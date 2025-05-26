// automation-server.js
// Complete Server with Newsletter + Blog System - PostgreSQL Compatible
// Updated with Dark Theme and Title Generation Fixes

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
const DynamicBlogGenerator = require('./dynamic-blog-generator');
const BlogContentCleaner = require('./blog-content-cleaner');

require('dotenv').config();

console.log('✅ Dotenv loaded');

javascriptrequire('dotenv').config();

console.log('✅ Dotenv loaded');

// Basic auth middleware - ADD HERE (around line 29)
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
        
        // Initialize OpenAI if available
        this.initializeOpenAI();
        
        // Setup server components
        this.setupMiddleware();
        this.initializeDatabase();
        this.initializeEmailSystem();
        this.initializeNewsletterSystem();
        this.initializeBlogSystem();
        this.setupRoutes();
        
        console.log('🚀 CalculiQ Automation Server Initializing...');
    }

    initializeOpenAI() {
        if (process.env.OPENAI_API_KEY) {
            try {
                const { OpenAI } = require('openai');
                this.openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
                console.log('✅ OpenAI initialized for unique content generation');
            } catch (error) {
                console.log('📝 OpenAI initialization failed:', error.message);
                this.openai = null;
            }
        } else {
            console.log('📝 OpenAI not configured - using template system');
            this.openai = null;
        }
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Serve static files from root directory
        this.app.use(express.static(path.join(__dirname)));
        
        // Also serve from public directory if it exists
        this.app.use(express.static(path.join(__dirname, 'public')));

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
            // Use DATABASE_URL from Railway
            this.db = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            
            // Test connection
            await this.db.query('SELECT NOW()');
            
            // Create all tables
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
                )`
            ];

            for (const tableSQL of tables) {
                await this.db.query(tableSQL);
            }
            
            console.log('✅ PostgreSQL database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.db = null;
        }
    }

    // Database helper methods
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

    async initializeBlogSystem() {
        try {
            // PST Schedule (UTC - 8 hours, or UTC - 7 during daylight saving)
            cron.schedule('0 16 * * *', async () => {  // 4 PM UTC = 8 AM PST
                console.log('📝 Morning blog: Mortgage focus (8 AM PST)...');
                await this.generateAndPublishTopicalBlog('mortgage');
            });
            
            cron.schedule('0 20 * * *', async () => {  // 8 PM UTC = 12 PM PST
                console.log('📝 Noon blog: Investment focus (12 PM PST)...');
                await this.generateAndPublishTopicalBlog('investment');
            });
            
            cron.schedule('0 0 * * *', async () => {   // Midnight UTC = 4 PM PST
                console.log('📝 Afternoon blog: Loan focus (4 PM PST)...');
                await this.generateAndPublishTopicalBlog('loan');
            });
            
            cron.schedule('0 4 * * *', async () => {   // 4 AM UTC = 8 PM PST
                console.log('📝 Evening blog: Insurance focus (8 PM PST)...');
                await this.generateAndPublishTopicalBlog('insurance');
            });
            
            console.log('✅ Blog automation: 4 calculator-focused posts daily (PST times)');
        } catch (error) {
            console.log('📝 Blog system initialization skipped:', error.message);
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
async generateAndPublishTopicalBlog(calculatorType) {
    try {
        console.log(`📝 Generating ${calculatorType} blog with dynamic generator...`);
        
        // Always use your dynamic generator (it's better than AI)
        const generator = new DynamicBlogGenerator();
        const cleaner = new BlogContentCleaner();
        
        // Generate article
        let article = await generator.generateArticle(calculatorType);
        
        // Clean any formatting issues
        article = cleaner.cleanBlogPost(article);
        
        // Save to database
        await this.saveBlogPost({
            slug: article.slug,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            category: article.calculatorType.charAt(0).toUpperCase() + article.calculatorType.slice(1),
            tags: `${article.calculatorType},calculator,${new Date().getFullYear()},financial calculator`,
            meta_description: article.metaDescription || article.excerpt,
            status: 'published'
        });
        
        console.log(`✅ ${calculatorType} blog published: "${article.title}"`);
        
    } catch (error) {
        console.error(`❌ ${calculatorType} blog generation failed:`, error);
    }
}

    async generateOpenAIBlog(calculatorType, marketData) {
        // Get variety in prompts based on date/time
        const dayOfWeek = new Date().getDay();
        const weekOfMonth = Math.floor(new Date().getDate() / 7);
        const hour = new Date().getHours();
        const varietyIndex = (dayOfWeek + weekOfMonth + hour) % 15;
        
        const titlePatterns = [
            {
                prefix: "How to",
                examples: ["How to Save Thousands", "How to Get Better Rates", "How to Choose the Right"]
            },
            {
                prefix: "The",
                examples: ["The Smart Buyer's Guide", "The Hidden Truth About", "The Complete Playbook"]
            },
            {
                prefix: "Why",
                examples: ["Why Smart Buyers Choose", "Why Now Is the Time", "Why Rates Matter More Than Ever"]
            },
            {
                prefix: "5/7/10",
                examples: ["5 Proven Strategies", "7 Insider Secrets", "10 Must-Know Tips"]
            },
            {
                prefix: "What",
                examples: ["What You Need to Know", "What Experts Recommend", "What Changes Mean for You"]
            },
            {
                prefix: "Is",
                examples: ["Is This the Right Time?", "Is Your Strategy Working?", "Is There a Better Way?"]
            },
            {
                prefix: "From X to Y",
                examples: ["From Application to Approval", "From Planning to Profit", "From Confusion to Clarity"]
            },
            {
                prefix: "Breaking Down",
                examples: ["Breaking Down the Numbers", "Breaking Down Complex Terms", "Breaking Down the Process"]
            },
            {
                prefix: "When",
                examples: ["When to Refinance", "When to Start Investing", "When Coverage Matters Most"]
            },
            {
                prefix: "Should You",
                examples: ["Should You Refinance Now?", "Should You Pay Points?", "Should You Consolidate?"]
            },
            {
                prefix: "A Guide to",
                examples: ["A Guide to Lower Rates", "A Guide to Smart Investing", "A Guide to Coverage"]
            },
            {
                prefix: "Everything About",
                examples: ["Everything About Rate Locks", "Everything About Dollar-Cost Averaging", "Everything About Term Life"]
            },
            {
                prefix: "Strategies for",
                examples: ["Strategies for First-Time Buyers", "Strategies for Market Volatility", "Strategies for Lower Premiums"]
            },
            {
                prefix: "Tips for",
                examples: ["Tips for Better Rates", "Tips for Growing Wealth", "Tips for Maximum Coverage"]
            },
            {
                prefix: "Understanding",
                examples: ["Understanding Rate Changes", "Understanding Market Cycles", "Understanding Policy Types"]
            }
        ];

        const selectedPattern = titlePatterns[varietyIndex];
        
        const prompts = {
            mortgage: `Write a comprehensive 1,500+ word blog post about home buying and mortgage strategies for ${new Date().toLocaleDateString()}.
Include: Current 30-year rate at ${marketData.rates.mortgage.thirtyYear}%, 15-year at ${marketData.rates.mortgage.fifteenYear}%.

CRITICAL TITLE REQUIREMENTS:
- Start with "${selectedPattern.prefix}" pattern
- Examples: ${selectedPattern.examples.join(', ')}
- Be specific and benefit-focused
- Include numbers when relevant (e.g., "How to Save $50,000 on Your Mortgage")
- Make it timely but not always date-specific
- NEVER use: Unlock, Unlocking, Master, Mastering, Navigate, Navigating, Ultimate, Complete Guide, Your Guide to, Your Path to, Your Financial

Article focus based on variety index ${varietyIndex}:
${varietyIndex % 4 === 0 ? 'Focus on first-time buyers' : varietyIndex % 4 === 1 ? 'Focus on refinancing' : varietyIndex % 4 === 2 ? 'Focus on investment properties' : 'Focus on rate shopping and comparison'}

Within the article, naturally mention and link to our mortgage calculator as a helpful tool.
Topics: down payment strategies, rate shopping, market timing, cost-saving tips.`,

            investment: `Write a comprehensive 1,500+ word blog post about wealth building and investment strategies for ${new Date().toLocaleDateString()}.
Include: S&P 500 at ${marketData.markets.sp500}% change, current market conditions.

CRITICAL TITLE REQUIREMENTS:
- Start with "${selectedPattern.prefix}" pattern
- Examples: ${selectedPattern.examples.join(', ')}
- Focus on specific outcomes (e.g., "How to Build a $1 Million Portfolio by 50")
- Use action-oriented language
- NEVER use: Unlock, Unlocking, Master, Mastering, Navigate, Navigating, Ultimate Guide, Your Guide, Your Path, Your Journey

Article angle based on variety ${varietyIndex}:
${varietyIndex % 4 === 0 ? 'Focus on beginners and getting started' : varietyIndex % 4 === 1 ? 'Focus on retirement planning' : varietyIndex % 4 === 2 ? 'Focus on aggressive growth strategies' : 'Focus on market timing and cycles'}

Within the article, naturally mention and link to our investment calculator as a planning tool.
Topics: compound interest, diversification, market cycles, tax-efficient investing.`,

            loan: `Write a comprehensive 1,500+ word blog post about smart borrowing and debt management for ${new Date().toLocaleDateString()}.
Include: Current lending environment, consolidation opportunities.

CRITICAL TITLE REQUIREMENTS:
- Start with "${selectedPattern.prefix}" pattern
- Examples: ${selectedPattern.examples.join(', ')}
- Address specific pain points (e.g., "How to Escape High-Interest Debt in 2025")
- Be solution-focused
- NEVER use: Unlock, Unlocking, Master, Mastering, Navigate, Navigating, Your Guide, Your Solution

Content angle ${varietyIndex}:
${varietyIndex % 4 === 0 ? 'Focus on debt consolidation' : varietyIndex % 4 === 1 ? 'Focus on credit improvement' : varietyIndex % 4 === 2 ? 'Focus on emergency loans' : 'Focus on personal loan strategies'}

Within the article, naturally mention and link to our loan calculator for comparing options.
Topics: loan types, credit optimization, repayment strategies, avoiding predatory lending.`,

            insurance: `Write a comprehensive 1,500+ word blog post about protecting your family's financial future for ${new Date().toLocaleDateString()}.
Include: Life insurance trends, coverage analysis.

CRITICAL TITLE REQUIREMENTS:
- Start with "${selectedPattern.prefix}" pattern
- Examples: ${selectedPattern.examples.join(', ')}
- Make it personal and relatable (e.g., "What Young Parents Need to Know About Life Insurance")
- Focus on protection and peace of mind
- NEVER use: Unlock, Unlocking, Master, Mastering, Navigate, Navigating, Your Complete, Your Ultimate

Article perspective ${varietyIndex}:
${varietyIndex % 4 === 0 ? 'Focus on young families' : varietyIndex % 4 === 1 ? 'Focus on retirement planning' : varietyIndex % 4 === 2 ? 'Focus on business owners' : 'Focus on term vs whole life'}

Within the article, naturally mention and link to our insurance calculator for coverage estimates.
Topics: coverage types, premium factors, beneficiary planning, policy comparisons.`
        };

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: `You are an expert financial writer creating varied, engaging content. Each article must be unique in style and approach.

CRITICAL VARIETY REQUIREMENTS:
1. TITLES: Use the provided pattern "${selectedPattern.prefix}" to start your title. Make it specific and compelling.
2. BANNED WORDS in titles: Unlock, Unlocking, Master, Mastering, Navigate, Navigating, Ultimate, Complete, Everything You Need, Your Guide to, Your Path to, Your Financial
3. AVOID REPETITIVE STARTERS: Don't begin multiple titles with "Your" - use variety
4. OPENINGS: Vary your opening style:
   - Statistical hook: "Did you know that 73% of homebuyers..."
   - Question: "Have you ever wondered why..."
   - Scenario: "Picture this: You're sitting at the closing table..."
   - Contrarian: "Forget everything you've heard about..."
   - News hook: "With rates hitting new levels this month..."
   - Personal angle: "Last week, a reader asked me..."
   - Direct statement: "Refinancing could save you thousands this year."
   - Comparison: "The difference between 6% and 7% interest rates..."
5. Write in a conversational yet authoritative tone
6. Include specific examples, calculations, and actionable advice
7. Minimum 1,500 words with substantial, valuable content`
                },
                {
                    role: "user",
                    content: prompts[calculatorType] + `\n\nREMEMBER:
                    - Start title with "${selectedPattern.prefix}"
                    - Reference one of these examples: ${selectedPattern.examples.join(', ')}
                    - Make the opening paragraph unique and engaging
                    - Include 5+ detailed sections
                    - Add comparison tables or numbered lists
                    - Include an FAQ section
                    - End with a clear call-to-action
                    - Format with HTML tags
                    - AVOID starting titles with "Your" unless it's the only natural option`
                }
            ],
            temperature: 0.85, // Slightly higher for more variety
            max_tokens: 4000
        });

        // Process the response...
        const responseText = completion.choices[0].message.content;
        const cleanedResponse = responseText
            .replace(/<!DOCTYPE.*?>/i, '')
            .replace(/<\/?html.*?>/gi, '')
            .replace(/<\/?head.*?>/gi, '')
            .replace(/<\/?body.*?>/gi, '')
            .replace(/<title.*?<\/title>/gi, '')
            .trim();

        const lines = cleanedResponse.split('\n');
        const title = lines[0].replace(/^(<.*?>)+/, '').replace(/<.*?>/g, '').trim();
        const content = lines.slice(1).join('\n');
        const slug = this.createSlug(title + '-' + new Date().toISOString().split('T')[0]);
        const htmlContent = this.convertMarkdownToHTML(content);

        // Extract excerpt
        const cleanTextContent = htmlContent
            .replace(/<h[1-6]>.*?<\/h[1-6]>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const sentences = cleanTextContent.match(/[^.!?]+[.!?]+/g) || [];
        let excerpt = '';

        for (const sentence of sentences) {
            const cleanSentence = sentence.trim();
            if (cleanSentence.length > 50) {
                excerpt = cleanSentence.length > 160 
                    ? cleanSentence.substring(0, 157) + '...' 
                    : cleanSentence;
                break;
            }
        }

        if (!excerpt && cleanTextContent.length > 50) {
            excerpt = cleanTextContent.substring(0, 157) + '...';
        }

        if (!excerpt) {
            excerpt = `Expert insights on ${calculatorType} strategies and financial planning.`;
        }

        return {
            title,
            content: htmlContent,
            excerpt,
            slug,
            calculatorType,
            metaDescription: excerpt
        };
    }

    // Fixed markdown conversion to handle bold text properly
    convertMarkdownToHTML(markdown) {
        return markdown
            // Handle bold text FIRST before other conversions
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Then handle headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Handle lists
            .replace(/^\* (.+)$/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Handle paragraphs
            .split('\n\n')
            .map(para => para.trim() ? `<p>${para}</p>` : '')
            .join('\n')
            .replace(/<\/li>\n<li>/g, '</li><li>')
            .replace(/<p><ul>/g, '<ul>')
            .replace(/<\/ul><\/p>/g, '</ul>');
    }

    // Helper method to strip markdown from titles
    stripMarkdown(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.+?)\*/g, '$1') // Remove italic
            .replace(/^#+\s*/gm, '') // Remove headers
            .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
            .trim();
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
            return result?.count || 0;
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
            .replace(/-+/g, '-');
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
                const posts = await this.getRecentPosts(10);
                res.send(this.generateBlogIndexPage(posts));
            } catch (error) {
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
        this.app.delete('/api/blog/:slug', async (req, res) => {
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
        this.app.patch('/api/blog/:slug/update', async (req, res) => {
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

        // Lead capture endpoints
        this.app.post('/api/capture-lead-email', async (req, res) => {
            try {
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

        // Test blog endpoint
        this.app.post('/api/publish-test-blog', async (req, res) => {
            try {
                const { type } = req.body;
                const types = ['mortgage', 'investment', 'loan', 'insurance'];
                const selectedType = type && types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
                
                await this.generateAndPublishTopicalBlog(selectedType);
                res.json({ success: true, message: `Test ${selectedType} blog published successfully` });
            } catch (error) {
                console.error('Test blog error:', error);
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
        this.app.get('/blog-admin', (req, res) => {
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

                const result = await this.dbGet('SELECT COUNT(*) as count FROM leads_enhanced');
                const totalLeads = result?.count || 0;

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

        this.app.get('/api/leads', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 10;
                
                if (!this.db) {
                    return res.json({ success: true, leads: [] });
                }

                const leads = await this.dbAll(
                    'SELECT * FROM leads_enhanced ORDER BY created_at DESC LIMIT $1',
                    [limit]
                );

                res.json({ success: true, leads });
                
            } catch (error) {
                console.error('Leads fetch error:', error);
                res.json({ success: true, leads: [] });
            }
        });

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

        this.app.post('/api/track-lead-interaction', (req, res) => {
            try {
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
                    --text-secondary: #94a3b8;
                    --glass-bg: rgba(255, 255, 255, 0.05);
                    --glass-border: rgba(255, 255, 255, 0.1);
                }
                
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
    generateBlogPostPage(post) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.stripMarkdown(post.title)} - CalculiQ Blog</title>
            <meta name="description" content="${post.meta_description || post.excerpt}">
            <style>
                :root {
                    --primary-dark: #0a0e27;
                    --secondary-dark: #151932;
                    --accent-blue: #00d4ff;
                    --accent-purple: #7b2ff7;
                    --accent-gradient: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    --text-primary: #ffffff;
                    --text-secondary: #94a3b8;
                    --glass-bg: rgba(255, 255, 255, 0.05);
                    --glass-border: rgba(255, 255, 255, 0.1);
                }
                
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
                
                .nav {
                    text-align: center;
                    padding: 30px 20px;
                    border-bottom: 1px solid var(--glass-border);
                    background: var(--glass-bg);
                    backdrop-filter: blur(10px);
                }
                
                .nav-link {
                    color: var(--text-secondary);
                    text-decoration: none;
                    margin: 0 15px;
                    padding: 8px 16px;
                    border-radius: 20px;
                    transition: all 0.3s ease;
                    display: inline-block;
                }
                
                .nav-link:hover {
                    color: var(--text-primary);
                    background: var(--glass-bg);
                    transform: translateY(-2px);
                }
                
                .blog-post {
                    max-width: 800px;
                    margin: 60px auto;
                    padding: 0 20px;
                }
                
                .blog-post h1 {
                    color: var(--text-primary);
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 20px;
                    line-height: 1.2;
                    background: var(--accent-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .blog-post h2 {
                    color: var(--text-primary);
                    font-size: 1.8rem;
                    font-weight: 700;
                    margin: 40px 0 20px 0;
                    line-height: 1.3;
                }
                
                .blog-post h3 {
                    color: var(--text-primary);
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin: 30px 0 15px 0;
                }
                
                .post-meta {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    padding-bottom: 30px;
                    border-bottom: 1px solid var(--glass-border);
                    margin-bottom: 40px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .post-category {
                    background: var(--accent-gradient);
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                
                .blog-post p {
                    color: var(--text-secondary);
                    margin-bottom: 25px;
                    font-size: 1.1rem;
                    line-height: 1.8;
                }
                
                .blog-post strong {
                    color: var(--text-primary);
                    font-weight: 600;
                }
                
                .rate-box, .tip-box, .calculator-highlight, .cta-box {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    padding: 25px;
                    border-radius: 15px;
                    margin: 30px 0;
                    backdrop-filter: blur(10px);
                    border-left: 4px solid var(--accent-blue);
                }
                
                .cta-box {
                    background: var(--glass-bg);
                    border: 1px solid var(--accent-blue);
                    text-align: center;
                    padding: 40px;
                    margin-top: 50px;
                    position: relative;
                    overflow: hidden;
                }
                
                .cta-box::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 50%);
                    animation: float 10s ease-in-out infinite;
                }
                
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(30px, 30px); }
                }
                
                .cta-box h3 {
                    position: relative;
                    z-index: 1;
                    margin-bottom: 15px;
                }
                
                .cta-box p {
                    position: relative;
                    z-index: 1;
                    margin-bottom: 25px;
                }
                
                .cta-button {
                    background: var(--accent-gradient);
                    color: white;
                    padding: 16px 40px;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: 600;
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
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }
                
                .stat-item {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                }
                
                .blog-post a {
                    color: var(--accent-blue);
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                
                .blog-post a:hover {
                    color: var(--accent-purple);
                    text-decoration: underline;
                }
                
                .blog-post ul, .blog-post ol {
                    margin: 20px 0;
                    padding-left: 30px;
                    color: var(--text-secondary);
                }
                
                .blog-post li {
                    margin: 10px 0;
                }
                
                .blog-post table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .blog-post th, .blog-post td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                }
                
                .blog-post th {
                    background: var(--secondary-dark);
                    color: var(--accent-blue);
                    font-weight: 600;
                }
                
                .footer-nav {
                    text-align: center;
                    margin-top: 80px;
                    padding: 40px 20px;
                    border-top: 1px solid var(--glass-border);
                }
                
                .footer-nav p {
                    color: var(--text-secondary);
                    margin-bottom: 20px;
                }
                
                .back-to-blog {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    padding: 12px 30px;
                    border-radius: 25px;
                    text-decoration: none;
                    display: inline-block;
                    transition: all 0.3s ease;
                }
                
                .back-to-blog:hover {
                    border-color: var(--accent-blue);
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(0, 212, 255, 0.2);
                }
                
                @media (max-width: 768px) {
                    .blog-post h1 {
                        font-size: 2rem;
                    }
                    
                    .blog-post p {
                        font-size: 1rem;
                    }
                    
                    .cta-box {
                        padding: 25px 20px;
                    }
                }
            </style>
        </head>
        <body>
            <nav class="nav">
                <a href="/" class="nav-link">🏠 Home</a>
                <a href="/blog" class="nav-link">📝 Blog</a>
                <a href="/#calculators" class="nav-link">🧮 Calculators</a>
            </nav>
            
            <article class="blog-post">
                <h1>${this.stripMarkdown(post.title)}</h1>
                <div class="post-meta">
                    <span>Published ${new Date(post.published_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span class="post-category">${post.category || 'Finance'}</span>
                </div>
                
                ${post.content}
                
                <div class="cta-box">
                    <h3>Ready to Calculate Your ${post.category} Strategy?</h3>
                    <p>Use our advanced ${post.category.toLowerCase()} calculator to get personalized insights and connect with verified lenders.</p>
                    <a href="/" class="cta-button">Try Our ${post.category} Calculator</a>
                </div>
            </article>
            
            <div class="footer-nav">
                <p>Published ${new Date(post.published_at).toLocaleDateString()}</p>
                <a href="/blog" class="back-to-blog">← Back to Blog</a>
            </div>
        </body>
        </html>
        `;
    }

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

📧 Newsletter System: Automated weekly emails every Monday at 9 AM
📝 Blog System: Automated daily posts at 8 AM, 12 PM, 4 PM, 8 PM PST

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
                this.db.end();
            }
            process.exit(0);
        });
    }
}

// Start the server
const server = new CalculiQAutomationServer();
server.start();

module.exports = CalculiQAutomationServer;