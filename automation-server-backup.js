const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const CalculiQLeadCapture = require('./lead-capture-system');
const LeadSalesBridge = require('./lead-sales-bridge');
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
        this.initializeAffiliateSystem();
        this.initializeComplianceSystem();
        this.setupRoutes();
        this.startAutomationCrons();
        
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
    }

    async initializeDatabase() {
        try {
            this.db = new sqlite3.Database('./calculiq_empire.db');
            
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
                
                `CREATE TABLE IF NOT EXISTS automation_triggers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_uid TEXT NOT NULL,
                    trigger_type TEXT NOT NULL,
                    trigger_data TEXT,
                    status TEXT DEFAULT 'pending',
                    priority INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    executed_at DATETIME,
                    result TEXT
                )`,
                
                `CREATE TABLE IF NOT EXISTS email_sequences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    sequence_type TEXT NOT NULL,
                    step INTEGER NOT NULL,
                    subject TEXT,
                    content TEXT,
                    status TEXT DEFAULT 'scheduled',
                    scheduled_for DATETIME,
                    sent_at DATETIME,
                    opened_at DATETIME,
                    clicked_at DATETIME
                )`,
                
                `CREATE TABLE IF NOT EXISTS content_library (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    keywords TEXT,
                    target_audience TEXT,
                    performance_score DECIMAL(5,2) DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    published_at DATETIME,
                    status TEXT DEFAULT 'draft'
                )`,
                
                `CREATE TABLE IF NOT EXISTS affiliate_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_uid TEXT,
                    affiliate_program TEXT NOT NULL,
                    affiliate_link TEXT NOT NULL,
                    click_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    conversion_value DECIMAL(10,2) DEFAULT 0,
                    commission DECIMAL(10,2) DEFAULT 0,
                    conversion_date DATETIME,
                    status TEXT DEFAULT 'clicked'
                )`,
                
                `CREATE TABLE IF NOT EXISTS revenue_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    revenue_source TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    visitor_count INTEGER DEFAULT 0,
                    conversion_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // NEW: Affiliate campaigns table
                `CREATE TABLE IF NOT EXISTS affiliate_campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lead_uid TEXT NOT NULL,
                    campaign_type TEXT NOT NULL,
                    affiliate_links TEXT,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    clicks INTEGER DEFAULT 0,
                    conversions INTEGER DEFAULT 0,
                    revenue_generated DECIMAL(10,2) DEFAULT 0
                )`,

                // NEW: Lead buyer relationships
                `CREATE TABLE IF NOT EXISTS lead_buyers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    buyer_name TEXT NOT NULL,
                    buyer_type TEXT NOT NULL,
                    contact_email TEXT,
                    contact_phone TEXT,
                    price_per_lead DECIMAL(10,2) DEFAULT 0,
                    lead_requirements TEXT,
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                // NEW: Lead sales tracking
                `CREATE TABLE IF NOT EXISTS lead_sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lead_id INTEGER,
                    buyer_id INTEGER,
                    sale_amount DECIMAL(10,2),
                    commission DECIMAL(10,2),
                    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    payment_status TEXT DEFAULT 'pending',
                    FOREIGN KEY (lead_id) REFERENCES leads_enhanced(id),
                    FOREIGN KEY (buyer_id) REFERENCES lead_buyers(id)
                )`,

                // NEW: Compliance tables
                `CREATE TABLE IF NOT EXISTS suppression_list (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE,
                    phone TEXT,
                    reason TEXT DEFAULT 'user_request',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS consent_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lead_uid TEXT NOT NULL,
                    consent_type TEXT NOT NULL,
                    consent_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    user_agent TEXT,
                    consent_proof TEXT
                )`,
                
                `CREATE TABLE IF NOT EXISTS data_retention_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_type TEXT NOT NULL,
                    records_affected INTEGER DEFAULT 0,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    details TEXT
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
            
            // Initialize lead capture system AFTER database is ready
            this.leadCapture = new CalculiQLeadCapture(this.db);
	    this.leadSales = new LeadSalesBridge(this.db);

            
            console.log('✅ CalculiQ database initialized successfully');
            console.log('✅ Lead capture system initialized');
	    console.log('✅ Lead sales bridge initialized');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
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

    initializeAffiliateSystem() {
        this.affiliateSystem = new AffiliateBackupSystem(this.db);
        console.log('✅ Affiliate backup system initialized');
    }

    initializeComplianceSystem() {
        this.complianceSystem = new AutomatedComplianceSystem(this.db);
        console.log('✅ Automated compliance system initialized');
    }

    setupRoutes() {
        // Core tracking and automation
        this.app.get('/api/track-visitor', this.trackVisitor.bind(this));
        this.app.post('/api/trigger-automation', this.triggerAutomation.bind(this));
        this.app.post('/api/email-automation', this.startEmailSequence.bind(this));
this.app.get('/api/lead-sales-metrics', async (req, res) => {
        try {
            if (!this.leadSales) {
                return res.json({ success: true, metrics: { totalSales: 0, totalRevenue: 0, avgPrice: 0 }});
            }
            
            const metrics = await this.leadSales.getSalesMetrics();
            res.json({ success: true, metrics });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
        
        // Content generation and management
        this.app.post('/api/generate-content', this.generateAIContent.bind(this));
        this.app.get('/api/content-calendar', this.getContentCalendar.bind(this));
        this.app.post('/api/schedule-content', this.scheduleContent.bind(this));
        
        // Revenue and affiliate tracking
        this.app.post('/api/track-affiliate', this.trackAffiliateClick.bind(this));
        this.app.get('/api/revenue-metrics', this.getRevenueMetrics.bind(this));
        this.app.get('/api/affiliate-performance', this.getAffiliatePerformance.bind(this));
        
        // Dashboard and reporting
        this.app.get('/api/dashboard-data', this.getDashboardData.bind(this));
        this.app.get('/api/automation-status', this.getAutomationStatus.bind(this));
        this.app.post('/api/start-automation', this.startAutomation.bind(this));
        this.app.post('/api/pause-automation', this.pauseAutomation.bind(this));

        // Lead capture routes (delegated to lead capture system)
        if (this.leadCapture) {
            this.leadCapture.setupRoutes(this.app);
        }
if (this.leadSales) {
    this.leadSales.setupRoutes(this.app);
}
this.app.post('/api/capture-lead-email-with-sales', async (req, res) => {
    try {
        const { email, calculatorType, results, source } = req.body;
        
        // First capture the lead using existing system
        const leadData = {
            email,
            calculatorType,
            results,
            source: source || 'email_capture',
            step: 1
        };

        const captureResult = await this.leadCapture.captureLead(leadData);
        
        if (captureResult.success && this.leadSales) {
            // Try to sell the lead immediately
            try {
                const saleResult = await this.leadSales.sellLead({
                    ...leadData,
                    uid: captureResult.uid,
                    lead_score: captureResult.leadScore.totalScore,
                    phone: req.body.phone || null,
                    calculation_results: JSON.stringify(results || {})
                });
                
                if (saleResult.success) {
                    console.log(`💰 Lead sold: $${saleResult.price} to ${saleResult.buyer}`);
                }
            } catch (saleError) {
                console.log('Lead sale attempt failed:', saleError.message);
            }
        }
        
        // Return the original capture result
        res.json({
            success: true,
            message: 'Email captured successfully',
            leadScore: captureResult.leadScore,
            nextStep: 'profile_completion',
            leadSold: captureResult.success && this.leadSales ? true : false
        });
        
    } catch (error) {
        console.error('Lead capture with sales error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
        // NEW: Affiliate backup routes
        this.setupAffiliateRoutes();
        
        // NEW: Compliance routes
        this.setupComplianceRoutes();
        
        // NEW: Lead buyer management routes
        this.setupLeadBuyerRoutes();
        
        console.log('✅ CalculiQ API routes configured');
    }

    setupAffiliateRoutes() {
        // Trigger affiliate backup for specific lead
        this.app.post('/api/trigger-affiliate-backup', async (req, res) => {
            try {
                const { leadUid } = req.body;
                
                const leadData = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT * FROM leads_enhanced WHERE uid = ?',
                        [leadUid],
                        (err, row) => err ? reject(err) : resolve(row)
                    );
                });

                if (!leadData) {
                    return res.status(404).json({ success: false, error: 'Lead not found' });
                }

                await this.affiliateSystem.sendAffiliateFollowUp(leadData);
                
                res.json({ success: true, message: 'Affiliate backup triggered' });
                
            } catch (error) {
                console.error('Affiliate backup error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Setup affiliate backup system
        this.app.get('/api/setup-affiliate-backup', async (req, res) => {
            try {
                // Add affiliate_backup_sent column if it doesn't exist
                await new Promise((resolve, reject) => {
                    this.db.run(
                        'ALTER TABLE leads_enhanced ADD COLUMN affiliate_backup_sent INTEGER DEFAULT 0',
                        (err) => {
                            // Column might already exist, ignore error
                            resolve();
                        }
                    );
                });

                res.json({ success: true, message: 'Affiliate backup system ready' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get affiliate performance metrics
        this.app.get('/api/affiliate-metrics', async (req, res) => {
            try {
                const metrics = await this.affiliateSystem.getAffiliateMetrics();
                res.json({ success: true, metrics });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    setupComplianceRoutes() {
        // Automated unsubscribe endpoint
        this.app.get('/unsubscribe/:token', async (req, res) => {
            try {
                const token = req.params.token;
                const email = req.query.email;
                
                if (!this.complianceSystem.verifyUnsubscribeToken(token, email)) {
                    return res.status(400).send(`
                        <div style="max-width: 500px; margin: 50px auto; padding: 30px; text-align: center; font-family: Arial, sans-serif;">
                            <h2 style="color: #e74c3c;">❌ Invalid Unsubscribe Link</h2>
                            <p>This unsubscribe link is invalid or has expired.</p>
                            <p>Please contact us directly if you need to unsubscribe.</p>
                        </div>
                    `);
                }

                const success = await this.complianceSystem.handleOptOut(email, null, 'unsubscribe_link');
                
                if (success) {
                    res.send(`
                        <div style="max-width: 500px; margin: 50px auto; padding: 30px; text-align: center; font-family: Arial, sans-serif; border: 2px solid #27ae60; border-radius: 10px;">
                            <h2 style="color: #27ae60;">✅ Successfully Unsubscribed</h2>
                            <p>You have been removed from all CalculiQ communications.</p>
                            <p><strong>This was processed automatically and is effective immediately.</strong></p>
                            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                            <p style="font-size: 0.9em; color: #666;">
                                Email: ${email}<br>
                                Date: ${new Date().toLocaleDateString()}<br>
                                Status: Permanently removed
                            </p>
                        </div>
                    `);
                } else {
                    res.status(500).send('Error processing unsubscribe request');
                }

            } catch (error) {
                console.error('Unsubscribe error:', error);
                res.status(500).send('Error processing unsubscribe request');
            }
        });

        // Manual opt-out endpoint
        this.app.post('/api/manual-optout', async (req, res) => {
            try {
                const { email, phone, reason } = req.body;
                
                if (!email && !phone) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Email or phone required' 
                    });
                }

                const success = await this.complianceSystem.handleOptOut(email, phone, reason || 'manual_request');
                
                if (success) {
                    res.json({ 
                        success: true, 
                        message: `Opt-out processed for ${email || phone}` 
                    });
                } else {
                    res.status(500).json({ 
                        success: false, 
                        error: 'Failed to process opt-out' 
                    });
                }

            } catch (error) {
                console.error('Manual opt-out error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Compliance status dashboard
        this.app.get('/api/compliance-status', async (req, res) => {
            try {
                const suppressionCount = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT COUNT(*) as count FROM suppression_list',
                        (err, row) => err ? reject(err) : resolve(row?.count || 0)
                    );
                });

                const activeLeadsCount = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT COUNT(*) as count FROM leads_enhanced WHERE status = "new"',
                        (err, row) => err ? reject(err) : resolve(row?.count || 0)
                    );
                });

                const expiredLeadsCount = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT COUNT(*) as count FROM leads_enhanced WHERE status = "expired"',
                        (err, row) => err ? reject(err) : resolve(row?.count || 0)
                    );
                });

                const lastCleanup = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT MAX(executed_at) as last_cleanup FROM data_retention_log WHERE action_type = "daily_cleanup"',
                        (err, row) => err ? reject(err) : resolve(row?.last_cleanup)
                    );
                });

                res.json({
                    success: true,
                    compliance: {
                        suppressionListSize: suppressionCount,
                        activeLeads: activeLeadsCount,
                        expiredLeads: expiredLeadsCount,
                        lastCleanup: lastCleanup,
                        dataRetentionActive: true,
                        autoOptOutActive: true
                    }
                });

            } catch (error) {
                console.error('Compliance status error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    setupLeadBuyerRoutes() {
        // Add new lead buyer
        this.app.post('/api/lead-buyers', async (req, res) => {
            try {
                const { buyer_name, buyer_type, contact_email, contact_phone, price_per_lead, lead_requirements } = req.body;
                
                await new Promise((resolve, reject) => {
                    this.db.run(
                        `INSERT INTO lead_buyers (buyer_name, buyer_type, contact_email, contact_phone, price_per_lead, lead_requirements)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [buyer_name, buyer_type, contact_email, contact_phone, price_per_lead, JSON.stringify(lead_requirements)],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                res.json({ success: true, message: 'Lead buyer added successfully' });
                
            } catch (error) {
                console.error('Add lead buyer error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all lead buyers
        this.app.get('/api/lead-buyers', async (req, res) => {
            try {
                const buyers = await new Promise((resolve, reject) => {
                    this.db.all(
                        'SELECT * FROM lead_buyers WHERE active = 1 ORDER BY buyer_name',
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                res.json({ success: true, buyers });
                
            } catch (error) {
                console.error('Get lead buyers error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Record lead sale
        this.app.post('/api/record-lead-sale', async (req, res) => {
            try {
                const { lead_id, buyer_id, sale_amount } = req.body;
                
                // Record the sale
                await new Promise((resolve, reject) => {
                    this.db.run(
                        `INSERT INTO lead_sales (lead_id, buyer_id, sale_amount, commission)
                         VALUES (?, ?, ?, ?)`,
                        [lead_id, buyer_id, sale_amount, sale_amount * 0.95], // 95% commission rate
                        (err) => err ? reject(err) : resolve()
                    );
                });

                // Update lead status
                await new Promise((resolve, reject) => {
                    this.db.run(
                        'UPDATE leads_enhanced SET status = "sold", revenue_attributed = ? WHERE id = ?',
                        [sale_amount, lead_id],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                res.json({ success: true, message: 'Lead sale recorded successfully' });
                
            } catch (error) {
                console.error('Record lead sale error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get lead sales metrics
        this.app.get('/api/lead-sales-metrics', async (req, res) => {
            try {
                const totalSales = await new Promise((resolve, reject) => {
                    this.db.get(
                        'SELECT COUNT(*) as count, SUM(sale_amount) as revenue FROM lead_sales WHERE sale_date >= date("now", "-30 days")',
                        (err, row) => err ? reject(err) : resolve(row || { count: 0, revenue: 0 })
                    );
                });

                const topBuyers = await new Promise((resolve, reject) => {
                    this.db.all(
                        `SELECT lb.buyer_name, COUNT(ls.id) as leads_purchased, SUM(ls.sale_amount) as total_spent
                         FROM lead_sales ls
                         JOIN lead_buyers lb ON ls.buyer_id = lb.id
                         WHERE ls.sale_date >= date("now", "-30 days")
                         GROUP BY ls.buyer_id
                         ORDER BY total_spent DESC
                         LIMIT 10`,
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                res.json({
                    success: true,
                    metrics: {
                        totalLeadsSold: totalSales.count,
                        totalRevenue: totalSales.revenue || 0,
                        topBuyers
                    }
                });
                
            } catch (error) {
                console.error('Lead sales metrics error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    startAutomationCrons() {
        // Daily affiliate backup for unsold leads
        cron.schedule('0 10 * * *', async () => {
            try {
                console.log('🔄 Running affiliate backup for unsold leads...');
                
                const unsoldLeads = await new Promise((resolve, reject) => {
                    this.db.all(
                        `SELECT * FROM leads_enhanced 
                         WHERE created_at < datetime('now', '-24 hours') 
                         AND status = 'new' 
                         AND (affiliate_backup_sent IS NULL OR affiliate_backup_sent = 0)`,
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                for (const lead of unsoldLeads) {
                    await this.affiliateSystem.sendAffiliateFollowUp(lead);
                    
                    // Mark as backup sent
                    await new Promise((resolve, reject) => {
                        this.db.run(
                            'UPDATE leads_enhanced SET affiliate_backup_sent = 1 WHERE uid = ?',
                            [lead.uid],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                    
                    // Small delay to avoid overwhelming email systems
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                console.log(`✅ Affiliate backup sent to ${unsoldLeads.length} unsold leads`);
                
            } catch (error) {
                console.error('❌ Affiliate backup cron error:', error);
            }
        });

        console.log('✅ Automation cron jobs started');
    }

    // Core API Methods
    async trackVisitor(req, res) {
        try {
            const uid = req.query.uid || this.generateUID();
            const visitorData = {
                userAgent: req.headers['user-agent'],
                referrer: req.headers.referer,
                ip: req.ip,
                timestamp: new Date().toISOString()
            };

            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT OR REPLACE INTO visitors (uid, profile, last_activity) 
                     VALUES (?, ?, CURRENT_TIMESTAMP)`,
                    [uid, JSON.stringify(visitorData)],
                    (err) => err ? reject(err) : resolve()
                );
            });

            this.revenueMetrics.dailyVisitors++;
            
            const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('Content-Type', 'image/gif');
            res.send(pixel);
            
        } catch (error) {
            console.error('Visitor tracking error:', error);
            res.status(500).json({ error: 'Tracking failed' });
        }
    }

    async triggerAutomation(req, res) {
        try {
            const { interactions, interests, financialProfile, engagementScore } = req.body;
            const uid = req.headers['x-visitor-uid'] || this.generateUID();
            
            await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE visitors SET profile = ?, engagement_score = ?, last_activity = CURRENT_TIMESTAMP 
                     WHERE uid = ?`,
                    [JSON.stringify(req.body), engagementScore || 0, uid],
                    (err) => err ? reject(err) : resolve()
                );
            });

            const triggers = this.analyzeAutomationTriggers(req.body);
            
            for (const trigger of triggers) {
                await new Promise((resolve, reject) => {
                    this.db.run(
                        `INSERT INTO automation_triggers (visitor_uid, trigger_type, trigger_data, priority) 
                         VALUES (?, ?, ?, ?)`,
                        [uid, trigger.type, JSON.stringify(trigger.data), trigger.priority],
                        (err) => err ? reject(err) : resolve()
                    );
                });
            }

            res.json({ 
                success: true, 
                uid,
                triggersQueued: triggers.length,
                nextActions: await this.getNextActions(uid)
            });
            
        } catch (error) {
            console.error('Automation trigger error:', error);
            res.status(500).json({ error: 'Automation failed' });
        }
    }

    async getAutomationStatus(req, res) {
        try {
            const status = {
                serverRunning: true,
                databaseConnected: this.db !== null,
                emailSystemReady: this.emailTransporter !== null,
                leadCaptureReady: this.leadCapture !== null,
                affiliateSystemReady: this.affiliateSystem !== null,
                complianceSystemReady: this.complianceSystem !== null,
                automationActive: process.env.AUTOMATION_LIVE === 'true',
                lastUpdate: new Date().toISOString()
            };
            
            res.json({ success: true, status });
            
        } catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({ error: 'Status check failed' });
        }
    }

    async getRevenueMetrics(req, res) {
        try {
            // Get lead sales metrics
            const leadSales = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT 
                        COUNT(*) as total_sales,
                        SUM(sale_amount) as total_revenue,
                        AVG(sale_amount) as avg_sale_price
                     FROM lead_sales 
                     WHERE sale_date >= date('now', '-30 days')`,
                    (err, row) => err ? reject(err) : resolve(row || { total_sales: 0, total_revenue: 0, avg_sale_price: 0 })
                );
            });

            // Get affiliate metrics
            const affiliateRevenue = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT 
                        COUNT(*) as total_campaigns,
                        SUM(revenue_generated) as total_revenue
                     FROM affiliate_campaigns 
                     WHERE sent_at >= date('now', '-30 days')`,
                    (err, row) => err ? reject(err) : resolve(row || { total_campaigns: 0, total_revenue: 0 })
                );
            });

            // Get lead generation metrics
            const leadMetrics = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT 
                        COUNT(*) as total_leads,
                        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_leads,
                        COUNT(CASE WHEN lead_score >= 80 THEN 1 END) as hot_leads
                     FROM leads_enhanced 
                     WHERE created_at >= date('now', '-30 days')`,
                    (err, row) => err ? reject(err) : resolve(row || { total_leads: 0, sold_leads: 0, hot_leads: 0 })
                );
            });

            const totalRevenue = (leadSales.total_revenue || 0) + (affiliateRevenue.total_revenue || 0);
            const conversionRate = leadMetrics.total_leads > 0 ? 
                ((leadMetrics.sold_leads / leadMetrics.total_leads) * 100).toFixed(2) : '0.00';

            res.json({
                success: true,
                metrics: {
                    monthly: {
                        revenue: totalRevenue,
                        leadSales: leadSales.total_revenue || 0,
                        affiliateRevenue: affiliateRevenue.total_revenue || 0
                    },
                    today: {
                        visitors: this.revenueMetrics.dailyVisitors,
                        revenue: Math.round(totalRevenue / 30), // Daily average
                        conversionRate: conversionRate
                    },
                    leads: {
                        total: leadMetrics.total_leads,
                        sold: leadMetrics.sold_leads,
                        hot: leadMetrics.hot_leads,
                        avgPrice: leadSales.avg_sale_price || 0
                    }
                }
            });
            
        } catch (error) {
            console.error('Revenue metrics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async generateAIContent(req, res) {
        try {
            const { contentType, keywords, targetAudience } = req.body;
            
            // Mock content generation (replace with actual OpenAI integration if API key provided)
            const mockContent = this.generateMockContent(contentType, keywords, targetAudience);
            
            // Store in content library
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO content_library (content_type, title, content, keywords, target_audience, performance_score)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [contentType, mockContent.title, mockContent.content, keywords, targetAudience, 85],
                    (err) => err ? reject(err) : resolve()
                );
            });

            res.json({
                success: true,
                content: mockContent.content,
                title: mockContent.title,
                wordCount: mockContent.content.split(' ').length,
                seoScore: 85
            });
            
        } catch (error) {
            console.error('Content generation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    generateMockContent(contentType, keywords, targetAudience) {
        const contentTemplates = {
            blog: {
                title: `Ultimate ${keywords} Guide for ${targetAudience}`,
                content: `# ${keywords} Guide for ${targetAudience}

Are you looking to make smarter financial decisions with ${keywords}? You're in the right place.

## Why ${keywords} Matters

For ${targetAudience}, understanding ${keywords} can be the difference between financial stress and financial freedom. Our comprehensive calculator tools help you make informed decisions.

## Key Benefits:
- Accurate calculations tailored to your needs
- Personalized recommendations from verified partners
- Step-by-step guidance through complex financial decisions
- Free tools with no hidden fees

## How to Use Our ${keywords} Calculator

1. Enter your financial information
2. Review your personalized results  
3. Connect with pre-screened financial professionals
4. Make informed decisions with confidence

## Expert Tips

Smart ${targetAudience} know that the right financial tools can save thousands of dollars annually. Our calculators provide institutional-grade accuracy with consumer-friendly interfaces.

## Ready to Get Started?

Use our ${keywords} calculator today and discover how much you could save. Join thousands of satisfied users who've made smarter financial decisions with CalculiQ.

[Use Calculator Now] → Connect with verified professionals in your area.`
            },
            faq: {
                title: `Frequently Asked Questions - ${keywords}`,
                content: `# ${keywords} FAQ for ${targetAudience}

## Q: How accurate are your ${keywords} calculations?
A: Our calculators use the same formulas used by financial institutions, ensuring accuracy within 0.1% of professional tools.

## Q: Is my information secure?
A: Yes, we use bank-level encryption and never sell your personal data. You can unsubscribe anytime.

## Q: Why do you ask for my contact information?
A: We connect you with pre-screened professionals who can provide personalized rates and services. This is optional but recommended for the best experience.

## Q: How much does it cost to use the calculators?
A: All our calculators are completely free. We're compensated by our verified partners when they provide you services.

## Q: What makes CalculiQ different?
A: We combine advanced calculations with personalized matching to verified professionals, saving you time and money.`
            }
        };

        return contentTemplates[contentType] || contentTemplates.blog;
    }

    // Helper methods
    generateUID() {
        return 'cq_' + crypto.randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
    }

    analyzeAutomationTriggers(profile) {
        const triggers = [];
        
        if (profile.interactions && profile.interactions.length > 0) {
            const lastInteraction = profile.interactions[profile.interactions.length - 1];
            
            if (lastInteraction.type === 'calculation_completed') {
                triggers.push({
                    type: 'calculation_follow_up',
                    data: lastInteraction.data,
                    priority: 3
                });
            }
        }

        if (profile.engagementScore > 50) {
            triggers.push({
                type: 'high_engagement',
                data: { score: profile.engagementScore },
                priority: 2
            });
        }

        return triggers;
    }

    async getNextActions(uid) {
        // Define next actions based on user profile
        return [
            'email_sequence_financial_tips',
            'retargeting_campaign',
            'affiliate_product_recommendations'
        ];
    }

    async startEmailSequence(req, res) {
        try {
            res.json({ success: true, message: 'Email sequence disabled - using affiliate backup instead' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async trackAffiliateClick(req, res) {
        try {
            const { visitor_uid, affiliate_program, affiliate_link } = req.body;
            
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO affiliate_tracking (visitor_uid, affiliate_program, affiliate_link)
                     VALUES (?, ?, ?)`,
                    [visitor_uid, affiliate_program, affiliate_link],
                    (err) => err ? reject(err) : resolve()
                );
            });

            res.json({ success: true, message: 'Affiliate click tracked' });
            
        } catch (error) {
            console.error('Affiliate tracking error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getAffiliatePerformance(req, res) {
        try {
            const performance = await new Promise((resolve, reject) => {
                this.db.all(
                    `SELECT 
                        affiliate_program,
                        COUNT(*) as clicks,
                        SUM(conversion_value) as total_conversions,
                        AVG(commission) as avg_commission
                     FROM affiliate_tracking 
                     WHERE click_timestamp >= date('now', '-30 days')
                     GROUP BY affiliate_program
                     ORDER BY total_conversions DESC`,
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });

            res.json({ success: true, performance });
            
        } catch (error) {
            console.error('Affiliate performance error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getDashboardData(req, res) {
        try {
            const data = {
                serverStatus: 'running',
                totalLeads: await this.getTotalLeads(),
                totalRevenue: await this.getTotalRevenue(),
                systemHealth: 'good'
            };
            
            res.json({ success: true, data });
            
        } catch (error) {
            console.error('Dashboard data error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getTotalLeads() {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM leads_enhanced',
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });
            return result;
        } catch (error) {
            return 0;
        }
    }

    async getTotalRevenue() {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT SUM(sale_amount) as total FROM lead_sales',
                    (err, row) => err ? reject(err) : resolve(row?.total || 0)
                );
            });
            return result;
        } catch (error) {
            return 0;
        }
    }

    async startAutomation(req, res) {
        try {
            res.json({ success: true, message: 'Automation started' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async pauseAutomation(req, res) {
        try {
            res.json({ success: true, message: 'Automation paused' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getContentCalendar(req, res) {
        try {
            const content = await new Promise((resolve, reject) => {
                this.db.all(
                    'SELECT * FROM content_library ORDER BY created_at DESC LIMIT 20',
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });

            res.json({ success: true, content });
            
        } catch (error) {
            console.error('Content calendar error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async scheduleContent(req, res) {
        try {
            const { contentId, scheduledDate } = req.body;
            
            await new Promise((resolve, reject) => {
                this.db.run(
                    'UPDATE content_library SET published_at = ?, status = "scheduled" WHERE id = ?',
                    [scheduledDate, contentId],
                    (err) => err ? reject(err) : resolve()
                );
            });

            res.json({ success: true, message: 'Content scheduled successfully' });
            
        } catch (error) {
            console.error('Content scheduling error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    
    start(port = 3001) {
        this.app.listen(port, () => {
            console.log(`
🚀 CALCULIQ AUTOMATION SERVER RUNNING ON PORT ${port}

✅ Database: Ready with ${this.db ? 'SQLite' : 'Error'}
✅ Lead Capture: ${this.leadCapture ? 'Ready' : 'Not initialized'}
✅ Affiliate System: ${this.affiliateSystem ? 'Ready' : 'Not initialized'}
✅ Compliance System: ${this.complianceSystem ? 'Ready' : 'Not initialized'}
✅ Email: ${this.emailTransporter ? 'Ready' : 'Disabled (Direct conversions mode)'}
✅ AI: ${process.env.OPENAI_API_KEY ? 'Ready' : 'Configure OPENAI_API_KEY for enhanced content'}
✅ Cron Jobs: Running
✅ API Endpoints: Active

🌐 Access your system at: http://localhost:${port}
📊 Dashboard will be available once frontend connects
🎯 Lead capture system is ${this.leadCapture ? 'ACTIVE' : 'INACTIVE'}
💰 Affiliate backup system is ${this.affiliateSystem ? 'ACTIVE' : 'INACTIVE'}
🛡️ Compliance automation is ${this.complianceSystem ? 'ACTIVE' : 'INACTIVE'}

⚡ Your CalculiQ automated revenue empire is LIVE and processing!
            `);
        });
    }
}

// Affiliate Backup System Class
class AffiliateBackupSystem {
    constructor(database) {
        this.db = database;
        this.affiliatePrograms = {
            mortgage: [
                {
                    name: 'Rocket Mortgage',
                    url: 'https://apply.rocketmortgage.com/purchase/eligibility-questions',
                    commission: '$200-500',
                    params: '?customer_type=prospect&partner_id=calculiq&lead_id='
                },
                {
                    name: 'Better Mortgage', 
                    url: 'https://better.com/preapproval',
                    commission: '$150-400',
                    params: '?utm_source=calculiq&lead_id='
                }
            ],
            investment: [
                {
                    name: 'TD Ameritrade',
                    url: 'https://www.tdameritrade.com/open-account.html',
                    commission: '$100-600',
                    params: '?cid=calculiq&source=partner&lead='
                },
                {
                    name: 'Webull',
                    url: 'https://www.webull.com/activity',
                    commission: '$50-300',
                    params: '?inviteCode=calculiq&source=partner&lead='
                }
            ],
            loan: [
                {
                    name: 'SoFi Personal Loans',
                    url: 'https://www.sofi.com/personal-loans/',
                    commission: '$75-250',
                    params: '?utm_source=calculiq&partner=calculiq&lead_id='
                }
            ],
            insurance: [
                {
                    name: 'SelectQuote',
                    url: 'https://www.selectquote.com/life-insurance',
                    commission: '$75-300',
                    params: '?utm_source=calculiq&partner=calculiq&lead_id='
                }
            ]
        };
    }

    async sendAffiliateFollowUp(leadData) {
        const affiliateLinks = this.generateAffiliateLinks(leadData);
        const emailContent = this.generateFollowUpEmail(leadData, affiliateLinks);
        
        // In a real implementation, you'd send this email
        console.log(`📧 Affiliate follow-up prepared for ${leadData.email}`);
        
        // Track the affiliate campaign
        await this.trackAffiliateCampaign(leadData.uid, affiliateLinks);
    }

    generateAffiliateLinks(leadData) {
        const calculatorType = leadData.calculator_type;
        const programs = this.affiliatePrograms[calculatorType] || [];
        
        return programs.map(program => ({
            name: program.name,
            url: program.url + program.params + leadData.uid,
            commission: program.commission
        }));
    }

    generateFollowUpEmail(leadData, affiliateLinks) {
        return `Follow-up email with affiliate links for ${leadData.first_name || 'valued customer'}`;
    }

    async trackAffiliateCampaign(leadUid, affiliateLinks) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO affiliate_campaigns (lead_uid, campaign_type, affiliate_links)
                     VALUES (?, ?, ?)`,
                    [leadUid, 'follow_up_email', JSON.stringify(affiliateLinks)],
                    (err) => err ? reject(err) : resolve()
                );
            });
        } catch (error) {
            console.error('Affiliate tracking error:', error);
        }
    }

    async getAffiliateMetrics() {
        try {
            const metrics = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT 
                        COUNT(*) as total_campaigns,
                        SUM(clicks) as total_clicks,
                        SUM(conversions) as total_conversions,
                        SUM(revenue_generated) as total_revenue
                     FROM affiliate_campaigns 
                     WHERE sent_at >= date('now', '-30 days')`,
                    (err, row) => err ? reject(err) : resolve(row || {})
                );
            });

            return {
                totalCampaigns: metrics.total_campaigns || 0,
                totalClicks: metrics.total_clicks || 0,
                totalConversions: metrics.total_conversions || 0,
                totalRevenue: metrics.total_revenue || 0
            };
        } catch (error) {
            return { totalCampaigns: 0, totalClicks: 0, totalConversions: 0, totalRevenue: 0 };
        }
    }
}

// Automated Compliance System Class
class AutomatedComplianceSystem {
    constructor(database) {
        this.db = database;
        this.startComplianceCrons();
    }

    startComplianceCrons() {
        // Daily data cleanup at 2 AM
        cron.schedule('0 2 * * *', () => {
            this.performDailyCleanup();
        });

        console.log('✅ Compliance cron jobs started');
    }

    async performDailyCleanup() {
        try {
            console.log('🧹 Starting daily compliance cleanup...');
            
            // Delete old visitor sessions
            const deletedSessions = await new Promise((resolve, reject) => {
                this.db.run(
                    `DELETE FROM visitor_sessions 
                     WHERE created_at < datetime('now', '-48 hours') 
                     AND email IS NULL`,
                    function(err) {
                        err ? reject(err) : resolve(this.changes);
                    }
                );
            });

            // Auto-expire old leads by anonymizing personal data
            const anonymizedLeads = await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE leads_enhanced SET 
                        email = '[expired]',
                        phone = '[expired]',
                        first_name = '[expired]',
                        last_name = '[expired]',
                        status = 'expired'
                     WHERE created_at < datetime('now', '-90 days') 
                     AND status NOT IN ('converted', 'expired')`,
                    function(err) {
                        err ? reject(err) : resolve(this.changes);
                    }
                );
            });

            console.log(`✅ Daily cleanup complete: ${deletedSessions} sessions, ${anonymizedLeads} leads anonymized`);

        } catch (error) {
            console.error('❌ Daily cleanup error:', error);
        }
    }

    async handleOptOut(email, phone, reason = 'user_request') {
        try {
            // Add to suppression list
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT OR IGNORE INTO suppression_list (email, phone, reason)
                     VALUES (?, ?, ?)`,
                    [email, phone, reason],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // Update existing leads
            await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE leads_enhanced SET 
                        status = 'unsubscribed',
                        email = '[unsubscribed]',
                        phone = '[unsubscribed]'
                     WHERE (email = ? OR phone = ?) AND status != 'unsubscribed'`,
                    [email, phone],
                    (err) => err ? reject(err) : resolve()
                );
            });

            console.log(`🚫 Opt-out processed for ${email || phone}`);
            return true;

        } catch (error) {
            console.error('Opt-out processing error:', error);
            return false;
        }
    }

    generateUnsubscribeToken(email, leadUid) {
        const crypto = require('crypto');
        const data = `${email}:${leadUid}:${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substr(0, 16);
    }

    verifyUnsubscribeToken(token, email) {
        return token && token.length === 16 && /^[a-f0-9]+$/.test(token);
    }

    async logConsent(leadUid, consentType, metadata = {}) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO consent_log (lead_uid, consent_type, ip_address, user_agent, consent_proof)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        leadUid,
                        consentType,
                        metadata.ip || null,
                        metadata.userAgent || null,
                        JSON.stringify({
                            timestamp: Date.now(),
                            method: 'checkbox_opt_in',
                            page: metadata.page || 'calculator'
                        })
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        } catch (error) {
            console.error('Consent logging error:', error);
        }
    }
}

// Start the server
const server = new CalculiQAutomationServer();
server.start();

module.exports = CalculiQAutomationServer;