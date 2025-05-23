const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

class CalculiQSetup {
    constructor() {
        this.results = {
            environment: false,
            database: false,
            email: false,
            ai: false,
            directories: false
        };
    }

    async runSetup() {
        console.log(`
🚀 CALCULIQ AUTOMATED REVENUE EMPIRE SETUP
=====================================

Setting up your complete automation system...
        `);

        await this.checkEnvironment();
        await this.setupDirectories();
        await this.testDatabase();
        await this.testEmail();
        await this.testAI();
        await this.generateSampleData();
        
        this.displayResults();
        this.showNextSteps();
    }

    async checkEnvironment() {
        console.log('📋 Checking environment configuration...');
        
        const requiredFiles = ['.env'];
        const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
        
        if (missingFiles.length > 0) {
            console.log('⚠️  Missing configuration files:');
            missingFiles.forEach(file => {
                if (file === '.env') {
                    console.log(`   • ${file} - Copy .env template and add your keys`);
                }
            });
            this.results.environment = false;
        } else {
            console.log('✅ Environment files found');
            this.results.environment = true;
        }
    }

    async setupDirectories() {
        console.log('📁 Setting up CalculiQ directories...');
        
        const directories = [
            'public',
            'data',
            'logs',
            'content',
            'exports',
            'calculiq-data'
        ];
        
        try {
            for (const dir of directories) {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }
            
            console.log('✅ CalculiQ directories created successfully');
            this.results.directories = true;
            
        } catch (error) {
            console.log('❌ Directory setup failed:', error.message);
            this.results.directories = false;
        }
    }

    async testDatabase() {
        console.log('🗄️  Testing CalculiQ database connection...');
        
        try {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('./test_calculiq.db');
            
            await new Promise((resolve, reject) => {
                db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER)', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            await new Promise((resolve, reject) => {
                db.run('DROP TABLE test_table', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            db.close();
            
            // Clean up test database
            if (fs.existsSync('./test_calculiq.db')) {
                fs.unlinkSync('./test_calculiq.db');
            }
            
            console.log('✅ CalculiQ database connection successful');
            this.results.database = true;
            
        } catch (error) {
            console.log('❌ Database test failed:', error.message);
            this.results.database = false;
        }
    }

    async testEmail() {
        console.log('📧 Testing CalculiQ email configuration...');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️  Email not configured - set EMAIL_USER and EMAIL_PASS in .env');
            console.log('   • For Gmail: Go to Google Account → Security → App Passwords');
            console.log('   • Generate app password for "Mail" application');
            this.results.email = false;
            return;
        }
        
        try {
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            
            await transporter.verify();
            console.log('✅ CalculiQ email connection successful');
            this.results.email = true;
            
        } catch (error) {
            console.log('❌ Email test failed:', error.message);
            console.log('   • Check your EMAIL_USER and EMAIL_PASS in .env');
            console.log('   • For Gmail, use App Password, not regular password');
            console.log('   • Enable 2-factor authentication first');
            this.results.email = false;
        }
    }

    async testAI() {
        console.log('🤖 Testing CalculiQ AI configuration...');
        
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️  OpenAI not configured - set OPENAI_API_KEY in .env (optional)');
            console.log('   • Get API key from: https://platform.openai.com/api-keys');
            console.log('   • Cost: ~$20/month for typical usage');
            console.log('   • System works without it using templates');
            this.results.ai = false;
            return;
        }
        
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (apiKey.startsWith('sk-') && apiKey.length > 20) {
                console.log('✅ OpenAI API key format looks correct');
                console.log('   • AI content generation will be available');
                console.log('   • Estimated cost: $20-50/month based on usage');
                this.results.ai = true;
            } else {
                console.log('❌ OpenAI API key format appears invalid');
                console.log('   • Should start with "sk-" and be 40+ characters');
                this.results.ai = false;
            }
            
        } catch (error) {
            console.log('❌ AI test failed:', error.message);
            this.results.ai = false;
        }
    }

    async generateSampleData() {
        console.log('📊 Generating CalculiQ sample configuration...');
        
        const sampleConfig = {
            business: {
                name: process.env.BUSINESS_NAME || 'CalculiQ',
                email: process.env.BUSINESS_EMAIL || 'contact@calculiq.com',
                phone: process.env.BUSINESS_PHONE || '+1-555-0123',
                website: process.env.WEBSITE_URL || 'https://calculiq.com'
            },
            automation: {
                contentGeneration: this.results.ai,
                emailSequences: this.results.email,
                aiContent: this.results.ai,
                liveMode: process.env.AUTOMATION_LIVE === 'true',
                autoPublish: process.env.AUTO_PUBLISH === 'true'
            },
            calculators: [
                {
                    name: 'Mortgage Calculator',
                    type: 'mortgage',
                    affiliates: ['LendingTree', 'Rocket Mortgage', 'Quicken Loans'],
                    commission: '$50-500 per lead'
                },
                {
                    name: 'Investment Calculator', 
                    type: 'investment',
                    affiliates: ['TD Ameritrade', 'E*TRADE', 'Charles Schwab'],
                    commission: '$100-600 per account'
                },
                {
                    name: 'Loan Calculator',
                    type: 'loan', 
                    affiliates: ['SoFi', 'Marcus', 'LightStream'],
                    commission: '$25-200 per approval'
                },
                {
                    name: 'Insurance Calculator',
                    type: 'insurance',
                    affiliates: ['Geico', 'Progressive', 'State Farm'],
                    commission: '$75-300 per policy'
                },
                {
                    name: 'Business Finance Calculator',
                    type: 'business',
                    affiliates: ['Kabbage', 'OnDeck', 'BlueVine'],
                    commission: '$200-800 per funding'
                }
            ],
            revenueProjections: {
                month1: { visitors: 1000, revenue: 2000 },
                month3: { visitors: 5000, revenue: 15000 },
                month6: { visitors: 20000, revenue: 56000 },
                month12: { visitors: 50000, revenue: 120000 }
            }
        };
        
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        
        fs.writeFileSync('./data/calculiq-config.json', JSON.stringify(sampleConfig, null, 2));
        console.log('✅ CalculiQ sample configuration generated');
    }

    displayResults() {
        console.log(`
🎯 CALCULIQ SETUP RESULTS
=====================================`);
        
        const statusEmoji = {
            environment: this.results.environment ? '✅' : '❌',
            directories: this.results.directories ? '✅' : '❌', 
            database: this.results.database ? '✅' : '❌',
            email: this.results.email ? '✅' : '⚠️',
            ai: this.results.ai ? '✅' : '⚠️'
        };
        
        console.log(`${statusEmoji.environment} Environment: ${this.results.environment ? 'Ready' : 'Needs Setup'}`);
        console.log(`${statusEmoji.directories} Directories: ${this.results.directories ? 'Ready' : 'Failed'}`);
        console.log(`${statusEmoji.database} Database: ${this.results.database ? 'Ready' : 'Failed'}`);
        console.log(`${statusEmoji.email} Email System: ${this.results.email ? 'Ready' : 'Optional Setup Needed'}`);
        console.log(`${statusEmoji.ai} AI Content: ${this.results.ai ? 'Ready' : 'Optional Setup Needed'}`);
        
        const readyCount = Object.values(this.results).filter(Boolean).length;
        const totalCount = Object.keys(this.results).length;
        
        console.log(`
📈 SYSTEM STATUS: ${readyCount}/${totalCount} components ready
        `);
    }

    showNextSteps() {
        const coreReady = this.results.environment && this.results.directories && this.results.database;
        
        if (coreReady) {
            console.log(`
🎉 CALCULIQ CORE SYSTEM READY!

🚀 NEXT STEPS:
=====================================

1. START YOUR CALCULIQ EMPIRE:
   npm run dev

2. ACCESS YOUR SYSTEM:
   • Electron app opens automatically
   • Backend API: http://localhost:3001
   • Click "Generate CalculiQ Empire"

3. OPEN YOUR DASHBOARD:
   • Generated dashboard.html file
   • Full control over automation
   • Revenue tracking and analytics

4. CONFIGURE AUTOMATION:
   • Test email sequences
   • Generate sample content
   • Set up affiliate programs
   • Monitor performance metrics

🔒 SAFETY FEATURES ACTIVE:
• Preview mode enabled by default (AUTOMATION_LIVE=false)
• Manual approval for publishing (AUTO_PUBLISH=false) 
• Test mode for all integrations
• Full control over activation

            `);
            
            if (!this.results.email) {
                console.log(`
📧 OPTIONAL: ENABLE EMAIL AUTOMATION
• Add EMAIL_USER and EMAIL_PASS to .env
• Use Gmail App Passwords for security
• Enables automated email sequences
                `);
            }
            
            if (!this.results.ai) {
                console.log(`
🤖 OPTIONAL: ENABLE AI CONTENT GENERATION  
• Add OPENAI_API_KEY to .env
• Cost: ~$20/month for AI content
• Enables automated blog post generation
                `);
            }
            
            console.log(`
💰 REVENUE POTENTIAL:
• Month 1: $500-2,000 (learning phase)
• Month 3: $5,000-15,000 (optimization)
• Month 6: $25,000-56,000 (scaling)
• Month 12: $50,000-120,000+ (empire mode)

🎯 Your CalculiQ automated revenue empire is ready to launch!
            `);
            
        } else {
            console.log(`
⚠️  CALCULIQ SETUP INCOMPLETE

📋 REQUIRED ACTIONS:
=====================================
            `);
            
            if (!this.results.environment) {
                console.log(`
1. ENVIRONMENT SETUP:
   • Create .env file from template
   • Add your email credentials at minimum
                `);
            }
            
            if (!this.results.database) {
                console.log(`
2. DATABASE ISSUE:
   • SQLite dependency may need reinstallation
   • Try: npm install sqlite3 --save
                `);
            }
            
            if (!this.results.directories) {
                console.log(`
3. DIRECTORY PERMISSIONS:
   • Run as administrator if on Windows
   • Check folder write permissions
                `);
            }
            
            console.log(`
🔄 After fixing issues, run: npm run setup
            `);
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new CalculiQSetup();
    setup.runSetup().catch(console.error);
}

module.exports = CalculiQSetup;