// calculator-lead-integration.js
// Frontend Lead Capture Integration for CalculiQ Calculators
// Updated to insert lead forms AFTER calculation results

class CalculiQLeadIntegration {
    constructor() {
        this.userProfile = {
            uid: this.generateUID(),
            interactions: [],
            timeOnSite: 0,
            calculatorUsage: 0,
            behavioralData: {}
        };
        
        this.exitIntentShown = false;
        this.leadCaptured = false;
        this.calculationCompleted = false;
        this.currentCalculatorType = '';
        this.currentResults = {};
        
        this.initialize();
    }

    initialize() {
        this.startTimeTracking();
        this.setupExitIntentHandlers();
        this.setupMobileExitIntent();
        this.trackPageView();
        this.fixInputFields();
        
        console.log('📊 CalculiQ Lead Integration initialized');
    }

    // FIX FOR INPUT FIELDS
    fixInputFields() {
        // Fix inputs every 500ms for dynamically generated content
        setInterval(() => {
            const selectors = [
                '#firstNameInput',
                '#lastNameInput', 
                '#phoneInput',
                '#creditScoreInput',
                '#leadEmailInput',
                '#exitIntentEmail',
                'input[type="text"]',
                'input[type="email"]',
                'input[type="tel"]',
                'select'
            ];
            
            const inputs = document.querySelectorAll(selectors.join(', '));
            
            inputs.forEach(input => {
                if (input && !input.hasAttribute('data-fixed')) {
                    input.setAttribute('data-fixed', 'true');
                    
                    // Force enable
                    input.style.cssText += `
                        position: relative !important;
                        z-index: 9999 !important;
                        pointer-events: auto !important;
                        -webkit-user-select: text !important;
                        user-select: text !important;
                    `;
                    
                    input.disabled = false;
                    input.readOnly = false;
                    
                    // Add event listeners
                    input.addEventListener('click', function(e) {
                        e.stopPropagation();
                        this.focus();
                    });
                    
                    input.addEventListener('focus', function() {
                        this.style.outline = '2px solid #667eea';
                    });
                }
            });
        }, 250);
    }

    // ======================
    // CALCULATOR INTEGRATION
    // ======================

    integrateWithCalculator(calculatorType, calculatorElement) {
        this.currentCalculatorType = calculatorType;
        this.trackInteraction('calculator_opened', { type: calculatorType });
        
        // Don't insert the lead form immediately - wait for calculation
        console.log(`🧮 Calculator integrated: ${calculatorType}`);
    }

    onCalculationComplete(calculatorType, results) {
        this.currentCalculatorType = calculatorType;
        this.currentResults = results;
        this.calculationCompleted = true;
        this.userProfile.calculatorUsage++;
        
        this.trackInteraction('calculation_completed', {
            type: calculatorType,
            results: results
        });
        
        // Insert lead capture form after calculation
        this.insertLeadCaptureForm(calculatorType, results);
        
        // Setup exit intent after calculation
        setTimeout(() => {
            this.enableExitIntent();
        }, 5000);
        
        console.log(`📊 Calculation completed: ${calculatorType}`, results);
    }

    insertLeadCaptureForm(calculatorType, results) {
        // Find the container for this calculator's lead capture
        const containerId = `${calculatorType}-lead-capture-container`;
        const container = document.getElementById(containerId);
        
        if (container && !container.hasChildNodes()) {
            const leadFormHTML = this.generateProgressiveLeadForm(calculatorType, results);
            container.innerHTML = leadFormHTML;
            
            // Re-run the input field fix for the new form
            this.fixInputFields();
            
            // Smooth scroll to the lead form
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    // ======================
    // PROGRESSIVE LEAD CAPTURE FORM
    // ======================

    generateProgressiveLeadForm(calculatorType, results) {
        const urgencyMessage = this.getUrgencyMessage(calculatorType, results);
        const personalizedMessage = this.getPersonalizedMessage(calculatorType, results);
        const socialProof = this.getSocialProof(calculatorType);
        
        return `
        <div class="calculiq-lead-capture" id="leadCaptureContainer" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0 0 0;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        ">
            <!-- Animated background -->
            <div class="bg-animation" style="
                position: absolute; 
                top: -50%; 
                left: -50%; 
                width: 200%; 
                height: 200%; 
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); 
                animation: calculiqFloat 6s ease-in-out infinite;
                pointer-events: none;
            "></div>
            
            <!-- Urgency Header -->
            <div class="urgency-alert" style="
                background: rgba(231, 76, 60, 0.95); 
                margin: -30px -30px 25px -30px; 
                padding: 15px; 
                font-weight: 600;
                animation: calculiqPulse 2s infinite;
                position: relative;
                z-index: 2;
            ">
                ${urgencyMessage}
            </div>
            
            <!-- Step 1: Email Capture -->
            <div class="capture-step active" id="emailCaptureStep" data-step="1" style="position: relative; z-index: 2;">
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem;">
                    🎯 Get Personalized Rate Quotes
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.2rem; opacity: 0.95;">
                    ${personalizedMessage}
                </p>
                
                <!-- Email Form -->
                <div class="email-form">
                    <input type="email" 
                           id="leadEmailInput" 
                           name="email"
                           placeholder="Enter your email for personalized quotes" 
                           autocomplete="email"
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
                               transition: all 0.3s ease;
                               color: #333;
                               background: white;
                           "
                           onkeypress="if(event.key==='Enter') submitEmailCapture('${calculatorType}')">
                    
                    <button onclick="submitEmailCapture('${calculatorType}')" 
                            class="primary-capture-btn"
                            style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71); 
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
                                position: relative;
                                overflow: hidden;
                            "
                            onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(39, 174, 96, 0.6)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 5px 15px rgba(39, 174, 96, 0.4)'">
                        <span>📞 Get My Quotes</span>
                    </button>
                </div>
                
                <!-- Trust Signals -->
                <div class="trust-signals" style="
                    display: flex; 
                    justify-content: center; 
                    gap: 25px; 
                    flex-wrap: wrap; 
                    font-size: 0.9rem; 
                    opacity: 0.9;
                ">
                    <span style="display: flex; align-items: center; gap: 5px;">🔒 100% Secure</span>
                    <span style="display: flex; align-items: center; gap: 5px;">📞 Direct Lender Contact</span>
                    <span style="display: flex; align-items: center; gap: 5px;">⚡ 24-Hour Response</span>
                    <span style="display: flex; align-items: center; gap: 5px;">💰 ${socialProof}</span>
                </div>
            </div>
            
            <!-- Step 2: Profile Enhancement -->
            <div class="capture-step" id="profileCaptureStep" data-step="2" style="display: none; position: relative; z-index: 2;">
                <div class="step-indicator" style="
                    display: flex; 
                    justify-content: center; 
                    gap: 15px; 
                    margin-bottom: 25px;
                ">
                    <div style="width: 30px; height: 4px; background: rgba(255,255,255,0.5); border-radius: 2px;"></div>
                    <div style="width: 30px; height: 4px; background: white; border-radius: 2px;"></div>
                </div>
                
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem;">
                    🚀 Get Premium Rate Access
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.1rem; opacity: 0.95;">
                    Complete your profile for priority lender matching and exclusive rates
                </p>
                
                <!-- Profile Form -->
                <div class="profile-form" style="
                    max-width: 500px; 
                    margin: 0 auto;
                    display: grid;
                    gap: 15px;
                ">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <input type="text" 
                               id="firstNameInput"
                               name="firstName"
                               placeholder="First Name"
                               autocomplete="given-name" 
                               style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem; color: #333; background: white;">
                        <input type="text" 
                               id="lastNameInput"
                               name="lastName" 
                               placeholder="Last Name"
                               autocomplete="family-name"
                               style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem; color: #333; background: white;">
                    </div>
                    
                    <input type="tel" 
                           id="phoneInput"
                           name="phone"
                           placeholder="Phone (for priority contact)"
                           autocomplete="tel" 
                           style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem; color: #333; background: white;">
                    
                    <select id="creditScoreInput"
                            name="creditScore" 
                            style="padding: 15px; border: none; border-radius: 8px; font-size: 1rem; color: #333; background: white;">
                        <option value="">Select Credit Score Range</option>
                        <option value="800+">Excellent (800+)</option>
                        <option value="750-799">Very Good (750-799)</option>
                        <option value="700-749">Good (700-749)</option>
                        <option value="650-699">Fair (650-699)</option>
                        <option value="600-649">Poor (600-649)</option>
                        <option value="<600">Building Credit (<600)</option>
                    </select>
                    
                    <button onclick="submitProfileCapture('${calculatorType}')" 
                            style="
                                background: linear-gradient(135deg, #e74c3c, #c0392b); 
                                color: white; 
                                border: none; 
                                padding: 18px 40px; 
                                border-radius: 50px; 
                                font-size: 1.2rem; 
                                font-weight: 700; 
                                cursor: pointer; 
                                box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='translateY(-2px)'"
                            onmouseout="this.style.transform='translateY(0)'">
                        🎯 Get Priority Access
                    </button>
                </div>
                
                <!-- Premium Benefits -->
                <div class="premium-benefits" style="
                    margin-top: 25px; 
                    font-size: 0.9rem; 
                    opacity: 0.9;
                ">
                    <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>✅ Pre-approved rates</span>
                        <span>✅ Priority contact</span>
                        <span>✅ Multiple lender quotes</span>
                        <span>✅ Exclusive offers</span>
                    </div>
                </div>
            </div>
            
            <!-- Success Step -->
            <div class="capture-step success-step" id="successStep" style="display: none; position: relative; z-index: 2;">
                <div style="font-size: 4rem; margin-bottom: 15px; animation: calculiqBounce 1s ease-out;">🎉</div>
                <h3 style="margin: 0 0 15px 0; color: #27ae60; font-size: 2rem;">Success!</h3>
                <p style="margin: 0 0 25px 0; font-size: 1.2rem;">
                    Your information has been submitted.<br>
                    <strong>Our verified partners will contact you within 24 hours!</strong>
                </p>
                <div id="nextStepsContainer" style="
                    background: rgba(255,255,255,0.1); 
                    padding: 20px; 
                    border-radius: 10px; 
                    margin-top: 20px;
                ">
                    <h4 style="margin: 0 0 15px 0;">What happens next:</h4>
                    <div style="text-align: left; max-width: 300px; margin: 0 auto;">
                        <div style="margin: 8px 0;">✅ Verified lenders will call you</div>
                        <div style="margin: 8px 0;">✅ Personalized rate quotes</div>
                        <div style="margin: 8px 0;">✅ Pre-approval opportunities</div>
                        <div style="margin: 8px 0;">✅ Money-saving comparisons</div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes calculiqFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(180deg); }
            }
            
            @keyframes calculiqPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            @keyframes calculiqBounce {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .calculiq-lead-capture input:focus {
                outline: 2px solid #27ae60 !important;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                transform: translateY(-2px);
            }
            
            .primary-capture-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
                pointer-events: none;
            }
            
            .primary-capture-btn:hover::before {
                left: 100%;
            }
            
            @media (max-width: 768px) {
                .calculiq-lead-capture {
                    margin: 15px -15px !important;
                    border-radius: 0 !important;
                    padding: 20px !important;
                }
                
                .profile-form > div {
                    grid-template-columns: 1fr !important;
                }
                
                .trust-signals {
                    flex-direction: column !important;
                    gap: 10px !important;
                }
                
                .calculiq-lead-capture h3 {
                    font-size: 1.4rem !important;
                }
                
                .calculiq-lead-capture p {
                    font-size: 1rem !important;
                }
            }
        </style>
        `;
    }

    // ======================
    // EXIT INTENT CAPTURE
    // ======================

    generateExitIntentModal(calculatorType, results) {
        const savings = this.calculatePotentialSavings(calculatorType, results);
        
        return `
        <div id="calculiqExitModal" style="
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.9); 
            z-index: 999999; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            animation: calculiqFadeIn 0.3s ease-out;
        ">
            <div style="
                background: white; 
                padding: 50px; 
                border-radius: 20px; 
                max-width: 650px; 
                width: 90%; 
                text-align: center; 
                position: relative;
                box-shadow: 0 30px 60px rgba(0,0,0,0.3);
                animation: calculiqSlideIn 0.4s ease-out;
            ">
                <!-- Close Button -->
                <button onclick="closeExitIntent()" style="
                    position: absolute; 
                    top: 20px; 
                    right: 25px; 
                    background: none; 
                    border: none; 
                    font-size: 2.5rem; 
                    cursor: pointer; 
                    color: #999;
                    line-height: 1;
                    transition: color 0.3s ease;
                " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">&times;</button>
                
                <!-- Warning Icon -->
                <div style="font-size: 4rem; margin-bottom: 20px; animation: calculiqShake 0.8s ease-in-out;">⚠️</div>
                
                <!-- Main Headline -->
                <h2 style="
                    color: #e74c3c; 
                    margin: 0 0 15px 0; 
                    font-size: 2.4rem;
                    font-weight: 800;
                ">
                    Wait! Don't Miss Out on Better Rates
                </h2>
                
                <!-- Value Proposition -->
                <p style="
                    font-size: 1.4rem; 
                    margin: 0 0 30px 0; 
                    color: #2c3e50;
                    line-height: 1.4;
                ">
                    You could save <strong style="color: #27ae60; font-size: 1.6rem;">$${savings.toLocaleString()}/year</strong><br>
                    with verified lender quotes from our partners
                </p>
                
                <!-- Benefits Box -->
                <div style="
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                    padding: 30px; 
                    border-radius: 15px; 
                    margin: 30px 0;
                    border-left: 5px solid #27ae60;
                ">
                    <h4 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 1.3rem;">
                        🎯 Get Connected with Verified Lenders:
                    </h4>
                    <div style="
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 15px; 
                        text-align: left;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #27ae60; font-size: 1.2rem;">✅</span>
                            <span>Personalized rate quotes based on your calculation</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #27ae60; font-size: 1.2rem;">✅</span>
                            <span>Direct contact from verified lenders</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #27ae60; font-size: 1.2rem;">✅</span>
                            <span>Pre-approval opportunities</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #27ae60; font-size: 1.2rem;">✅</span>
                            <span>Compare multiple offers to save money</span>
                        </div>
                    </div>
                </div>
                
                <!-- Email Capture Form -->
                <div style="
                    display: flex; 
                    gap: 15px; 
                    margin: 30px 0; 
                    align-items: center;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                ">
                    <input type="email" 
                           id="exitIntentEmail"
                           name="exitEmail"
                           placeholder="Enter your email for lender quotes"
                           autocomplete="email"
                           style="
                               flex: 1; 
                               padding: 20px; 
                               border: 2px solid #e0e0e0; 
                               border-radius: 12px; 
                               font-size: 1.1rem;
                               transition: all 0.3s ease;
                               color: #333;
                           "
                           onkeypress="if(event.key==='Enter') captureExitEmail('${calculatorType}')"
                           onfocus="this.style.borderColor='#27ae60'; this.style.boxShadow='0 0 0 3px rgba(39,174,96,0.1)'"
                           onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'">
                    
                    <button onclick="captureExitEmail('${calculatorType}')" 
                            style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71); 
                                color: white; 
                                border: none; 
                                padding: 20px 30px; 
                                border-radius: 12px; 
                                font-size: 1.1rem; 
                                font-weight: 600; 
                                cursor: pointer;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(39,174,96,0.3)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        Get Quotes
                    </button>
                </div>
                
                <!-- Security & Social Proof -->
                <div style="
                    display: flex; 
                    justify-content: center; 
                    gap: 25px; 
                    flex-wrap: wrap; 
                    font-size: 0.9rem; 
                    color: #666; 
                    margin: 20px 0;
                ">
                    <span style="display: flex; align-items: center; gap: 5px;">🔒 100% secure</span>
                    <span style="display: flex; align-items: center; gap: 5px;">📞 Direct lender contact</span>
                    <span style="display: flex; align-items: center; gap: 5px;">🚀 24-hour response</span>
                </div>
                
                <!-- Social Proof Footer -->
                <div style="
                    margin-top: 25px; 
                    padding-top: 20px; 
                    border-top: 1px solid #eee; 
                    font-size: 0.85rem; 
                    color: #999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                ">
                    <div style="display: flex; gap: 5px;">
                        <span style="color: #f39c12;">⭐⭐⭐⭐⭐</span>
                    </div>
                    <span>Join 50,000+ smart savers who use CalculiQ</span>
                </div>
            </div>
        </div>

        <style>
            @keyframes calculiqFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes calculiqSlideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes calculiqShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            @media (max-width: 768px) {
                #calculiqExitModal > div {
                    padding: 30px 20px !important;
                    margin: 20px !important;
                    max-width: 95% !important;
                }
                
                #calculiqExitModal h2 {
                    font-size: 1.8rem !important;
                }
                
                #calculiqExitModal p {
                    font-size: 1.1rem !important;
                }
                
                #calculiqExitModal > div > div:nth-child(6) {
                    flex-direction: column !important;
                    gap: 15px !important;
                }
                
                #calculiqExitModal input,
                #calculiqExitModal button {
                    width: 100% !important;
                }
                
                #calculiqExitModal .benefits-grid {
                    grid-template-columns: 1fr !important;
                }
            }
        </style>
        `;
    }

    // ======================
    // MOBILE EXIT TRIGGER
    // ======================

    generateMobileExitTrigger(calculatorType) {
        return `
        <div id="calculiqMobileExit" style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            padding: 15px 25px;
            border-radius: 30px;
            border: none;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(231, 76, 60, 0.4);
            z-index: 10000;
            display: none;
            animation: calculiqMobileBounce 2s infinite;
            max-width: 90%;
            text-align: center;
        " onclick="showExitIntent()">
            💰 Get Your Rate Quotes from ${this.getCalculatorDisplayName(calculatorType)} Lenders
        </div>

        <style>
            @keyframes calculiqMobileBounce {
                0%, 20%, 50%, 80%, 100% { 
                    transform: translateX(-50%) translateY(0); 
                }
                40% { 
                    transform: translateX(-50%) translateY(-8px); 
                }
                60% { 
                    transform: translateX(-50%) translateY(-4px); 
                }
            }
            
            #calculiqMobileExit:hover {
                background: linear-gradient(135deg, #c0392b, #a93226);
                transform: translateX(-50%) translateY(-2px);
                box-shadow: 0 15px 35px rgba(231, 76, 60, 0.6);
            }
        </style>
        `;
    }

    // ======================
    // EVENT HANDLERS
    // ======================

    setupExitIntentHandlers() {
        if (this.isMobile()) return;
        
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && this.canShowExitIntent()) {
                this.showExitIntent();
            }
        });
        
        document.addEventListener('mouseenter', (e) => {
            if (e.target.tagName === 'A' && e.target.href) {
                this.exitIntentShown = true;
            }
        });
    }

    setupMobileExitIntent() {
        if (!this.isMobile()) return;
        
        let scrollCount = 0;
        let lastScrollTop = 0;
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop < lastScrollTop && scrollTop > 100) {
                scrollCount++;
                
                if (scrollCount >= 3 && this.canShowExitIntent()) {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        this.showMobileExitTrigger();
                    }, 1000);
                }
            }
            
            lastScrollTop = scrollTop;
        });
    }

    canShowExitIntent() {
        return this.calculationCompleted && 
               !this.exitIntentShown && 
               !this.leadCaptured &&
               this.userProfile.timeOnSite > 30;
    }

    enableExitIntent() {
        this.exitIntentEnabled = true;
    }

    showExitIntent() {
        if (!this.canShowExitIntent()) return;
        
        this.exitIntentShown = true;
        const modalHTML = this.generateExitIntentModal(this.currentCalculatorType, this.currentResults);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        this.trackInteraction('exit_intent_shown', {
            calculatorType: this.currentCalculatorType,
            timeOnSite: this.userProfile.timeOnSite
        });
        
        console.log('🚪 Exit intent modal shown');
    }

    showMobileExitTrigger() {
        if (!this.canShowExitIntent()) return;
        
        const triggerHTML = this.generateMobileExitTrigger(this.currentCalculatorType);
        document.body.insertAdjacentHTML('beforeend', triggerHTML);
        
        const trigger = document.getElementById('calculiqMobileExit');
        if (trigger) {
            trigger.style.display = 'block';
            
            setTimeout(() => {
                trigger.style.display = 'none';
            }, 10000);
        }
        
        this.trackInteraction('mobile_exit_trigger_shown', {
            calculatorType: this.currentCalculatorType
        });
        
        console.log('📱 Mobile exit trigger shown');
    }

    closeExitIntent() {
        const modal = document.getElementById('calculiqExitModal');
        if (modal) {
            modal.style.animation = 'calculiqFadeOut 0.3s ease-out';
            setTimeout(() => modal.remove(), 300);
        }
    }

    // ======================
    // API COMMUNICATION
    // ======================

    async submitEmailCapture(calculatorType) {
        console.log('submitEmailCapture called with:', calculatorType);
        const email = document.getElementById('leadEmailInput')?.value;
        console.log('Email value:', email);
        
        if (!email || !email.includes('@')) {
            console.log('Email validation failed');
            this.showError('Please enter a valid email address');
            return;
        }
        
        console.log('About to make fetch request');
        try {
            const response = await fetch('/api/capture-lead-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    calculatorType: calculatorType,
                    results: this.currentResults,
                    source: 'progressive_form'
                })
            });
            
            const result = await response.json();
            console.log('API response:', result);
            
            if (result.success) {
                this.leadCaptured = true;
                this.userProfile.email = email;
                
                // Move to step 2
                this.showStep('profileCaptureStep');
                
                this.trackInteraction('email_captured', {
                    email: email,
                    leadScore: result.leadScore
                });
                
                console.log('📧 Email captured successfully', result);
            } else {
                this.showError('Please try again');
            }
            
        } catch (error) {
            console.error('Email capture error:', error);
            this.showError('Connection error - please try again');
        }
    }

    async submitProfileCapture(calculatorType) {
        const email = this.userProfile.email;
        const firstName = document.getElementById('firstNameInput')?.value;
        const lastName = document.getElementById('lastNameInput')?.value;
        const phone = document.getElementById('phoneInput')?.value;
        const creditScore = document.getElementById('creditScoreInput')?.value;
        
        if (!firstName || !phone) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        try {
            const response = await fetch('/api/capture-lead-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    phone: phone,
                    creditScore: creditScore,
                    behavioral: this.userProfile.behavioralData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success step
                this.showStep('successStep');
                
                this.trackInteraction('profile_completed', {
                    leadScore: result.leadScore,
                    tier: result.tier
                });
                
                // Auto-close after 5 seconds
                setTimeout(() => {
                    this.hideLeadCapture();
                }, 5000);
                
                console.log('👤 Profile completed successfully', result);
            } else {
                this.showError('Please try again');
            }
            
        } catch (error) {
            console.error('Profile capture error:', error);
            this.showError('Connection error - please try again');
        }
    }

    async captureExitEmail(calculatorType) {
        const email = document.getElementById('exitIntentEmail')?.value;
        
        if (!email || !email.includes('@')) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        try {
            const response = await fetch('/api/capture-exit-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    calculatorType: calculatorType,
                    results: this.currentResults,
                    source: 'exit_intent'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.leadCaptured = true;
                this.closeExitIntent();
                
                // Show success message
                this.showSuccessMessage('✅ Success! Our verified lenders will contact you within 24 hours with personalized quotes.');
                
                this.trackInteraction('exit_email_captured', { email: email });
                
                console.log('🚪 Exit intent email captured');
            }
            
        } catch (error) {
            console.error('Exit email capture error:', error);
            this.showError('Connection error - please try again');
        }
    }

    // ======================
    // UI HELPER METHODS
    // ======================

    showStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.capture-step').forEach(step => {
            step.style.display = 'none';
        });
        
        // Show target step
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.style.display = 'block';
        }
    }

    hideLeadCapture() {
        const container = document.getElementById('leadCaptureContainer');
        if (container) {
            container.style.animation = 'calculiqFadeOut 0.5s ease-out';
            setTimeout(() => {
                container.style.display = 'none';
            }, 500);
        }
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('calculiqError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'calculiqError';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #e74c3c;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 1000000;
                animation: calculiqSlideIn 0.3s ease-out;
            `;
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 4000);
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000000;
            animation: calculiqSlideIn 0.3s ease-out;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }

    // ======================
    // TRACKING & ANALYTICS
    // ======================

    trackInteraction(type, data = {}) {
        const interaction = {
            type: type,
            data: data,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.userProfile.interactions.push(interaction);
        
        // Send to backend
        fetch('/api/track-lead-interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                leadUID: this.userProfile.uid,
                interactionType: type,
                data: data
            })
        }).catch(console.error);
        
        console.log('📊 Interaction tracked:', type, data);
    }

    trackPageView() {
        this.trackInteraction('page_view', {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        });
    }

    startTimeTracking() {
        const startTime = Date.now();
        
        setInterval(() => {
            this.userProfile.timeOnSite = Math.floor((Date.now() - startTime) / 1000);
        }, 1000);
        
        // Track time milestones
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 30 }), 30000);
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 60 }), 60000);
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 120 }), 120000);
    }

    // ======================
    // UTILITY METHODS
    // ======================

    isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    generateUID() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    getUrgencyMessage(calculatorType, results) {
        const messages = {
            mortgage: "🚨 Mortgage rates change daily - get your quotes now!",
            investment: "⏰ Market conditions are optimal - connect with advisors!",
            loan: "🔥 Best rates available this week - get pre-approved!",
            insurance: "⚡ Premium quotes available - compare and save!"
        };
        return messages[calculatorType] || "🎯 Limited time - connect with verified lenders!";
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
        if (!results || Object.keys(results).length === 0) {
            return "Based on your calculation, connect with verified lenders for personalized quotes and exclusive rates.";
        }
        
        const messages = {
            mortgage: `Based on your $${this.formatCurrency(results.monthlyPayment || 0)}/month calculation, get quotes from top mortgage lenders.`,
            investment: `With your $${this.formatCurrency(results.finalAmount || 0)} projection, connect with investment advisors for better strategies.`,
            loan: `For your $${this.formatCurrency(results.loanAmount || 0)} loan, compare pre-approved offers from multiple lenders.`,
            insurance: `Based on your coverage needs, get quotes from top-rated insurance providers.`
        };
        
        return messages[calculatorType] || "Connect with verified financial partners for personalized quotes based on your calculation.";
    }

    calculatePotentialSavings(calculatorType, results) {
        if (!results || Object.keys(results).length === 0) return 2400;
        
        const savings = {
            mortgage: Math.round((results.monthlyPayment || 2000) * 0.15 * 12),
            investment: Math.round((results.finalAmount || 100000) * 0.05),
            loan: Math.round((results.totalInterest || 15000) * 0.2),
            insurance: 1200 // Average insurance savings
        };
        
        return Math.max(savings[calculatorType] || 2400, 1200);
    }

    // HELPER: Format currency properly
    formatCurrency(amount) {
        if (!amount || isNaN(amount)) return '0';
        return Math.round(amount).toLocaleString();
    }
}

// ======================
// GLOBAL FUNCTIONS (for onclick handlers)
// ======================

let calculiqIntegration;

function initializeCalculiQIntegration() {
    if (!window.calculiqIntegration) {
        window.calculiqIntegration = new CalculiQLeadIntegration();
    }
    return window.calculiqIntegration;
}

function submitEmailCapture(calculatorType) {
    const integration = window.calculiqIntegration;
    if (integration) {
        integration.submitEmailCapture(calculatorType);
    }
}

function submitProfileCapture(calculatorType) {
    const integration = window.calculiqIntegration;
    if (integration) {
        integration.submitProfileCapture(calculatorType);
    }
}

function captureExitEmail(calculatorType) {
    const integration = window.calculiqIntegration;
    if (integration) {
        integration.captureExitEmail(calculatorType);
    }
}

function showExitIntent() {
    const integration = window.calculiqIntegration;
    if (integration) {
        integration.showExitIntent();
    }
}

function closeExitIntent() {
    const integration = window.calculiqIntegration;
    if (integration) {
        integration.closeExitIntent();
    }
}

// ======================
// AUTO-INITIALIZATION
// ======================

document.addEventListener('DOMContentLoaded', function() {
    window.calculiqIntegration = initializeCalculiQIntegration();
    console.log('🚀 CalculiQ Lead Integration ready!');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculiQLeadIntegration;
}