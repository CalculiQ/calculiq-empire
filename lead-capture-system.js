// lead-capture-system.js
// Complete Lead Capture System for CalculiQ Empire
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
            
            `CREATE TABLE IF NOT EXISTS lead_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_uid TEXT NOT NULL,
                interaction_type TEXT NOT NULL,
                interaction_data TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                revenue_impact DECIMAL(10,2) DEFAULT 0,
                conversion_score INTEGER DEFAULT 0
            )`,
            
            `CREATE TABLE IF NOT EXISTS conversion_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_uid TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_value DECIMAL(10,2) DEFAULT 0,
                affiliate_source TEXT,
                commission_earned DECIMAL(10,2) DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const tableSQL of tables) {
            await new Promise((resolve, reject) => {
                this.db.run(tableSQL, (err) => {
                    if (err) {
                        console.error('Lead table creation error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }

    // PROGRESSIVE LEAD CAPTURE FORMS
    generateProgressiveForm(calculatorType, results, userProfile = {}) {
        const urgencyMessage = this.generateUrgencyMessage(calculatorType, results);
        const socialProof = this.getSocialProof(calculatorType);
        
        return `
        <div class="progressive-lead-capture" id="leadCaptureContainer" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 25px 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        ">
            <!-- Animated background elements -->
            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: float 6s ease-in-out infinite;"></div>
            
            <!-- Step 1: Email Capture -->
            <div class="capture-step active" id="step1" data-step="1">
                <div class="urgency-header" style="background: rgba(231, 76, 60, 0.9); margin: -30px -30px 25px -30px; padding: 15px;">
                    ${urgencyMessage}
                </div>
                
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem; position: relative; z-index: 2;">
                    🎯 Get Your Personalized ${this.getCalculatorDisplayName(calculatorType)} Report
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.2rem; opacity: 0.95; position: relative; z-index: 2;">
                    ${this.getPersonalizedMessage(calculatorType, results)}
                </p>
                
                <div class="email-capture-form" style="position: relative; z-index: 2;">
                    <input type="email" 
                           id="leadEmail" 
                           placeholder="Enter your email for instant report" 
                           style="
                               width: 100%; 
                               max-width: 400px; 
                               padding: 18px 25px; 
                               border: none; 
                               border-radius: 50px; 
                               font-size: 1.1rem; 
                               margin: 0 0 20px 0;
                               box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                               text-align: center;
                           ">
                    
                    <button onclick="submitEmailStep('${calculatorType}')" 
                            style="
                                background: #27ae60; 
                                color: white; 
                                border: none; 
                                padding: 18px 40px; 
                                border-radius: 50px; 
                                font-size: 1.2rem; 
                                font-weight: 700; 
                                cursor: pointer; 
                                display: block; 
                                margin: 0 auto 25px auto;
                                box-shadow: 0 5px 15px rgba(39, 174, 96, 0.4);
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(39, 174, 96, 0.6)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 5px 15px rgba(39, 174, 96, 0.4)'">
                        📧 Get My FREE Report
                    </button>
                </div>
                
                <div class="trust-signals" style="display: flex; justify-content: center; gap: 25px; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.9; position: relative; z-index: 2;">
                    <span>🔒 100% Secure</span>
                    <span>📧 No Spam Ever</span>
                    <span>⚡ Instant Delivery</span>
                    <span>💰 ${socialProof}</span>
                </div>
            </div>
            
            <!-- Step 2: Profile Enhancement -->
            <div class="capture-step" id="step2" data-step="2" style="display: none;">
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem;">
                    🚀 Unlock Your Premium Matches
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.1rem; opacity: 0.95;">
                    Complete your profile to access exclusive rates and priority lender matching
                </p>
                
                <div class="profile-form" style="max-width: 500px; margin: 0 auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <input type="text" id="firstName" placeholder="First Name" style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem;">
                        <input type="text" id="lastName" placeholder="Last Name" style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem;">
                    </div>
                    
                    <input type="tel" id="phone" placeholder="Phone (for priority access)" style="width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 1rem; margin-bottom: 20px;">
                    
                    <select id="creditScore" style="width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 1rem; margin-bottom: 20px;">
                        <option value="">Select Credit Score Range</option>
                        <option value="800+">Excellent (800+)</option>
                        <option value="750-799">Very Good (750-799)</option>
                        <option value="700-749">Good (700-749)</option>
                        <option value="650-699">Fair (650-699)</option>
                        <option value="600-649">Poor (600-649)</option>
                        <option value="<600">Building Credit (<600)</option>
                    </select>
                    
                    <button onclick="submitProfileStep()" 
                            style="
                                background: #e74c3c; 
                                color: white; 
                                border: none; 
                                padding: 18px 40px; 
                                border-radius: 50px; 
                                font-size: 1.2rem; 
                                font-weight: 700; 
                                cursor: pointer; 
                                width: 100%;
                                box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
                            ">
                        🎯 Get My Premium Matches
                    </button>
                </div>
                
                <div class="premium-benefits" style="margin-top: 25px; font-size: 0.9rem; opacity: 0.9;">
                    <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>✅ Pre-approved rates</span>
                        <span>✅ Priority processing</span>
                        <span>✅ Dedicated support</span>
                        <span>✅ Exclusive offers</span>
                    </div>
                </div>
            </div>
            
            <!-- Success Step -->
            <div class="capture-step success-step" id="successStep" style="display: none;">
                <div style="font-size: 4rem; margin-bottom: 15px;">🎉</div>
                <h3 style="margin: 0 0 15px 0; color: #27ae60;">Success!</h3>
                <p style="margin: 0 0 25px 0;">Your personalized report is being prepared. Check your email in 2-3 minutes!</p>
                <div id="nextStepsContainer"></div>
            </div>
        </div>

        <style>
            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(180deg); }
            }
            
            @media (max-width: 768px) {
                .progressive-lead-capture {
                    margin: 15px -15px !important;
                    border-radius: 0 !important;
                }
                
                .profile-form > div {
                    grid-template-columns: 1fr !important;
                }
                
                .trust-signals {
                    flex-direction: column !important;
                    gap: 10px !important;
                }
            }
        </style>

        <script>
            // Lead capture JavaScript will be added to the main calculator page
            window.leadCaptureData = {
                calculatorType: '${calculatorType}',
                results: ${JSON.stringify(results)},
                userProfile: ${JSON.stringify(userProfile)}
            };
        </script>
        `;
    }

    // EXIT INTENT CAPTURE SYSTEM
    generateExitIntentCapture(calculatorType, results) {
        const savings = this.calculatePotentialSavings(calculatorType, results);
        
        return `
        <div id="exitIntentModal" style="
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.85); 
            z-index: 999999; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            animation: fadeIn 0.3s ease-out;
        ">
            <div style="
                background: white; 
                padding: 50px; 
                border-radius: 20px; 
                max-width: 600px; 
                width: 90%; 
                text-align: center; 
                position: relative;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideIn 0.4s ease-out;
            ">
                <button onclick="closeExitIntent()" style="
                    position: absolute; 
                    top: 20px; 
                    right: 25px; 
                    background: none; 
                    border: none; 
                    font-size: 2rem; 
                    cursor: pointer; 
                    color: #999;
                    line-height: 1;
                ">&times;</button>
                
                <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                
                <h2 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 2.2rem;">
                    Wait! Don't Leave Without Your Report
                </h2>
                
                <p style="font-size: 1.3rem; margin: 0 0 25px 0; color: #2c3e50;">
                    You could save <strong style="color: #27ae60;">$${savings.toLocaleString()}/year</strong> 
                    with the right ${this.getCalculatorDisplayName(calculatorType).toLowerCase()}
                </p>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Get Your FREE Report Instantly:</h4>
                    <ul style="text-align: left; margin: 0; padding-left: 20px; color: #666;">
                        <li style="margin: 8px 0;">✅ Personalized recommendations based on your calculation</li>
                        <li style="margin: 8px 0;">✅ Current market rates and exclusive offers</li>
                        <li style="margin: 8px 0;">✅ Step-by-step action plan to save money</li>
                        <li style="margin: 8px 0;">✅ Priority access to verified lenders</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 15px; margin: 30px 0; align-items: center;">
                    <input type="email" 
                           id="exitEmail" 
                           placeholder="Enter your email address" 
                           style="
                               flex: 1; 
                               padding: 18px 20px; 
                               border: 2px solid #e0e0e0; 
                               border-radius: 10px; 
                               font-size: 1.1rem;
                           ">
                    
                    <button onclick="captureExitEmail('${calculatorType}')" 
                            style="
                                background: #27ae60; 
                                color: white; 
                                border: none; 
                                padding: 18px 30px; 
                                border-radius: 10px; 
                                font-size: 1.1rem; 
                                font-weight: 600; 
                                cursor: pointer;
                                white-space: nowrap;
                            ">
                        Send Report
                    </button>
                </div>
                
                <div style="font-size: 0.9rem; color: #666; margin-top: 15px;">
                    🔒 100% secure • No spam • Unsubscribe anytime
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #999;">
                    Join 50,000+ smart savers who use CalculiQ
                </div>
            </div>
        </div>

        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @media (max-width: 768px) {
                #exitIntentModal > div {
                    padding: 30px 20px !important;
                    margin: 20px !important;
                }
                
                #exitIntentModal .flex-container {
                    flex-direction: column !important;
                }
                
                #exitIntentModal input, #exitIntentModal button {
                    width: 100% !important;
                    margin-bottom: 10px !important;
                }
            }
        </style>
        `;
    }

    // MOBILE EXIT INTENT (SCROLL-BASED)
    generateMobileExitTrigger(calculatorType) {
        return `
        <div id="mobileExitTrigger" style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            border: none;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 25px rgba(231, 76, 60, 0.4);
            z-index: 10000;
            display: none;
            animation: bounce 2s infinite;
        " onclick="showExitIntent()">
            💰 Get Your FREE ${this.getCalculatorDisplayName(calculatorType)} Report
        </div>

        <style>
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
                40% { transform: translateX(-50%) translateY(-10px); }
                60% { transform: translateX(-50%) translateY(-5px); }
            }
        </style>
        `;
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
                '600-649': 5
            };
            score += creditScores[leadData.creditScore] || 0;
            breakdown.creditScore = creditScores[leadData.creditScore] || 0;
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

    // HELPER METHODS
    generateUrgencyMessage(calculatorType, results) {
        const messages = {
            mortgage: "🚨 Mortgage rates change daily - lock in your calculation!",
            investment: "⏰ Market conditions are optimal - act now!",
            loan: "🔥 Best rates available this week only!",
            insurance: "⚡ Premium rates expire soon!"
        };
        return messages[calculatorType] || "🎯 Limited time - get your personalized report!";
    }

    getSocialProof(calculatorType) {
        const proofs = {
            mortgage: "Avg. $3,200/year saved",
            investment: "Avg. 15% better returns",
            loan: "Avg. $1,800/year saved",
            insurance: "Avg. 25% lower premiums"
        };
        return proofs[calculatorType] || "Avg. $2,400/year saved";
    }

    getCalculatorDisplayName(calculatorType) {
        const names = {
            mortgage: 'Mortgage',
            investment: 'Investment',
            loan: 'Loan',
            insurance: 'Insurance'
        };
        return names[calculatorType] || 'Financial';
    }

    getPersonalizedMessage(calculatorType, results) {
        if (!results) return "Based on your calculation, see personalized recommendations and exclusive offers.";
        
        const messages = {
            mortgage: `Based on your $${results.monthlyPayment || 'X'}/month calculation, discover lenders with better rates.`,
            investment: `With your $${results.finalAmount || 'X'} projection, unlock premium investment strategies.`,
            loan: `For your $${results.loanAmount || 'X'} loan, access pre-approved offers with lower rates.`,
            insurance: `Based on your coverage needs, compare quotes from top-rated insurers.`
        };
        
        return messages[calculatorType] || "Get personalized recommendations based on your specific calculation.";
    }

    calculatePotentialSavings(calculatorType, results) {
        if (!results) return 2400;
        
        const savings = {
            mortgage: Math.round((results.monthlyPayment || 2000) * 0.15 * 12),
            investment: Math.round((results.finalAmount || 100000) * 0.05),
            loan: Math.round((results.totalInterest || 15000) * 0.2),
            insurance: Math.round(1200) // Average insurance savings
        };
        
        return savings[calculatorType] || 2400;
    }

    // DATABASE OPERATIONS
    async captureLead(leadData) {
        const uid = this.generateUID();
        const leadScore = this.calculateLeadScore(leadData);
        
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO leads_enhanced (
                        uid, email, first_name, last_name, phone, 
                        calculator_type, calculation_results, lead_score, 
                        lead_tier, source, behavioral_data, step
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });

            // Track the interaction
            await this.trackLeadInteraction(uid, 'lead_captured', {
                score: leadScore.totalScore,
                tier: leadScore.tier,
                source: leadData.source
            });

            return { success: true, uid, leadScore };
        } catch (error) {
            console.error('Lead capture error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateLead(email, updateData) {
        try {
            const leadScore = this.calculateLeadScore({...updateData, email});
            
            await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE leads_enhanced SET 
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        phone = COALESCE(?, phone),
                        lead_score = ?,
                        lead_tier = ?,
                        step = ?,
                        behavioral_data = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = ?`,
                    [
                        updateData.firstName,
                        updateData.lastName,
                        updateData.phone,
                        leadScore.totalScore,
                        leadScore.tier,
                        updateData.step || 2,
                        JSON.stringify(updateData.behavioral || {}),
                        email
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });

            return { success: true, leadScore };
        } catch (error) {
            console.error('Lead update error:', error);
            return { success: false, error: error.message };
        }
    }

    async trackLeadInteraction(leadUid, interactionType, data = {}) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO lead_interactions (lead_uid, interaction_type, interaction_data, conversion_score)
                     VALUES (?, ?, ?, ?)`,
                    [
                        leadUid,
                        interactionType,
                        JSON.stringify(data),
                        data.conversionScore || 0
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        } catch (error) {
            console.error('Interaction tracking error:', error);
        }
    }

    async getLeadMetrics() {
        try {
            const totalLeads = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM leads_enhanced',
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });

            const qualifiedLeads = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM leads_enhanced WHERE lead_score >= 60',
                    (err, row) => err ? reject(err) : resolve(row?.count || 0)
                );
            });

            const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : '0.00';
            const estimatedRevenue = qualifiedLeads * 150; // Average revenue per qualified lead

            return {
                totalLeads,
                qualifiedLeads,
                conversionRate,
                estimatedRevenue,
                averageScore: await this.getAverageLeadScore()
            };
        } catch (error) {
            console.error('Lead metrics error:', error);
            return {
                totalLeads: 0,
                qualifiedLeads: 0,
                conversionRate: '0.00',
                estimatedRevenue: 0,
                averageScore: 0
            };
        }
    }

    async getAverageLeadScore() {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT AVG(lead_score) as avg_score FROM leads_enhanced WHERE lead_score > 0',
                    (err, row) => err ? reject(err) : resolve(row?.avg_score || 0)
                );
            });
            return Math.round(result);
        } catch (error) {
            return 0;
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
                
                const leadData = {
                    email,
                    calculatorType,
                    results,
                    source: source || 'email_capture',
                    step: 1
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
                    step: 0
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
                const leads = await new Promise((resolve, reject) => {
                    this.db.all(
                        `SELECT * FROM leads_enhanced 
                         ORDER BY lead_score DESC, created_at DESC 
                         LIMIT 100`,
                        (err, rows) => err ? reject(err) : resolve(rows || [])
                    );
                });

                res.json({ success: true, leads });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        console.log('✅ Lead capture routes initialized');
    }
}

module.exports = CalculiQLeadCapture;