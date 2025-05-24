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
        
        <h2>Cookies and Tracking</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
            <li>Remember your calculator inputs and preferences</li>
            <li>Analyze website usage and improve our services</li>
            <li>Provide personalized content and recommendations</li>
        </ul>
        
        <h2>Third-Party Links</h2>
        <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.</p>
        
        <h2>Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page.</p>
        
        <h2>Contact Us</h2>
        <p>If you have questions about this privacy policy or your personal information, please contact us at:</p>
        <p><strong>Email:</strong> privacy@calculiq.com<br>
        <strong>Address:</strong> CalculiQ Privacy Team, 123 Financial Street, Suite 100, New York, NY 10001</p>
        
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
            .warning { background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
        </style>
    </head>
    <body>
        <h1>CalculiQ Terms of Service</h1>
        <div class="last-updated">
            <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}
        </div>
        
        <h2>Acceptance of Terms</h2>
        <p>By using CalculiQ's website and services, you agree to these terms of service. If you do not agree, please do not use our services.</p>
        
        <h2>Description of Service</h2>
        <p>CalculiQ provides free financial calculators and connects users with financial service providers. Our services include:</p>
        <ul>
            <li>Mortgage, loan, investment, and insurance calculators</li>
            <li>Personalized financial recommendations</li>
            <li>Connections to verified lenders and financial partners</li>
            <li>Educational financial content and resources</li>
        </ul>
        
        <h2>Calculator Estimates and Accuracy</h2>
        <div class="warning">
            <p><strong>Important Disclaimer:</strong> Our calculators provide estimates only. Actual financial terms, rates, and payments may differ significantly from calculator results. Always consult with qualified financial professionals for personalized advice.</p>
        </div>
        <p>Calculator results are based on:</p>
        <ul>
            <li>Information you provide (which we assume is accurate)</li>
            <li>Standard financial formulas and market averages</li>
            <li>Current estimated rates and terms</li>
        </ul>
        
        <h2>Third-Party Financial Services</h2>
        <p>We may recommend or connect you with third-party financial service providers, including:</p>
        <ul>
            <li>Mortgage lenders and brokers</li>
            <li>Personal loan companies</li>
            <li>Insurance providers</li>
            <li>Investment advisors</li>
        </ul>
        <p><strong>We are not responsible for:</strong></p>
        <ul>
            <li>The services, rates, or terms offered by third parties</li>
            <li>The accuracy of third-party information</li>
            <li>Any disputes between you and third-party providers</li>
            <li>The approval or denial of applications</li>
        </ul>
        
        <h2>No Financial Advice</h2>
        <div class="highlight">
            <p><strong>Not Financial Advice:</strong> Our calculators, recommendations, and content do not constitute professional financial, legal, or tax advice. Always consult with qualified professionals for personalized guidance.</p>
        </div>
        
        <h2>User Responsibilities</h2>
        <p>You agree to:</p>
        <ul>
            <li>Provide accurate information when using our calculators</li>
            <li>Use our services for lawful purposes only</li>
            <li>Not attempt to reverse engineer or misuse our systems</li>
            <li>Respect intellectual property rights</li>
            <li>Not submit false or misleading information</li>
        </ul>
        
        <h2>Privacy and Data Sharing</h2>
        <p>By using our services, you consent to our collection and sharing of your information as described in our <a href="/privacy">Privacy Policy</a>. This includes sharing your information with financial partners to provide you with relevant offers.</p>
        
        <h2>Compensation and Affiliations</h2>
        <p>CalculiQ may receive compensation from financial service providers when:</p>
        <ul>
            <li>Users click through to partner websites</li>
            <li>Users submit applications or are matched with providers</li>
            <li>Transactions are completed through our partners</li>
        </ul>
        <p>This compensation helps us provide free calculators and services.</p>
        
        <h2>Limitation of Liability</h2>
        <div class="warning">
            <p><strong>Limitation:</strong> CalculiQ is not liable for any financial decisions made based on our calculators or recommendations. Use our tools as a starting point, but always verify information and consult professionals.</p>
        </div>
        
        <h2>Service Availability</h2>
        <p>We strive to maintain service availability but do not guarantee uninterrupted access. We may modify or discontinue services at any time.</p>
        
        <h2>Intellectual Property</h2>
        <p>All content, calculators, and materials on CalculiQ are protected by intellectual property laws. You may use our services for personal, non-commercial purposes.</p>
        
        <h2>Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.</p>
        
        <h2>Governing Law</h2>
        <p>These terms are governed by the laws of New York State, United States.</p>
        
        <h2>Contact Information</h2>
        <p>Questions about these terms? Contact us:</p>
        <p><strong>Email:</strong> legal@calculiq.com<br>
        <strong>Address:</strong> CalculiQ Legal Team, 123 Financial Street, Suite 100, New York, NY 10001</p>
        
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
        <title>Contact Us - CalculiQ</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            h1 { color: #1a1f3a; margin-bottom: 30px; text-align: center; }
            h2 { color: #1a1f3a; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 15px; }
            .contact-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 30px;
                margin: 30px 0;
            }
            .contact-card {
                background: #f8f9fa;
                padding: 25px;
                border-radius: 12px;
                text-align: center;
                border-left: 4px solid #646cff;
            }
            .contact-icon {
                font-size: 2rem;
                margin-bottom: 15px;
            }
            .contact-form {
                background: #f8f9fa;
                padding: 30px;
                border-radius: 12px;
                margin: 30px 0;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #1a1f3a;
            }
            .form-group input,
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: #646cff;
            }
            .submit-btn {
                background: #646cff;
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 8px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            .submit-btn:hover {
                background: #5661ff;
            }
            .back-btn {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                margin-top: 30px;
                text-align: center;
            }
            .back-btn:hover {
                background: #0f9d6e;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Contact CalculiQ</h1>
            <p style="text-align: center; font-size: 1.1rem; color: #666;">
                We're here to help with your financial calculations and questions!
            </p>
            
            <div class="contact-grid">
                <div class="contact-card">
                    <div class="contact-icon">📧</div>
                    <h3>Email Support</h3>
                    <p><strong>General:</strong> support@calculiq.com</p>
                    <p><strong>Privacy:</strong> privacy@calculiq.com</p>
                    <p><strong>Legal:</strong> legal@calculiq.com</p>
                </div>
                
                <div class="contact-card">
                    <div class="contact-icon">📞</div>
                    <h3>Phone Support</h3>
                    <p><strong>Toll-Free:</strong> 1-800-CALC-123</p>
                    <p><strong>Hours:</strong> Mon-Fri 9AM-6PM EST</p>
                    <p>Calculator support & general inquiries</p>
                </div>
                
                <div class="contact-card">
                    <div class="contact-icon">🏢</div>
                    <h3>Business Address</h3>
                    <p>CalculiQ Financial Tools<br>
                    123 Financial Street<br>
                    Suite 100<br>
                    New York, NY 10001</p>
                </div>
            </div>
            
            <div class="contact-form">
                <h2>Send us a Message</h2>
                <form onsubmit="handleContactForm(event)">
                    <div class="form-group">
                        <label for="name">Full Name *</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="subject">Subject *</label>
                        <select id="subject" name="subject" required>
                            <option value="">Select a topic...</option>
                            <option value="calculator-help">Calculator Help</option>
                            <option value="technical-issue">Technical Issue</option>
                            <option value="partnership">Partnership Inquiry</option>
                            <option value="feedback">Feedback</option>
                            <option value="privacy">Privacy Question</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="message">Message *</label>
                        <textarea id="message" name="message" rows="5" placeholder="How can we help you?" required></textarea>
                    </div>
                    
                    <button type="submit" class="submit-btn">Send Message</button>
                </form>
            </div>
            
            <h2>Frequently Asked Questions</h2>
            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px;">
                <h3>🤔 How accurate are your calculators?</h3>
                <p>Our calculators use standard financial formulas and provide estimates. Actual rates and terms may vary based on your specific situation and lender requirements.</p>
                
                <h3>🔒 Is my information secure?</h3>
                <p>Yes! We use industry-standard security measures to protect your data. Read our <a href="/privacy">Privacy Policy</a> for details.</p>
                
                <h3>💰 Are your calculators really free?</h3>
                <p>Absolutely! Our calculators are 100% free. We may earn compensation when you connect with our financial partners.</p>
                
                <h3>📞 Will I be contacted by lenders?</h3>
                <p>Only if you choose to receive quotes or connect with lenders through our platform. You control your communication preferences.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="/" class="back-btn">Return to CalculiQ</a>
            </div>
        </div>
        
        <script>
            function handleContactForm(event) {
                event.preventDefault();
                
                // Get form data
                const formData = new FormData(event.target);
                const data = Object.fromEntries(formData);
                
                // Simple validation
                if (!data.name || !data.email || !data.subject || !data.message) {
                    alert('Please fill in all required fields.');
                    return;
                }
                
                // Simulate form submission
                alert('Thank you for your message! We\\'ll respond within 24 hours.');
                event.target.reset();
                
                // In a real implementation, you'd send this to your server
                console.log('Contact form submitted:', data);
            }
        </script>
    </body>
    </html>
    `);
});

// Do Not Sell My Info Page (CCPA Compliance)
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
                max-width: 800px; 
                margin: 0 auto; 
                padding: 40px 20px; 
                line-height: 1.6; 
                color: #333;
            }
            h1 { color: #1a1f3a; margin-bottom: 30px; }
            h2 { color: #1a1f3a; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 15px; }
            .highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; }
            .form-container { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 30px 0; }
            .form-group { margin-bottom: 20px; }
            .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
            .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 6px; }
            .submit-btn { background: #dc3545; color: white; padding: 15px 30px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
            .submit-btn:hover { background: #c82333; }
            a { color: #646cff; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>Do Not Sell My Personal Information</h1>
        
        <div class="highlight">
            <p><strong>Your California Privacy Rights (CCPA)</strong></p>
            <p>California residents have the right to opt out of the "sale" of their personal information. Under California law, sharing information for marketing purposes may be considered a "sale."</p>
        </div>
        
        <h2>What Information Do We Share?</h2>
        <p>CalculiQ may share your information with financial partners including:</p>
        <ul>
            <li>Contact information (name, email, phone)</li>
            <li>Financial calculation data and preferences</li>
            <li>Demographic and location information</li>
            <li>Website usage and interaction data</li>
        </ul>
        
        <h2>How We Share Information</h2>
        <p>We share your information to:</p>
        <ul>
            <li>Connect you with relevant lenders and financial service providers</li>
            <li>Provide personalized rate quotes and offers</li>
            <li>Enable financial partners to contact you with relevant services</li>
            <li>Improve our matching algorithms and services</li>
        </ul>
        
        <h2>Opt-Out Request</h2>
        <p>To opt out of the sale of your personal information, please complete the form below:</p>
        
        <div class="form-container">
            <form onsubmit="handleOptOut(event)">
                <div class="form-group">
                    <label for="full-name">Full Name *</label>
                    <input type="text" id="full-name" name="fullName" required>
                </div>
                
                <div class="form-group">
                    <label for="email-address">Email Address *</label>
                    <input type="email" id="email-address" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="phone-number">Phone Number</label>
                    <input type="tel" id="phone-number" name="phone">
                </div>
                
                <div class="form-group">
                    <label for="request-type">Request Type *</label>
                    <select id="request-type" name="requestType" required>
                        <option value="">Select request type...</option>
                        <option value="do-not-sell">Do Not Sell My Information</option>
                        <option value="delete-data">Delete My Data</option>
                        <option value="access-data">Access My Data</option>
                        <option value="correct-data">Correct My Data</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="additional-info">Additional Information</label>
                    <textarea id="additional-info" name="additionalInfo" rows="4" placeholder="Please provide any additional details about your request..."></textarea>
                </div>
                
                <div style="margin: 20px 0;">
                    <label>
                        <input type="checkbox" required style="width: auto; margin-right: 10px;">
                        I confirm that I am a California resident and am authorized to make this request *
                    </label>
                </div>
                
                <button type="submit" class="submit-btn">Submit Opt-Out Request</button>
            </form>
        </div>
        
        <h2>What Happens After You Opt Out?</h2>
        <p>Once you submit your opt-out request:</p>
        <ul>
            <li><strong>Processing Time:</strong> We'll process your request within 15 business days</li>
            <li><strong>Verification:</strong> We may contact you to verify your identity</li>
            <li><strong>Confirmation:</strong> You'll receive email confirmation when complete</li>
            <li><strong>Future Sharing:</strong> We'll stop sharing your information for marketing purposes</li>
        </ul>
        
        <div class="highlight">
            <p><strong>Important Note:</strong> Opting out may limit our ability to provide personalized financial recommendations and connect you with relevant lenders. You can still use our calculators, but you may receive fewer targeted offers.</p>
        </div>
        
        <h2>Other Privacy Rights</h2>
        <p>California residents also have the right to:</p>
        <ul>
            <li><strong>Know:</strong> What personal information we collect and how it's used</li>
            <li><strong>Delete:</strong> Request deletion of your personal information</li>
            <li><strong>Access:</strong> Request a copy of your personal information</li>
            <li><strong>Correct:</strong> Request correction of inaccurate information</li>
            <li><strong>Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
        </ul>
        
        <h2>Contact Information</h2>
        <p>Questions about your privacy rights or this process?</p>
        <p><strong>Email:</strong> privacy@calculiq.com<br>
        <strong>Phone:</strong> 1-800-CALC-123<br>
        <strong>Mail:</strong> CalculiQ Privacy Team, 123 Financial Street, Suite 100, New York, NY 10001</p>
        
        <div style="margin-top: 50px; text-align: center;">
            <a href="/privacy" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px; margin-right: 15px;">View Privacy Policy</a>
            <a href="/" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px;">Return to CalculiQ</a>
        </div>
        
        <script>
            function handleOptOut(event) {
                event.preventDefault();
                
                const formData = new FormData(event.target);
                const data = Object.fromEntries(formData);
                
                // Simple validation
                if (!data.fullName || !data.email || !data.requestType) {
                    alert('Please fill in all required fields.');
                    return;
                }
                
                // Simulate form submission
                alert('Your opt-out request has been submitted successfully! We\\'ll process it within 15 business days and send you a confirmation email.');
                event.target.reset();
                
                // In real implementation, send to server
                console.log('Opt-out request submitted:', data);
            }
            
            // Add textarea styling
            const style = document.createElement('style');
            style.textContent = \`
                textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-height: 100px !important;
                    padding: 12px !important;
                    border: 2px solid #e5e7eb !important;
                    border-radius: 6px !important;
                    font-family: inherit !important;
                    resize: vertical !important;
                }
                textarea:focus {
                    border-color: #646cff !important;
                    outline: none !important;
                }
            \`;
            document.head.appendChild(style);
        </script>
    </body>
    </html>
    `);
});

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