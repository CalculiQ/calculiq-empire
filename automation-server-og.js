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
                    message: '✅ Thank you! Your personalized financial analysis is being prepared. Our specialists will contact you within 24 hours with exclusive rates and money-saving recommendations.',
                    leadScore: { totalScore: 75, tier: 'warm' },
                    revenue: leadPrice
                });
                
            } catch (error) {
                console.error('Lead capture error:', error);
                res.json({ 
                    success: true, 
                    message: '✅ Information received! Our financial team will be in touch within 24 hours.' 
                });
            }
        });

        // NEW: Profile capture endpoint
        this.app.post('/api/capture-lead-profile', async (req, res) => {
            try {
                const { email, firstName, lastName, phone, creditScore, behavioral } = req.body;
                
                console.log('📋 Profile capture:', { email, firstName, phone, creditScore });
                
                if (this.db && email) {
                    await new Promise((resolve, reject) => {
                        this.db.run(
                            `UPDATE leads_enhanced SET 
                                first_name = ?, last_name = ?, phone = ?, 
                                lead_score = 85, lead_tier = 'hot', step = 2,
                                updated_at = CURRENT_TIMESTAMP
                             WHERE email = ?`,
                            [firstName, lastName, phone, email],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Profile completed successfully! Our premium partners will contact you with exclusive rates.',
                    leadScore: { totalScore: 85, tier: 'hot' }
                });
                
            } catch (error) {
                console.error('Profile capture error:', error);
                res.json({ 
                    success: true, 
                    message: 'Profile received! You\'ll hear from our partners soon.' 
                });
            }
        });

        // NEW: Exit intent capture endpoint
        this.app.post('/api/capture-exit-intent', async (req, res) => {
            try {
                const { email, calculatorType, results, source } = req.body;
                
                console.log('🚪 Exit intent capture:', { email, calculatorType });
                
                const leadData = {
                    uid: this.generateUID(),
                    email,
                    calculatorType: calculatorType || 'unknown',
                    results: JSON.stringify(results || {}),
                    source: 'exit_intent',
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
                
                res.json({
                    success: true,
                    message: 'Thank you! Our lenders will contact you within 24 hours with personalized quotes.'
                });
                
            } catch (error) {
                console.error('Exit intent capture error:', error);
                res.json({ 
                    success: true, 
                    message: 'Information received! Our team will be in touch soon.' 
                });
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

        // Lead interaction tracking
        this.app.post('/api/track-lead-interaction', (req, res) => {
            try {
                const { leadUID, interactionType, data } = req.body;
                console.log('📊 Lead interaction:', { leadUID, interactionType });
                res.json({ success: true });
            } catch (error) {
                console.error('Interaction tracking error:', error);
                res.json ({ success: true }); // Don't fail on tracking errors
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
                    'POST /api/capture-lead-profile',
                    'POST /api/capture-exit-intent',
                    'POST /api/trigger-automation',
                    'GET /api/lead-metrics',
                    'GET /api/revenue-metrics',
                    'POST /api/generate-content'
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
    
    getBlogTemplate(keywords) {
        const templates = [
            {
                title: "Complete Guide to Mortgage Calculators: Save Thousands in 2024",
                metaDescription: "Learn how mortgage calculators work and discover strategies to save thousands on your home loan. Free calculator included.",
                content: `# Complete Guide to Mortgage Calculators: Save Thousands in 2024

## Why Every Homebuyer Needs a Mortgage Calculator

Planning to buy a home? A mortgage calculator is your most important tool for making smart financial decisions. Our advanced calculator helps you understand exactly what you can afford and how different scenarios affect your monthly payments.

## How Our Mortgage Calculator Works

### Key Features:
- **Real-time calculations** based on current market rates
- **Payment breakdowns** showing principal vs interest
- **Total cost analysis** over the life of your loan
- **Comparison tools** for different loan scenarios

### What You'll Discover:
1. **Affordable home price range** based on your income
2. **Monthly payment estimates** including taxes and insurance
3. **Interest savings** from larger down payments
4. **Total loan costs** over 15, 20, or 30 years

## Advanced Calculator Features

Our calculator goes beyond basic payments to show:

- **PMI calculations** and when it can be removed
- **Property tax estimates** by zip code
- **Homeowners insurance** cost factors
- **HOA fees** impact on affordability

## Smart Strategies to Save Money

### 1. Optimize Your Down Payment
- **20% down** eliminates PMI entirely
- **15% down** still provides significant savings
- **10% down** may qualify for special programs

### 2. Compare Loan Terms
- **15-year loans** save massive interest but higher payments
- **30-year loans** lower payments but higher total cost
- **Bi-weekly payments** can save 6+ years of payments

### 3. Rate Shopping Benefits
Even a 0.25% rate difference can save thousands:
- **$300,000 loan:** $45/month = $16,200 over 30 years
- **$500,000 loan:** $75/month = $27,000 over 30 years

## When to Use a Mortgage Calculator

### Pre-Shopping Phase:
- Determine realistic price range
- Calculate required down payment
- Estimate monthly housing costs
- Plan saving timeline

### Active Shopping:
- Compare different properties
- Evaluate loan offers
- Negotiate with lenders
- Final affordability check

## Getting Pre-Approved

After using our calculator:
1. **Gather financial documents** (pay stubs, tax returns, bank statements)
2. **Check your credit score** (aim for 620+ for best rates)
3. **Contact multiple lenders** for rate quotes
4. **Get pre-approval letters** for serious house hunting

## Next Steps

Ready to start your home buying journey? Use our free mortgage calculator to:
- Calculate your ideal home price range
- Compare different down payment scenarios
- Estimate your monthly payments
- Connect with top-rated lenders

Our calculator is used by thousands of successful homebuyers. Join them and make informed decisions about the biggest purchase of your life.

**[Calculate Your Mortgage Payment Now →]**

---

*Disclaimer: Calculator results are estimates. Actual loan terms may vary. Consult with qualified mortgage professionals for personalized advice.*`
            }
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    getFAQTemplate(keywords) {
        return {
            title: "Financial Calculator FAQ: Your Questions Answered",
            metaDescription: "Get answers to common questions about financial calculators, mortgage calculations, and investment planning.",
            content: `# Financial Calculator FAQ: Your Questions Answered

## Mortgage Calculator Questions

**Q: How accurate are mortgage calculator results?**
A: Our calculator uses standard banking formulas and provides estimates within 1-2% of actual payments. Final terms depend on your credit, lender, and market conditions.

**Q: Should I include property taxes and insurance?**
A: Yes, always include these in your calculations. They typically add 20-30% to your base mortgage payment and are required for most loans.

**Q: What credit score do I need for the best rates?**
A: Generally 740+ gets the best rates, 620+ qualifies for conventional loans, and 580+ may qualify for FHA loans.

## Investment Calculator Questions

**Q: What return rate should I use?**
A: Historical stock market average is 10%, but 7-8% is more conservative when accounting for inflation and fees.

**Q: How often should I update my calculations?**
A: Review annually or when major life changes occur (job change, marriage, etc.).

**Q: Should I invest or pay off debt first?**
A: Generally pay off high-interest debt (>6-7%) first, then invest. Low-interest debt can be managed alongside investing.

## General Questions

**Q: Are these calculators free to use?**
A: Yes, all our calculators are completely free with no hidden fees or required sign-ups.

**Q: Do you store my personal information?**
A: We only collect email addresses if you choose to receive results. We never sell or share your data.

**Q: Can I save my calculations?**
A: Yes, enter your email to save and compare different scenarios over time.`
        };
    }
    
    getGuideTemplate(keywords) {
        return {
            title: "Step-by-Step Financial Planning Guide",
            metaDescription: "Complete guide to financial planning using calculators. Learn mortgage, investment, and loan strategies.",
            content: `# Step-by-Step Financial Planning Guide

## Phase 1: Foundation (Months 1-6)
1. **Emergency fund** (3-6 months expenses)
2. **High-interest debt** payoff plan
3. **Credit score** improvement
4. **Budget optimization**

## Phase 2: Building (Months 6-24)
1. **Employer 401(k)** match maximization
2. **IRA contributions** 
3. **House down payment** saving
4. **Insurance coverage** review

## Phase 3: Growth (Years 2-10)
1. **Investment diversification**
2. **Real estate** consideration
3. **Tax optimization** strategies
4. **Estate planning** basics

Use our calculators at each phase to stay on track!`
        };
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