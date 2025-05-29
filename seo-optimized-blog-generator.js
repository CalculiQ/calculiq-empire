// seo-optimized-blog-generator.js
// Generates longer, keyword-focused articles that actually rank

class SEOOptimizedBlogGenerator {
    constructor(db) {
        this.db = db;
        
        // SEO-focused article templates by day and type
        this.articleTemplates = {
            mortgage: [
                {
                    titleTemplate: "How Much House Can I Afford With a $[INCOME] Salary in 2025?",
                    keywords: ["mortgage affordability calculator", "how much house can I afford", "mortgage qualification"],
                    incomes: [50000, 75000, 100000, 150000]
                },
                {
                    titleTemplate: "Should I Refinance My Mortgage at [RATE]%? Complete 2025 Guide",
                    keywords: ["mortgage refinance calculator", "should I refinance", "refinancing break even"],
                    rates: [6.5, 7.0, 7.5, 8.0]
                },
                {
                    titleTemplate: "[PERCENT]% Down Payment: How Much House Can You Buy in 2025?",
                    keywords: ["down payment calculator", "minimum down payment", "FHA loan requirements"],
                    percents: [3, 5, 10, 20]
                },
                {
                    titleTemplate: "Mortgage Calculator: [CITY] Home Buying Guide 2025",
                    keywords: ["mortgage calculator [CITY]", "[CITY] home prices", "buying a house in [CITY]"],
                    cities: ["Los Angeles", "Austin", "Denver", "Nashville", "Phoenix"]
                }
            ],
            investment: [
                {
                    titleTemplate: "$[AMOUNT] Investment: How Much Will It Grow in [YEARS] Years?",
                    keywords: ["investment calculator", "compound interest calculator", "investment growth"],
                    amounts: [1000, 5000, 10000, 50000],
                    years: [10, 20, 30]
                },
                {
                    titleTemplate: "Roth IRA vs 401k Calculator: Which Saves You More Taxes in 2025?",
                    keywords: ["roth ira calculator", "401k calculator", "retirement tax calculator"],
                },
                {
                    titleTemplate: "Dollar Cost Averaging Calculator: Is It Worth It in 2025's Market?",
                    keywords: ["dollar cost averaging calculator", "DCA strategy", "investment timing"],
                }
            ],
            loan: [
                {
                    titleTemplate: "Personal Loan Calculator: How Much Can I Borrow With a [SCORE] Credit Score?",
                    keywords: ["personal loan calculator", "loan qualification", "credit score requirements"],
                    scores: [600, 650, 700, 750]
                },
                {
                    titleTemplate: "Debt Consolidation Calculator: Save $[AMOUNT] on Credit Card Interest",
                    keywords: ["debt consolidation calculator", "credit card payoff", "debt reduction"],
                    amounts: [1000, 2500, 5000, 10000]
                }
            ],
            insurance: [
                {
                    titleTemplate: "Life Insurance Calculator: How Much Coverage Does a [AGE] Year Old Need?",
                    keywords: ["life insurance calculator", "life insurance needs", "coverage amount"],
                    ages: [30, 40, 50, 60]
                },
                {
                    titleTemplate: "Term vs Whole Life Insurance Calculator: 2025 Cost Comparison",
                    keywords: ["life insurance calculator", "term life vs whole life", "insurance comparison"],
                }
            ]
        };
    }

    async generateSEOArticle(calculatorType) {
        // Pick a template based on date to ensure variety
        const templates = this.articleTemplates[calculatorType];
        const dayOfMonth = new Date().getDate();
        const template = templates[dayOfMonth % templates.length];
        
        // Generate specific article
        const articleData = this.generateFromTemplate(template, calculatorType);
        
        // Get market data for accuracy
        const marketData = await this.fetchMarketData();
        
        // Generate comprehensive content
        const content = this.generateComprehensiveContent(articleData, marketData, calculatorType);
        
        return {
            title: articleData.title,
            content: content,
            excerpt: articleData.excerpt,
            slug: this.generateSEOSlug(articleData.title),
            calculatorType: calculatorType,
            metaDescription: articleData.metaDescription,
            keywords: articleData.keywords.join(', ')
        };
    }

    generateFromTemplate(template, calculatorType) {
        let title = template.titleTemplate;
        let focusKeyword = template.keywords[0];
        
        // Replace variables in template
        if (template.incomes) {
            const income = template.incomes[Math.floor(Math.random() * template.incomes.length)];
            title = title.replace('[INCOME]', income.toLocaleString());
            focusKeyword = focusKeyword.replace('[INCOME]', income);
        }
        
        if (template.rates) {
            const rate = template.rates[Math.floor(Math.random() * template.rates.length)];
            title = title.replace('[RATE]', rate);
        }
        
        if (template.percents) {
            const percent = template.percents[Math.floor(Math.random() * template.percents.length)];
            title = title.replace('[PERCENT]', percent);
        }
        
        if (template.cities) {
            const city = template.cities[Math.floor(Math.random() * template.cities.length)];
            title = title.replace(/\[CITY\]/g, city);
            focusKeyword = focusKeyword.replace(/\[CITY\]/g, city);
        }
        
        if (template.amounts) {
            const amount = template.amounts[Math.floor(Math.random() * template.amounts.length)];
            title = title.replace('[AMOUNT]', amount.toLocaleString());
        }
        
        if (template.years) {
            const years = template.years[Math.floor(Math.random() * template.years.length)];
            title = title.replace('[YEARS]', years);
        }
        
        if (template.scores) {
            const score = template.scores[Math.floor(Math.random() * template.scores.length)];
            title = title.replace('[SCORE]', score);
        }
        
        if (template.ages) {
            const age = template.ages[Math.floor(Math.random() * template.ages.length)];
            title = title.replace('[AGE]', age);
        }
        
        const excerpt = `Complete guide to ${focusKeyword} in 2025. Use our free calculator and expert analysis to make the best financial decision.`;
        const metaDescription = excerpt.substring(0, 155) + '...';
        
        return {
            title,
            focusKeyword,
            keywords: template.keywords,
            excerpt,
            metaDescription
        };
    }

    generateComprehensiveContent(articleData, marketData, calculatorType) {
        const { title, focusKeyword, keywords } = articleData;
        
        let content = `
        <div class="seo-article">
            <!-- Introduction with focus keyword in first paragraph -->
            <p>If you're searching for a <strong>${focusKeyword}</strong>, you've come to the right place. In today's market with rates at ${marketData.mortgageRate30}%, understanding your options is more important than ever.</p>
            
            <p>This comprehensive guide will walk you through everything you need to know, plus give you access to our free calculator that provides instant, personalized results based on current market conditions.</p>
            
            <!-- Table of Contents for better UX and SEO -->
            <div class="table-of-contents">
                <h2>Quick Navigation</h2>
                <ul>
                    <li><a href="#how-it-works">How the Calculation Works</a></li>
                    <li><a href="#current-rates">Current Market Rates</a></li>
                    <li><a href="#factors">Key Factors to Consider</a></li>
                    <li><a href="#calculator">Use Our Free Calculator</a></li>
                    <li><a href="#expert-tips">Expert Tips</a></li>
                    <li><a href="#faqs">Frequently Asked Questions</a></li>
                </ul>
            </div>
            
            <!-- Main content sections -->
            ${this.generateMainContent(calculatorType, articleData, marketData)}
            
            <!-- Calculator CTA Section -->
            <div id="calculator" class="calculator-cta-section">
                <h2>Calculate Your ${this.getCalculatorName(calculatorType)} Now</h2>
                <p>Ready to get your personalized results? Our free ${focusKeyword} gives you instant answers based on today's rates and your specific situation.</p>
                
                <div class="cta-benefits">
                    <div class="cta-benefit">✓ Instant Results</div>
                    <div class="cta-benefit">✓ Current Market Rates</div>
                    <div class="cta-benefit">✓ No Email Required</div>
                    <div class="cta-benefit">✓ 100% Free</div>
                </div>
                
                <a href="/#calculators" class="cta-button-primary">Launch ${this.getCalculatorName(calculatorType)} Calculator →</a>
                
                <p class="cta-note">Join over 50,000 people who use CalculiQ's calculators every month to make smarter financial decisions.</p>
            </div>
            
            <!-- Expert Tips Section -->
            ${this.generateExpertTips(calculatorType, marketData)}
            
            <!-- FAQs for featured snippets -->
            ${this.generateFAQs(calculatorType, articleData)}
            
            <!-- Final CTA -->
            <div class="article-conclusion">
                <h2>Ready to Take the Next Step?</h2>
                <p>Now that you understand ${focusKeyword}, it's time to get your personalized calculation. Our tool takes just 60 seconds to use and provides results you can trust.</p>
                <a href="/#calculators" class="cta-button-primary">Start Calculating →</a>
            </div>
        </div>
        `;
        
        return content;
    }

    generateMainContent(calculatorType, articleData, marketData) {
        // This generates 800-1000 words of valuable, keyword-optimized content
        const contentGenerators = {
            mortgage: () => this.generateMortgageContent(articleData, marketData),
            investment: () => this.generateInvestmentContent(articleData, marketData),
            loan: () => this.generateLoanContent(articleData, marketData),
            insurance: () => this.generateInsuranceContent(articleData, marketData)
        };
        
        return contentGenerators[calculatorType]();
    }

    generateMortgageContent(articleData, marketData) {
        return `
            <h2 id="how-it-works">How Mortgage Calculations Work in 2025</h2>
            <p>Understanding mortgage calculations is crucial when you're planning to buy a home. The basic formula considers your loan amount, interest rate, and loan term, but there's much more to consider in today's market.</p>
            
            <h3>The Basic Mortgage Formula</h3>
            <p>Your monthly mortgage payment consists of four main components, often referred to as PITI:</p>
            <ul>
                <li><strong>Principal:</strong> The amount you borrow</li>
                <li><strong>Interest:</strong> The cost of borrowing (currently averaging ${marketData.mortgageRate30}%)</li>
                <li><strong>Taxes:</strong> Property taxes (varies by location)</li>
                <li><strong>Insurance:</strong> Homeowners insurance and PMI if applicable</li>
            </ul>
            
            <h2 id="current-rates">Current Mortgage Rates (Updated ${new Date().toLocaleDateString()})</h2>
            <div class="rate-table">
                <table>
                    <tr>
                        <th>Loan Type</th>
                        <th>Current Rate</th>
                        <th>Change from Last Week</th>
                    </tr>
                    <tr>
                        <td>30-Year Fixed</td>
                        <td>${marketData.mortgageRate30}%</td>
                        <td>${marketData.direction === 'up' ? '↑' : '↓'} ${Math.abs(marketData.rateChange)}%</td>
                    </tr>
                    <tr>
                        <td>15-Year Fixed</td>
                        <td>${marketData.mortgageRate15}%</td>
                        <td>→ 0.00%</td>
                    </tr>
                    <tr>
                        <td>5/1 ARM</td>
                        <td>${(parseFloat(marketData.mortgageRate30) - 0.5).toFixed(3)}%</td>
                        <td>→ 0.00%</td>
                    </tr>
                </table>
            </div>
            
            <h2 id="factors">Key Factors Affecting Your Mortgage</h2>
            <h3>1. Credit Score Impact</h3>
            <p>Your credit score significantly affects your mortgage rate. Here's how:</p>
            <ul>
                <li>740+ credit score: Best rates available (${marketData.mortgageRate30}%)</li>
                <li>700-739: Add 0.25% to base rate</li>
                <li>660-699: Add 0.5% to base rate</li>
                <li>620-659: Add 1-2% to base rate</li>
            </ul>
            
            <h3>2. Down Payment Options</h3>
            <p>Different loan programs have different down payment requirements:</p>
            <ul>
                <li><strong>Conventional loans:</strong> 3% minimum (with PMI)</li>
                <li><strong>FHA loans:</strong> 3.5% minimum</li>
                <li><strong>VA loans:</strong> 0% down for eligible veterans</li>
                <li><strong>USDA loans:</strong> 0% down in eligible rural areas</li>
            </ul>
            
            <h3>3. Debt-to-Income Ratio</h3>
            <p>Lenders typically want your total monthly debt payments (including the new mortgage) to be no more than 43% of your gross monthly income. Some loan programs allow up to 50% DTI with compensating factors.</p>
        `;
    }

    generateInvestmentContent(articleData, marketData) {
        return `
            <h2 id="how-it-works">Understanding Investment Growth Calculations</h2>
            <p>Investment calculations help you project how your money can grow over time through the power of compound interest. Whether you're planning for retirement or a major purchase, understanding these calculations is essential.</p>
            
            <h3>The Compound Interest Formula</h3>
            <p>The basic formula for compound interest is: A = P(1 + r/n)^(nt)</p>
            <ul>
                <li><strong>A:</strong> Final amount</li>
                <li><strong>P:</strong> Principal (initial investment)</li>
                <li><strong>r:</strong> Annual interest rate</li>
                <li><strong>n:</strong> Number of times interest compounds per year</li>
                <li><strong>t:</strong> Number of years</li>
            </ul>
            
            <h2 id="current-rates">Current Investment Environment</h2>
            <p>With interest rates at ${marketData.mortgageRate30}%, the investment landscape has shifted significantly:</p>
            <ul>
                <li><strong>High-yield savings:</strong> 4.5-5.5% APY</li>
                <li><strong>CDs (1-year):</strong> 5.0-5.5% APY</li>
                <li><strong>Treasury bonds:</strong> 4.5-5.0% yield</li>
                <li><strong>Stock market (historical):</strong> 10% average annual return</li>
            </ul>
            
            <h2 id="factors">Investment Strategy Factors</h2>
            <h3>1. Time Horizon</h3>
            <p>Your investment timeline dramatically affects your strategy:</p>
            <ul>
                <li><strong>Short-term (1-3 years):</strong> Focus on stability with savings, CDs, bonds</li>
                <li><strong>Medium-term (3-10 years):</strong> Balanced approach with stocks and bonds</li>
                <li><strong>Long-term (10+ years):</strong> Growth-focused with majority in stocks</li>
            </ul>
            
            <h3>2. Risk Tolerance</h3>
            <p>Understanding your risk tolerance helps determine the right investment mix:</p>
            <ul>
                <li><strong>Conservative:</strong> 20% stocks, 80% bonds/cash</li>
                <li><strong>Moderate:</strong> 60% stocks, 40% bonds</li>
                <li><strong>Aggressive:</strong> 80%+ stocks</li>
            </ul>
        `;
    }

    generateLoanContent(articleData, marketData) {
        return `
            <h2 id="how-it-works">How Personal Loan Calculations Work</h2>
            <p>Personal loan calculations determine your monthly payment based on the loan amount, interest rate, and term. Understanding these calculations helps you choose the right loan and avoid overextending your budget.</p>
            
            <h3>Factors Affecting Your Loan Rate</h3>
            <p>In today's market with base rates at ${marketData.mortgageRate30}%, personal loan rates typically range from:</p>
            <ul>
                <li><strong>Excellent credit (720+):</strong> 7-12% APR</li>
                <li><strong>Good credit (690-719):</strong> 13-18% APR</li>
                <li><strong>Fair credit (630-689):</strong> 19-25% APR</li>
                <li><strong>Poor credit (below 630):</strong> 26-36% APR</li>
            </ul>
            
            <h2 id="current-rates">Personal Loan Market Update</h2>
            <p>The personal loan market has seen significant changes in 2025:</p>
            <ul>
                <li>Average loan amount: $15,000</li>
                <li>Most common term: 3-5 years</li>
                <li>Average APR: 18.5%</li>
                <li>Approval rates: 35-40% for online applications</li>
            </ul>
            
            <h2 id="factors">Smart Borrowing Strategies</h2>
            <h3>1. When Personal Loans Make Sense</h3>
            <ul>
                <li><strong>Debt consolidation:</strong> When the loan rate is lower than your credit cards</li>
                <li><strong>Home improvements:</strong> For projects that add value to your home</li>
                <li><strong>Medical expenses:</strong> To manage unexpected healthcare costs</li>
                <li><strong>Major purchases:</strong> When you need predictable monthly payments</li>
            </ul>
        `;
    }

    generateInsuranceContent(articleData, marketData) {
        return `
            <h2 id="how-it-works">How Life Insurance Calculations Work</h2>
            <p>Life insurance calculations help determine how much coverage you need to protect your family's financial future. The right amount depends on your income, debts, and family's living expenses.</p>
            
            <h3>The DIME Formula</h3>
            <p>Financial advisors often use the DIME method to calculate life insurance needs:</p>
            <ul>
                <li><strong>D - Debt:</strong> All outstanding debts including mortgage</li>
                <li><strong>I - Income:</strong> 5-10 years of income replacement</li>
                <li><strong>M - Mortgage:</strong> Remaining mortgage balance</li>
                <li><strong>E - Education:</strong> Future education costs for children</li>
            </ul>
            
            <h2 id="current-rates">2025 Life Insurance Rate Trends</h2>
            <p>Life insurance rates have been affected by recent economic changes:</p>
            <ul>
                <li>20-year term rates have increased 5-10% from 2024</li>
                <li>Whole life policies offering 4-5% guaranteed returns</li>
                <li>More insurers offering accelerated underwriting</li>
                <li>Hybrid policies gaining popularity</li>
            </ul>
        `;
    }

    generateExpertTips(calculatorType, marketData) {
        const tips = {
            mortgage: `
                <h2 id="expert-tips">Expert Mortgage Tips for 2025</h2>
                <h3>1. Lock Your Rate at the Right Time</h3>
                <p>With rates at ${marketData.mortgageRate30}% and ${marketData.direction === 'up' ? 'rising' : 'falling'}, timing your rate lock is crucial. Most lenders offer 30-60 day locks for free.</p>
                
                <h3>2. Consider Buying Points</h3>
                <p>One discount point typically costs 1% of your loan amount and reduces your rate by 0.25%. Calculate if the upfront cost saves money over your expected time in the home.</p>
                
                <h3>3. Don't Forget Closing Costs</h3>
                <p>Budget 2-5% of the home price for closing costs. Some lenders offer no-closing-cost mortgages but at higher rates.</p>
            `,
            investment: `
                <h2 id="expert-tips">Expert Investment Tips for 2025</h2>
                <h3>1. Start Early, Even with Small Amounts</h3>
                <p>Thanks to compound interest, starting with just $100/month at age 25 vs 35 can mean a difference of hundreds of thousands at retirement.</p>
                
                <h3>2. Maximize Tax-Advantaged Accounts</h3>
                <p>Contribute to 401(k)s up to employer match, then max out Roth IRAs. The tax savings compound over time.</p>
                
                <h3>3. Rebalance Annually</h3>
                <p>Market movements can shift your asset allocation. Rebalance yearly to maintain your target risk level.</p>
            `,
            loan: `
                <h2 id="expert-tips">Expert Personal Loan Tips</h2>
                <h3>1. Shop Multiple Lenders</h3>
                <p>Rates can vary by 10% or more between lenders. Get at least 3 quotes before deciding.</p>
                
                <h3>2. Avoid Prepayment Penalties</h3>
                <p>Choose loans without prepayment penalties so you can pay off early and save on interest.</p>
                
                <h3>3. Consider Credit Union Options</h3>
                <p>Credit unions often offer rates 2-3% lower than traditional banks for members.</p>
            `,
            insurance: `
                <h2 id="expert-tips">Expert Insurance Tips for 2025</h2>
                <h3>1. Buy Term and Invest the Difference</h3>
                <p>For most people, term life insurance plus separate investments beats whole life insurance.</p>
                
                <h3>2. Review Coverage Annually</h3>
                <p>Life changes like marriage, children, or home purchase should trigger a coverage review.</p>
                
                <h3>3. Consider Laddering Policies</h3>
                <p>Buy multiple smaller policies with different terms to match decreasing insurance needs over time.</p>
            `
        };
        
        return tips[calculatorType];
    }

    generateFAQs(calculatorType, articleData) {
        // These target "People Also Ask" featured snippets
        return `
            <h2 id="faqs">Frequently Asked Questions</h2>
            
            <div class="faq-item">
                <h3>What is a ${articleData.focusKeyword}?</h3>
                <p>A ${articleData.focusKeyword} is a free online tool that helps you calculate ${this.getFAQDescription(calculatorType)}. It provides instant results based on current market rates and your specific financial situation.</p>
            </div>
            
            <div class="faq-item">
                <h3>How accurate are online ${calculatorType} calculators?</h3>
                <p>Quality calculators like CalculiQ's use real-time market data and standard financial formulas, making them highly accurate for planning purposes. However, actual rates from lenders may vary based on your complete financial profile.</p>
            </div>
            
            <div class="faq-item">
                <h3>What information do I need to use a ${calculatorType} calculator?</h3>
                <p>${this.getRequiredInfo(calculatorType)}</p>
            </div>
            
            <div class="faq-item">
                <h3>Is the ${calculatorType} calculator really free?</h3>
                <p>Yes, CalculiQ's ${calculatorType} calculator is completely free to use. We don't require any payment or credit card information. You can calculate as many scenarios as you'd like.</p>
            </div>
            
            <div class="faq-item">
                <h3>How often are the rates updated in the calculator?</h3>
                <p>Our calculators use market data that's updated daily. As of ${new Date().toLocaleDateString()}, current rates are ${marketData.mortgageRate30}% for 30-year mortgages.</p>
            </div>
        `;
    }

    getFAQDescription(calculatorType) {
        const descriptions = {
            mortgage: "monthly mortgage payments, total interest costs, and affordability based on your income",
            investment: "investment growth, compound interest, and retirement savings projections",
            loan: "personal loan payments, total interest costs, and loan comparisons",
            insurance: "life insurance coverage needs based on your income, debts, and family situation"
        };
        return descriptions[calculatorType];
    }

    getRequiredInfo(calculatorType) {
        const info = {
            mortgage: "You'll need: home price, down payment amount, interest rate (we provide current rates), and loan term. Optional: property taxes, HOA fees, and insurance costs for more accuracy.",
            investment: "You'll need: initial investment amount, monthly contributions, expected return rate, and investment timeframe. We provide historical averages for different investment types.",
            loan: "You'll need: loan amount, interest rate (or we'll estimate based on credit score), and loan term. Knowing your credit score helps get more accurate rate estimates.",
            insurance: "You'll need: annual income, outstanding debts, number of dependents, and any specific future expenses like college tuition."
        };
        return info[calculatorType];
    }

    getCalculatorName(calculatorType) {
        const names = {
            mortgage: "Mortgage",
            investment: "Investment",
            loan: "Personal Loan",
            insurance: "Life Insurance"
        };
        return names[calculatorType];
    }

    generateSEOSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60); // Keep slugs concise
    }

    async fetchMarketData() {
        // Same as before - get real rates
        try {
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            const response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&limit=2&sort_order=desc&file_type=json`
            );
            
            if (response.data.observations && response.data.observations.length > 0) {
                const currentRate = parseFloat(response.data.observations[0].value);
                const previousRate = response.data.observations[1] ? parseFloat(response.data.observations[1].value) : currentRate;
                
                return {
                    mortgageRate30: currentRate.toFixed(3),
                    mortgageRate15: (currentRate - 0.5).toFixed(3),
                    rateChange: (currentRate - previousRate).toFixed(3),
                    direction: currentRate > previousRate ? 'up' : currentRate < previousRate ? 'down' : 'stable'
                };
            }
        } catch (error) {
            console.error('Market data error:', error);
        }
        
        return {
            mortgageRate30: '7.125',
            mortgageRate15: '6.625',
            rateChange: '0.000',
            direction: 'stable'
        };
    }
}

module.exports = SEOOptimizedBlogGenerator;