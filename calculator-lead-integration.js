// calculator-lead-integration.js
// Frontend Lead Capture Integration for CalculiQ Calculators - Dark Theme Version
// Updated with futuristic dark theme styling

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
                        this.style.outline = '2px solid #00d4ff';
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
    // DARK THEME PROGRESSIVE LEAD CAPTURE FORM
    // ======================

    generateProgressiveLeadForm(calculatorType, results) {
        const urgencyMessage = this.getUrgencyMessage(calculatorType, results);
        const personalizedMessage = this.getPersonalizedMessage(calculatorType, results);
        const socialProof = this.getSocialProof(calculatorType);
        
        return `
        <div class="calculiq-lead-capture" id="leadCaptureContainer" style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
            padding: 40px;
            border-radius: 20px;
            margin: 30px 0 0 0;
            text-align: center;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.5s ease-out;
        ">
            <!-- Animated background -->
            <div class="bg-animation" style="
                position: absolute; 
                top: -50%; 
                left: -50%; 
                width: 200%; 
                height: 200%; 
                background: radial-gradient(circle at 30% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 70% 80%, rgba(123, 47, 247, 0.05) 0%, transparent 50%);
                animation: floatGradient 10s ease-in-out infinite;
                pointer-events: none;
            "></div>
            
            <!-- Urgency Header -->
            <div class="urgency-alert" style="
                background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                margin: -40px -40px 30px -40px; 
                padding: 15px; 
                font-weight: 600;
                position: relative;
                z-index: 2;
                font-size: 0.95rem;
                letter-spacing: 0.5px;
            ">
                ${urgencyMessage}
            </div>
            
            <!-- Step 1: Email Capture -->
            <div class="capture-step active" id="emailCaptureStep" data-step="1" style="position: relative; z-index: 2;">
                <h3 style="
                    margin: 0 0 20px 0; 
                    font-size: 2rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                ">
                    Get Personalized Rate Quotes
                </h3>
                
                <p style="
                    margin: 0 0 30px 0; 
                    font-size: 1.1rem; 
                    color: #94a3b8;
                    line-height: 1.6;
                ">
                    ${personalizedMessage}
                </p>
                
                <!-- Email Form -->
                <div class="email-form">
                    <input type="email" 
                           id="leadEmailInput" 
                           name="email"
                           placeholder="Enter your email for exclusive rates" 
                           autocomplete="email"
                           style="
                               width: 100%; 
                               max-width: 450px; 
                               padding: 18px 25px; 
                               background: #0a0e27;
                               border: 1px solid rgba(255, 255, 255, 0.1);
                               border-radius: 30px; 
                               font-size: 1rem; 
                               margin: 0 0 20px 0;
                               text-align: center;
                               transition: all 0.3s ease;
                               color: #ffffff;
                           "
                           onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'; this.style.boxShadow='0 0 0 3px rgba(0, 212, 255, 0.1)'"
                           onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'; this.style.boxShadow='none'"
                           onkeypress="if(event.key==='Enter') submitEmailCapture('${calculatorType}')">
                    
                    <button onclick="submitEmailCapture('${calculatorType}')" 
                            class="primary-capture-btn"
                            style="
                                background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                                color: white; 
                                border: none; 
                                padding: 18px 50px; 
                                border-radius: 30px; 
                                font-size: 1.1rem; 
                                font-weight: 600; 
                                cursor: pointer; 
                                display: block; 
                                margin: 0 auto 30px auto;
                                transition: all 0.3s ease;
                                position: relative;
                                overflow: hidden;
                                box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 40px rgba(123, 47, 247, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(123, 47, 247, 0.3)'">
                        <span>Get My Quotes</span>
                    </button>
                </div>
                
                <!-- Trust Signals -->
                <div class="trust-signals" style="
                    display: flex; 
                    justify-content: center; 
                    gap: 30px; 
                    flex-wrap: wrap; 
                    font-size: 0.9rem; 
                    color: #94a3b8;
                ">
                    <span>🔒 100% Secure</span>
                    <span>📞 Direct Lender Contact</span>
                    <span>⚡ 24-Hour Response</span>
                    <span>💰 ${socialProof}</span>
                </div>
            </div>
            
            <!-- Step 2: Profile Enhancement -->
            <div class="capture-step" id="profileCaptureStep" data-step="2" style="display: none; position: relative; z-index: 2;">
                <div class="step-indicator" style="
                    display: flex; 
                    justify-content: center; 
                    gap: 15px; 
                    margin-bottom: 30px;
                ">
                    <div style="width: 40px; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px;"></div>
                    <div style="width: 40px; height: 3px; background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%); border-radius: 2px;"></div>
                </div>
                
                <h3 style="
                    margin: 0 0 20px 0; 
                    font-size: 1.8rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                ">
                    Get Premium Rate Access
                </h3>
                
                <p style="
                    margin: 0 0 30px 0; 
                    font-size: 1rem; 
                    color: #94a3b8;
                ">
                    Complete your profile for priority lender matching
                </p>
                
                <!-- Profile Form -->
                <div class="profile-form" style="
                    max-width: 500px; 
                    margin: 0 auto;
                    display: grid;
                    gap: 20px;
                ">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <input type="text" 
                               id="firstNameInput"
                               name="firstName"
                               placeholder="First Name"
                               autocomplete="given-name" 
                               style="
                                   padding: 15px 20px; 
                                   background: #0a0e27;
                                   border: 1px solid rgba(255, 255, 255, 0.1);
                                   border-radius: 10px; 
                                   font-size: 1rem; 
                                   color: #ffffff;
                                   transition: all 0.3s ease;
                               "
                               onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'"
                               onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'">
                        <input type="text" 
                               id="lastNameInput"
                               name="lastName" 
                               placeholder="Last Name"
                               autocomplete="family-name"
                               style="
                                   padding: 15px 20px; 
                                   background: #0a0e27;
                                   border: 1px solid rgba(255, 255, 255, 0.1);
                                   border-radius: 10px; 
                                   font-size: 1rem; 
                                   color: #ffffff;
                                   transition: all 0.3s ease;
                               "
                               onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'"
                               onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'">
                    </div>
                    
                    <input type="tel" 
                           id="phoneInput"
                           name="phone"
                           placeholder="Phone (for priority contact)"
                           autocomplete="tel" 
                           style="
                               padding: 15px 20px; 
                               background: #0a0e27;
                               border: 1px solid rgba(255, 255, 255, 0.1);
                               border-radius: 10px; 
                               font-size: 1rem; 
                               color: #ffffff;
                               transition: all 0.3s ease;
                           "
                           onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'"
                           onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'">
                    
                    <select id="creditScoreInput"
                            name="creditScore" 
                            style="
                                padding: 15px 20px; 
                                background: #0a0e27;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 10px; 
                                font-size: 1rem; 
                                color: #ffffff;
                                transition: all 0.3s ease;
                                cursor: pointer;
                            "
                            onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'"
                            onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'">
                        <option value="" style="background: #0a0e27;">Select Credit Score Range</option>
                        <option value="800+" style="background: #0a0e27;">Excellent (800+)</option>
                        <option value="750-799" style="background: #0a0e27;">Very Good (750-799)</option>
                        <option value="700-749" style="background: #0a0e27;">Good (700-749)</option>
                        <option value="650-699" style="background: #0a0e27;">Fair (650-699)</option>
                        <option value="600-649" style="background: #0a0e27;">Poor (600-649)</option>
                        <option value="<600" style="background: #0a0e27;">Building Credit (<600)</option>
                    </select>
                    
                    <button onclick="submitProfileCapture('${calculatorType}')" 
                            style="
                                background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                                color: white; 
                                border: none; 
                                padding: 18px 40px; 
                                border-radius: 30px; 
                                font-size: 1.1rem; 
                                font-weight: 600; 
                                cursor: pointer; 
                                box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
                                transition: all 0.3s ease;
                                margin-top: 10px;
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 40px rgba(123, 47, 247, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(123, 47, 247, 0.3)'">
                        Get Priority Access
                    </button>
                </div>
                
                <!-- Premium Benefits -->
                <div class="premium-benefits" style="
                    margin-top: 30px; 
                    font-size: 0.9rem; 
                    color: #94a3b8;
                ">
                    <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>✅ Pre-approved rates</span>
                        <span>✅ Priority contact</span>
                        <span>✅ Multiple quotes</span>
                        <span>✅ Exclusive offers</span>
                    </div>
                </div>
            </div>
            
            <!-- Success Step -->
            <div class="capture-step success-step" id="successStep" style="display: none; position: relative; z-index: 2;">
                <div style="
                    font-size: 4rem; 
                    margin-bottom: 20px; 
                    background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: successPulse 1s ease-out;
                ">✓</div>
                <h3 style="
                    margin: 0 0 20px 0; 
                    color: #00d4ff; 
                    font-size: 2rem;
                    font-weight: 700;
                ">Success!</h3>
                <p style="
                    margin: 0 0 30px 0; 
                    font-size: 1.1rem;
                    color: #94a3b8;
                ">
                    Your information has been submitted.<br>
                    <strong style="color: #ffffff;">Our verified partners will contact you within 24 hours!</strong>
                </p>
                <div id="nextStepsContainer" style="
                    background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 25px; 
                    border-radius: 15px; 
                    margin-top: 25px;
                ">
                    <h4 style="margin: 0 0 20px 0; color: #00d4ff;">What happens next:</h4>
                    <div style="text-align: left; max-width: 350px; margin: 0 auto; color: #94a3b8;">
                        <div style="margin: 10px 0;">✓ Verified lenders will call you</div>
                        <div style="margin: 10px 0;">✓ Personalized rate quotes</div>
                        <div style="margin: 10px 0;">✓ Pre-approval opportunities</div>
                        <div style="margin: 10px 0;">✓ Money-saving comparisons</div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes floatGradient {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-20px, -20px) scale(1.1); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes successPulse {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .calculiq-lead-capture select option {
                background: #0a0e27 !important;
                color: #ffffff !important;
            }
            
            .calculiq-lead-capture input::placeholder,
            .calculiq-lead-capture select {
                color: #94a3b8;
            }
            
            @media (max-width: 768px) {
                .calculiq-lead-capture {
                    margin: 20px -20px !important;
                    border-radius: 0 !important;
                    padding: 30px 20px !important;
                }
                
                .profile-form > div {
                    grid-template-columns: 1fr !important;
                }
                
                .trust-signals {
                    gap: 15px !important;
                }
            }
        </style>
        `;
    }

    // ======================
    // DARK THEME EXIT INTENT
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
            background: rgba(10, 14, 39, 0.95); 
            z-index: 999999; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            animation: fadeInModal 0.3s ease-out;
            backdrop-filter: blur(10px);
        ">
            <div style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 50px; 
                border-radius: 25px; 
                max-width: 650px; 
                width: 90%; 
                text-align: center; 
                position: relative;
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(20px);
                animation: slideInModal 0.4s ease-out;
            ">
                <!-- Close Button -->
                <button onclick="closeExitIntent()" style="
                    position: absolute; 
                    top: 20px; 
                    right: 25px; 
                    background: none; 
                    border: none; 
                    font-size: 2rem; 
                    cursor: pointer; 
                    color: #94a3b8;
                    line-height: 1;
                    transition: all 0.3s ease;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " 
                onmouseover="this.style.color='#00d4ff'; this.style.background='rgba(255,255,255,0.05)'" 
                onmouseout="this.style.color='#94a3b8'; this.style.background='none'">×</button>
                
                <!-- Warning Icon -->
                <div style="
                    font-size: 4rem; 
                    margin-bottom: 25px; 
                    background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: iconPulse 2s ease-in-out infinite;
                ">⚡</div>
                
                <!-- Main Headline -->
                <h2 style="
                    color: #ffffff; 
                    margin: 0 0 20px 0; 
                    font-size: 2.2rem;
                    font-weight: 700;
                    line-height: 1.2;
                ">
                    Wait! Don't Miss Out on <br>Better Rates
                </h2>
                
                <!-- Value Proposition -->
                <p style="
                    font-size: 1.3rem; 
                    margin: 0 0 35px 0; 
                    color: #94a3b8;
                    line-height: 1.5;
                ">
                    You could save <strong style="
                        color: #00d4ff; 
                        font-size: 1.5rem;
                        font-weight: 700;
                    ">$${savings.toLocaleString()}/year</strong><br>
                    with verified lender quotes
                </p>
                
                <!-- Benefits Box -->
                <div style="
                    background: rgba(0, 212, 255, 0.05); 
                    border: 1px solid rgba(0, 212, 255, 0.2);
                    padding: 30px; 
                    border-radius: 15px; 
                    margin: 30px 0;
                ">
                    <h4 style="
                        margin: 0 0 20px 0; 
                        color: #00d4ff; 
                        font-size: 1.2rem;
                        font-weight: 600;
                    ">
                        Get Connected with Verified Lenders:
                    </h4>
                    <div style="
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 15px; 
                        text-align: left;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px; color: #94a3b8;">
                            <span style="color: #00d4ff; font-size: 1.2rem;">✓</span>
                            <span>Personalized quotes based on your data</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #94a3b8;">
                            <span style="color: #00d4ff; font-size: 1.2rem;">✓</span>
                            <span>Direct contact from verified lenders</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #94a3b8;">
                            <span style="color: #00d4ff; font-size: 1.2rem;">✓</span>
                            <span>Pre-approval opportunities</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #94a3b8;">
                            <span style="color: #00d4ff; font-size: 1.2rem;">✓</span>
                            <span>Compare multiple offers easily</span>
                        </div>
                    </div>
                </div>
                
                <!-- Email Capture Form -->
                <div style="
                    display: flex; 
                    gap: 15px; 
                    margin: 35px 0; 
                    align-items: center;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                ">
                    <input type="email" 
                           id="exitIntentEmail"
                           name="exitEmail"
                           placeholder="Enter your email for quotes"
                           autocomplete="email"
                           style="
                               flex: 1; 
                               padding: 18px 25px; 
                               background: #0a0e27;
                               border: 1px solid rgba(255, 255, 255, 0.1);
                               border-radius: 30px; 
                               font-size: 1rem;
                               transition: all 0.3s ease;
                               color: #ffffff;
                           "
                           onkeypress="if(event.key==='Enter') captureExitEmail('${calculatorType}')"
                           onfocus="this.style.borderColor='#00d4ff'; this.style.backgroundColor='rgba(0, 212, 255, 0.05)'; this.style.boxShadow='0 0 0 3px rgba(0, 212, 255, 0.1)'"
                           onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.backgroundColor='#0a0e27'; this.style.boxShadow='none'">
                    
                    <button onclick="captureExitEmail('${calculatorType}')" 
                            style="
                                background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                                color: white; 
                                border: none; 
                                padding: 18px 35px; 
                                border-radius: 30px; 
                                font-size: 1rem; 
                                font-weight: 600; 
                                cursor: pointer;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                                box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 40px rgba(123, 47, 247, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(123, 47, 247, 0.3)'">
                        Get Quotes
                    </button>
                </div>
                
                <!-- Security & Social Proof -->
                <div style="
                    display: flex; 
                    justify-content: center; 
                    gap: 30px; 
                    flex-wrap: wrap; 
                    font-size: 0.9rem; 
                    color: #94a3b8; 
                    margin: 25px 0;
                ">
                    <span>🔒 100% secure</span>
                    <span>📞 Direct lender contact</span>
                    <span>🚀 24-hour response</span>
                </div>
                
                <!-- Social Proof Footer -->
                <div style="
                    margin-top: 30px; 
                    padding-top: 25px; 
                    border-top: 1px solid rgba(255, 255, 255, 0.1); 
                    font-size: 0.85rem; 
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                ">
                    <div style="display: flex; gap: 5px;">
                        <span style="color: #00d4ff;">⭐⭐⭐⭐⭐</span>
                    </div>
                    <span>Join thousands of smart savers using CalculiQ</span>
                </div>
            </div>
        </div>

        <style>
            @keyframes fadeInModal {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideInModal {
                from { transform: translateY(-50px) scale(0.9); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            
            @keyframes iconPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            #calculiqExitModal input::placeholder {
                color: #94a3b8;
            }
            
            @media (max-width: 768px) {
                #calculiqExitModal > div {
                    padding: 35px 25px !important;
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
    // MOBILE EXIT TRIGGER (DARK THEME)
    // ======================

    generateMobileExitTrigger(calculatorType) {
        return `
        <div id="calculiqMobileExit" style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 30px;
            border: none;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(123, 47, 247, 0.4);
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
                transform: translateX(-50%) translateY(-2px);
                box-shadow: 0 15px 35px rgba(123, 47, 247, 0.6);
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
            modal.style.animation = 'fadeOutModal 0.3s ease-out';
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
            container.style.animation = 'fadeOut 0.5s ease-out';
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
                animation: slideInError 0.3s ease-out;
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
            background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000000;
            animation: slideInError 0.3s ease-out;
            box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
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
            mortgage: "🚨 Mortgage rates change daily - lock in your quote now!",
            investment: "⏰ Market conditions are shifting - secure your strategy!",
            loan: "🔥 Limited-time rates available - get pre-approved today!",
            insurance: "⚡ Premium quotes expire soon - compare and save!"
        };
        return messages[calculatorType] || "🎯 Exclusive rates available - connect with lenders now!";
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

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes fadeOutModal {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideInError {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

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