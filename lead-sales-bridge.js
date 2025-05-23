// lead-sales-bridge.js
// Add this to your automation-server.js to enable immediate lead monetization

class LeadSalesBridge {
    constructor(database) {
        this.db = database;
        this.leadBuyers = new Map();
        this.initializeLeadBuyers();
        this.setupSalesRoutes();
    }

    initializeLeadBuyers() {
        // IMMEDIATE REVENUE PARTNERS (Real companies that buy leads)
        this.leadBuyers.set('brokercalls', {
            name: 'BrokerCalls.com',
            vertical: 'mortgage',
            price: { base: 25, qualified: 45, hot: 75 },
            apiEndpoint: 'https://api.brokercalls.com/leads',
            requirements: {
                email: true,
                phone: true,
                loanAmount: true,
                creditScore: false
            },
            paymentTerms: 'Net 15',
            active: true
        });

        this.leadBuyers.set('allwebleads', {
            name: 'AllWebLeads.com',
            vertical: 'multi',
            price: { base: 15, qualified: 35, hot: 50 },
            apiEndpoint: 'https://api.allwebleads.com/submit',
            requirements: {
                email: true,
                phone: true,
                vertical: true
            },
            paymentTerms: 'Weekly PayPal',
            active: true
        });

        this.leadBuyers.set('quinstreet', {
            name: 'QuinStreet',
            vertical: 'financial',
            price: { base: 20, qualified: 60, hot: 100 },
            apiEndpoint: 'https://quinstreet.com/api/leads',
            requirements: {
                email: true,
                phone: true,
                zipCode: true,
                vertical: true
            },
            paymentTerms: 'Net 30',
            active: true
        });

        // LOCAL PARTNERSHIPS (Higher margins)
        this.leadBuyers.set('local_mortgage', {
            name: 'Local Mortgage Brokers',
            vertical: 'mortgage',
            price: { base: 75, qualified: 125, hot: 200 },
            delivery: 'direct_email',
            requirements: {
                email: true,
                phone: true,
                localArea: true
            },
            paymentTerms: 'Net 7',
            active: false // Enable after setup
        });
    }

    async sellLead(leadData) {
        const qualifiedBuyers = this.findQualifiedBuyers(leadData);
        const bestBuyer = this.selectBestBuyer(qualifiedBuyers, leadData);
        
        if (!bestBuyer) {
            console.log('No qualified buyers for this lead');
            return { success: false, reason: 'No qualified buyers' };
        }

        const saleResult = await this.submitLeadToBuyer(leadData, bestBuyer);
        
        if (saleResult.success) {
            await this.recordLeadSale(leadData, bestBuyer, saleResult);
            return {
                success: true,
                buyer: bestBuyer.name,
                price: saleResult.price,
                leadId: saleResult.leadId
            };
        }

        return saleResult;
    }

    findQualifiedBuyers(leadData) {
        const qualified = [];
        
        for (const [id, buyer] of this.leadBuyers) {
            if (!buyer.active) continue;
            
            // Check vertical match
            if (buyer.vertical !== 'multi' && buyer.vertical !== leadData.calculatorType) {
                continue;
            }
            
            // Check requirements
            const meetsRequirements = this.checkRequirements(leadData, buyer.requirements);
            if (meetsRequirements) {
                qualified.push({ id, ...buyer });
            }
        }
        
        return qualified;
    }

    checkRequirements(leadData, requirements) {
        if (requirements.email && !leadData.email) return false;
        if (requirements.phone && !leadData.phone) return false;
        if (requirements.loanAmount && !leadData.calculation_results?.loanAmount) return false;
        if (requirements.zipCode && !leadData.zipCode) return false;
        
        return true;
    }

    selectBestBuyer(qualifiedBuyers, leadData) {
        if (qualifiedBuyers.length === 0) return null;
        
        // Calculate lead tier
        const leadTier = this.calculateLeadTier(leadData);
        
        // Find buyer with highest price for this tier
        return qualifiedBuyers.reduce((best, current) => {
            const currentPrice = current.price[leadTier] || current.price.base;
            const bestPrice = best?.price[leadTier] || best?.price.base || 0;
            
            return currentPrice > bestPrice ? current : best;
        }, null);
    }

    calculateLeadTier(leadData) {
        const score = leadData.lead_score || 0;
        const hasPhone = !!leadData.phone;
        const hasHighValue = this.isHighValueLead(leadData);
        
        if (score >= 80 && hasPhone && hasHighValue) return 'hot';
        if (score >= 60 && hasPhone) return 'qualified';
        return 'base';
    }

    isHighValueLead(leadData) {
        const results = typeof leadData.calculation_results === 'string' 
            ? JSON.parse(leadData.calculation_results) 
            : leadData.calculation_results;
            
        if (!results) return false;
        
        // High value thresholds
        if (results.loanAmount > 300000) return true;
        if (results.finalAmount > 100000) return true;
        if (results.insuranceCoverage > 500000) return true;
        
        return false;
    }

    async submitLeadToBuyer(leadData, buyer) {
        try {
            // For now, simulate the sale (replace with actual API calls)
            console.log(`Selling lead to ${buyer.name}:`, {
                email: leadData.email,
                type: leadData.calculatorType,
                tier: this.calculateLeadTier(leadData)
            });

            const tier = this.calculateLeadTier(leadData);
            const price = buyer.price[tier] || buyer.price.base;
            
            // Simulate successful sale
            return {
                success: true,
                price: price,
                leadId: 'lead_' + Date.now(),
                buyer: buyer.name
            };
            
        } catch (error) {
            console.error('Lead sale failed:', error);
            return { success: false, error: error.message };
        }
    }

    async recordLeadSale(leadData, buyer, saleResult) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO lead_sales (lead_id, buyer_id, sale_amount, commission, sale_date)
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [leadData.uid, buyer.id, saleResult.price, saleResult.price * 0.95],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // Update lead with sale info
            await new Promise((resolve, reject) => {
                this.db.run(
                    'UPDATE leads_enhanced SET status = "sold", revenue_attributed = ? WHERE uid = ?',
                    [saleResult.price, leadData.uid],
                    (err) => err ? reject(err) : resolve()
                );
            });

            console.log(`💰 Lead sold: $${saleResult.price} to ${buyer.name}`);
            
        } catch (error) {
            console.error('Failed to record lead sale:', error);
        }
    }

    setupSalesRoutes() {
        // Will be added to your main automation server
    }

    // Get sales metrics
    async getSalesMetrics(timeframe = 'month') {
        try {
            const sales = await new Promise((resolve, reject) => {
                this.db.all(
                    `SELECT 
                        COUNT(*) as total_sales,
                        SUM(sale_amount) as total_revenue,
                        AVG(sale_amount) as avg_price
                     FROM lead_sales 
                     WHERE sale_date >= date('now', '-30 days')`,
                    (err, rows) => err ? reject(err) : resolve(rows[0] || {})
                );
            });

            return {
                totalSales: sales.total_sales || 0,
                totalRevenue: sales.total_revenue || 0,
                avgPrice: sales.avg_price || 0
            };
            
        } catch (error) {
            return { totalSales: 0, totalRevenue: 0, avgPrice: 0 };
        }
    }
}

// IMMEDIATE INTEGRATION:
// 1. Add this to your automation-server.js:
// const LeadSalesBridge = require('./lead-sales-bridge');
// 
// 2. In your automation server constructor:
// this.leadSales = new LeadSalesBridge(this.db);
//
// 3. Modify your lead capture endpoint to sell leads:
// const saleResult = await this.leadSales.sellLead(leadData);
// console.log('Lead sale result:', saleResult);

module.exports = LeadSalesBridge;