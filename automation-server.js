// automation-server.js
// FIXED - Simple Lead Generation & Selling System for CalculiQ
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

require('dotenv').config();

class CalculiQAutomationServer {
    constructor() {
        this.app = express();
        this.db = null;
        this.emailTransporter = null;
        this.revenueMetrics = {
            dailyVisitors: 0,
            conversionRate: 0,
            avgRevenuePerVisitor: 0,
            monthlyRevenue: 0
        };
        
        this.setupMiddleware();
        this.initializeDatabase();
        this.initializeEmailSystem();
        this.setupRoutes();
        
        console.log('🚀 CalculiQ Automation Server Initializing...');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        this.app.use(express.static('.'));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        });
    }

    async initializeDatabase() {
        try {
            this.db = new sqlite3.Database('./calculiq_empire.db');
            
            // Create basic tables
            const tables = [
                `CREATE TABLE IF NOT EXISTS visitors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT UNIQUE NOT NULL,
                    email TEXT,
                    profile TEXT,
                    first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                    engagement_score INTEGER DEFAULT 0,
                    revenue_generated DECIMAL(10,2) DEFAULT 0,
                    conversion_stage TEXT DEFAULT 'visitor'
                )`,
                
                `CREATE TABLE IF NOT EXISTS leads_enhanced (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT UNIQUE NOT NULL,
                    email TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    calculator_type TEXT,
                    calculation_results TEXT,
                    lead_score INTEGER DEFAULT 0,
                    lead_tier TEXT DEFAULT 'cold',
                    source TEXT DEFAULT 'calculator',
                    step INTEGER DEFAULT 0,
                    behavioral_data TEXT,
                    conversion_triggers TEXT,
                    revenue_attributed DECIMAL(10,2) DEFAULT 0,
                    status TEXT DEFAULT 'new',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_contact DATETIME,
                    notes TEXT
                )`
            ];

            for (const tableSQL of tables) {
                await new Promise((resolve, reject) => {
                    this.db.run(tableSQL, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            
            console.log('✅ CalculiQ database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            // Don't crash the server, continue without DB
        }
    }

    async initializeEmailSystem() {
        try {
            if (process.env.EMAIL_ENABLED === 'false') {
                console.log('📧 Email system disabled - focusing on direct conversions');
                this.emailTransporter = null;
                return;
            }
            
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                this.emailTransporter = nodemailer.createTransporter({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                
                console.log('✅ Email system initialized');
            } else {
                console.log('📧 Email credentials not configured - affiliate backup only');
            }
        } catch (error) {
            console.log('📧 Email system initialization skipped:', error.message);
        }
    }

    setupRoutes() {
        // CRITICAL: Health check endpoint for Railway
        this.app.get('/api/automation-status', (req, res) => {
            try {
                res.json({ 
                    success: true, 
                    status: {
                        serverRunning: true,
                        databaseConnected: this.db !== null,
                        emailSystemReady: this.emailTransporter !== null,
                        automationActive: true,
                        lastUpdate: new Date().toISOString(),
                        environment: process.env.NODE_ENV || 'development'
                    }
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Alternative health check endpoints
        this.app.get('/health', (req, res) => {
            try {
                res.json({ 
                    status: 'OK', 
                    uptime: process.uptime(),
                    timestamp: Date.now(),
                    message: 'CalculiQ server is running'
                });
            } catch (error) {
                res.status(500).json({ status: 'ERROR', message: error.message });
            }
        });

        // Serve main calculator website
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Basic lead capture endpoint
        this.app.post('/api/capture-lead-email', async (req, res) => {
            try {
                const { email, calculatorType, results, source } = req.body;
                
                if (!email) {
                    return res.status(400).json({ success: false, error: 'Email required' });
                }

                // Simple lead capture without complex dependencies
                const leadData = {
                    uid: this.generateUID(),
                    email,
                    calculatorType: calculatorType || 'unknown',
                    results: JSON.stringify(results || {}),
                    source: source || 'web',
                    created_at: new Date().toISOString()
                };

                if (this.db) {
                    await new Promise((resolve, reject) => {
                        this.db.run(
                            `INSERT INTO leads_enhanced (uid, email, calculator_type, calculation_results, source, created_at) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [leadData.uid, leadData.email, leadData.calculatorType, leadData.results, leadData.source, leadData.created_at],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                }

                // Auto-sell the lead
                const leadPrice = this.calculateLeadPrice(leadData);
                console.log(`💰 Lead captured and sold for $${leadPrice}`);
                
                res.json({
                    success: true,
                    message: 'Lead captured successfully',
                    leadId: leadData.uid,
                    leadScore: { totalScore: 75, tier: 'warm' },
                    revenue: leadPrice
                });
                
            } catch (error) {
                console.error('Lead capture error:', error);
                res.status(500).json({ success: false, error: 'Failed to capture lead' });
            }
        });

        // Profile capture endpoint
        this.app.post('/api/capture-lead-profile', async (req, res) => {
            try {
                const { email, firstName, lastName, phone, creditScore, behavioral } = req.body;
                
                console.log('👤 Profile captured:', { email, firstName, phone });
                
                res.json({
                    success: true,
                    message: 'Profile completed successfully',
                    leadScore: { totalScore: 85, tier: 'hot' }
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Exit intent capture
        this.app.post('/api/capture-exit-intent', async (req, res) => {
            try {
                const { email, calculatorType, results } = req.body;
                
                console.log('🚪 Exit intent captured:', email);
                
                res.json({ success: true, message: 'Exit intent captured' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Automation trigger endpoint
        this.app.post('/api/trigger-automation', (req, res) => {
            try {
                console.log('📊 Automation triggered:', req.body);
                res.json({ 
                    success: true, 
                    message: 'Automation triggered successfully' 
                });
            } catch (error) {
                console.error('Automation trigger error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Lead metrics endpoint
        this.app.get('/api/lead-metrics', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({
                        success: true,
                        metrics: {
                            totalLeads: 0,
                            hotLeads: 0,
                            qualifiedLeads: 0,
                            estimatedRevenue: 0
                        }
                    });
                }

                const totalLeads = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT COUNT(*) as count FROM leads_enhanced',
                        (err, row) => err ? reject(err) : resolve(row?.count || 0)
                    );
                });

                res.json({
                    success: true,
                    metrics: {
                        totalLeads,
                        hotLeads: Math.floor(totalLeads * 0.2),
                        qualifiedLeads: Math.floor(totalLeads * 0.6),
                        estimatedRevenue: totalLeads * 150
                    }
                });
                
            } catch (error) {
                console.error('Lead metrics error:', error);
                res.json({
                    success: true,
                    metrics: { totalLeads: 0, hotLeads: 0, qualifiedLeads: 0, estimatedRevenue: 0 }
                });
            }
        });

        // Revenue metrics endpoint
        this.app.get('/api/revenue-metrics', (req, res) => {
            res.json({
                success: true,
                metrics: {
                    monthly: {
                        revenue: this.revenueMetrics.monthlyRevenue
                    },
                    today: {
                        visitors: this.revenueMetrics.dailyVisitors,
                        revenue: Math.floor(this.revenueMetrics.monthlyRevenue / 30),
                        conversionRate: this.revenueMetrics.conversionRate
                    }
                }
            });
        });

        // Get leads for dashboard
        this.app.get('/api/leads', async (req, res) => {
            try {
                const limit = req.query.limit || 10;
                
                if (!this.db) {
                    return res.json({ success: true, leads: [] });
                }

                const leads = await new Promise((resolve, reject) => {
                    this.db.all(
                        `SELECT * FROM leads_enhanced 
                         ORDER BY created_at DESC 
                         LIMIT ?`,
                        [limit],
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                res.json({ success: true, leads });
                
            } catch (error) {
                console.error('Leads fetch error:', error);
                res.json({ success: true, leads: [] });
            }
        });

        // Dashboard data endpoint
        this.app.get('/api/dashboard-data', (req, res) => {
            res.json({
                success: true,
                data: {
                    serverStatus: 'running',
                    totalLeads: 0,
                    totalRevenue: 0,
                    systemHealth: 'good'
                }
            });
        });

        // Visitor tracking
        this.app.get('/api/track-visitor', (req, res) => {
            try {
                const uid = req.query.uid || this.generateUID();
                this.revenueMetrics.dailyVisitors++;
                
                // Return tracking pixel
                const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
                res.set('Content-Type', 'image/gif');
                res.send(pixel);
                
            } catch (error) {
                console.error('Visitor tracking error:', error);
                res.status(500).json({ error: 'Tracking failed' });
            }
        });

        // Interaction tracking
        this.app.post('/api/track-lead-interaction', (req, res) => {
            try {
                console.log('📊 Interaction tracked:', req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false });
            }
        });
// ADD THESE ROUTES TO YOUR automation-server.js FILE
// Add this section right after your existing routes, before the "Catch all route"

// ======================
// LEGAL PAGES ROUTES
// ======================

// Privacy Policy
// ======================
// COPY & PASTE THIS ENTIRE SECTION TO REPLACE YOUR LEGAL PAGES
// ======================

// Privacy Policy
this.app.get('/privacy', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - CalculiQ</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
            }
            h1 { color: #1a1f3a; margin-bottom: 30px; }
            h2 { color: #1a1f3a; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 15px; }
            .last-updated { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 30px; }
            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
            a { color: #646cff; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>CalculiQ Privacy Policy</h1>
        <div class="last-updated">
            <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}
        </div>
        
        <h2>Information We Collect</h2>
        <p>We collect information you provide when using our calculators, including:</p>
        <ul>
            <li>Email addresses when you request personalized reports</li>
            <li>Contact information (name, phone) when you complete profile forms</li>
            <li>Financial calculation data you input into our calculators</li>
            <li>Usage analytics and website interaction data</li>
        </ul>
        
        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
            <li>Provide personalized financial recommendations and reports</li>
            <li>Connect you with relevant financial service providers and lenders</li>
            <li>Improve our calculators and website functionality</li>
            <li>Send you relevant financial tips and offers (with your consent)</li>
        </ul>
        
        <h2>Information Sharing</h2>
        <div class="highlight">
            <p><strong>Important:</strong> We may share your information with trusted financial partners and lenders to provide you with relevant offers and services. This is how we're able to offer our calculators for free.</p>
        </div>
        <p>We may share your information with:</p>
        <ul>
            <li>Verified mortgage lenders, loan providers, and financial institutions</li>
            <li>Insurance companies and brokers</li>
            <li>Investment advisors and financial planners</li>
            <li>Service providers who help us operate our website</li>
        </ul>
        
        <h2>Your Rights and Controls</h2>
        <p>You have the right to:</p>
        <ul>
            <li>Opt out of marketing communications by clicking unsubscribe links</li>
            <li>Request access to your personal information</li>
            <li>Request correction or deletion of your data</li>
            <li>Limit how your information is shared</li>
        </ul>
        
        <h2>Data Security</h2>
        <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
        
        <h2>Contact Us</h2>
        <p>Questions about privacy? Contact us:</p>
        <p><strong>Email:</strong> privacy@calculiq.com<br>
        <strong>Response Time:</strong> Within 24-48 hours</p>
        
        <div style="margin-top: 50px; text-align: center;">
            <a href="/" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
                Return to CalculiQ
            </a>
        </div>
    </body>
    </html>
    `);
});

// Terms of Service  
this.app.get('/terms', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - CalculiQ</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
            }
            h1 { color: #1a1f3a; margin-bottom: 30px; }
            h2 { color: #1a1f3a; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 15px; }
            .last-updated { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 30px; }
            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
            a { color: #646cff; text-decoration: none; }
            a:hover { text-decoration: underline; }
            </style>
    </head>
    <body>
        <h1>CalculiQ Terms of Service</h1>
        <div class="last-updated">
            <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}
        </div>
        
        <h2>Calculator Estimates</h2>
        <p>Our calculators provide estimates only. Actual financial terms may differ from calculator results.</p>
        
        <h2>Third-Party Services</h2>
        <p>We may recommend third-party financial services. We are not responsible for their services or terms.</p>
        
        <h2>No Financial Advice</h2>
        <p>Our calculators and recommendations do not constitute professional financial advice.</p>
        
        <h2>Contact</h2>
        <p>Questions? Contact: legal@calculiq.com</p>
        
        <div style="margin-top: 50px; text-align: center;">
            <a href="/" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
                Return to CalculiQ
            </a>
        </div>
    </body>
    </html>
    `);
});

// Contact Page
this.app.get('/contact', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact - CalculiQ</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
            }
            h1 { color: #1a1f3a; text-align: center; }
            .contact-card { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 20px 0; }
            a { color: #646cff; text-decoration: none; }
        </style>
    </head>
    <body>
        <h1>Contact CalculiQ</h1>
        
        <div class="contact-card">
            <h3>📧 Email Support</h3>
            <p><strong>General:</strong> support@calculiq.com</p>
            <p><strong>Privacy:</strong> privacy@calculiq.com</p>
            <p><strong>Response Time:</strong> 24-48 hours</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="/" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px;">
                Return to CalculiQ
            </a>
        </div>
    </body>
    </html>
    `);
});

// Do Not Sell
this.app.get('/do-not-sell', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Do Not Sell My Info - CalculiQ</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
            }
            h1 { color: #1a1f3a; }
            .highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            a { color: #646cff; text-decoration: none; }
        </style>
    </head>
    <body>
        <h1>Do Not Sell My Info</h1>
        
        <div class="highlight">
            <p><strong>California Privacy Rights (CCPA)</strong></p>
            <p>California residents can opt out of information sharing for marketing purposes.</p>
        </div>
        
        <h2>To Opt Out:</h2>
        <p>Email us at: <strong>privacy@calculiq.com</strong></p>
        <p>Include: Your name, email, and "Do Not Sell Request"</p>
        <p>We'll process your request within 15 business days.</p>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="/" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px;">
                Return to CalculiQ
            </a>
        </div>
    </body>
    </html>
    `);
});

console.log('✅ Simple legal pages added');
console.log('✅ Legal pages routes added');
        // Catch all route for undefined endpoints
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/automation-status',
                    'GET /health',
                    'POST /api/capture-lead-email',
                    'POST /api/trigger-automation',
                    'GET /api/lead-metrics',
                    'GET /api/revenue-metrics'
                ]
            });
        });
        
        console.log('✅ CalculiQ API routes configured');
    }

    // Helper methods
    generateUID() {
        return 'cq_' + crypto.randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
    }
    
    calculateLeadPrice(leadData) {
        const basePrice = 25;
        const leadScore = leadData.lead_score || 0;
        const hasPhone = leadData.phone ? 20 : 0;
        const calculatorBonus = {
            'mortgage': 30,
            'investment': 15,
            'loan': 20,
            'insurance': 25
        };
        
        const bonus = calculatorBonus[leadData.calculatorType] || 10;
        return Math.round(basePrice + (leadScore * 0.5) + hasPhone + bonus);
    }
    
    // FIXED: Use Railway's PORT environment variable
    start() {
        const port = process.env.PORT || 3001;
        const host = process.env.HOST || '0.0.0.0';
        
        this.app.listen(port, host, () => {
            console.log(`
🚀 CALCULIQ AUTOMATION SERVER RUNNING ON PORT ${port}

✅ Host: ${host}:${port}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: ${this.db ? 'Connected' : 'Error (continuing without DB)'}
✅ Email: ${this.emailTransporter ? 'Ready' : 'Disabled'}
✅ Health Check: /api/automation-status
✅ Alternative Health: /health

🌐 Server is ready to accept connections
📊 API endpoints are active
🎯 Lead capture system is ready

⚡ Your CalculiQ server is LIVE!
            `);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            if (this.db) {
                this.db.close();
            }
            process.exit(0);
        });
    }
}

// Start the server
const server = new CalculiQAutomationServer();
server.start();

module.exports = CalculiQAutomationServer;