// affiliate-revenue-system.js
// Complete Affiliate Revenue System for CalculiQ Empire
// Drop this file in your AutomatedRevenueEmpire folder

const crypto = require('crypto');

class CalculiQAffiliateSystem {
    constructor(database) {
        this.db = database;
        this.affiliatePartners = new Map();
        this.revenueTracking = new Map();
        this.conversionEvents = new Map();
        
        this.initializeAffiliatePrograms();
        this.initializeAffiliateTables();
    }

    async initializeAffiliateTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS affiliate_programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS affiliate_clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_uid TEXT NOT NULL,
                affiliate_program TEXT NOT NULL,
                tracking_id TEXT NOT NULL,
                click_data TEXT,
                ip_address TEXT,
                user_agent TEXT,
                referrer TEXT,
                clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                converted BOOLEAN DEFAULT FALSE,
                conversion_value DECIMAL(10,2) DEFAULT 0,
                commission_earned DECIMAL(10,2) DEFAULT 0,
                conversion_date DATETIME
            )`,
            
            `CREATE TABLE IF NOT EXISTS revenue_attribution (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_uid TEXT NOT NULL,
                revenue_source TEXT NOT NULL,
                gross_revenue DECIMAL(10,2) NOT NULL,
                commission_earned DECIMAL(10,2) NOT NULL,
                affiliate_program TEXT,
                conversion_type TEXT,
                attribution_data TEXT,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                payout_status TEXT DEFAULT 'pending',
                payout_date DATETIME
            )`,
            
            `CREATE TABLE IF NOT EXISTS conversion_funnels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_uid TEXT NOT NULL,
                funnel_stage TEXT NOT NULL,
                stage_data TEXT,
                completion_time INTEGER,
                conversion_probability DECIMAL(5,4) DEFAULT 0,
                estimated_value DECIMAL(10,2) DEFAULT 0,
                stage_entered DATETIME DEFAULT CURRENT_TIMESTAMP,
                stage_completed DATETIME,
                next_stage TEXT
            )`
        ];

        for (const tableSQL of tables) {
            await new Promise((resolve, reject) => {
                this.db.run(tableSQL, (err) => {
                    if (err) {
                        console.error('Affiliate table creation error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
        
        console.log('✅ Affiliate revenue system tables initialized');
    }

    initializeAffiliatePrograms() {
        // High-converting mortgage affiliates
        this.affiliatePartners.set('rocket_mortgage', {
            name: 'Rocket Mortgage',
            type: 'mortgage',
            commission: {
                base: 500,
                qualified: 750,
                funded: 1200
            },
            conversionRate: 0.08,
            avgDealSize: 350000,
            trackingUrl: 'https://apply.rocketmortgage.com/purchase/eligibility-questions?customer_type=prospect&lead_id={{LEAD_ID}}&partner_id=calculiq',
            requirements: {
                minCreditScore: 580,
                maxLTV: 97,
                minIncome: 35000
            },
            priority: 1
        });

        this.affiliatePartners.set('better_mortgage', {
            name: 'Better.com',
            type: 'mortgage',
            commission: {
                base: 400,
                qualified: 600,
                funded: 1000
            },
            conversionRate: 0.12,
            avgDealSize: 425000,
            trackingUrl: 'https://better.com/preapproval?utm_source=calculiq&lead_id={{LEAD_ID}}&ref=partner',
            requirements: {
                minCreditScore: 620,
                maxLTV: 95,
                minIncome: 50000
            },
            priority: 2
        });

        // Investment affiliates
        this.affiliatePartners.set('td_ameritrade', {
            name: 'TD Ameritrade',
            type: 'investment',
            commission: {
                base: 150,
                funded: 300,
                active_trader: 500
            },
            conversionRate: 0.15,
            avgAccountSize: 25000,
            trackingUrl: 'https://www.tdameritrade.com/open-account.html?cid=calculiq&lead={{LEAD_ID}}',
            requirements: {
                minAge: 18,
                minInitialDeposit: 0
            },
            priority: 1
        });

        this.affiliatePartners.set('webull', {
            name: 'Webull',
            type: 'investment',
            commission: {
                base: 100,
                funded: 200,
                active_trader: 350
            },
            conversionRate: 0.22,
            avgAccountSize: 5000,
            trackingUrl: 'https://www.webull.com/activity?inviteCode=calculiq&lead={{LEAD_ID}}',
            requirements: {
                minAge: 18,
                minInitialDeposit: 0
            },
            priority: 2
        });

        // Loan affiliates
        this.affiliatePartners.set('sofi_loans', {
            name: 'SoFi Personal Loans',
            type: 'loan',
            commission: {
                base: 75,
                approved: 150,
                funded: 250
            },
            conversionRate: 0.06,
            avgLoanSize: 35000,
            trackingUrl: 'https://www.sofi.com/personal-loans/?utm_source=calculiq&lead_id={{LEAD_ID}}',
            requirements: {
                minCreditScore: 680,
                minIncome: 45000
            },
            priority: 1
        });

        // Insurance affiliates  
        this.affiliatePartners.set('selectquote', {
            name: 'SelectQuote Life Insurance',
            type: 'insurance',
            commission: {
                base: 50,
                quoted: 100,
                sold: 200
            },
            conversionRate: 0.18,
            avgPremium: 2400,
            trackingUrl: 'https://www.selectquote.com/life-insurance?utm_source=calculiq&lead_id={{LEAD_ID}}',
            requirements: {
                minAge: 18,
                maxAge: 75
            },
            priority: 1
        });

        console.log(`✅ ${this.affiliatePartners.size} affiliate programs initialized`);

// NEW: Add the 3 insurance programs  
this.affiliatePartners.set('policygenius', {
    name: 'Policygenius Insurance',
    type: 'insurance', 
    commission: {
        base: 75,
        quoted: 150,
        sold: 300
    },
    conversionRate: 0.15,
    avgPremium: 3000,
    trackingUrl: 'https://www.policygenius.com/life-insurance?utm_source=calculiq&lead_id={{LEAD_ID}}&ref=partner',
    requirements: {
        minAge: 18,
        maxAge: 80
    },
    priority: 2
});

this.affiliatePartners.set('geico', {
    name: 'GEICO Auto Insurance',
    type: 'insurance',
    commission: {
        base: 30,
        quoted: 75,
        sold: 150
    },
    conversionRate: 0.25,
    avgPremium: 1800,
    trackingUrl: 'https://www.geico.com/auto-insurance/?utm_source=calculiq&lead_id={{LEAD_ID}}&partner_id=calculiq',
    requirements: {
        minAge: 16,
        maxAge: 99
    },
    priority: 3
});

console.log(`✅ ${this.affiliatePartners.size} affiliate programs initialized`);
    }

    // ======================
    // LEAD QUALIFICATION & MATCHING
    // ======================

    async qualifyLeadForAffiliates(leadData) {
        const qualifications = [];
        
        for (const [partnerId, partner] of this.affiliatePartners) {
            const qualification = await this.evaluateLeadFit(leadData, partner);
            
            if (qualification.qualified) {
                qualifications.push({
                    partnerId,
                    partner,
                    qualification,
                    estimatedCommission: this.calculateEstimatedCommission(leadData, partner),
                    conversionProbability: this.calculateConversionProbability(leadData, partner)
                });
            }
        }

        // Sort by estimated value (commission * probability)
        qualifications.sort((a, b) => {
            const valueA = a.estimatedCommission * a.conversionProbability;
            const valueB = b.estimatedCommission * b.conversionProbability;
            return valueB - valueA;
        });

        return qualifications;
    }

    async evaluateLeadFit(leadData, partner) {
        const qualification = {
            qualified: false,
            score: 0,
            reasons: [],
            requirements_met: {}
        };

        // Parse calculation results
        const results = typeof leadData.calculation_results === 'string' ? 
            JSON.parse(leadData.calculation_results || '{}') : 
            (leadData.calculation_results || {});

        // Check calculator type match
        if (leadData.calculator_type !== partner.type) {
            qualification.reasons.push('Calculator type mismatch');
            return qualification;
        }

        // Evaluate specific requirements
        const reqs = partner.requirements;
        
        if (partner.type === 'mortgage') {
            const loanAmount = results.homePrice ? (results.homePrice - (results.downPayment || 0)) : 0;
            const creditScore = this.extractCreditScore(leadData);
            const ltv = results.homePrice ? ((loanAmount / results.homePrice) * 100) : 0;

            if (reqs.minCreditScore && creditScore && creditScore >= reqs.minCreditScore) {
                qualification.score += 25;
                qualification.requirements_met.creditScore = true;
            } else if (reqs.minCreditScore && creditScore) {
                qualification.reasons.push(`Credit score ${creditScore} below minimum ${reqs.minCreditScore}`);
            }

            if (reqs.maxLTV && ltv <= reqs.maxLTV) {
                qualification.score += 20;
                qualification.requirements_met.ltv = true;
            }

            if (loanAmount >= 50000) {
                qualification.score += 15;
                qualification.requirements_met.loanSize = true;
            }
        }

        if (partner.type === 'investment') {
            const investmentAmount = results.initialInvestment || results.finalAmount || 0;
            
            if (investmentAmount >= 1000) {
                qualification.score += 20;
                qualification.requirements_met.investmentSize = true;
            }
        }

        if (partner.type === 'loan') {
            const loanAmount = results.loanAmount || 0;
            const creditScore = this.extractCreditScore(leadData);

            if (reqs.minCreditScore && creditScore && creditScore >= reqs.minCreditScore) {
                qualification.score += 30;
                qualification.requirements_met.creditScore = true;
            }

            if (loanAmount >= 5000) {
                qualification.score += 15;
                qualification.requirements_met.loanSize = true;
            }
        }

        // Lead quality factors
        if (leadData.phone) qualification.score += 15;
        if (leadData.first_name) qualification.score += 10;
        if (leadData.lead_score >= 60) qualification.score += 10;

        // Qualification threshold
        qualification.qualified = qualification.score >= 40;
        
        if (qualification.qualified) {
            qualification.reasons.push(`Qualified with score ${qualification.score}/100`);
        } else {
            qualification.reasons.push(`Score ${qualification.score}/100 below threshold`);
        }

        return qualification;
    }

    calculateEstimatedCommission(leadData, partner) {
        const leadTier = leadData.lead_tier || 'cold';
        const baseCommission = partner.commission.base || 100;
        
        const tierMultipliers = {
            'hot': 1.5,
            'warm': 1.3,
            'qualified': 1.1,
            'nurture': 1.0,
            'cold': 0.8
        };

        return Math.round(baseCommission * (tierMultipliers[leadTier] || 1.0));
    }

    calculateConversionProbability(leadData, partner) {
        let baseProbability = partner.conversionRate || 0.05;
        
        // Adjust based on lead quality
        const leadScore = leadData.lead_score || 0;
        const scoreMultiplier = 1 + ((leadScore - 50) / 100); // +/- 50% based on score
        
        // Adjust based on lead tier
        const tierMultipliers = {
            'hot': 1.8,
            'warm': 1.4,
            'qualified': 1.1,
            'nurture': 1.0,
            'cold': 0.6
        };
        
        const tierMultiplier = tierMultipliers[leadData.lead_tier] || 1.0;
        
        return Math.min(baseProbability * scoreMultiplier * tierMultiplier, 0.95);
    }

    // ======================
    // AFFILIATE LINK GENERATION
    // ======================

    generateAffiliateLinks(leadData, qualifications) {
        const links = [];
        
        for (const qual of qualifications.slice(0, 3)) { // Top 3 matches
            const trackingId = this.generateTrackingId(leadData.uid, qual.partnerId);
            const affiliateUrl = this.buildTrackingUrl(qual.partner, leadData, trackingId);
            
            links.push({
                partnerId: qual.partnerId,
                partnerName: qual.partner.name,
                url: affiliateUrl,
                trackingId: trackingId,
                estimatedCommission: qual.estimatedCommission,
                conversionProbability: qual.conversionProbability,
                estimatedValue: qual.estimatedCommission * qual.conversionProbability,
                qualification: qual.qualification,
                priority: qual.partner.priority
            });
        }
        
        return links.sort((a, b) => a.priority - b.priority);
    }

    buildTrackingUrl(partner, leadData, trackingId) {
        let url = partner.trackingUrl;
        
        // Replace tracking parameters
        url = url.replace('{{LEAD_ID}}', leadData.uid);
        url = url.replace('{{TRACKING_ID}}', trackingId);
        url = url.replace('{{EMAIL}}', encodeURIComponent(leadData.email || ''));
        url = url.replace('{{ZIP}}', leadData.zip_code || '');
        
        // Add additional tracking parameters
        const params = new URLSearchParams({
            'utm_campaign': 'calculiq_lead_gen',
            'utm_medium': 'calculator',
            'utm_content': leadData.calculator_type,
            'calc_score': leadData.lead_score || 0,
            'calc_tier': leadData.lead_tier || 'unknown'
        });
        
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + params.toString();
    }

    generateTrackingId(leadUid, partnerId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `cq_${partnerId}_${timestamp}_${random}`;
    }

    // ======================
    // CLICK TRACKING & CONVERSION
    // ======================

    async trackAffiliateClick(leadUid, partnerId, trackingId, clickData = {}) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO affiliate_clicks (
                        lead_uid, affiliate_program, tracking_id, click_data,
                        ip_address, user_agent, referrer
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        leadUid,
                        partnerId,
                        trackingId,
                        JSON.stringify(clickData),
                        clickData.ip || null,
                        clickData.userAgent || null,
                        clickData.referrer || null
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });

            console.log(`🔗 Affiliate click tracked: ${partnerId} for lead ${leadUid}`);
            return { success: true, trackingId };
            
        } catch (error) {
            console.error('Affiliate click tracking error:', error);
            return { success: false, error: error.message };
        }
    }

    async recordConversion(trackingId, conversionData) {
        try {
            const conversionValue = conversionData.value || 0;
            const partner = this.affiliatePartners.get(conversionData.partnerId);
            const commission = this.calculateActualCommission(partner, conversionData);

            await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE affiliate_clicks SET 
                        converted = TRUE,
                        conversion_value = ?,
                        commission_earned = ?,
                        conversion_date = CURRENT_TIMESTAMP
                    WHERE tracking_id = ?`,
                    [conversionValue, commission, trackingId],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // Record revenue attribution
            await this.recordRevenueAttribution(trackingId, conversionData, commission);

            console.log(`💰 Conversion recorded: ${trackingId} - $${commission} commission`);
            return { success: true, commission };
            
        } catch (error) {
            console.error('Conversion recording error:', error);
            return { success: false, error: error.message };
        }
    }

    async recordRevenueAttribution(trackingId, conversionData, commission) {
        // Get lead info from click tracking
        const clickData = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT lead_uid, affiliate_program FROM affiliate_clicks WHERE tracking_id = ?',
                [trackingId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (clickData) {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO revenue_attribution (
                        lead_uid, revenue_source, gross_revenue, commission_earned,
                        affiliate_program, conversion_type, attribution_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        clickData.lead_uid,
                        'affiliate_commission',
                        conversionData.value || 0,
                        commission,
                        clickData.affiliate_program,
                        conversionData.type || 'unknown',
                        JSON.stringify(conversionData)
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        }
    }

    calculateActualCommission(partner, conversionData) {
        if (!partner || !partner.commission) return 0;
        
        const conversionType = conversionData.type || 'base';
        return partner.commission[conversionType] || partner.commission.base || 0;
    }

    // ======================
    // REVENUE ANALYTICS
    // ======================

    async getRevenueMetrics(timeframe = 'month') {
        try {
            const dateFilter = this.getDateFilter(timeframe);
            
            const totalCommissions = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT SUM(commission_earned) as total 
                     FROM revenue_attribution 
                     WHERE recorded_at ${dateFilter}`,
                    (err, row) => err ? reject(err) : resolve(row?.total || 0)
                );
            });

            const conversionCount = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT COUNT(*) as count 
                     FROM affiliate_clicks 
                     WHERE converted = TRUE AND conversion_date ${dateFilter}`,
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });

            const clickCount = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT COUNT(*) as count 
                     FROM affiliate_clicks 
                     WHERE clicked_at ${dateFilter}`,
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });

            const conversionRate = clickCount > 0 ? (conversionCount / clickCount) : 0;
            const avgCommission = conversionCount > 0 ? (totalCommissions / conversionCount) : 0;

            return {
                totalCommissions: parseFloat(totalCommissions) || 0,
                conversionCount,
                clickCount,
                conversionRate: (conversionRate * 100).toFixed(2),
                avgCommission: parseFloat(avgCommission) || 0,
                timeframe
            };
            
        } catch (error) {
            console.error('Revenue metrics error:', error);
            return {
                totalCommissions: 0,
                conversionCount: 0,
                clickCount: 0,
                conversionRate: '0.00',
                avgCommission: 0,
                timeframe
            };
        }
    }

    async getTopPerformingAffiliates(limit = 10) {
        try {
            const affiliates = await new Promise((resolve, reject) => {
                this.db.all(
                    `SELECT 
                        ac.affiliate_program,
                        COUNT(ac.id) as total_clicks,
                        COUNT(CASE WHEN ac.converted THEN 1 END) as conversions,
                        SUM(ac.commission_earned) as total_commission,
                        AVG(ac.commission_earned) as avg_commission,
                        (COUNT(CASE WHEN ac.converted THEN 1 END) * 100.0 / COUNT(ac.id)) as conversion_rate
                     FROM affiliate_clicks ac
                     GROUP BY ac.affiliate_program
                     ORDER BY total_commission DESC
                     LIMIT ?`,
                    [limit],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });

            return affiliates.map(affiliate => ({
                ...affiliate,
                partnerName: this.affiliatePartners.get(affiliate.affiliate_program)?.name || affiliate.affiliate_program,
                conversion_rate: parseFloat(affiliate.conversion_rate || 0).toFixed(2)
            }));
            
        } catch (error) {
            console.error('Top affiliates error:', error);
            return [];
        }
    }

    getDateFilter(timeframe) {
        const filters = {
            'today': ">= date('now')",
            'week': ">= date('now', '-7 days')",
            'month': ">= date('now', '-30 days')",
            'quarter': ">= date('now', '-90 days')",
            'year': ">= date('now', '-365 days')"
        };
        
        return filters[timeframe] || filters.month;
    }

    // ======================
    // UTILITY METHODS
    // ======================

    extractCreditScore(leadData) {
        // Extract from behavioral data or form input
        if (leadData.behavioral_data) {
            const behavioral = typeof leadData.behavioral_data === 'string' ? 
                JSON.parse(leadData.behavioral_data) : leadData.behavioral_data;
            
            if (behavioral.creditScore) {
                return this.parseCreditScore(behavioral.creditScore);
            }
        }
        
        return null;
    }

    parseCreditScore(scoreRange) {
        const scoreMappings = {
            '800+': 820,
            '750-799': 775,
            '700-749': 725,
            '650-699': 675,
            '600-649': 625,
            '<600': 580
        };
        
        return scoreMappings[scoreRange] || null;
    }

    // ======================
    // EXPRESS ROUTE HANDLERS
    // ======================

    setupRoutes(app) {
        // Affiliate qualification and matching
        app.post('/api/qualify-lead-affiliates', async (req, res) => {
            try {
                const { leadData } = req.body;
                const qualifications = await this.qualifyLeadForAffiliates(leadData);
                const affiliateLinks = this.generateAffiliateLinks(leadData, qualifications);
                
                res.json({
                    success: true,
                    qualifications: qualifications.length,
                    affiliateLinks,
                    estimatedRevenue: affiliateLinks.reduce((sum, link) => sum + link.estimatedValue, 0)
                });
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Track affiliate clicks
        app.post('/api/track-affiliate-click', async (req, res) => {
            try {
                const { leadUid, partnerId, trackingId, clickData } = req.body;
                const result = await this.trackAffiliateClick(leadUid, partnerId, trackingId, clickData);
                res.json(result);
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Record conversions (webhook endpoint)
        app.post('/api/record-conversion', async (req, res) => {
            try {
                const { trackingId, conversionData } = req.body;
                const result = await this.recordConversion(trackingId, conversionData);
                res.json(result);
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Revenue analytics
        app.get('/api/affiliate-revenue', async (req, res) => {
            try {
                const timeframe = req.query.timeframe || 'month';
                const metrics = await this.getRevenueMetrics(timeframe);
                res.json({ success: true, metrics });
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Top performing affiliates
        app.get('/api/top-affiliates', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 10;
                const affiliates = await this.getTopPerformingAffiliates(limit);
                res.json({ success: true, affiliates });
                
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        console.log('✅ Affiliate revenue system routes initialized');
    }
}

module.exports = CalculiQAffiliateSystem;