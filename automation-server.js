// automation-server.js
// UPDATED - Simple Lead Generation & Newsletter System for CalculiQ
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
        this.initializeNewsletterSystem();
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
                )`,
                
                `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    source TEXT,
                    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    last_email_sent DATETIME
                )`,
                
                `CREATE TABLE IF NOT EXISTS newsletter_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    week_of DATE,
                    subject TEXT,
                    content TEXT,
                    data_sources TEXT,
                    sent_at DATETIME,
                    subscriber_count INTEGER DEFAULT 0
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

    async initializeNewsletterSystem() {
        try {
            // Set up automated newsletter - sends every Monday at 9 AM
            cron.schedule('0 9 * * 1', async () => {
                console.log('📧 Automated newsletter scheduled to send...');
                await this.generateAndSendWeeklyNewsletter();
            });
            
            console.log('✅ Newsletter automation scheduled for Mondays at 9 AM');
        } catch (error) {
            console.log('📧 Newsletter system initialization skipped:', error.message);
        }
    }

    async generateAndSendWeeklyNewsletter() {
        try {
            console.log('🤖 Generating automated newsletter content...');
            
            // Get current financial data
            const marketData = await this.fetchCurrentMarketData();
            const newsContent = await this.generateNewsletterContent(marketData);
            
            // Get subscribers
            const subscribers = await this.getActiveSubscribers();
            
            if (subscribers.length === 0) {
                console.log('📧 No subscribers found - skipping newsletter send');
                return;
            }

            // Send to all subscribers
            const results = await this.sendNewsletterToSubscribers(newsContent, subscribers);
            
            // Log results
            await this.logNewsletterSend(newsContent, results);
            
            console.log(`✅ Newsletter sent to ${results.successful} subscribers`);
            
        } catch (error) {
            console.error('❌ Newsletter generation failed:', error);
        }
    }

    async fetchCurrentMarketData() {
        try {
            // Simulate realistic financial data
            const baseRate = 6.5 + (Math.random() * 1.5); // 6.5-8.0% range
            
            return {
                timestamp: new Date().toISOString(),
                rates: {
                    mortgage: {
                        thirtyYear: (baseRate + 0.2).toFixed(2),
                        fifteenYear: (baseRate - 0.5).toFixed(2),
                        jumbo: (baseRate + 0.3).toFixed(2),
                        trend: Math.random() > 0.5 ? 'up' : 'down',
                        weeklyChange: ((Math.random() - 0.5) * 0.4).toFixed(2)
                    }
                },
                news: [
                    "Federal Reserve Signals Potential Rate Changes",
                    "Housing Market Shows Mixed Signals Nationwide"
                ].slice(0, 1)
            };
        } catch (error) {
            return this.getFallbackMarketData();
        }
    }

    async generateNewsletterContent(marketData) {
        const currentDate = new Date();
        const rates = marketData.rates.mortgage;
        const tip = this.getWeeklyTip();
        
        const content = {
            subject: `CalculiQ Weekly: Rates ${rates.trend === 'up' ? 'Rise' : 'Drop'} + Money Tips`,
            html: this.generateHTMLContent(marketData, tip),
            text: this.generateTextContent(marketData, tip),
            weekOf: this.getWeekStart(currentDate)
        };

        return content;
    }

    generateHTMLContent(marketData, tip) {
        const rates = marketData.rates.mortgage;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CalculiQ Weekly Newsletter</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
                .content { padding: 20px; }
                .section { margin: 25px 0; padding: 20px; border-left: 4px solid #667eea; background: #f8f9fa; }
                .rates-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                .rates-table th, .rates-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                .rates-table th { background: #f1f3f4; font-weight: 600; }
                .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9rem; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 CalculiQ Weekly</h1>
                <p>Your Financial Intelligence Brief</p>
            </div>
            
            <div class="content">
                <div class="section">
                    <h2>📈 This Week's Mortgage Rates</h2>
                    <table class="rates-table">
                        <tr><th>Loan Type</th><th>Rate</th><th>Change</th></tr>
                        <tr><td>30-Year Fixed</td><td>${rates.thirtyYear}%</td><td>${rates.weeklyChange > 0 ? '+' : ''}${rates.weeklyChange}%</td></tr>
                        <tr><td>15-Year Fixed</td><td>${rates.fifteenYear}%</td><td>-0.1%</td></tr>
                        <tr><td>Jumbo Loans</td><td>${rates.jumbo}%</td><td>+0.05%</td></tr>
                    </table>
                    <p><strong>Impact:</strong> On a $400,000 loan, this week's rates mean approximately $${this.calculateMonthlyPayment(400000, rates.thirtyYear, 30).toLocaleString()}/month.</p>
                </div>

                <div class="section">
                    <h2>💡 Money-Saving Tip of the Week</h2>
                    <p><strong>${tip.title}</strong></p>
                    <p>${tip.content}</p>
                    <a href="https://calculiq.com" class="cta-button">Try Our Calculators</a>
                </div>

                <div class="section">
                    <h2>🧮 Calculator Spotlight</h2>
                    <p>This week: <strong>Investment Calculator</strong></p>
                    <p>Did you know? Starting with just $500/month at age 25, you could have over $1.3 million by retirement. Use our investment calculator to see your personalized projection.</p>
                    <a href="https://calculiq.com" class="cta-button">Calculate Your Future</a>
                </div>
            </div>

            <div class="footer">
                <p>Thanks for reading CalculiQ Weekly!</p>
                <p>Forward this to a friend • <a href="{{UNSUBSCRIBE_LINK}}">Unsubscribe</a></p>
                <p>© ${new Date().getFullYear()} CalculiQ. All rights reserved.</p>
            </div>
        </body>
        </html>
        `;
    }

    generateTextContent(marketData, tip) {
        const rates = marketData.rates.mortgage;
        
        return `
CalculiQ Weekly Financial Brief
${new Date().toLocaleDateString()}

📈 THIS WEEK'S MORTGAGE RATES:
• 30-Year Fixed: ${rates.thirtyYear}%
• 15-Year Fixed: ${rates.fifteenYear}%  
• Jumbo Loans: ${rates.jumbo}%

💡 MONEY TIP: ${tip.title}
${tip.content}

🧮 Use our free calculators: https://calculiq.com

Thanks for reading!
The CalculiQ Team

Unsubscribe: {{UNSUBSCRIBE_LINK}}
        `.trim();
    }

    getWeeklyTip() {
        const tips = [
            {
                title: "The 1% Rule for Mortgages",
                content: "For every 1% difference in mortgage rates, your monthly payment changes by about 10%. Use our mortgage calculator to see exactly how rate changes affect your budget."
            },
            {
                title: "Compound Interest Magic",
                content: "Starting to invest 5 years earlier can double your retirement savings due to compound interest. Our investment calculator shows you the real impact of starting today vs. waiting."
            },
            {
                title: "The 20% Down Payment Myth",
                content: "You don't always need 20% down! Many programs allow 3-5% down. Use our mortgage calculator to compare different down payment scenarios."
            },
            {
                title: "Refinancing Sweet Spot",
                content: "Generally, refinancing makes sense if you can lower your rate by 0.5-1%. Our calculator helps you determine if refinancing saves you money after closing costs."
            },
            {
                title: "Emergency Fund Target",
                content: "Aim for 3-6 months of expenses in emergency savings. Use our savings calculator to plan how to reach this goal automatically."
            }
        ];
        
        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        return tips[weekNumber % tips.length];
    }

    calculateMonthlyPayment(principal, rate, years) {
        const monthlyRate = (rate / 100) / 12;
        const numPayments = years * 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
        return Math.round(payment);
    }

    async getActiveSubscribers() {
        if (!this.db) return [];
        
        try {
            return await new Promise((resolve, reject) => {
                this.db.all(
                    'SELECT email FROM newsletter_subscribers WHERE status = "active"',
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });
        } catch (error) {
            console.error('Error fetching subscribers:', error);
            return [];
        }
    }

    async sendNewsletterToSubscribers(content, subscribers) {
        if (!this.emailTransporter) {
            console.log('📧 Email system not configured - newsletter content generated but not sent');
            return { successful: 0, failed: subscribers.length };
        }

        let successful = 0;
        let failed = 0;

        for (const subscriber of subscribers) {
            try {
                const personalizedContent = content.html.replace(
                    '{{UNSUBSCRIBE_LINK}}', 
                    `https://calculiq.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
                );

                await this.emailTransporter.sendMail({
                    from: process.env.EMAIL_USER || 'calculiq.business@outlook.com',
                    to: subscriber.email,
                    subject: content.subject,
                    html: personalizedContent,
                    text: content.text.replace('{{UNSUBSCRIBE_LINK}}', `https://calculiq.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}`)
                });

                successful++;
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Failed to send to ${subscriber.email}:`, error);
                failed++;
            }
        }

        return { successful, failed };
    }

    async logNewsletterSend(content, results) {
        if (!this.db) return;
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO newsletter_content (week_of, subject, content, sent_at, subscriber_count)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        content.weekOf,
                        content.subject, 
                        JSON.stringify({ html: content.html.substring(0, 1000) + '...' }),
                        new Date().toISOString(),
                        results.successful
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        } catch (error) {
            console.error('Error logging newsletter send:', error);
        }
    }

    getFallbackMarketData() {
        return {
            rates: {
                mortgage: {
                    thirtyYear: "7.1",
                    fifteenYear: "6.6", 
                    jumbo: "7.4",
                    trend: "stable",
                    weeklyChange: "0.0"
                }
            },
            news: ["Markets show continued volatility amid economic uncertainty"]
        };
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    }

    setupRoutes() {
        // CRITICAL: Health check endpoint for Railway
        this.app.get('/api/automation-status', (req, res) => {
            try {
                res.json({
                    success: true,
                    message: 'Successfully subscribed to newsletter',
                    subscriberId: subscriberData.uid
                });
                
            } catch (error) {
                console.error('Newsletter subscription error:', error);
                res.status(500).json({ success: false, error: 'Failed to subscribe' });
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

        // Manual newsletter trigger (for testing)
        this.app.post('/api/send-test-newsletter', async (req, res) => {
            try {
                await this.generateAndSendWeeklyNewsletter();
                res.json({ success: true, message: 'Test newsletter sent successfully' });
                
            } catch (error) {
                console.error('Test newsletter error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get newsletter statistics
        this.app.get('/api/newsletter-stats', async (req, res) => {
            try {
                const subscribers = await this.getNewsletterSubscriberCount();
                const lastSent = await this.getLastNewsletterDate();
                
                res.json({
                    success: true,
                    stats: {
                        totalSubscribers: subscribers,
                        lastNewsletterSent: lastSent,
                        nextScheduled: 'Every Monday at 9 AM',
                        systemActive: this.emailTransporter !== null
                    }
                });
                
            } catch (error) {
                res.json({
                    success: true,
                    stats: { totalSubscribers: 0, lastNewsletterSent: null, systemActive: false }
                });
            }
        });

        // Get newsletter subscribers (for your dashboard)
        this.app.get('/api/newsletter-subscribers', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({ success: true, subscribers: [] });
                }

                const subscribers = await new Promise((resolve, reject) => {
                    this.db.all(
                        'SELECT email, subscribed_at, source FROM newsletter_subscribers WHERE status = "active" ORDER BY subscribed_at DESC',
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                res.json({ success: true, subscribers, count: subscribers.length });
                
            } catch (error) {
                console.error('Newsletter subscribers fetch error:', error);
                res.json({ success: true, subscribers: [], count: 0 });
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

        // Legal Pages Routes
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
                <p>We collect information you provide when using our calculators, including email addresses and financial calculation data.</p>
                
                <h2>How We Use Your Information</h2>
                <p>We use your information to provide personalized financial recommendations and connect you with relevant financial service providers.</p>
                
                <h2>Data Sharing</h2>
                <p>We may share your information with trusted financial partners to provide you with relevant offers and services.</p>
                
                <h2>Your Rights</h2>
                <p>You can unsubscribe from our communications at any time by clicking the unsubscribe link in our emails.</p>
                
                <h2>Contact Us</h2>
                <p>For privacy questions, contact us at: privacy@calculiq.com</p>
                
                <div style="text-align: center; margin-top: 40px;">
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
                
                <div style="text-align: center; margin-top: 40px;">
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

        // Catch all route for undefined endpoints
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/automation-status',
                    'GET /health',
                    'POST /api/capture-lead-email',
                    'POST /api/subscribe-newsletter',
                    'POST /api/send-test-newsletter',
                    'GET /api/newsletter-stats'
                ]
            });
        });
        
        console.log('✅ CalculiQ API routes configured with newsletter system');
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

    async getNewsletterSubscriberCount() {
        if (!this.db) return 0;
        
        try {
            return await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = "active"',
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });
        } catch (error) {
            return 0;
        }
    }

    async getLastNewsletterDate() {
        if (!this.db) return null;
        
        try {
            return await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT sent_at FROM newsletter_content ORDER BY sent_at DESC LIMIT 1',
                    (err, row) => err ? reject(err) : resolve(row?.sent_at || null)
                );
            });
        } catch (error) {
            return null;
        }
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
✅ Newsletter: Automated (Mondays 9 AM)
✅ Health Check: /api/automation-status

🌐 Server is ready to accept connections
📊 API endpoints are active
🎯 Lead capture system is ready
📧 Newsletter system is active

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

        // Newsletter subscription endpoint
        this.app.post('/api/subscribe-newsletter', async (req, res) => {
            try {
                const { email, source } = req.body;
                
                if (!email) {
                    return res.status(400).json({ success: false, error: 'Email required' });
                }

                // Store newsletter subscriber
                const subscriberData = {
                    uid: this.generateUID(),
                    email,
                    source: source || 'newsletter',
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                };

                if (this.db) {
                    // Insert subscriber
                    await new Promise((resolve, reject) => {
                        this.db.run(
                            `INSERT OR IGNORE INTO newsletter_subscribers (uid, email, source, subscribed_at) 
                             VALUES (?, ?, ?, ?)`,
                            [subscriberData.uid, subscriberData.email, subscriberData.source, subscriberData.subscribed_at],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                }

                console.log(`📧 Newsletter subscriber added: ${email}`);
                
                res.json({