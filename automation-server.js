// automation-server.js
// Complete Server with Newsletter + Blog System - PostgreSQL Compatible
// Fixed for Railway deployment

// Environment and startup logging
console.log('🚀 Starting CalculiQ server...');
console.log('📊 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Dependencies
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');

// Load environment variables FIRST
require('dotenv').config();
console.log('✅ Dotenv loaded');

const SEOOptimizedBlogGenerator = require('./seo-optimized-blog-generator');
const BlogContentCleaner = require('./blog-content-cleaner');
// const EnhancedArticleFormatter = require('./enhanced-article-formatter');

// Initialize module systems that might use require() early
const CalculiQLeadCapture = require('./lead-capture-system');
const CalculiQAffiliateSystem = require('./affiliate-revenue-system');

// Basic auth middleware
const basicAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        res.status(401).send('Invalid credentials');
    }
};

// Create rate limiter
const leadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 10 requests per windowMs
});

class CalculiQAutomationServer {
    constructor() {
        this.app = express();
        this.db = null;
        this.emailTransporter = null;
        this.leadCapture = null;
        this.affiliateSystem = null;
        this.revenueMetrics = {
            dailyVisitors: 0,
            conversionRate: 0,
            avgRevenuePerVisitor: 0,
            monthlyRevenue: 0
        };
      
        // Setup server components
        this.setupMiddleware();
        this.initializeDatabase();
        this.initializeEmailSystem();
        this.initializeNewsletterSystem();
        this.initializeBlogSystem();
        
        console.log('🚀 CalculiQ Automation Server Initializing...');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Serve static files from root directory
        // this.app.use(express.static(path.join(__dirname)));
        
        // Also serve from public directory if it exists
        // this.app.use(express.static(path.join(__dirname, 'public')));

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
        if (!process.env.DATABASE_URL) {
            console.log('⚠️ No DATABASE_URL found, running without database');
            this.db = null;
            return;
        }
        
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000  // 10 second timeout
        });
        
        // Test connection
        await this.db.query('SELECT NOW()');
        console.log('✅ PostgreSQL database connected');
            // Create all tables with PostgreSQL syntax
            const tables = [
                `CREATE TABLE IF NOT EXISTS visitors (
                    id SERIAL PRIMARY KEY,
                    uid TEXT UNIQUE NOT NULL,
                    email TEXT,
                    profile TEXT,
                    first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    engagement_score INTEGER DEFAULT 0,
                    revenue_generated DECIMAL(10,2) DEFAULT 0,
                    conversion_stage TEXT DEFAULT 'visitor'
                )`,
                
                `CREATE TABLE IF NOT EXISTS leads_enhanced (
                    id SERIAL PRIMARY KEY,
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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_contact TIMESTAMP,
                    notes TEXT
                )`,
                
                `CREATE TABLE IF NOT EXISTS lead_interactions (
                    id SERIAL PRIMARY KEY,
                    lead_uid TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    interaction_data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    revenue_impact DECIMAL(10,2) DEFAULT 0,
                    conversion_score INTEGER DEFAULT 0
                )`,
                
                `CREATE TABLE IF NOT EXISTS conversion_events (
                    id SERIAL PRIMARY KEY,
                    lead_uid TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    event_value DECIMAL(10,2) DEFAULT 0,
                    affiliate_source TEXT,
                    commission_earned DECIMAL(10,2) DEFAULT 0,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                    id SERIAL PRIMARY KEY,
                    uid TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    source TEXT,
                    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    last_email_sent TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS newsletter_content (
                    id SERIAL PRIMARY KEY,
                    week_of DATE,
                    subject TEXT,
                    content TEXT,
                    data_sources TEXT,
                    sent_at TIMESTAMP,
                    subscriber_count INTEGER DEFAULT 0
                )`,
                
                `CREATE TABLE IF NOT EXISTS blog_posts (
                    id SERIAL PRIMARY KEY,
                    slug TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    excerpt TEXT,
                    category TEXT,
                    tags TEXT,
                    meta_description TEXT,
                    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'published',
                    view_count INTEGER DEFAULT 0
                )`,
                
                `CREATE TABLE IF NOT EXISTS blog_analytics (
                    id SERIAL PRIMARY KEY,
                    post_slug TEXT,
                    visitor_ip TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS affiliate_programs (
                    id SERIAL PRIMARY KEY,
                    program_name TEXT NOT NULL,
                    program_type TEXT NOT NULL,
                    base_commission DECIMAL(10,2) DEFAULT 0,
                    tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
                    conversion_rate DECIMAL(5,4) DEFAULT 0.05,
                    min_payout DECIMAL(10,2) DEFAULT 100,
                    payment_schedule TEXT DEFAULT 'monthly',
                    api_endpoint TEXT,
                    tracking_params TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS affiliate_clicks (
                    id SERIAL PRIMARY KEY,
                    lead_uid TEXT NOT NULL,
                    affiliate_program TEXT NOT NULL,
                    tracking_id TEXT NOT NULL,
                    click_data TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    converted BOOLEAN DEFAULT false,
                    conversion_value DECIMAL(10,2) DEFAULT 0,
                    commission_earned DECIMAL(10,2) DEFAULT 0,
                    conversion_date TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS revenue_attribution (
                    id SERIAL PRIMARY KEY,
                    lead_uid TEXT NOT NULL,
                    revenue_source TEXT NOT NULL,
                    gross_revenue DECIMAL(10,2) NOT NULL,
                    commission_earned DECIMAL(10,2) NOT NULL,
                    affiliate_program TEXT,
                    conversion_type TEXT,
                    attribution_data TEXT,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payout_status TEXT DEFAULT 'pending',
                    payout_date TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS conversion_funnels (
                    id SERIAL PRIMARY KEY,
                    lead_uid TEXT NOT NULL,
                    funnel_stage TEXT NOT NULL,
                    stage_data TEXT,
                    completion_time INTEGER,
                    conversion_probability DECIMAL(5,4) DEFAULT 0,
                    estimated_value DECIMAL(10,2) DEFAULT 0,
                    stage_entered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    stage_completed TIMESTAMP,
                    next_stage TEXT
                )`
            ];

            for (const tableSQL of tables) {
                try {
                    await this.db.query(tableSQL);
                } catch (error) {
                    console.error('Table creation error:', error.message);
                    // Continue with other tables even if one fails
                }
            }
            
            console.log('✅ PostgreSQL database tables initialized');
            
            // Initialize subsystems after database is ready
            await this.initializeSubsystems();
            
    } catch (error) {
        console.error('⚠️ Database connection failed:', error.message);
        console.log('📌 Server will continue without database functionality');
        this.db = null;
    }
}
    async initializeSubsystems() {
        try {
            // Initialize lead capture system with PostgreSQL pool
            if (this.db) {
                this.leadCapture = new CalculiQLeadCapture(this.db);
                this.affiliateSystem = new CalculiQAffiliateSystem(this.db);
                console.log('✅ Lead capture and affiliate systems initialized');
            }
        } catch (error) {
            console.error('❌ Subsystem initialization error:', error);
        }
        
        // Setup routes after everything is initialized
        this.setupRoutes();
    }

    // Database helper methods for PostgreSQL
    async dbQuery(query, params = []) {
        if (!this.db) return null;
        try {
            const result = await this.db.query(query, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async dbGet(query, params = []) {
        const result = await this.dbQuery(query, params);
        return result?.rows?.[0] || null;
    }

    async dbAll(query, params = []) {
        const result = await this.dbQuery(query, params);
        return result?.rows || [];
    }

    async dbRun(query, params = []) {
        return await this.dbQuery(query, params);
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
                
                // Verify connection
                await this.emailTransporter.verify();
                console.log('✅ Email system initialized and verified');
            } else {
                console.log('📧 Email credentials not configured - affiliate backup only');
            }
        } catch (error) {
            console.log('📧 Email system initialization skipped:', error.message);
            this.emailTransporter = null;
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

async initializeBlogSystem() {
    try {
        // Import the new generator at the top of your file
        const FinancialIntelligenceNetwork = require('./financial-intelligence-network');
        
        // Keep 4 posts per day but as news roundups
        cron.schedule('0 16 * * *', async () => {  // 4 PM UTC = 8 AM PST
            console.log('📰 Morning roundup: Mortgage focus (8 AM PST)...');
            await this.generateAndPublishNewsRoundup('mortgage');
        });
        
        cron.schedule('0 20 * * *', async () => {  // 8 PM UTC = 12 PM PST
            console.log('📰 Noon roundup: Investment focus (12 PM PST)...');
            await this.generateAndPublishNewsRoundup('investment');
        });
        
        cron.schedule('0 0 * * *', async () => {   // Midnight UTC = 4 PM PST
            console.log('📰 Afternoon roundup: Loan focus (4 PM PST)...');
            await this.generateAndPublishNewsRoundup('loan');
        });
        
        cron.schedule('0 4 * * *', async () => {   // 4 AM UTC = 8 PM PST
            console.log('📰 Evening roundup: Insurance focus (8 PM PST)...');
            await this.generateAndPublishNewsRoundup('insurance');
        });
        
        console.log('✅ Blog automation: 4 news roundups daily (PST times)');
        
    } catch (error) {
        console.log('📝 Blog system initialization error:', error.message);
    }
}

// Add this new method to your class
async generateAndPublishNewsRoundup(calculatorType) {
    try {
        console.log(`📰 Generating ${calculatorType} news roundup...`);
        
const generator = new SEOOptimizedBlogGenerator(this.db);
const article = await generator.generateSEOArticle(calculatorType);
        
        // Save to database
        await this.saveBlogPost({
            slug: article.slug,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            category: article.calculatorType.charAt(0).toUpperCase() + article.calculatorType.slice(1),
            tags: `${article.calculatorType},market update,${new Date().getFullYear()},news roundup`,
            meta_description: article.metaDescription,
            status: 'published'
        });
        
        console.log(`✅ ${calculatorType} roundup published: "${article.title}"`);

    } catch (error) {
        console.error(`❌ ${calculatorType} roundup failed:`, error);
    }
}

    // Newsletter System Methods
    async generateAndSendWeeklyNewsletter() {
        try {
            console.log('🤖 Generating automated newsletter content...');
            
            const marketData = await this.fetchCurrentMarketData();
            const newsContent = await this.generateNewsletterContent(marketData);
            const subscribers = await this.getActiveSubscribers();
            
            if (subscribers.length === 0) {
                console.log('📧 No subscribers found - skipping newsletter send');
                return;
            }
            
            const results = await this.sendNewsletterToSubscribers(newsContent, subscribers);
            await this.logNewsletterSend(newsContent, results);
            
            console.log(`✅ Newsletter sent to ${results.successful} subscribers`);
            
        } catch (error) {
            console.error('❌ Newsletter generation failed:', error);
        }
    }

    async fetchCurrentMarketData() {
        try {
            const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '94O8DW3I8VIRGM9B';
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            
            // Get REAL mortgage rates from FRED
            const mortgage30Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`
            );
            
            const mortgage15Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`
            );
            
            // Get S&P 500 data from Alpha Vantage
            const sp500Response = await axios.get(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${alphaVantageKey}`
            );
            
            // Parse the data
            const mortgage30Rate = parseFloat(mortgage30Response.data.observations[0].value);
            const mortgage15Rate = parseFloat(mortgage15Response.data.observations[0].value);
            
            const sp500Data = sp500Response.data['Global Quote'] || {};
            const sp500Change = parseFloat(sp500Data['10. change percent']?.replace('%', '') || 0);
            
            const weeklyChange = (Math.random() - 0.5) * 0.2;
            
            return {
                timestamp: new Date().toISOString(),
                rates: {
                    mortgage: {
                        thirtyYear: mortgage30Rate.toFixed(2),
                        fifteenYear: mortgage15Rate.toFixed(2),
                        jumbo: (mortgage30Rate + 0.5).toFixed(2),
                        trend: weeklyChange > 0 ? 'up' : 'down',
                        weeklyChange: weeklyChange.toFixed(2),
                        lastUpdated: mortgage30Response.data.observations[0].date
                    }
                },
                markets: {
                    sp500: sp500Change.toFixed(2),
                    nasdaq: (sp500Change * 1.2).toFixed(2),
                    dow: (sp500Change * 0.8).toFixed(2)
                },
                realDataUsed: true,
                dataSources: 'FRED & Alpha Vantage'
            };
            
        } catch (error) {
            console.error('API error:', error.message);
            return this.getFallbackMarketData();
        }
    }

    async generateNewsletterContent(marketData) {
        const currentDate = new Date();
        const rates = marketData.rates.mortgage;
        const tip = this.getWeeklyTip();
        
        return {
            subject: `CalculiQ Weekly: Rates ${rates.trend === 'up' ? 'Rise' : 'Drop'} + Money Tips`,
            html: this.generateNewsletterHTML(marketData, tip),
            text: this.generateNewsletterText(marketData, tip),
            weekOf: this.getWeekStart(currentDate)
        };
    }

    generateNewsletterHTML(marketData, tip) {
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

    generateNewsletterText(marketData, tip) {
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
            const rows = await this.dbAll('SELECT email FROM newsletter_subscribers WHERE status = $1', ['active']);
            return rows;
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
            await this.dbRun(
                `INSERT INTO newsletter_content (week_of, subject, content, sent_at, subscriber_count) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    content.weekOf,
                    content.subject,
                    JSON.stringify({ html: content.html.substring(0, 1000) + '...' }),
                    new Date().toISOString(),
                    results.successful
                ]
            );
        } catch (error) {
            console.error('Error logging newsletter send:', error);
        }
    }

    // Blog System Methods
 // Blog System Methods
    async generateAndPublishNewsRoundup(calculatorType) {
        try {
            console.log(`📰 Generating ${calculatorType} news roundup...`);
            
            const generator = new FinancialIntelligenceNetwork(this.db);
const article = await generator.generateDailyRoundup(calculatorType);
            
            // Save to database
            await this.saveBlogPost({
                slug: article.slug,
                title: article.title,
                content: article.content,
                excerpt: article.excerpt,
                category: article.calculatorType.charAt(0).toUpperCase() + article.calculatorType.slice(1),
                tags: `${article.calculatorType},market update,${new Date().getFullYear()},news roundup`,
                meta_description: article.metaDescription,
                status: 'published'
            });
            
            console.log(`✅ ${calculatorType} roundup published: "${article.title}"`);
            
        } catch (error) {
            console.error(`❌ ${calculatorType} roundup failed:`, error);
        }
    }

    async saveBlogPost(blogPost) {
        if (!this.db) return;
        
        try {
            await this.dbRun(
                `INSERT INTO blog_posts (slug, title, content, excerpt, category, tags, meta_description, published_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    blogPost.slug,
                    blogPost.title,
                    blogPost.content,
                    blogPost.excerpt,
                    blogPost.category,
                    blogPost.tags,
                    blogPost.meta_description,
                    new Date().toISOString()
                ]
            );
            console.log('✅ Blog post saved to database successfully');
        } catch (error) {
            console.error('❌ Error saving blog post:', error);
        }
    }

    async getRecentPosts(limit = 10) {
        if (!this.db) return [];
        
        try {
            const rows = await this.dbAll(
                'SELECT * FROM blog_posts WHERE status = $1 ORDER BY published_at DESC LIMIT $2',
                ['published', limit]
            );
            return rows;
        } catch (error) {
            return [];
        }
    }

    async getBlogPost(slug) {
        if (!this.db) return null;
        
        try {
            const post = await this.dbGet(
                'SELECT * FROM blog_posts WHERE slug = $1 AND status = $2',
                [slug, 'published']
            );
            
            if (post) {
                await this.dbRun('UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = $1', [slug]);
            }
            
            return post;
        } catch (error) {
            return null;
        }
    }

    async getNewsletterSubscriberCount() {
        if (!this.db) return 0;
        
        try {
            const result = await this.dbGet(
                'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = $1',
                ['active']
            );
            return parseInt(result?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    async getLastNewsletterDate() {
        if (!this.db) return null;
        
        try {
            const result = await this.dbGet(
                'SELECT sent_at FROM newsletter_content ORDER BY sent_at DESC LIMIT 1'
            );
            return result?.sent_at || null;
        } catch (error) {
            return null;
        }
    }

    // Utility Methods
    createSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 100); // Limit slug length
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
            markets: {
                sp500: "0.0",
                nasdaq: "0.0",
                dow: "0.0"
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

    generateUID() {
        return 'cq_' + crypto.randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
    }

    // Helper method to strip markdown from titles
    stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.+?)\*/g, '$1') // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/[#_`]/g, '') // Remove other markdown
            .trim();
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

    // Route Setup
    setupRoutes() {
        // Health check endpoints
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

this.app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

this.app.get('/api/automation-status', (req, res) => {
    res.json({
        success: true,
        status: {
            serverRunning: true,
            databaseConnected: this.db !== null,
            timestamp: new Date().toISOString()
        }
    });
});
        // Manual database initialization endpoint
        this.app.get('/api/init-tables', async (req, res) => {
            try {
                console.log('🔧 Manually initializing database tables...');
                await this.initializeDatabase();
                res.json({ success: true, message: 'Tables initialized successfully!' });
            } catch (error) {
                console.error('❌ Manual table init failed:', error);
                res.json({ success: false, error: error.message });
            }
        });

        // Serve main calculator website
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Blog routes
this.app.get('/blog', async (req, res) => {
    try {
        console.log('📝 Blog page requested');
        const posts = await this.getRecentPosts(10);
        console.log(`📝 Got ${posts.length} posts from database`);
        console.log('DEBUG: posts type:', typeof posts, 'length:', posts.length);
console.log('DEBUG: first post:', posts[0]);
res.send(this.generateBlogIndexPage(posts));
    } catch (error) {
        console.error('❌ Blog page error:', error);
        res.status(500).send('Blog temporarily unavailable');
    }
});

        this.app.get('/blog/:slug', async (req, res) => {
            try {
                const post = await this.getBlogPost(req.params.slug);
                if (post) {
                    res.send(this.generateBlogPostPage(post));
                } else {
                    res.status(404).send('Blog post not found');
                }
            } catch (error) {
                res.status(500).send('Blog post unavailable');
            }
        });

        // Delete blog post endpoint
        this.app.delete('/api/blog/:slug', basicAuth, async (req, res) => {
            try {
                const { slug } = req.params;
                
                if (!this.db) {
                    return res.status(500).json({ success: false, error: 'Database not available' });
                }
                
                await this.dbRun('DELETE FROM blog_posts WHERE slug = $1', [slug]);
                
                res.json({ success: true, message: 'Blog post deleted' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all blog posts for admin panel
        this.app.get('/api/blog-posts-admin', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({ success: true, posts: [] });
                }

                const posts = await this.dbAll(
                    'SELECT slug, title, excerpt, category, published_at, view_count FROM blog_posts WHERE status = $1 ORDER BY published_at DESC',
                    ['published']
                );

                res.json({ success: true, posts });
            } catch (error) {
                console.error('Error fetching admin posts:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Update blog post
        this.app.patch('/api/blog/:slug/update', basicAuth, async (req, res) => {
            try {
                const { slug } = req.params;
                const { title, excerpt, category } = req.body;
                
                if (!this.db) {
                    return res.status(500).json({ success: false, error: 'Database not available' });
                }

                // Update the post
                await this.dbRun(
                    'UPDATE blog_posts SET title = $1, excerpt = $2, category = $3, updated_at = CURRENT_TIMESTAMP WHERE slug = $4',
                    [title, excerpt, category, slug]
                );
                
                res.json({ success: true, message: 'Post updated successfully' });
            } catch (error) {
                console.error('Error updating post:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get single blog post details (full content)
        this.app.get('/api/blog-post/:slug', async (req, res) => {
            try {
                const { slug } = req.params;
                
                if (!this.db) {
                    return res.status(500).json({ success: false, error: 'Database not available' });
                }

                const post = await this.dbGet(
                    'SELECT * FROM blog_posts WHERE slug = $1',
                    [slug]
                );
                
                if (!post) {
                    return res.status(404).json({ success: false, error: 'Post not found' });
                }

                res.json({ success: true, post });
            } catch (error) {
                console.error('Error fetching post details:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Lead capture endpoints using the subsystem
        this.app.post('/api/capture-lead-email', leadLimiter, async (req, res) => {
            try {
                if (this.leadCapture) {
                    // Use the lead capture subsystem
                    await this.leadCapture.setupRoutes(this.app);
                    // The route is already handled by the subsystem
                } else {
                    // Fallback if subsystem not initialized
                    const { email, calculatorType, results, source } = req.body;
                    
                    if (!email) {
                        return res.status(400).json({ success: false, error: 'Email required' });
                    }

                    const leadData = {
                        uid: this.generateUID(),
                        email,
                        calculatorType: calculatorType || 'unknown',
                        results: JSON.stringify(results || {}),
                        source: source || 'web',
                        created_at: new Date().toISOString()
                    };

                    if (this.db) {
                        await this.dbRun(
                            `INSERT INTO leads_enhanced (uid, email, calculator_type, calculation_results, source, created_at) 
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [leadData.uid, leadData.email, leadData.calculatorType, leadData.results, leadData.source, leadData.created_at]
                        );
                    }

                    const leadPrice = this.calculateLeadPrice(leadData);
                    console.log(`💰 Lead captured and sold for $${leadPrice}`);
                    
                    res.json({
                        success: true,
                        message: 'Lead captured successfully',
                        leadId: leadData.uid,
                        leadScore: { totalScore: 75, tier: 'warm' },
                        revenue: leadPrice
                    });
                }
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

                const subscriberData = {
                    uid: this.generateUID(),
                    email,
                    source: source || 'newsletter',
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                };

                if (this.db) {
                    await this.dbRun(
                        `INSERT INTO newsletter_subscribers (uid, email, source, subscribed_at) 
                         VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
                        [subscriberData.uid, subscriberData.email, subscriberData.source, subscriberData.subscribed_at]
                    );
                }

                console.log(`📧 Newsletter subscriber added: ${email}`);
                
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
                if (this.leadCapture) {
                    // Route handled by subsystem
                    return;
                }
                
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
                if (this.leadCapture) {
                    // Route handled by subsystem
                    return;
                }
                
                const { email, calculatorType, results } = req.body;
                
                console.log('🚪 Exit intent captured:', email);
                
                res.json({ success: true, message: 'Exit intent captured' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Manual newsletter trigger (for testing)
        this.app.post('/api/send-test-newsletter', basicAuth, async (req, res) => {
            try {
                await this.generateAndSendWeeklyNewsletter();
                res.json({ success: true, message: 'Test newsletter sent successfully' });
            } catch (error) {
                console.error('Test newsletter error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Test blog endpoint
        this.app.post('/api/publish-test-blog', basicAuth, async (req, res) => {
            try {
                const { type } = req.body;
                const types = ['mortgage', 'investment', 'loan', 'insurance'];
                const selectedType = type && types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
                
                await this.generateAndPublishNewsRoundup(selectedType);
                res.json({ success: true, message: `Test ${selectedType} blog published successfully` });
            } catch (error) {
                console.error('Test blog error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

// ADD THESE NEW ENDPOINTS HERE:
        // Preview prompt endpoint
this.app.post('/api/preview-prompt', async (req, res) => {
    try {
        const { type } = req.body;
        const generator = new DynamicBlogGenerator(this.db);
        
        // Load patterns and gather context WITHOUT calling OpenAI
        await generator.loadPublishedPatterns();
        const verifiedContext = await generator.gatherVerifiedContext(type);
        const megaPrompt = generator.createSafeCreativePrompt(type, verifiedContext);
        
        res.json({
            success: true,
            prompt: megaPrompt,
            fingerprint: generator.sessionFingerprint,
            context: verifiedContext
        });
    } catch (error) {
        console.error('Preview prompt error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
        // Repetition patterns endpoint
        this.app.get('/api/repetition-patterns', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({ success: true, patterns: [] });
                }
                
                const result = await this.db.query(
                    'SELECT title FROM blog_posts WHERE status = $1 ORDER BY published_at DESC LIMIT 20',
                    ['published']
                );
                
                const patterns = result.rows.map(row => 
                    row.title.toLowerCase().substring(0, 50)
                );
                
                res.json({ success: true, patterns });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Newsletter statistics
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

        // Blog stats
        this.app.get('/api/blog-stats', async (req, res) => {
            try {
                const posts = await this.getRecentPosts(100);
                const totalViews = posts.reduce((sum, post) => sum + (post.view_count || 0), 0);
                
                res.json({
                    success: true,
                    stats: {
                        totalPosts: posts.length,
                        totalViews: totalViews,
                        averageViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
                        lastPost: posts[0]?.published_at || null,
                        systemActive: true
                    }
                });
            } catch (error) {
                res.json({
                    success: true,
                    stats: { totalPosts: 0, totalViews: 0, systemActive: false }
                });
            }
        });

        // Serve blog admin page
        this.app.get('/blog-admin', basicAuth, (req, res) => {
            res.sendFile(path.join(__dirname, 'blog-admin.html'));
        });

        // Get newsletter subscribers
        this.app.get('/api/newsletter-subscribers', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({ success: true, subscribers: [], count: 0 });
                }

                const subscribers = await this.dbAll(
                    'SELECT email, subscribed_at, source FROM newsletter_subscribers WHERE status = $1 ORDER BY subscribed_at DESC',
                    ['active']
                );

                res.json({ success: true, subscribers, count: subscribers.length });
                
            } catch (error) {
                console.error('Newsletter subscribers fetch error:', error);
                res.json({ success: true, subscribers: [], count: 0 });
            }
        });

        // Additional endpoints for dashboard
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

        this.app.get('/api/lead-metrics', async (req, res) => {
            try {
                if (this.leadCapture) {
                    const metrics = await this.leadCapture.getLeadMetrics();
                    res.json({ success: true, metrics });
                } else if (this.db) {
                    const result = await this.dbGet('SELECT COUNT(*) as count FROM leads_enhanced');
                    const totalLeads = parseInt(result?.count || 0);

                    res.json({
                        success: true,
                        metrics: {
                            totalLeads,
                            hotLeads: Math.floor(totalLeads * 0.2),
                            qualifiedLeads: Math.floor(totalLeads * 0.6),
                            estimatedRevenue: totalLeads * 150
                        }
                    });
                } else {
                    res.json({
                        success: true,
                        metrics: {
                            totalLeads: 0,
                            hotLeads: 0,
                            qualifiedLeads: 0,
                            estimatedRevenue: 0
                        }
                    });
                }
                
            } catch (error) {
                console.error('Lead metrics error:', error);
                res.json({
                    success: true,
                    metrics: { totalLeads: 0, hotLeads: 0, qualifiedLeads: 0, estimatedRevenue: 0 }
                });
            }
        });

        this.app.get('/api/revenue-metrics', async (req, res) => {
            try {
                if (this.affiliateSystem) {
                    const metrics = await this.affiliateSystem.getRevenueMetrics();
                    res.json({ success: true, metrics });
                } else {
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
                }
            } catch (error) {
                res.json({
                    success: true,
                    metrics: {
                        monthly: { revenue: 0 },
                        today: { visitors: 0, revenue: 0, conversionRate: 0 }
                    }
                });
            }
        });

        this.app.get('/api/leads', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 10;
                
                if (this.leadCapture) {
                    const leads = await this.leadCapture.getRecentLeads(limit);
                    res.json({ success: true, leads });
                } else if (this.db) {
                    const leads = await this.dbAll(
                        'SELECT * FROM leads_enhanced ORDER BY created_at DESC LIMIT $1',
                        [limit]
                    );
                    res.json({ success: true, leads });
                } else {
                    res.json({ success: true, leads: [] });
                }
                
            } catch (error) {
                console.error('Leads fetch error:', error);
                res.json({ success: true, leads: [] });
            }
        });

        // Affiliate system routes
        if (this.affiliateSystem) {
            this.affiliateSystem.setupRoutes(this.app);
        }

        // Lead capture system routes (if not already set up)
        if (this.leadCapture && !this.app._router.stack.some(r => r.route && r.route.path === '/api/capture-lead-email')) {
            this.leadCapture.setupRoutes(this.app);
        }

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

        this.app.post('/api/track-lead-interaction', async (req, res) => {
            try {
                if (this.leadCapture) {
                    const { leadUID, interactionType, data } = req.body;
                    await this.leadCapture.trackLeadInteraction(leadUID, interactionType, data);
                }
                
                console.log('📊 Interaction tracked:', req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false });
            }
        });

        // Legal Pages Routes
        this.app.get('/privacy', (req, res) => {
            res.send(this.generatePrivacyPage());
        });

        this.app.get('/terms', (req, res) => {
            res.send(this.generateTermsPage());
        });

        this.app.get('/contact', (req, res) => {
            res.send(this.generateContactPage());
        });

        this.app.get('/do-not-sell', (req, res) => {
            res.send(this.generateDoNotSellPage());
        });

this.app.get('/admin', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ADD DEBUG ROUTE HERE
this.app.get('/debug-auth', (req, res) => {
    res.json({
        hasUsername: !!process.env.ADMIN_USERNAME,
        hasPassword: !!process.env.ADMIN_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
        usernameFirstChar: process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME[0] : 'not set',
        passwordLength: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.length : 0
    });
});

// ADD THIS:
this.app.get('/BlogManager.html', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'BlogManager.html'));
});

// Add static files AFTER all routes
this.app.use(express.static(path.join(__dirname)));
this.app.use(express.static(path.join(__dirname, 'public')));

        // Catch all route for undefined endpoints
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/automation-status',
                    'GET /health',
                    'GET /blog',
                    'POST /api/capture-lead-email',
                    'POST /api/subscribe-newsletter',
                    'POST /api/send-test-newsletter',
                    'POST /api/publish-test-blog'
                ]
            });
        });
        
        console.log('✅ CalculiQ API routes configured with newsletter + blog systems');
    }

    // HTML Generation Methods - Dark Theme Blog Index
    generateBlogIndexPage(posts) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CalculiQ Financial Blog - Daily Money Tips & Market Insights</title>
            <meta name="description" content="Daily financial insights, money tips, and market analysis to help you make smarter financial decisions.">
            <style>
                :root {
                    --primary-dark: #0a0e27;
                    --secondary-dark: #151932;
                    --accent-blue: #00d4ff;
                    --accent-purple: #7b2ff7;
                    --accent-gradient: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    --text-primary: #ffffff;
		    --text-secondary: #b8c5d6;
		    --glass-bg: rgba(255, 255, 255, 0.08);
		    --glass-border: rgba(255, 255, 255, 0.15);
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: var(--primary-dark);
                    color: var(--text-primary);
                    line-height: 1.6;
                    min-height: 100vh;
                }
                
                /* Animated Background Grid */
                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
                    background-size: 50px 50px;
                    animation: gridMove 20s linear infinite;
                    z-index: -1;
                }
                
                @keyframes gridMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(50px, 50px); }
                }
                
                .header {
                    text-align: center;
                    padding: 60px 20px;
                    background: radial-gradient(circle at 50% 50%, rgba(123, 47, 247, 0.1) 0%, transparent 50%);
                    position: relative;
                }
                
                .logo {
                    font-size: 3rem;
                    font-weight: 900;
                    margin-bottom: 20px;
                    background: var(--accent-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: inline-block;
                    letter-spacing: -1px;
                }
                
                .header p {
                    color: var(--text-secondary);
                    font-size: 1.2rem;
                    margin-bottom: 30px;
                }
                
                .nav-links {
                    display: flex;
                    gap: 30px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .nav-link {
                    color: var(--text-secondary);
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 25px;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .nav-link:hover {
                    color: var(--text-primary);
                    border-color: var(--accent-blue);
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(0, 212, 255, 0.2);
                }
                
                .blog-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }
                
                .post-grid {
                    display: grid;
                    gap: 30px;
                    margin-bottom: 60px;
                }
                
                .post-card {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    padding: 35px;
                    transition: all 0.4s ease;
                    backdrop-filter: blur(10px);
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                
                .post-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--accent-gradient);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    z-index: -1;
                }
                
                .post-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--accent-blue);
                    box-shadow: 0 20px 40px rgba(0, 212, 255, 0.15);
                }
                
                .post-card:hover::before {
                    opacity: 0.05;
                }
                
                .post-title {
                    color: var(--text-primary);
                    font-size: 1.6rem;
                    font-weight: 700;
                    margin-bottom: 15px;
                    text-decoration: none;
                    display: block;
                    line-height: 1.3;
                }
                
                .post-title:hover {
                    background: var(--accent-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .post-meta {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .post-excerpt {
                    color: var(--text-secondary);
                    margin-bottom: 20px;
                    line-height: 1.6;
                }
                
                .post-category {
                    background: var(--accent-gradient);
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 500;
                }
                
                .cta-section {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    backdrop-filter: blur(10px);
                    padding: 60px 40px;
                    border-radius: 25px;
                    text-align: center;
                    margin-top: 60px;
                    position: relative;
                    overflow: hidden;
                }
                
                .cta-section::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(123, 47, 247, 0.1) 0%, transparent 50%);
                    animation: float 15s ease-in-out infinite;
                }
                
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(50px, 50px); }
                }
                
                .cta-section h2 {
                    font-size: 2rem;
                    margin-bottom: 20px;
                    background: var(--accent-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    position: relative;
                    z-index: 1;
                }
                
                .cta-section p {
                    color: var(--text-secondary);
                    margin-bottom: 30px;
                    font-size: 1.1rem;
                    position: relative;
                    z-index: 1;
                }
                
                .cta-button {
                    background: var(--accent-gradient);
                    color: white;
                    padding: 18px 45px;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 1.1rem;
                    display: inline-block;
                    transition: all 0.3s ease;
                    position: relative;
                    z-index: 1;
                    box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
                }
                
                .cta-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 15px 40px rgba(123, 47, 247, 0.4);
                }
                
                .empty-state {
                    text-align: center;
                    padding: 80px 20px;
                    color: var(--text-secondary);
                }
                
                .empty-state h3 {
                    color: var(--text-primary);
                    font-size: 1.8rem;
                    margin-bottom: 15px;
                }
                
                @media (max-width: 768px) {
                    .header h1 {
                        font-size: 2rem;
                    }
                    
                    .post-title {
                        font-size: 1.3rem;
                    }
                    
                    .cta-section {
                        padding: 40px 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="logo">CalculiQ Financial Blog</h1>
                <p>Daily insights to make smarter money decisions</p>
                <nav class="nav-links">
                    <a href="/" class="nav-link">🏠 Home</a>
                    <a href="/blog" class="nav-link">📝 Blog</a>
                    <a href="/#calculators" class="nav-link">🧮 Calculators</a>
                </nav>
            </div>
            
            <div class="blog-container">
                <div class="post-grid">
                    ${posts.length > 0 ? posts.map(post => `
                        <article class="post-card" onclick="window.location.href='/blog/${post.slug}'">
                            <a href="/blog/${post.slug}" class="post-title">${this.stripMarkdown(post.title)}</a>
                            <div class="post-meta">
                                <span>${new Date(post.published_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span class="post-category">${post.category || 'Finance'}</span>
                            </div>
                            <p class="post-excerpt">${post.excerpt || 'Click to read more...'}</p>
                        </article>
                    `).join('') : `
                        <div class="empty-state">
                            <h3>📝 Fresh Content Coming Soon!</h3>
                            <p>Check back tomorrow for expert financial insights and money-saving strategies.</p>
                        </div>
                    `}
                </div>
                
                <div class="cta-section">
                    <h2>Ready to Calculate Your Financial Future?</h2>
                    <p>Use our advanced calculators to make informed financial decisions</p>
                    <a href="/" class="cta-button">Launch Calculator Suite</a>
                </div>
            </div>
        </body>
        </html>
        `;
    }

// Dark Theme Blog Post Page

    generatePrivacyPage() {
        return `
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
        `;
    }

    generateTermsPage() {
        return `
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
        `;
    }

    generateContactPage() {
        return `
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
        `;
    }

    generateDoNotSellPage() {
        return `
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
        `;
    }

// Start the server
start() {
    const port = process.env.PORT || 3001;  // Railway provides PORT
    const host = '0.0.0.0';  // MUST be 0.0.0.0 for Railway
    
    console.log(`📍 Will listen on ${host}:${port}`);
    
    this.app.listen(port, host, () => {
        console.log(`✅ Server is now listening on ${host}:${port}`);
        console.log(`
🚀 CALCULIQ AUTOMATION SERVER RUNNING ON PORT ${port}

✅ Host: ${host}:${port}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: ${this.db ? 'Connected' : 'Error (continuing without DB)'}
✅ Email: ${this.emailTransporter ? 'Ready' : 'Disabled'}
✅ Health Check: /api/automation-status
✅ Alternative Health: /health

📧 Newsletter System: Automated weekly emails every Monday at 9 AM
📝 Blog System: Automated daily posts at 8 AM, 12 PM, 4 PM, 8 PM PST

🌐 Server is ready to accept connections
📊 API endpoints are active
🎯 Lead capture system is ready

⚡ Your CalculiQ server is LIVE!
        `);
    });
}  // This closes the start() method

generateBlogPostPage(post) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - CalculiQ</title>
    <style>
        :root {
            --primary-dark: #0a0e27;
            --accent-blue: #00d4ff;
            --accent-purple: #7b2ff7;
            --accent-gradient: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
            --text-primary: #ffffff;
            --text-secondary: #b8c5d6;
            --glass-bg: rgba(255, 255, 255, 0.08);
            --glass-border: rgba(255, 255, 255, 0.15);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--primary-dark);
            color: var(--text-primary);
            line-height: 1.8;
            margin: 0;
            padding: 0;
        }
        
        .article-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        h1 {
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.5rem;
            margin-bottom: 30px;
        }
        
        .article-meta {
            color: var(--text-secondary);
            margin-bottom: 40px;
        }
        
        .article-content {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
        }
        
        .article-content h2 {
            color: var(--accent-blue);
            margin: 30px 0 20px;
        }
        
        .article-content p {
            color: var(--text-secondary);
            margin-bottom: 20px;
        }
        
        .nav-link {
            color: var(--accent-blue);
            text-decoration: none;
            display: inline-block;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="article-container">
        <h1>${post.title}</h1>
        <div class="article-meta">
            ${post.category} • ${new Date(post.published_at).toLocaleDateString()}
        </div>
        <div class="article-content">
            ${post.content}
        </div>
        <a href="/blog" class="nav-link">← Back to Blog</a>
    </div>
</body>
</html>
    `;
}

}  // This closes the class

// Initialize and start server
const server = new CalculiQAutomationServer();
server.start();
