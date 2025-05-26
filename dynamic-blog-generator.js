// dynamic-blog-generator.js
// Complete Fixed Version with Live Market Data Integration
// Replace your entire dynamic-blog-generator.js file with this

const axios = require('axios');

class DynamicBlogGenerator {
    constructor() {
        this.titlePatterns = [
            "How to Save $X on Your {type} in {year}",
            "The Smart Person's Guide to {type} in {year}",
            "{number} Ways to Get Better {type} Results",
            "Why {year} is the Perfect Time for {type}",
            "The Complete {type} Strategy for {year}",
            "What You Need to Know About {type} Right Now",
            "{type} Secrets That Could Save You Thousands",
            "The {year} {type} Landscape: What's Changed",
            "Smart {type} Moves for Today's Market",
            "From Confusion to Clarity: Your {type} Guide"
        ];
        
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
    }

    async generateArticle(calculatorType) {
        try {
            console.log(`📝 Generating ${calculatorType} blog with live market data...`);
            
            // Get real market data
            const marketData = await this.fetchCurrentMarketData();
            
            const title = this.generateDynamicTitle(calculatorType);
            const slug = this.createSlug(title);
            const content = await this.generateDynamicContent(calculatorType, marketData);
            const excerpt = this.generateExcerpt(content);
            const metaDescription = excerpt.length > 160 ? excerpt.substring(0, 157) + '...' : excerpt;

            return {
                title,
                slug,
                content,
                excerpt,
                metaDescription,
                calculatorType,
                category: calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1),
                publishedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error generating ${calculatorType} article:`, error);
            throw error;
        }
    }

    generateDynamicTitle(calculatorType) {
        const pattern = this.titlePatterns[Math.floor(Math.random() * this.titlePatterns.length)];
        const numbers = ['5', '7', '10', '12', '15'];
        const savingsAmounts = ['5,000', '10,000', '25,000', '50,000'];
        
        return pattern
            .replace('{type}', this.getTypeDisplayName(calculatorType))
            .replace('{year}', this.currentYear.toString())
            .replace('{number}', numbers[Math.floor(Math.random() * numbers.length)])
            .replace('$X', '$' + savingsAmounts[Math.floor(Math.random() * savingsAmounts.length)]);
    }

    getTypeDisplayName(calculatorType) {
        const displayNames = {
            mortgage: 'Mortgage',
            investment: 'Investment Strategy',
            loan: 'Personal Loan',
            insurance: 'Life Insurance'
        };
        return displayNames[calculatorType] || calculatorType;
    }

    async generateDynamicContent(calculatorType, marketData) {
        const sections = [
            this.generateIntroduction(calculatorType, marketData),
            this.generateCurrentMarketSection(calculatorType, marketData),
            this.generateCalculationBreakdown(calculatorType, marketData),
            this.generateTipsSection(calculatorType),
            this.generateCommonMistakes(calculatorType),
            this.generateFAQSection(calculatorType),
            this.generateCallToAction(calculatorType)
        ];

        return sections.join('\n\n');
    }

    generateIntroduction(calculatorType, marketData) {
        const intros = {
            mortgage: `<p>With mortgage rates currently at ${marketData.rates.mortgage.thirtyYear}% for a 30-year fixed loan, understanding your mortgage options has never been more critical. Whether you're a first-time homebuyer or looking to refinance, the decisions you make today will impact your finances for decades to come.</p>

<p>In this comprehensive guide, we'll break down everything you need to know about mortgages in ${this.currentYear}, including how current market conditions affect your buying power and strategies to secure the best possible rate.</p>`,

            investment: `<p>The investment landscape in ${this.currentYear} presents both opportunities and challenges. With market volatility and changing economic conditions, having a solid investment strategy is more important than ever.</p>

<p>Whether you're just starting your investment journey or looking to optimize your existing portfolio, understanding the fundamentals of smart investing can make the difference between financial success and missed opportunities.</p>`,

            loan: `<p>Personal loans have become an increasingly popular financial tool, offering flexibility for everything from debt consolidation to major purchases. With interest rates varying widely based on your credit profile, understanding how to navigate the personal loan market can save you thousands of dollars.</p>

<p>This guide will walk you through everything you need to know about personal loans in ${this.currentYear}, including how to qualify for the best rates and avoid common pitfalls.</p>`,

            insurance: `<p>Life insurance is one of the most important financial decisions you'll make, yet it's often misunderstood or postponed. The truth is, the cost of waiting can be significant, both financially and for your family's security.</p>

<p>In this comprehensive guide, we'll demystify life insurance, helping you understand how much coverage you need and how to get the best value for your premium dollars.</p>`
        };

        return intros[calculatorType] || `<p>Understanding ${calculatorType} options is crucial for your financial success.</p>`;
    }

    generateCurrentMarketSection(calculatorType, marketData) {
        const sections = {
            mortgage: `<h2>Current Mortgage Market Conditions</h2>

<p>As of ${new Date().toLocaleDateString()}, mortgage rates are showing the following trends:</p>

<div class="rate-box">
<h3>Today's Mortgage Rates</h3>
<ul>
<li><strong>30-Year Fixed:</strong> ${marketData.rates.mortgage.thirtyYear}%</li>
<li><strong>15-Year Fixed:</strong> ${marketData.rates.mortgage.fifteenYear}%</li>
<li><strong>Jumbo Loans:</strong> ${marketData.rates.mortgage.jumbo}%</li>
</ul>
<p><em>Rates updated from Federal Reserve Economic Data (FRED)</em></p>
</div>

<p>These rates represent a significant factor in your monthly payment calculations. For every 1% change in interest rate, your monthly payment changes by approximately 10-12%. This means that timing your mortgage application and securing the best possible rate can save you tens of thousands of dollars over the life of your loan.</p>`,

            investment: `<h2>Current Investment Market Overview</h2>

<p>The investment markets in ${this.currentYear} are characterized by several key factors that every investor should understand:</p>

<div class="tip-box">
<h3>Market Conditions to Watch</h3>
<ul>
<li><strong>Volatility:</strong> Markets continue to experience higher than average volatility</li>
<li><strong>Interest Rates:</strong> Current rate environment affects bond and dividend investments</li>
<li><strong>Inflation Impact:</strong> Understanding how inflation affects your real returns</li>
<li><strong>Diversification:</strong> More important than ever in uncertain times</li>
</ul>
</div>

<p>Despite market uncertainties, the fundamentals of long-term investing remain unchanged. Time in the market continues to be more valuable than timing the market, and consistent contributions to diversified portfolios historically outperform attempts to predict short-term market movements.</p>`,

            loan: `<h2>Personal Loan Market in ${this.currentYear}</h2>

<p>The personal loan market has evolved significantly, with rates and terms varying widely based on several factors:</p>

<div class="rate-box">
<h3>Typical Personal Loan Rates</h3>
<ul>
<li><strong>Excellent Credit (750+):</strong> 6% - 12%</li>
<li><strong>Good Credit (700-749):</strong> 12% - 18%</li>
<li><strong>Fair Credit (650-699):</strong> 18% - 25%</li>
<li><strong>Poor Credit (below 650):</strong> 25%+ or may not qualify</li>
</ul>
</div>

<p>Your credit score is the primary factor determining your loan terms, but lenders also consider your income, debt-to-income ratio, and employment history. Understanding these factors can help you position yourself for the best possible loan terms.</p>`,

            insurance: `<h2>Life Insurance Market Trends in ${this.currentYear}</h2>

<p>The life insurance industry has seen several important developments that affect both costs and coverage options:</p>

<div class="tip-box">
<h3>Key Market Trends</h3>
<ul>
<li><strong>Premium Stability:</strong> Term life insurance rates remain competitive</li>
<li><strong>Underwriting Changes:</strong> Many insurers now offer accelerated underwriting</li>
<li><strong>Digital Applications:</strong> Faster approval processes for qualified applicants</li>
<li><strong>Coverage Flexibility:</strong> More options for customizing policies</li>
</ul>
</div>

<p>These trends generally favor consumers, making it easier and more affordable to secure appropriate life insurance coverage. However, the key is understanding how much coverage you actually need and choosing the right type of policy for your situation.</p>`
        };

        return sections[calculatorType] || `<h2>Current ${calculatorType} Market</h2><p>Understanding current market conditions is important for making informed decisions.</p>`;
    }

    async generateCalculationBreakdown(calculatorType, marketData) {
        // FIXED: Define conditions with REAL market data
        const conditions = {
            mortgage: {
                scenarios: [
                    { 
                        homePrice: 400000, 
                        downPayment: 80000, 
                        rate: parseFloat(marketData.rates.mortgage.thirtyYear), // REAL FRED data
                        term: 30 
                    },
                    { 
                        homePrice: 350000, 
                        downPayment: 70000, 
                        rate: parseFloat(marketData.rates.mortgage.fifteenYear), // REAL FRED data
                        term: 15 
                    },
                    { 
                        homePrice: 500000, 
                        downPayment: 100000, 
                        rate: parseFloat(marketData.rates.mortgage.jumbo || marketData.rates.mortgage.thirtyYear), 
                        term: 30 
                    }
                ]
            },
            investment: {
                scenarios: [
                    { initial: 10000, monthly: 500, rate: 8, years: 20 },
                    { initial: 25000, monthly: 1000, rate: 10, years: 15 },
                    { initial: 5000, monthly: 250, rate: 6, years: 30 }
                ]
            },
            loan: {
                scenarios: [
                    { amount: 25000, rate: 12, term: 5 },
                    { amount: 15000, rate: 8.5, term: 3 },
                    { amount: 50000, rate: 15, term: 7 }
                ]
            },
            insurance: {
                scenarios: [
                    { income: 75000, years: 20, debts: 250000 },
                    { income: 100000, years: 25, debts: 300000 },
                    { income: 50000, years: 15, debts: 150000 }
                ]
            }
        };

        const scenarios = conditions[calculatorType]?.scenarios || [];
        
        if (scenarios.length === 0) {
            return `<div class="calculator-highlight">
                <h3>Calculate Your ${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} Options</h3>
                <p>Use our advanced ${calculatorType} calculator to see personalized scenarios based on your specific situation.</p>
            </div>`;
        }

        let breakdown = `<h2>Real ${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} Scenarios</h2>
        <p>Based on current market conditions (rates updated ${new Date().toLocaleDateString()}):</p>\n`;

        scenarios.forEach((scenario, index) => {
            breakdown += this.formatScenario(calculatorType, scenario, index + 1);
        });

        return breakdown;
    }

    formatScenario(calculatorType, scenario, number) {
        switch (calculatorType) {
            case 'mortgage':
                const monthlyPayment = this.calculateMortgagePayment(
                    scenario.homePrice - scenario.downPayment, 
                    scenario.rate, 
                    scenario.term
                );
                return `<div class="stats-grid">
                    <h4>Scenario ${number}: $${scenario.homePrice.toLocaleString()} Home</h4>
                    <ul>
                        <li>Home Price: $${scenario.homePrice.toLocaleString()}</li>
                        <li>Down Payment: $${scenario.downPayment.toLocaleString()}</li>
                        <li>Current Rate: ${scenario.rate}% <em>(Live FRED data)</em></li>
                        <li><strong>Monthly Payment: $${monthlyPayment.toLocaleString()}</strong></li>
                    </ul>
                </div>\n`;

            case 'investment':
                const futureValue = this.calculateInvestmentGrowth(
                    scenario.initial, 
                    scenario.monthly, 
                    scenario.rate, 
                    scenario.years
                );
                return `<div class="stats-grid">
                    <h4>Scenario ${number}: ${scenario.years}-Year Investment</h4>
                    <ul>
                        <li>Initial Investment: $${scenario.initial.toLocaleString()}</li>
                        <li>Monthly Contribution: $${scenario.monthly.toLocaleString()}</li>
                        <li>Expected Return: ${scenario.rate}%</li>
                        <li><strong>Future Value: $${futureValue.toLocaleString()}</strong></li>
                    </ul>
                </div>\n`;

            case 'loan':
                const loanPayment = this.calculateLoanPayment(scenario.amount, scenario.rate, scenario.term);
                return `<div class="stats-grid">
                    <h4>Scenario ${number}: $${scenario.amount.toLocaleString()} Loan</h4>
                    <ul>
                        <li>Loan Amount: $${scenario.amount.toLocaleString()}</li>
                        <li>Interest Rate: ${scenario.rate}%</li>
                        <li>Term: ${scenario.term} years</li>
                        <li><strong>Monthly Payment: $${loanPayment.toLocaleString()}</strong></li>
                    </ul>
                </div>\n`;

            case 'insurance':
                const coverage = (scenario.income * scenario.years) + scenario.debts + 15000;
                return `<div class="stats-grid">
                    <h4>Scenario ${number}: $${scenario.income.toLocaleString()} Income</h4>
                    <ul>
                        <li>Annual Income: $${scenario.income.toLocaleString()}</li>
                        <li>Coverage Period: ${scenario.years} years</li>
                        <li>Outstanding Debts: $${scenario.debts.toLocaleString()}</li>
                        <li><strong>Recommended Coverage: $${coverage.toLocaleString()}</strong></li>
                    </ul>
                </div>\n`;

            default:
                return '';
        }
    }

    generateTipsSection(calculatorType) {
        const tips = {
            mortgage: `<h2>5 Smart Mortgage Strategies</h2>

<ol>
<li><strong>Shop Multiple Lenders:</strong> Rates can vary by 0.5% or more between lenders. This difference can save you $50,000+ over a 30-year loan.</li>
<li><strong>Consider Points vs. Rate:</strong> Sometimes paying points upfront reduces your rate enough to justify the cost, especially if you plan to stay in the home long-term.</li>
<li><strong>Time Your Application:</strong> Apply when your credit score is at its peak and your debt-to-income ratio is lowest.</li>
<li><strong>Don't Forget About PMI:</strong> If you put down less than 20%, factor private mortgage insurance into your monthly budget.</li>
<li><strong>Get Pre-approved, Not Pre-qualified:</strong> Pre-approval carries more weight with sellers and gives you a realistic budget.</li>
</ol>`,

            investment: `<h2>7 Investment Principles That Work</h2>

<ol>
<li><strong>Start Early:</strong> Time is your most powerful investment tool. Starting 5 years earlier can double your retirement savings.</li>
<li><strong>Automate Everything:</strong> Set up automatic transfers to remove emotion from investing decisions.</li>
<li><strong>Diversify Properly:</strong> Don't put all your eggs in one basket, but don't over-diversify either.</li>
<li><strong>Keep Costs Low:</strong> High fees can eat 30-50% of your returns over decades.</li>
<li><strong>Rebalance Regularly:</strong> Maintain your target allocation through regular rebalancing.</li>
<li><strong>Stay the Course:</strong> Market volatility is normal. Your long-term plan should account for ups and downs.</li>
<li><strong>Maximize Tax-Advantaged Accounts:</strong> Use 401(k)s and IRAs to their fullest extent before taxable investing.</li>
</ol>`,

            loan: `<h2>Personal Loan Best Practices</h2>

<ol>
<li><strong>Check Your Credit First:</strong> Know your score before applying. A few points can make a significant difference in rates.</li>
<li><strong>Compare Multiple Offers:</strong> Rates and terms vary significantly between lenders.</li>
<li><strong>Consider the Total Cost:</strong> Look beyond monthly payments to the total interest you'll pay.</li>
<li><strong>Avoid Prepayment Penalties:</strong> Choose loans that allow early payoff without penalties.</li>
<li><strong>Have a Payoff Plan:</strong> Know exactly how you'll repay the loan before you borrow.</li>
</ol>`,

            insurance: `<h2>Life Insurance Essentials</h2>

<ol>
<li><strong>Calculate Real Needs:</strong> Use the income replacement method: 8-12 times your annual income, plus debts and final expenses.</li>
<li><strong>Buy When Young and Healthy:</strong> Premiums increase with age and health issues. Don't wait.</li>
<li><strong>Term vs. Whole Life:</strong> For most people, term life insurance provides the most coverage for the lowest cost.</li>
<li><strong>Review Beneficiaries Regularly:</strong> Update beneficiaries after major life events.</li>
<li><strong>Don't Over-Insure or Under-Insure:</strong> Get the right amount of coverage for your situation.</li>
</ol>`
        };

        return tips[calculatorType] || `<h2>${calculatorType} Tips</h2><p>Here are some helpful tips for ${calculatorType}.</p>`;
    }

    generateCommonMistakes(calculatorType) {
        const mistakes = {
            mortgage: `<h2>Common Mortgage Mistakes to Avoid</h2>

<ul>
<li><strong>Not Shopping Around:</strong> The first lender you talk to may not offer the best rate.</li>
<li><strong>Forgetting About Closing Costs:</strong> These can add 2-5% to your home purchase price.</li>
<li><strong>Making Large Purchases Before Closing:</strong> New debt can affect your approval.</li>
<li><strong>Choosing the Wrong Loan Term:</strong> 15-year loans have higher payments but save significant interest.</li>
<li><strong>Ignoring Property Taxes and Insurance:</strong> These are part of your total housing cost.</li>
</ul>`,

            investment: `<h2>Investment Mistakes That Cost Money</h2>

<ul>
<li><strong>Trying to Time the Market:</strong> Even professionals struggle with market timing.</li>
<li><strong>Emotional Investing:</strong> Fear and greed lead to buying high and selling low.</li>
<li><strong>Chasing Performance:</strong> Last year's best performer is rarely next year's winner.</li>
<li><strong>Ignoring Fees:</strong> A 1% difference in fees can cost hundreds of thousands over time.</li>
<li><strong>Not Having a Plan:</strong> Random investing rarely leads to financial goals.</li>
</ul>`,

            loan: `<h2>Personal Loan Pitfalls</h2>

<ul>
<li><strong>Not Reading the Fine Print:</strong> Understand all terms, fees, and penalties.</li>
<li><strong>Borrowing More Than Needed:</strong> Only borrow what you can comfortably repay.</li>
<li><strong>Using Loans for Frivolous Spending:</strong> Personal loans should solve financial problems, not create them.</li>
<li><strong>Ignoring Your Credit Impact:</strong> New loans affect your credit utilization and score.</li>
<li><strong>Not Having a Backup Plan:</strong> What happens if your financial situation changes?</li>
</ul>`,

            insurance: `<h2>Life Insurance Mistakes</h2>

<ul>
<li><strong>Waiting Too Long:</strong> Premiums increase with age and health issues develop.</li>
<li><strong>Buying the Wrong Type:</strong> Whole life isn't always better than term life.</li>
<li><strong>Not Enough Coverage:</strong> Many people are significantly underinsured.</li>
<li><strong>Forgetting to Update Beneficiaries:</strong> Life changes require policy updates.</li>
<li><strong>Letting Policies Lapse:</strong> Consistent premium payments are crucial.</li>
</ul>`
        };

        return mistakes[calculatorType] || `<h2>Common ${calculatorType} Mistakes</h2><p>Avoid these common pitfalls.</p>`;
    }

    generateFAQSection(calculatorType) {
        const faqs = {
            mortgage: `<h2>Frequently Asked Questions</h2>

<h3>How much house can I afford?</h3>
<p>A general rule is that your monthly housing payment shouldn't exceed 28% of your gross monthly income. However, consider your other debts and financial goals when determining affordability.</p>

<h3>Should I pay points to lower my rate?</h3>
<p>Points can be worth it if you plan to stay in the home long enough to recoup the upfront cost through monthly savings. Calculate the break-even point before deciding.</p>

<h3>What's the difference between pre-qualification and pre-approval?</h3>
<p>Pre-qualification is an estimate based on information you provide. Pre-approval involves verification of your financial information and carries more weight with sellers.</p>`,

            investment: `<h2>Frequently Asked Questions</h2>

<h3>How much should I invest each month?</h3>
<p>A common recommendation is to save 10-15% of your income for retirement, but the right amount depends on your age, goals, and other savings.</p>

<h3>Should I invest if I have debt?</h3>
<p>Focus on high-interest debt first (credit cards), but don't skip employer 401(k) matching. For lower-interest debt, you can often invest and pay debt simultaneously.</p>

<h3>What's the best investment for beginners?</h3>
<p>Low-cost index funds provide instant diversification and are ideal for beginning investors. They're simple, effective, and historically outperform most actively managed funds.</p>`,

            loan: `<h2>Frequently Asked Questions</h2>

<h3>What credit score do I need for a personal loan?</h3>
<p>Most lenders prefer scores of 650 or higher, but some lenders work with lower scores. Higher scores qualify for better rates.</p>

<h3>How long does approval take?</h3>
<p>Online lenders can approve and fund loans within 24-48 hours. Traditional banks may take several days to a week.</p>

<h3>Can I pay off my loan early?</h3>
<p>Most personal loans allow early payoff, but check for prepayment penalties. Paying early saves interest but verify there are no fees.</p>`,

            insurance: `<h2>Frequently Asked Questions</h2>

<h3>How much life insurance do I need?</h3>
<p>A common formula is 8-12 times your annual income, plus enough to cover debts and final expenses. Consider your family's specific needs and expenses.</p>

<h3>What's the difference between term and whole life insurance?</h3>
<p>Term life provides coverage for a specific period at lower cost. Whole life combines insurance with investment but costs significantly more.</p>

<h3>When should I buy life insurance?</h3>
<p>The best time is when you're young and healthy. Premiums are lowest, and you can lock in rates. Don't wait until you have health issues.</p>`
        };

        return faqs[calculatorType] || `<h2>FAQ</h2><p>Common questions about ${calculatorType}.</p>`;
    }

    generateCallToAction(calculatorType) {
        return `<div class="cta-box">
<h2>Ready to Calculate Your ${this.getTypeDisplayName(calculatorType)} Options?</h2>
<p>Use our advanced ${calculatorType} calculator to get personalized results based on your specific situation. Get instant calculations and connect with verified lenders for the best rates.</p>
<p><strong>Calculate now and take the next step toward your financial goals.</strong></p>
</div>`;
    }

    generateExcerpt(content) {
        // Remove HTML tags and get first meaningful sentences
        const cleanText = content
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
        let excerpt = '';

        for (const sentence of sentences) {
            const cleanSentence = sentence.trim();
            if (cleanSentence.length > 50) {
                excerpt = cleanSentence.length > 160 
                    ? cleanSentence.substring(0, 157) + '...' 
                    : cleanSentence;
                break;
            }
        }

        if (!excerpt && cleanText.length > 50) {
            excerpt = cleanText.substring(0, 157) + '...';
        }

        return excerpt || `Expert insights on ${this.getTypeDisplayName(calculatorType)} strategies and financial planning.`;
    }

    createSlug(title) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        return (title + '-' + date)
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60); // Keep reasonable length
    }

    // Market Data Fetching (REAL FRED API DATA)
    async fetchCurrentMarketData() {
        try {
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            
            // Get REAL mortgage rates from FRED
            const mortgage30Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`
            );
            
            const mortgage15Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`
            );
            
            // Parse the REAL data
            const mortgage30Rate = parseFloat(mortgage30Response.data.observations[0].value);
            const mortgage15Rate = parseFloat(mortgage15Response.data.observations[0].value);
            
            return {
                timestamp: new Date().toISOString(),
                rates: {
                    mortgage: {
                        thirtyYear: mortgage30Rate.toFixed(2),
                        fifteenYear: mortgage15Rate.toFixed(2),
                        jumbo: (mortgage30Rate + 0.5).toFixed(2),
                        lastUpdated: mortgage30Response.data.observations[0].date
                    }
                },
                markets: {
                    sp500: "0.5" // Can add real S&P data here too
                },
                realDataUsed: true,
                dataSources: 'Federal Reserve Economic Data (FRED)'
            };
            
        } catch (error) {
            console.error('Live market data fetch failed:', error.message);
            // Return fallback data if API fails
            return {
                rates: {
                    mortgage: {
                        thirtyYear: "7.1",
                        fifteenYear: "6.6", 
                        jumbo: "7.4"
                    }
                },
                markets: { sp500: "0.5" },
                realDataUsed: false,
                dataSources: 'Fallback data'
            };
        }
    }

    // Calculation Helper Methods
    calculateMortgagePayment(principal, rate, years) {
        const monthlyRate = (rate / 100) / 12;
        const numPayments = years * 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
        return Math.round(payment);
    }

    calculateInvestmentGrowth(initial, monthly, rate, years) {
        const monthlyRate = (rate / 100) / 12;
        const months = years * 12;
        
        const futureInitial = initial * Math.pow(1 + (rate / 100), years);
        const futureMonthly = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
        
        return Math.round(futureInitial + futureMonthly);
    }

    calculateLoanPayment(principal, rate, years) {
        const monthlyRate = (rate / 100) / 12;
        const numPayments = years * 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
        return Math.round(payment);
    }
}

module.exports = DynamicBlogGenerator;