 automation-server-simple.js
 SIMPLE Lead Generation & Selling System for CalculiQ
 This version focuses on just capturing and selling leads

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

 Optional security (install with npm install helmet express-rate-limit)
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

class SimpleLeadServer {
    constructor() {
        this.app = express();
        this.db = null;
        this.setupMiddleware();
        this.initializeDatabase();
        this.setupRoutes();
        
        console.log('🚀 CalculiQ Lead Server Starting...');
    }

    setupMiddleware() {
         Basic security
        this.app.use(helmet({
            contentSecurityPolicy false  Allow inline scripts for calculators
        }));
        
         Rate limiting - prevent spam
        const limiter = rateLimit({
            windowMs 15  60  1000,  15 minutes
            max 100  limit each IP to 100 requests
        });
        
        this.app.use('api', limiter);
        
         Enable CORS
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('.'));
        
         Simple logging
        this.app.use((req, res, next) = {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    async initializeDatabase() {
        try {
            this.db = new sqlite3.Database('.calculiq_leads.db');
            
             Simple tables - just what you need
            const tables = [
                 Main leads table
                `CREATE TABLE IF NOT EXISTS leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    phone TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    calculator_type TEXT,
                    calculation_data TEXT,
                    lead_value DECIMAL(10,2) DEFAULT 0,
                    sold_to TEXT,
                    sold_price DECIMAL(10,2),
                    sold_date DATETIME,
                    ip_address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'new'
                )`,
                
                 Track who opted out
                `CREATE TABLE IF NOT EXISTS opt_outs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    opt_out_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    reason TEXT
                )`,
                
                 Track sales for reporting
                `CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lead_id INTEGER,
                    buyer TEXT,
                    price DECIMAL(10,2),
                    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (lead_id) REFERENCES leads(id)
                )`
            ];

            for (const sql of tables) {
                await new Promise((resolve, reject) = {
                    this.db.run(sql, err = err  reject(err)  resolve());
                });
            }
            
            console.log('✅ Database ready');
            
        } catch (error) {
            console.error('❌ Database error', error);
        }
    }

    setupRoutes() {
         Health check
        this.app.get('apihealth', (req, res) = {
            res.json({ 
                status 'healthy',
                service 'CalculiQ Lead System',
                timestamp new Date().toISOString()
            });
        });

         Main lead capture endpoint
        this.app.post('apicapture-lead', async (req, res) = {
            try {
                const { email, phone, calculatorType, results } = req.body;
                const ip = req.headers['x-forwarded-for']  req.connection.remoteAddress;
                
                 Check if email opted out
                const optedOut = await this.checkOptOut(email);
                if (optedOut) {
                    return res.json({ 
                        success false, 
                        message 'This email has opted out of communications' 
                    });
                }
                
                 Calculate lead value based on type
                const leadValue = this.calculateLeadValue(calculatorType, results);
                
                 Save lead to database
                const leadId = await this.saveLead({
                    email,
                    phone,
                    calculator_type calculatorType,
                    calculation_data JSON.stringify(results),
                    lead_value leadValue,
                    ip_address ip
                });
                
                 Auto-sell if valuable enough
                if (leadValue = 50) {
                    await this.sellLead(leadId, leadValue);
                }
                
                res.json({
                    success true,
                    message 'Thank you! You'll receive personalized quotes within 24 hours.',
                    leadId
                });
                
            } catch (error) {
                console.error('Lead capture error', error);
                res.status(500).json({ 
                    success false, 
                    message 'Error processing your information' 
                });
            }
        });

         Simple opt-out endpoint
        this.app.get('apiunsubscribeemail', async (req, res) = {
            try {
                const email = decodeURIComponent(req.params.email);
                
                await new Promise((resolve, reject) = {
                    this.db.run(
                        'INSERT OR REPLACE INTO opt_outs (email, reason) VALUES (, )',
                        [email, 'unsubscribe_link'],
                        err = err  reject(err)  resolve()
                    );
                });
                
                res.send(`
                    html
                    headtitleUnsubscribedtitlehead
                    body style=font-family Arial; text-align center; padding 50px;
                        h1✓ Unsubscribed Successfullyh1
                        pYou have been removed from our list.p
                        pa href=Return to Homepageap
                    body
                    html
                `);
                
            } catch (error) {
                res.status(500).send('Error processing unsubscribe');
            }
        });

         Privacy request (Do Not Sell)
        this.app.post('apiprivacy-request', async (req, res) = {
            try {
                const { email, type } = req.body;
                
                if (type === 'do_not_sell') {
                    await new Promise((resolve, reject) = {
                        this.db.run(
                            'INSERT OR REPLACE INTO opt_outs (email, reason) VALUES (, )',
                            [email, 'do_not_sell'],
                            err = err  reject(err)  resolve()
                        );
                    });
                }
                
                res.json({ 
                    success true, 
                    message 'Your privacy request has been processed' 
                });
                
            } catch (error) {
                res.status(500).json({ 
                    success false, 
                    error 'Error processing request' 
                });
            }
        });

         Get today's stats (for your dashboard)
        this.app.get('apistats', async (req, res) = {
            try {
                const stats = await this.getStats();
                res.json({ success true, stats });
            } catch (error) {
                res.status(500).json({ success false, error error.message });
            }
        });

         Serve your website
        this.app.get('', (req, res) = {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

     Helper Methods
    
    async checkOptOut(email) {
        return new Promise((resolve, reject) = {
            this.db.get(
                'SELECT  FROM opt_outs WHERE email = ',
                [email],
                (err, row) = resolve(!!row)
            );
        });
    }

    calculateLeadValue(calculatorType, results) {
         Base values for each calculator type
        const baseValues = {
            mortgage 100,
            investment 50,
            loan 75,
            insurance 80
        };
        
        let value = baseValues[calculatorType]  40;
        
         Adjust based on calculation results
        if (calculatorType === 'mortgage' && results.loanAmount  300000) {
            value += 50;
        }
        if (calculatorType === 'investment' && results.finalAmount  500000) {
            value += 30;
        }
        
        return value;
    }

    async saveLead(leadData) {
        return new Promise((resolve, reject) = {
            const fields = Object.keys(leadData);
            const placeholders = fields.map(() = '').join(',');
            const values = Object.values(leadData);
            
            this.db.run(
                `INSERT INTO leads (${fields.join(',')}) VALUES (${placeholders})`,
                values,
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async sellLead(leadId, leadValue) {
         This is where you'd integrate with real lead buyers
         For now, just mark as sold with simulated buyer
        
        const buyers = {
            mortgage ['LendingTree', 'Rocket Mortgage', 'Better.com'],
            investment ['SmartAsset', 'Personal Capital'],
            loan ['LendingClub', 'SoFi'],
            insurance ['SelectQuote', 'Policygenius']
        };
        
         Get lead info
        const lead = await new Promise((resolve, reject) = {
            this.db.get(
                'SELECT  FROM leads WHERE id = ',
                [leadId],
                (err, row) = err  reject(err)  resolve(row)
            );
        });
        
        if (!lead) return;
        
         Pick a random buyer for this type
        const typeBuyers = buyers[lead.calculator_type]  buyers.loan;
        const buyer = typeBuyers[Math.floor(Math.random()  typeBuyers.length)];
        
         Calculate sale price (you'd negotiate real prices with buyers)
        const salePrice = leadValue  0.8;  80% of calculated value
        
         Update lead as sold
        await new Promise((resolve, reject) = {
            this.db.run(
                `UPDATE leads SET 
                    sold_to = , 
                    sold_price = , 
                    sold_date = CURRENT_TIMESTAMP,
                    status = 'sold'
                WHERE id = `,
                [buyer, salePrice, leadId],
                err = err  reject(err)  resolve()
            );
        });
        
         Record the sale
        await new Promise((resolve, reject) = {
            this.db.run(
                'INSERT INTO sales (lead_id, buyer, price) VALUES (, , )',
                [leadId, buyer, salePrice],
                err = err  reject(err)  resolve()
            );
        });
        
        console.log(`💰 Lead #${leadId} sold to ${buyer} for $${salePrice}`);
        
         TODO Call actual buyer API
         await this.sendToBuyer(buyer, lead);
    }

    async getStats() {
        const today = new Date().toISOString().split('T')[0];
        
        const todayLeads = await new Promise((resolve, reject) = {
            this.db.get(
                `SELECT COUNT() as count FROM leads WHERE date(created_at) = date()`,
                [today],
                (err, row) = resolve(row.count  0)
            );
        });
        
        const todayRevenue = await new Promise((resolve, reject) = {
            this.db.get(
                `SELECT SUM(sold_price) as total FROM leads WHERE date(sold_date) = date()`,
                [today],
                (err, row) = resolve(row.total  0)
            );
        });
        
        const totalRevenue = await new Promise((resolve, reject) = {
            this.db.get(
                `SELECT SUM(sold_price) as total FROM leads WHERE sold_price  0`,
                (err, row) = resolve(row.total  0)
            );
        });
        
        return {
            todayLeads,
            todayRevenue,
            totalRevenue,
            timestamp new Date().toISOString()
        };
    }

    start() {
        const port = process.env.PORT  3001;
        this.app.listen(port, () = {
            console.log(`
🚀 CalculiQ Lead Server Running!
📍 Port ${port}
💾 Database calculiq_leads.db
🌐 Open httplocalhost${port}

✅ What this does
- Captures leads from calculators
- Calculates lead value
- Sells leads automatically
- Tracks opt-outs
- Shows basic stats

⚠️  What you still need
- Real lead buyer APIs
- Your actual pricing
- Business details in .env
            `);
        });
    }
}

 Start the server
const server = new SimpleLeadServer();
server.start();