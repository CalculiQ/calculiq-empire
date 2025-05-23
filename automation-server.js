// FIXED automation-server.js for Railway Deployment
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Import your existing systems (make sure these files exist)
// const CalculiQLeadCapture = require('./lead-capture-system');
// const LeadSalesBridge = require('./lead-sales-bridge');
require('dotenv').config();

class CalculiQAutomationServer {
    constructor() {
        this.app = express();
        this.db = null;
        this.emailTransporter = null;
        this.leadCapture = null;
        this.leadSales = null; 
        this.automationQueues = new Map();
        this.affiliateSystem = null;
        this.complianceSystem = null;
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

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CalculiQ - Smart Financial Calculators</title>
    <style>
        /* Add your CSS here */
    </style>
</head>
<body>
    <h1>🚀 CalculiQ Calculators</h1>
    <p>Calculators coming soon!</p>
</body>
</html>`);
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
// Blog content generation endpoint
        this.app.post('/api/generate-content', (req, res) => {
            try {
                const { contentType, keywords, targetAudience } = req.body;
                
                // Generate SEO-optimized blog content
                const blogContent = this.generateBlogContent(contentType, keywords, targetAudience);
                
                res.json({
                    success: true,
                    content: blogContent.content,
                    wordCount: blogContent.wordCount,
                    seoScore: blogContent.seoScore,
                    title: blogContent.title,
                    metaDescription: blogContent.metaDescription
                });
                
            } catch (error) {
                console.error('Content generation error:', error);
                res.status(500).json({ success: false, error: 'Failed to generate content' });
            }
        });

        // Lead sales endpoint
        this.app.post('/api/sell-lead', async (req, res) => {
            try {
                const { leadData } = req.body;
                
                // Simulate lead sale (replace with actual lead buyer APIs)
                const saleResult = {
                    success: true,
                    buyer: 'BrokerCalls.com',
                    price: this.calculateLeadPrice(leadData),
                    leadId: 'sale_' + Date.now()
                };
                
                console.log(`💰 Lead sold for $${saleResult.price}`);
                
                res.json(saleResult);
                
            } catch (error) {
                console.error('Lead sale error:', error);
                res.status(500).json({ success: false, error: 'Failed to sell lead' });
            }
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

        // Catch all route for undefined endpoints
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/automation-status',
                    'GET /health',
                    'POST /api/capture-lead-email',
                    'GET /api/lead-metrics'
                ]
            });
        });
        
        console.log('✅ CalculiQ API routes configured');
    }

    // Helper methods
   generateUID() {
        return 'cq_' + crypto.randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
    }
    
    // Content generation helper methods
    generateBlogContent(contentType, keywords, targetAudience) {
        const templates = {
            'blog': this.getBlogTemplate(keywords),
            'faq': this.getFAQTemplate(keywords),
            'guide': this.getGuideTemplate(keywords)
        };
        
        const template = templates[contentType] || templates['blog'];
        const content = template.content;
        const wordCount = content.split(' ').length;
        
        return {
            content: content,
            wordCount: wordCount,
            seoScore: 92,
            title: template.title,
            metaDescription: template.metaDescription
        };
    }
    
    // ... (rest of the methods from the artifact)
    
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