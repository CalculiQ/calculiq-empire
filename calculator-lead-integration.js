// calculator-lead-integration.js
// FIXED VERSION - Input fields will work properly
// Replace your current calculator-lead-integration.js with this file

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
        
        console.log('📊 CalculiQ Lead Integration initialized');
    }

    // FIXED: Simplified lead form that actually works
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
            margin: 25px 0;
            text-align: center;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        ">
            <!-- Urgency Header -->
            <div style="
                background: rgba(231, 76, 60, 0.95); 
                margin: -30px -30px 25px -30px; 
                padding: 15px; 
                font-weight: 600;
            ">
                ${urgencyMessage}
            </div>
            
            <!-- Step 1: Email Capture -->
            <div class="capture-step active" id="emailCaptureStep" data-step="1">
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem;">
                    🎯 Get Personalized Rate Quotes
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.2rem; opacity: 0.95;">
                    ${personalizedMessage}
                </p>
                
                <!-- FIXED Email Form -->
                <div class="email-form">
                    <input type="email" 
                           id="leadEmailInput" 
                           placeholder="Enter your email for personalized quotes" 
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
                               position: relative;
                               z-index: 100;
                               background: white;
                               color: #333;
                           ">
                    
                    <button onclick="window.calculiqIntegration.submitEmailCapture('${calculatorType}')" 
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
                                z-index: 100;
                            ">
                        📞 Get My Quotes
                    </button>
                </div>
                
                <!-- Trust Signals -->
                <div style="
                    display: flex; 
                    justify-content: center; 
                    gap: 25px; 
                    flex-wrap: wrap; 
                    font-size: 0.9rem; 
                    opacity: 0.9;
                ">
                    <span>🔒 100% Secure</span>
                    <span>📞 Direct Lender Contact</span>
                    <span>⚡ 24-Hour Response</span>
                    <span>💰 ${socialProof}</span>
                </div>
            </div>
            
            <!-- Step 2: Profile Enhancement -->
            <div class="capture-step" id="profileCaptureStep" data-step="2" style="display: none;">
                <h3 style="margin: 0 0 15px 0; font-size: 1.8rem;">
                    🚀 Get Premium Rate Access
                </h3>
                
                <p style="margin: 0 0 25px 0; font-size: 1.1rem; opacity: 0.95;">
                    Complete your profile for priority lender matching and exclusive rates
                </p>
                
                <!-- FIXED Profile Form -->
                <div class="profile-form" style="max-width: 500px; margin: 0 auto; display: grid; gap: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <input type="text" 
                               id="firstNameInput" 
                               placeholder="First Name" 
                               style="
                                   padding: 15px; 
                                   border: none; 
                                   border-radius: 8px; 
                                   font-size: 1rem;
                                   position: relative;
                                   z-index: 100;
                                   background: white;
                                   color: #333;
                               ">
                        <input type="text" 
                               id="lastNameInput" 
                               placeholder="Last Name" 
                               style="
                                   padding: 15px; 
                                   border: none; 
                                   border-radius: 8px; 
                                   font-size: 1rem;
                                   position: relative;
                                   z-index: 100;
                                   background: white;
                                   color: #333;
                               ">
                    </div>
                    
                    <input type="tel" 
                           id="phoneInput" 
                           placeholder="Phone (for priority contact)" 
                           style="
                               padding: 15px; 
                               border: none; 
                               border-radius: 8px; 
                               font-size: 1rem;
                               position: relative;
                               z-index: 100;
                               background: white;
                               color: #333;
                           ">
                    
                    <select id="creditScoreInput" 
                            style="
                                padding: 15px; 
                                border: none; 
                                border-radius: 8px; 
                                font-size: 1rem;
                                position: relative;
                                z-index: 100;
                                background: white;
                                color: #333;
                            ">
                        <option value="">Select Credit Score Range</option>
                        <option value="800+">Excellent (800+)</option>
                        <option value="750-799">Very Good (750-799)</option>
                        <option value="700-749">Good (700-749)</option>
                        <option value="650-699">Fair (650-699)</option>
                        <option value="600-649">Poor (600-649)</option>
                        <option value="<600">Building Credit (<600)</option>
                    </select>
                    
                    <button onclick="window.calculiqIntegration.submitProfileCapture('${calculatorType}')" 
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
                                position: relative;
                                z-index: 100;
                            ">
                        🎯 Get Priority Access
                    </button>
                </div>
                
                <!-- Premium Benefits -->
                <div style="margin-top: 25px; font-size: 0.9rem; opacity: 0.9;">
                    <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>✅ Pre-approved rates</span>
                        <span>✅ Priority contact</span>
                        <span>✅ Multiple lender quotes</span>
                        <span>✅ Exclusive offers</span>
                    </div>
                </div>
            </div>
            
            <!-- Success Step -->
            <div class="capture-step success-step" id="successStep" style="display: none;">
                <div style="font-size: 4rem; margin-bottom: 15px;">🎉</div>
                <h3 style="margin: 0 0 15px 0; color: #27ae60; font-size: 2rem;">Success!</h3>
                <p style="margin: 0 0 25px 0; font-size: 1.2rem;">
                    Your information has been submitted.<br>
                    <strong>Our verified partners will contact you within 24 hours!</strong>
                </p>
                <div style="
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
            /* FIXED: Make sure inputs work */
            .calculiq-lead-capture input,
            .calculiq-lead-capture select,
            .calculiq-lead-capture button {
                position: relative !important;
                z-index: 100 !important;
                pointer-events: auto !important;
            }
            
            .calculiq-lead-capture input:focus,
            .calculiq-lead-capture select:focus {
                outline: 3px solid rgba(255, 255, 255, 0.5);
                transform: translateY(-2px);
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
            }
        </style>
        `;
    }

    // Calculator integration
    integrateWithCalculator(calculatorType, calculatorElement) {
        this.currentCalculatorType = calculatorType;
        this.trackInteraction('calculator_opened', { type: calculatorType });
        
        const resultsContainer = calculatorElement.querySelector('.calc-results') || 
                               calculatorElement.querySelector('#' + calculatorType + '-results');
        
        if (resultsContainer) {
            const leadFormHTML = this.generateProgressiveLeadForm(calculatorType, {});
            resultsContainer.insertAdjacentHTML('beforeend', leadFormHTML);
        }
        
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
        
        this.updateLeadFormWithResults(calculatorType, results);
        
        setTimeout(() => {
            this.enableExitIntent();
        }, 5000);
        
        console.log(`📊 Calculation completed: ${calculatorType}`, results);
    }

    updateLeadFormWithResults(calculatorType, results) {
        const container = document.getElementById('leadCaptureContainer');
        if (container) {
            const messageElement = container.querySelector('p');
            if (messageElement) {
                messageElement.textContent = this.getPersonalizedMessage(calculatorType, results);
            }
        }
    }

    // Exit intent handlers
    setupExitIntentHandlers() {
        if (this.isMobile()) return;
        
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && this.canShowExitIntent()) {
                this.showExitIntent();
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
            ">
                <button onclick="window.calculiqIntegration.closeExitIntent()" style="
                    position: absolute; 
                    top: 20px; 
                    right: 25px; 
                    background: none; 
                    border: none; 
                    font-size: 2.5rem; 
                    cursor: pointer; 
                    color: #999;
                    line-height: 1;
                ">&times;</button>
                
                <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                
                <h2 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 2.4rem; font-weight: 800;">
                    Wait! Don't Miss Out on Better Rates
                </h2>
                
                <p style="font-size: 1.4rem; margin: 0 0 30px 0; color: #2c3e50; line-height: 1.4;">
                    You could save <strong style="color: #27ae60; font-size: 1.6rem;">$${savings.toLocaleString()}/year</strong><br>
                    with verified lender quotes from our partners
                </p>
                
                <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 30px; border-radius: 15px; margin: 30px 0; border-left: 5px solid #27ae60;">
                    <h4 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 1.3rem;">
                        🎯 Get Connected with Verified Lenders:
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; text-align: left;">
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
                
                <div style="display: flex; gap: 15px; margin: 30px 0; align-items: center; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <input type="email" 
                           id="exitIntentEmail" 
                           placeholder="Enter your email for lender quotes" 
                           style="
                               flex: 1; 
                               padding: 20px; 
                               border: 2px solid #e0e0e0; 
                               border-radius: 12px; 
                               font-size: 1.1rem;
                               position: relative;
                               z-index: 100;
                           ">
                    
                    <button onclick="window.calculiqIntegration.captureExitEmail('${calculatorType}')" 
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
                                position: relative;
                                z-index: 100;
                            ">
                        Get Quotes
                    </button>
                </div>
                
                <div style="display: flex; justify-content: center; gap: 25px; flex-wrap: wrap; font-size: 0.9rem; color: #666; margin: 20px 0;">
                    <span>🔒 100% secure</span>
                    <span>📞 Direct lender contact</span>
                    <span>🚀 24-hour response</span>
                </div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #999; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="display: flex; gap: 5px;">
                        <span style="color: #f39c12;">⭐⭐⭐⭐⭐</span>
                    </div>
                    <span>Join 50,000+ smart savers who use CalculiQ</span>
                </div>
            </div>
        </div>
        `;
    }

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
            max-width: 90%;
            text-align: center;
        " onclick="window.calculiqIntegration.showExitIntent()">
            💰 Get Your Rate Quotes from ${this.getCalculatorDisplayName(calculatorType)} Lenders
        </div>
        `;
    }

    closeExitIntent() {
        const modal = document.getElementById('calculiqExitModal');
        if (modal) {
            modal.remove();
        }
    }

    // API Communication - FIXED
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
                this.showStep('successStep');
                
                this.trackInteraction('profile_completed', {
                    leadScore: result.leadScore,
                    tier: result.tier
                });
                
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
                
                this.showSuccessMessage('✅ Success! Our verified lenders will contact you within 24 hours with personalized quotes.');
                
                this.trackInteraction('exit_email_captured', { email: email });
                
                console.log('🚪 Exit intent email captured');
            }
            
        } catch (error) {
            console.error('Exit email capture error:', error);
            this.showError('Connection error - please try again');
        }
    }

    // UI Helper Methods
    showStep(stepId) {
        document.querySelectorAll('.capture-step').forEach(step => {
            step.style.display = 'none';
        });
        
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.style.display = 'block';
        }
    }

    hideLeadCapture() {
        const container = document.getElementById('leadCaptureContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    showError(message) {
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
            `;
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        
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
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }

    // Tracking & Analytics
    trackInteraction(type, data = {}) {
        const interaction = {
            type: type,
            data: data,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.userProfile.interactions.push(interaction);
        
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
        
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 30 }), 30000);
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 60 }), 60000);
        setTimeout(() => this.trackInteraction('time_milestone', { seconds: 120 }), 120000);
    }

    // Utility Methods
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
            mortgage: `Based on your $${results.monthlyPayment || 'X'}/month calculation, get quotes from top mortgage lenders.`,
            investment: `With your $${results.finalAmount || 'X'} projection, connect with investment advisors for better strategies.`,
            loan: `For your $${results.loanAmount || 'X'} loan, compare pre-approved offers from multiple lenders.`,
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
            insurance: 1200
        };
        
        return Math.max(savings[calculatorType] || 2400, 1200);
    }
}

// Auto-initialization
document.addEventListener('DOMContentLoaded', function() {
    window.calculiqIntegration = new CalculiQLeadIntegration();
    console.log('🚀 CalculiQ Lead Integration ready!');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculiQLeadIntegration;
}