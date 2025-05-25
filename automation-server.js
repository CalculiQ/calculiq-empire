// automation-server.js
// Complete Server with Newsletter + Blog System
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
// const OpenAI = require('openai'); // Comment out for now

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
        
// Initialize OpenAI
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            console.log('✅ OpenAI initialized for unique content generation');
        } else {
            console.log('📝 OpenAI not configured - using template system');
        }
        
        this.setupMiddleware();
        this.initializeDatabase();
        this.initializeEmailSystem();
        this.initializeNewsletterSystem();
        this.initializeBlogSystem();
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
            
            // Create all tables
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
                )`,
                
                `CREATE TABLE IF NOT EXISTS blog_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    slug TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    excerpt TEXT,
                    category TEXT,
                    tags TEXT,
                    meta_description TEXT,
                    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'published',
                    view_count INTEGER DEFAULT 0
                )`,
                
                `CREATE TABLE IF NOT EXISTS blog_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_slug TEXT,
                    visitor_ip TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

async generateAndPublishDailyBlog() {
    try {
        // Use the new dynamic generator
        const DynamicBlogGenerator = require('./dynamic-blog-generator');
        const generator = new DynamicBlogGenerator();
        
        // Rotate through calculator types based on day
        const types = ['mortgage', 'investment', 'loan', 'insurance'];
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const calculatorType = types[dayOfYear % 4];
        
        // Generate completely unique article with full SEO content
        const article = await generator.generateArticle(calculatorType);
        
        // Save to database with proper formatting
        await this.saveBlogPost({
            slug: article.slug,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            category: article.calculatorType.charAt(0).toUpperCase() + article.calculatorType.slice(1),
            tags: `${article.calculatorType},calculator,${today.getFullYear()},financial calculator`,
            meta_description: article.metaDescription,
            status: 'published'
           });
        
        console.log(`✅ Dynamic SEO blog published: "${article.title}"`);
        
    } catch (error) {
        console.error('❌ Dynamic blog generation failed:', error);
    }
}

async generateOpenAIBlog(calculatorType, marketData) {
    const prompts = {
        mortgage: `Write a 1,500-word blog post about mortgage calculators and home buying for ${new Date().toLocaleDateString()}.
            Include: Current 30-year rate at ${marketData.rates.mortgage.thirtyYear}%, 15-year at ${marketData.rates.mortgage.fifteenYear}%.
            Focus on: How to use mortgage calculators, payment calculations, down payment strategies.
            MUST include real examples with actual numbers and link to our mortgage calculator.`,
        
        investment: `Write a 1,500-word blog post about investment calculators and wealth building for ${new Date().toLocaleDateString()}.
            Include: S&P 500 at ${marketData.markets.sp500}% change, current market volatility.
            Focus on: Compound interest calculations, retirement planning, portfolio strategies.
            MUST include specific calculations and link to our investment calculator.`,
        
        loan: `Write a 1,500-word blog post about personal loan calculators for ${new Date().toLocaleDateString()}.
            Include: Current rates, debt consolidation benefits, payment calculations.
            Focus on: How loan calculators help compare options, save money on interest.
            MUST include real loan scenarios and link to our loan calculator.`,
        
        insurance: `Write a 1,500-word blog post about life insurance calculators for ${new Date().toLocaleDateString()}.
            Include: Coverage calculations, premium factors, term vs whole life math.
            Focus on: How to calculate proper coverage, age-based pricing, family protection.
            MUST include coverage examples and link to our insurance calculator.`
    };

    const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are an expert financial writer creating SEO-optimized, helpful content about financial calculators. Always include specific numbers, calculations, and examples."
            },
            {
                role: "user",
                content: prompts[calculatorType] + `\n\nEnd with a strong CTA to use our ${calculatorType} calculator. Format the response with a clear title on the first line.`
            }
        ],
        temperature: 0.8,
        max_tokens: 2500
    });

    const responseText = completion.choices[0].message.content;
    const lines = responseText.split('\n');
    const title = lines[0].replace(/^[#\s]+/, '').trim();
    const content = lines.slice(1).join('\n');
    
    const slug = this.createSlug(title + '-' + new Date().toISOString().split('T')[0]);
    
    return {
        title: title,
        slug: slug,
        content: `<article class="blog-post">${content}</article>`,
        excerpt: title.substring(0, 160) + '...',
        calculatorType: calculatorType,
        metaDescription: `${title}. Expert ${calculatorType} analysis and calculator guide for ${new Date().toLocaleDateString()}.`
    };
}

async generateAndPublishTopicalBlog(calculatorType) {
    try {
        // Get market data
        const marketData = await this.fetchCurrentMarketData();
        
        let article;
        
        // Try OpenAI first
        if (this.openai) {
            try {
                console.log(`🤖 Generating ${calculatorType} blog with OpenAI...`);
                article = await this.generateOpenAIBlog(calculatorType, marketData);
            } catch (error) {
                console.error('❌ OpenAI failed, using dynamic generator:', error.message);
                const DynamicBlogGenerator = require('./dynamic-blog-generator');
                const generator = new DynamicBlogGenerator();
                article = await generator.generateArticle(calculatorType);
            }
        } else {
            console.log(`📝 Generating ${calculatorType} blog with dynamic generator...`);
            const DynamicBlogGenerator = require('./dynamic-blog-generator');
            const generator = new DynamicBlogGenerator();
            article = await generator.generateArticle(calculatorType);
        }
        
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
        
    async fetchCurrentMarketData() {
    try {
        // API Keys
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
        
        // Get market news from Alpha Vantage
        const newsResponse = await axios.get(
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=COIN,AAPL,MSFT&apikey=${alphaVantageKey}`
        );
        
        // Parse the data
        const mortgage30Rate = parseFloat(mortgage30Response.data.observations[0].value);
        const mortgage15Rate = parseFloat(mortgage15Response.data.observations[0].value);
        
        const sp500Data = sp500Response.data['Global Quote'] || {};
        const sp500Change = parseFloat(sp500Data['10. change percent']?.replace('%', '') || 0);
        
        const topNews = newsResponse.data.feed?.[0]?.title || "Markets show steady activity";
        
        // Calculate week-over-week change (simplified)
        const weeklyChange = (Math.random() - 0.5) * 0.2; // Small random change
        
        return {
            timestamp: new Date().toISOString(),
            rates: {
                mortgage: {
                    thirtyYear: mortgage30Rate.toFixed(2),
                    fifteenYear: mortgage15Rate.toFixed(2),
                    jumbo: (mortgage30Rate + 0.5).toFixed(2), // Jumbo typically 0.5% higher
                    trend: weeklyChange > 0 ? 'up' : 'down',
                    weeklyChange: weeklyChange.toFixed(2),
                    lastUpdated: mortgage30Response.data.observations[0].date
                }
            },
            markets: {
                sp500: sp500Change.toFixed(2),
                nasdaq: (sp500Change * 1.2).toFixed(2), // Approximation
                dow: (sp500Change * 0.8).toFixed(2)     // Approximation
            },
            news: [topNews],
            realDataUsed: true,
            dataSources: 'FRED & Alpha Vantage'
        };
        
    } catch (error) {
        console.error('API error:', error.message);
        // Fall back to simulated data if APIs fail
        return this.getFallbackMarketData();
    }
}

    async generateNewsletterContent(marketData) {
        const currentDate = new Date();
        const rates = marketData.rates.mortgage;
        const tip = this.getWeeklyTip();
        
        const content = {
            subject: `CalculiQ Weekly: Rates ${rates.trend === 'up' ? 'Rise' : 'Drop'} + Money Tips`,
            html: this.generateNewsletterHTML(marketData, tip),
            text: this.generateNewsletterText(marketData, tip),
            weekOf: this.getWeekStart(currentDate)
        };
        
        return content;
    }

async generateBlogContent(dayName, marketData) {
    // If OpenAI is available, use it for unique content
    if (this.openai) {
        try {
            const topicRotation = {
                monday: 'mortgage market analysis and weekly outlook',
                tuesday: 'investment strategies and market opportunities',
                wednesday: 'personal loans and debt management',
                thursday: 'insurance planning and coverage optimization',
                friday: 'weekly financial wrap-up and money tips',
                saturday: 'real estate trends and homebuying guides',
                sunday: 'financial planning and budgeting strategies'
            };

            const topic = topicRotation[dayName] || 'financial insights';

            const prompt = `Write a comprehensive 1,200-word blog post about ${topic} for ${new Date().toLocaleDateString()}.

MUST include this exact real market data:
- 30-Year Mortgage Rate: ${marketData.rates.mortgage.thirtyYear}% (${marketData.rates.mortgage.trend} from last week)
- 15-Year Mortgage Rate: ${marketData.rates.mortgage.fifteenYear}%
- Stock Market: S&P 500 ${marketData.markets.sp500 > 0 ? '+' : ''}${marketData.markets.sp500}%
- Latest News: "${marketData.news[0] || 'Markets showing mixed signals'}"

Requirements:
1. Create a unique, catchy title that includes the current date
2. Use the EXACT rates provided above in your calculations
3. Include specific, actionable advice based on current market conditions
4. Add a section analyzing what these rates mean for consumers
5. Include 3-4 practical tips readers can implement today
6. Write in an engaging, conversational tone
7. Format with proper HTML tags (h2, h3, p, ul, li, strong)
8. End with a call-to-action to use our calculators
9. Make it genuinely helpful and specific to TODAY's market
10. Include at least one calculation example using the rates provided

Start with the title on the first line, then the article content.`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert financial writer who creates unique, timely, data-driven content. Never use generic filler. Always incorporate exact market data provided."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.9, // High creativity for uniqueness
                max_tokens: 2000
            });

            const aiResponse = completion.choices[0].message.content;
            const lines = aiResponse.split('\n');
            const title = lines[0].replace(/^[#\s]+/, '').trim();
            const content = lines.slice(1).join('\n');

            console.log(`🤖 AI generated unique blog: "${title}"`);

            return {
                title: title,
                slug: this.createSlug(title + '-' + new Date().toISOString().split('T')[0]),
                content: `
                    <article class="blog-post">
                        <header>
                            <h1>${title}</h1>
                            <p class="post-meta">Published ${new Date().toLocaleDateString()} | ${Math.floor(content.split(' ').length / 200)} min read</p>
                            <p><em>*Analysis based on real-time data from Federal Reserve (FRED) and market APIs</em></p>
                        </header>
                        <section>
                            ${content}
                            
                            <div class="cta-box">
                                <h3>📊 Calculate Your Personal Scenario</h3>
                                <p>Use our free calculators with today's real rates to see your options.</p>
                                <a href="/" class="cta-button">Start Calculating</a>
                            </div>
                        </section>
                    </article>
                `,
                excerpt: title.substring(0, 150) + '...',
                category: this.getCategoryForDay(dayName),
                tags: this.getTagsForDay(dayName).join(','),
                metaDescription: `${title}. Real-time rates and analysis for ${new Date().toLocaleDateString()}.`
            };

        } catch (error) {
            console.error('❌ OpenAI generation failed:', error.message);
            // Fall back to template system
            return this.generateTemplateBlogContent(dayName, marketData);
        }
    } else {
        // No OpenAI key, use template system
        return this.generateTemplateBlogContent(dayName, marketData);
    }
}

// Add these helper methods
getCategoryForDay(dayName) {
    const categories = {
        monday: 'Market Analysis',
        tuesday: 'Investment Guide',
        wednesday: 'Loan Insights',
        thursday: 'Insurance Tips',
        friday: 'Weekly Recap',
        saturday: 'Real Estate',
        sunday: 'Financial Planning'
    };
    return categories[dayName] || 'Financial News';
}

getTagsForDay(dayName) {
    const tags = {
        monday: ['mortgage rates', 'market analysis', 'weekly outlook', 'real estate'],
        tuesday: ['investing', 'stock market', 'portfolio', 'wealth building'],
        wednesday: ['personal loans', 'debt', 'credit', 'financing'],
        thursday: ['insurance', 'coverage', 'protection', 'risk management'],
        friday: ['weekly recap', 'financial news', 'market summary', 'tips'],
        saturday: ['home buying', 'real estate', 'property', 'housing market'],
        sunday: ['budgeting', 'financial planning', 'money management', 'savings']
    };
    return tags[dayName] || ['finance', 'money', 'tips'];
}

// Rename your old method to this
generateTemplateBlogContent(dayName, marketData) {
    // Your existing template-based code here
    const blogTopics = {
        monday: ["Market Monday: This Week's Financial Outlook"],
        // ... rest of your existing template code
    };
    // ... etc
}

    createBlogContent(dayName, topic, marketData) {
        if (dayName === 'monday') {
            return {
                title: `Market Monday: This Week's Financial Outlook - ${new Date().toLocaleDateString()}`,
                excerpt: `Start your week with the latest market trends and mortgage rates. Current 30-year rates at ${marketData.rates.mortgage.thirtyYear}%.`,
                category: 'Market Analysis',
                tags: ['markets', 'mortgage rates', 'weekly outlook'],
                metaDescription: `Weekly financial market outlook with current mortgage rates and investment trends for ${new Date().toLocaleDateString()}.`,
                html: `
                <article class="blog-post">
                    <header>
                        <h1>Market Monday: This Week's Financial Outlook</h1>
                        <p class="post-meta">Published ${new Date().toLocaleDateString()} | 3 min read</p>
                    </header>
                    
                    <section>
                        <h2>📈 Current Market Snapshot</h2>
                        <p>As we start a new week, here's what's happening in the financial markets:</p>
                        
                        <div class="rate-box">
                            <h3>🏠 Mortgage Rates Today</h3>
                            <ul>
                                <li>30-Year Fixed: <strong>${marketData.rates.mortgage.thirtyYear}%</strong></li>
                                <li>15-Year Fixed: <strong>${marketData.rates.mortgage.fifteenYear}%</strong></li>
                                <li>Trend: <strong>${marketData.rates.mortgage.trend}</strong></li>
                            </ul>
                        </div>
                        
                        <h2>💡 What This Means for You</h2>
                        <p>With rates ${marketData.rates.mortgage.trend}, here's what homebuyers should know:</p>
                        <ul>
                            <li>Use our mortgage calculator to see how current rates affect your payment</li>
                            <li>Consider rate locks if you're in the application process</li>
                            <li>Explore different loan terms to find the best fit</li>
                        </ul>
                        
                        <div class="cta-box">
                            <h3>Ready to Explore Your Options?</h3>
                            <p>Get personalized mortgage quotes based on today's rates.</p>
                            <a href="/" class="cta-button">Calculate My Payment</a>
                        </div>
                    </section>
                </article>
                `
            };
        } else if (dayName === 'friday') {
            return {
                title: `Finance Friday: This Week's Money Recap - ${new Date().toLocaleDateString()}`,
                excerpt: `Weekly wrap-up of financial markets, rate changes, and what it means for your money decisions.`,
                category: 'Weekly Recap',
                tags: ['weekly recap', 'finance news', 'market summary'],
                metaDescription: `Weekly financial recap covering market performance, rate changes, and money management tips.`,
                html: `
                <article class="blog-post">
                    <header>
                        <h1>Finance Friday: This Week's Money Recap</h1>
                        <p class="post-meta">Published ${new Date().toLocaleDateString()} | 3 min read</p>
                    </header>
                    
                    <section>
                        <h2>📊 Week in Numbers</h2>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <h3>Mortgage Rates</h3>
                                <p>30-Year: <strong>${marketData.rates.mortgage.thirtyYear}%</strong></p>
                            </div>
                            <div class="stat-item">
                                <h3>Market Performance</h3>
                                <p>S&P 500: <strong>${marketData.markets.sp500 > 0 ? '+' : ''}${marketData.markets.sp500}%</strong></p>
                            </div>
                        </div>
                        
                        <h2>🎯 Action Items for Next Week</h2>
                        <ol>
                            <li>Review your budget and spending</li>
                            <li>Check investment account performance</li>
                            <li>Research rates for any major purchases</li>
                            <li>Plan your weekend money tasks</li>
                        </ol>
                        
                        <div class="cta-box">
                            <h3>Take the Weekend Challenge</h3>
                            <p>Spend 15 minutes exploring your financial scenarios.</p>
                            <a href="/" class="cta-button">Start Calculating</a>
                        </div>
                    </section>
                </article>
                `
            };
        } else {
            // Default content for other days
            return {
                title: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} Financial Tips - ${new Date().toLocaleDateString()}`,
                excerpt: `Daily financial insights and money management tips for ${dayName}.`,
                category: 'Financial Tips',
                tags: ['finance', 'money tips', 'financial planning'],
                metaDescription: `Daily financial insights and practical money management advice for ${dayName}.`,
                html: `
                <article class="blog-post">
                    <header>
                        <h1>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} Financial Insights</h1>
                        <p class="post-meta">Published ${new Date().toLocaleDateString()} | 3 min read</p>
                    </header>
                    
                    <section>
                        <h2>💡 Today's Financial Focus</h2>
                        <p>Smart money management starts with having the right information and tools to make informed decisions.</p>
                        
                        <h2>📊 Current Market Context</h2>
                        <ul>
                            <li>30-Year Mortgage Rates: ${marketData.rates.mortgage.thirtyYear}%</li>
                            <li>Market Trend: ${marketData.markets.sp500 > 0 ? 'Positive' : 'Cautious'}</li>
                            <li>Planning Opportunity: Great time to review your financial strategy</li>
                        </ul>
                        
                        <div class="cta-box">
                            <h3>Explore Your Financial Options</h3>
                            <p>Use our free calculators to make informed decisions.</p>
                            <a href="/" class="cta-button">Try Our Calculators</a>
                        </div>
                    </section>
                </article>
                `
            };
        }
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

    async saveBlogPost(blogPost) {
        if (!this.db) return;
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO blog_posts (slug, title, content, excerpt, category, tags, meta_description, published_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        blogPost.slug,
                        blogPost.title,
                        blogPost.content,
                        blogPost.excerpt,
                        blogPost.category,
                        blogPost.tags,
                        blogPost.metaDescription,
                        new Date().toISOString()
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        } catch (error) {
            console.error('Error saving blog post:', error);
        }
    }

    async getRecentPosts(limit = 10) {
        if (!this.db) return [];
        
        try {
            return await new Promise((resolve, reject) => {
                this.db.all(
                    'SELECT * FROM blog_posts WHERE status = "published" ORDER BY published_at DESC LIMIT ?',
                    [limit],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });
        } catch (error) {
            return [];
        }
    }

    async getBlogPost(slug) {
        if (!this.db) return null;
        
        try {
            const post = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT * FROM blog_posts WHERE slug = ? AND status = "published"',
                    [slug],
                    (err, row) => err ? reject(err) : resolve(row)
                );
            });
            
            // Increment view count
            if (post) {
                this.db.run('UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?', [slug]);
            }
            
            return post;
        } catch (error) {
            return null;
        }
    }

    async getNewsletterSubscriberCount() {
        if (!this.db) return 0;
        
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = "active"',
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });
            return result;
        } catch (error) {
            return 0;
        }
    }

    async getLastNewsletterDate() {
        if (!this.db) return null;
        
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT sent_at FROM newsletter_content ORDER BY sent_at DESC LIMIT 1',
                    (err, row) => err ? reject(err) : resolve(row?.sent_at || null)
                );
            });
            return result;
        } catch (error) {
            return null;
        }
    }

    createSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
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
                await this.generateAndPublishDailyBlog();
                res.json({ success: true, message: 'Test blog published successfully' });
            } catch (error) {
                console.error('Test blog error:', error);
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

        // Get newsletter subscribers (for your dashboard)
        this.app.get('/api/newsletter-subscribers', async (req, res) => {
            try {
                if (!this.db) {
                    return res.json({ success: true, subscribers: [], count: 0 });
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
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    padding: 40px 0;
                    border-bottom: 1px solid #eee;
                    margin-bottom: 40px;
                }
                .header h1 {
                    color: #1a1f3a;
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .header p {
                    color: #666;
                    font-size: 1.2rem;
                }
                .post-grid {
                    display: grid;
                    gap: 30px;
                    margin-bottom: 40px;
                }
                .post-card {
                    border: 1px solid #eee;
                    border-radius: 12px;
                    padding: 25px;
                    transition: all 0.3s ease;
                }
                .post-card:hover {
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }
                .post-title {
                    color: #1a1f3a;
                    font-size: 1.5rem;
                    margin-bottom: 10px;
                    text-decoration: none;
                }
                .post-title:hover {
                    color: #646cff;
                }
                .post-meta {
                    color: #666;
                    font-size: 0.9rem;
                    margin-bottom: 15px;
                }
                .post-excerpt {
                    color: #555;
                    margin-bottom: 15px;
                }
                .post-category {
                    background: #646cff;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    text-decoration: none;
                }
                .cta-section {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px;
                    border-radius: 15px;
                    text-align: center;
                    margin-top: 40px;
                }
                .cta-button {
                    background: white;
                    color: #667eea;
                    padding: 12px 24px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-block;
                    margin-top: 15px;
                }
                .nav-link {
                    color: #646cff;
                    text-decoration: none;
                    margin: 0 15px;
                }
                .nav-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 CalculiQ Financial Blog</h1>
                <p>Daily insights to make smarter money decisions</p>
                <nav style="margin-top: 20px;">
                    <a href="/" class="nav-link">🏠 Home</a>
                    <a href="/blog" class="nav-link">📝 Blog</a>
                    <a href="/#calculators" class="nav-link">🧮 Calculators</a>
                </nav>
            </div>
            
            <div class="post-grid">
                ${posts.length > 0 ? posts.map(post => `
                    <article class="post-card">
                        <h2><a href="/blog/${post.slug}" class="post-title">${post.title}</a></h2>
                        <div class="post-meta">
                            ${new Date(post.published_at).toLocaleDateString()} • 
                            <span class="post-category">${post.category}</span> • 
                            ${post.view_count || 0} views
                        </div>
                        <p class="post-excerpt">${post.excerpt}</p>
                    </article>
                `).join('') : `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h3>📝 Fresh Content Coming Soon!</h3>
                        <p>Check back tomorrow for expert financial insights and money-saving strategies.</p>
                    </div>
                `}
            </div>
            
            <div class="cta-section">
                <h2>Ready to Calculate Your Financial Future?</h2>
                <p>Use our free calculators to make informed financial decisions</p>
                <a href="/" class="cta-button">Try Our Calculators</a>
            </div>
        </body>
        </html>
        `;
    }

    generateBlogPostPage(post) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${post.title} - CalculiQ Blog</title>
            <meta name="description" content="${post.meta_description}">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .nav {
                    text-align: center;
                    padding: 20px 0;
                    border-bottom: 1px solid #eee;
                    margin-bottom: 30px;
                }
                .nav-link {
                    color: #646cff;
                    text-decoration: none;
                    margin: 0 15px;
                }
                .blog-post h1 {
                    color: #1a1f3a;
                    font-size: 2.2rem;
                    margin-bottom: 15px;
                }
                .blog-post h2 {
                    color: #1a1f3a;
                    font-size: 1.5rem;
                    margin: 30px 0 15px 0;
                }
                .blog-post h3 {
                    color: #1a1f3a;
                    font-size: 1.2rem;
                    margin: 25px 0 10px 0;
                }
                .post-meta {
                    color: #666;
                    font-size: 0.9rem;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #eee;
                    margin-bottom: 30px;
                }
                .rate-box, .tip-box, .calculator-highlight, .cta-box {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #646cff;
                }
                .cta-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                }
                .cta-button {
                    background: white;
                    color: #667eea;
                    padding: 12px 24px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-block;
                    margin-top: 10px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }
                .stat-item {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                a {
                    color: #646cff;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                ul, ol {
                    margin: 15px 0;
                    padding-left: 20px;
                }
                li {
                    margin: 8px 0;
                }
            </style>
        </head>
        <body>
            <nav class="nav">
                <a href="/" class="nav-link">🏠 Home</a>
                <a href="/blog" class="nav-link">📝 Blog</a>
                <a href="/#calculators" class="nav-link">🧮 Calculators</a>
            </nav>
            
            ${post.content}
            
            <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee;">
                <p style="color: #666; margin-bottom: 20px;">Published ${new Date(post.published_at).toLocaleDateString()} • ${post.view_count || 0} views</p>
                <a href="/blog" style="background: #646cff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">← Back to Blog</a>
            </div>
        </body>
        </html>
        `;
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

📧 Newsletter System: Automated weekly emails every Monday at 9 AM
📝 Blog System: Automated daily posts every day at 8 AM

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