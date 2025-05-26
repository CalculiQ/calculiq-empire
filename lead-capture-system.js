// lead-capture-system.js
// Complete Lead Capture System for CalculiQ Empire - BACKEND
// Drop this file in your AutomatedRevenueEmpire folder

const crypto = require('crypto');

class CalculiQLeadCapture {
    constructor(database) {
        this.db = database;
        this.leadScoring = new Map();
        this.exitIntentShown = new Set(); // Track who's seen exit intent
        this.conversionTriggers = new Map();
        
        // Initialize lead capture database tables
        this.initializeLeadTables();
    }

    async initializeLeadTables() {
        const tables = [
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
            )`
        ];

        for (const tableSQL of tables) {
            try {
                await this.db.query(tableSQL);
            } catch (error) {
                console.error('Lead table creation error:', error);
            }
        }
        
        console.log('✅ Lead capture tables initialized');
    }

    // LEAD SCORING SYSTEM
    calculateLeadScore(leadData) {
        let score = 0;
        const breakdown = {};

        // Email provided
        if (leadData.email) {
            score += 20;
            breakdown.email = 20;
        }

        // Phone provided
        if (leadData.phone) {
            score += 30;
            breakdown.phone = 30;
        }

        // Credit score
        if (leadData.creditScore) {
            const creditScores = {
                '800+': 25,
                '750-799': 20,
                '700-749': 15,
                '650-699': 10,
                '600-649': 5,
                '<600': 0
            };
            score += creditScores[leadData.creditScore] || 0;
            breakdown.creditScore = creditScores[leadData.creditScore] || 0;
        }

        // Calculator type value
        const calculatorValues = {
            'mortgage': 15,
            'investment': 10,
            'loan': 12,
            'insurance': 13
        };
        if (leadData.calculatorType) {
            score += calculatorValues[leadData.calculatorType] || 5;
            breakdown.calculatorType = calculatorValues[leadData.calculatorType] || 5;
        }

        // Calculation value (higher value = higher score)
        if (leadData.calculationValue) {
            if (leadData.calculationValue > 500000) score += 15;
            else if (leadData.calculationValue > 250000) score += 10;
            else if (leadData.calculationValue > 100000) score += 5;
            breakdown.calculationValue = Math.min(15, Math.floor(leadData.calculationValue / 50000));
        }

        // Multiple interactions
        if (leadData.interactions && leadData.interactions.length > 1) {
            score += 10;
            breakdown.multipleInteractions = 10;
        }

        return {
            totalScore: Math.min(score, 100),
            breakdown: breakdown,
            tier: this.getLeadTier(score)
        };
    }

    getLeadTier(score) {
        if (score >= 80) return 'hot';
        if (score >= 60) return 'warm';
        if (score >= 40) return 'qualified';
        if (score >= 20) return 'nurture';
        return 'cold';
    }

    // DATABASE OPERATIONS
    async captureLead(leadData) {
        const uid = this.generateUID();
        const leadScore = this.calculateLeadScore(leadData);
        
        try {
            if (this.db) {
                await this.db.query(
                    `INSERT INTO leads_enhanced (
                        uid, email, first_name, last_name, phone, 
                        calculator_type, calculation_results, lead_score, 
                        lead_tier, source, behavioral_data, step
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        uid,
                        leadData.email,
                        leadData.firstName || null,
                        leadData.lastName || null,
                        leadData.phone || null,
                        leadData.calculatorType,
                        JSON.stringify(leadData.results || {}),
                        leadScore.totalScore,
                        leadScore.tier,
                        leadData.source || 'calculator',
                        JSON.stringify(leadData.behavioral || {}),
                        leadData.step || 1
                    ]
                );
            }

            // Track the interaction
            await this.trackLeadInteraction(uid, 'lead_captured', {
                score: leadScore.totalScore,
                tier: leadScore.tier,
                source: leadData.source
            });

            console.log(`💰 Lead captured: ${leadData.email}, Score: ${leadScore.totalScore}, Tier: ${leadScore.tier}`);

            return { success: true, uid, leadScore };
        } catch (error) {
            console.error('Lead capture error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateLead(email, updateData) {
        try {
            const leadScore = this.calculateLeadScore({...updateData, email});
            
            if (this.db) {
                await this.db.query(
                    `UPDATE leads_enhanced SET 
                        first_name = COALESCE($1, first_name),
                        last_name = COALESCE($2, last_name),
                        phone = COALESCE($3, phone),
                        lead_score = $4,
                        lead_tier = $5,
                        step = $6,
                        behavioral_data = $7,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = $8`,
                    [
                        updateData.firstName,
                        updateData.lastName,
                        updateData.phone,
                        leadScore.totalScore,
                        leadScore.tier,
                        updateData.step || 2,
                        JSON.stringify(updateData.behavioral || {}),
                        email
                    ]
                );
            }

            console.log(`👤 Lead updated: ${email}, New Score: ${leadScore.totalScore}`);

            return { success: true, leadScore };
        } catch (error) {
            console.error('Lead update error:', error);
            return { success: false, error: error.message };
        }
    }

    async trackLeadInteraction(leadUid, interactionType, data = {}) {
        try {
            if (this.db) {
                await this.db.query(
                    `INSERT INTO lead_interactions (lead_uid, interaction_type, interaction_data, conversion_score)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        leadUid,
                        interactionType,
                        JSON.stringify(data),
                        data.conversionScore || 0
                    ]
                );
            }
        } catch (error) {
            console.error('Interaction tracking error:', error);
        }
    }

    async getLeadMetrics() {
        try {
            if (!this.db) {
                return {
                    totalLeads: 0,
                    hotLeads: 0,
                    warmLeads: 0,
                    qualifiedLeads: 0,
                    estimatedRevenue: 0,
                    conversionRate: '0.00',
                    averageScore: 0
                };
            }

            const totalResult = await this.db.query('SELECT COUNT(*) as count FROM leads_enhanced');
            const totalLeads = parseInt(totalResult.rows[0]?.count || 0);

            const hotResult = await this.db.query('SELECT COUNT(*) as count FROM leads_enhanced WHERE lead_tier = $1', ['hot']);
            const hotLeads = parseInt(hotResult.rows[0]?.count || 0);

            const warmResult = await this.db.query('SELECT COUNT(*) as count FROM leads_enhanced WHERE lead_tier = $1', ['warm']);
            const warmLeads = parseInt(warmResult.rows[0]?.count || 0);

            const qualifiedResult = await this.db.query('SELECT COUNT(*) as count FROM leads_enhanced WHERE lead_score >= 60');
            const qualifiedLeads = parseInt(qualifiedResult.rows[0]?.count || 0);

            const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : '0.00';
            const estimatedRevenue = (hotLeads * 250) + (warmLeads * 150) + (qualifiedLeads * 100);

            const avgScoreResult = await this.db.query('SELECT AVG(lead_score) as avg_score FROM leads_enhanced WHERE lead_score > 0');
            const averageScore = Math.round(avgScoreResult.rows[0]?.avg_score || 0);

            return {
                totalLeads,
                hotLeads,
                warmLeads,
                qualifiedLeads,
                conversionRate,
                estimatedRevenue,
                averageScore
            };
        } catch (error) {
            console.error('Lead metrics error:', error);
            return {
                totalLeads: 0,
                hotLeads: 0,
                warmLeads: 0,
                qualifiedLeads: 0,
                estimatedRevenue: 0,
                conversionRate: '0.00',
                averageScore: 0
            };
        }
    }

    async getRecentLeads(limit = 10) {
        try {
            if (!this.db) return [];

            const result = await this.db.query(
                'SELECT * FROM leads_enhanced ORDER BY created_at DESC LIMIT $1',
                [limit]
            );

            return result.rows || [];
        } catch (error) {
            console.error('Get recent leads error:', error);
            return [];
        }
    }

    generateUID() {
        return 'lead_' + crypto.randomBytes(8).toString('hex') + '_' + Date.now().toString(36);
    }

    // EXPRESS ROUTE HANDLERS
    setupRoutes(app) {
        // Lead capture routes
        app.post('/api/capture-lead-email', async (req, res) => {
            try {
                const { email, calculatorType, results, source } = req.body;
                
                if (!email) {
                    return res.status(400).json({ success: false, error: 'Email required' });
                }

                const leadData = {
                    email,
                    calculatorType,
                    results,
                    source: source || 'email_capture',
                    step: 1,
                    calculationValue: this.extractCalculationValue(calculatorType, results)
                };

                const result = await this.captureLead(leadData);
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Email captured successfully',
                        leadScore: result.leadScore,
                        nextStep: 'profile_completion'
                    });
                } else {
                    res.status(500).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.post('/api/capture-lead-profile', async (req, res) => {
            try {
                const { email, firstName, lastName, phone, creditScore, behavioral } = req.body;
                
                const updateData = {
                    firstName,
                    lastName,
                    phone,
                    creditScore,
                    behavioral,
                    step: 2
                };

                const result = await this.updateLead(email, updateData);
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Profile completed successfully',
                        leadScore: result.leadScore,
                        tier: result.leadScore.tier
                    });
                } else {
                    res.status(500).json({ success: false, error: result.error });
                }
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.post('/api/capture-exit-intent', async (req, res) => {
            try {
                const { email, calculatorType, results } = req.body;
                
                const leadData = {
                    email,
                    calculatorType,
                    results,
                    source: 'exit_intent',
                    step: 0,
                    calculationValue: this.extractCalculationValue(calculatorType, results)
                };

                const result = await this.captureLead(leadData);
                res.json({ success: true, message: 'Exit intent captured' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.get('/api/lead-metrics', async (req, res) => {
            try {
                const metrics = await this.getLeadMetrics();
                res.json({ success: true, metrics });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.get('/api/leads', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 10;
                const leads = await this.getRecentLeads(limit);
                res.json({ success: true, leads });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.post('/api/track-lead-interaction', async (req, res) => {
            try {
                const { leadUID, interactionType, data } = req.body;
                await this.trackLeadInteraction(leadUID, interactionType, data);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        console.log('✅ Lead capture routes initialized');
    }

    // Helper method to extract calculation value for lead scoring
    extractCalculationValue(calculatorType, results) {
        if (!results) return 0;

        switch (calculatorType) {
            case 'mortgage':
                return results.homePrice || results.loanAmount || 0;
            case 'investment':
                return results.finalAmount || results.initialInvestment || 0;
            case 'loan':
                return results.loanAmount || 0;
            case 'insurance':
                return results.insuranceCoverage || 0;
            default:
                return 0;
        }
    }
}

module.exports = CalculiQLeadCapture;