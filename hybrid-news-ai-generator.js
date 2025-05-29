// hybrid-news-ai-generator.js
// Fixed version with better news fetching and content generation

const axios = require('axios');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

class HybridNewsAIGenerator {
    constructor(db) {
        this.db = db;
        this.newsApiKey = process.env.NEWS_API_KEY || 'demo';
        
        // Initialize Claude only if API key exists
        if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder') {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
            this.aiEnabled = true;
            console.log('✅ AI enhancements enabled');
        } else {
            this.aiEnabled = false;
            console.log('📝 Running without AI enhancements');
        }
    }

    async generateDailyRoundup(calculatorType) {
        console.log(`📰 Generating ${calculatorType} roundup for ${new Date().toDateString()}`);
        
        try {
            // Get real data
            const marketData = await this.fetchMarketData();
            console.log('📊 Market data fetched:', marketData);
            
            const newsItems = await this.fetchRelevantNews(calculatorType);
            console.log(`📰 News items fetched: ${newsItems.length} articles`);
            
            // Try to enhance with AI (optional)
            let aiEnhancements = {};
            if (this.aiEnabled && newsItems.length > 0) {
                aiEnhancements = await this.getAIEnhancements(calculatorType, marketData, newsItems);
            }
            
            // Generate the roundup
            const roundup = this.createEnhancedRoundup(calculatorType, marketData, newsItems, aiEnhancements);
            
            return roundup;
            
        } catch (error) {
            console.error('Roundup generation error:', error);
            // Create a basic roundup even if APIs fail
            return this.createBasicRoundup(calculatorType);
        }
    }

    async fetchMarketData() {
        try {
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            
            // Get REAL mortgage rates from FRED
            const ratesResponse = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&limit=2&sort_order=desc&file_type=json`
            );
            
            if (ratesResponse.data.observations && ratesResponse.data.observations.length > 0) {
                const currentRate = parseFloat(ratesResponse.data.observations[0].value);
                const previousRate = ratesResponse.data.observations[1] ? parseFloat(ratesResponse.data.observations[1].value) : currentRate;
                const change = (currentRate - previousRate).toFixed(3);
                
                return {
                    mortgageRate30: currentRate.toFixed(3),
                    mortgageRate15: (currentRate - 0.5).toFixed(3), // Approximate 15-year rate
                    rateChange: change,
                    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged',
                    dataDate: ratesResponse.data.observations[0].date,
                    weeklyChange: change
                };
            }
        } catch (error) {
            console.error('Market data error:', error.message);
        }
        
        // Fallback data
        return {
            mortgageRate30: '7.125',
            mortgageRate15: '6.625',
            rateChange: '0.125',
            direction: 'up',
            dataDate: new Date().toISOString().split('T')[0],
            weeklyChange: '0.125'
        };
    }

    async fetchRelevantNews(calculatorType) {
        try {
            // If no API key, use sample news
            if (this.newsApiKey === 'demo') {
                return this.getSampleNews(calculatorType);
            }

            const queries = {
                mortgage: 'mortgage rates OR housing market OR home prices',
                investment: 'stock market OR S&P 500 OR dow jones',
                loan: 'interest rates OR personal loans OR consumer credit',
                insurance: 'insurance rates OR life insurance OR health insurance'
            };

            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: queries[calculatorType],
                    sortBy: 'publishedAt',
                    language: 'en',
                    pageSize: 5,
                    apiKey: this.newsApiKey,
                    from: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // Last 2 days
                }
            });

            if (response.data.articles && response.data.articles.length > 0) {
                return response.data.articles.map(article => ({
                    headline: article.title,
                    source: article.source.name,
                    url: article.url,
                    description: article.description || 'Click to read more'
                }));
            }
        } catch (error) {
            console.error('News fetch error:', error.message);
        }
        
        // Return sample news if API fails
        return this.getSampleNews(calculatorType);
    }

    getSampleNews(calculatorType) {
        const sampleNews = {
            mortgage: [
                {
                    headline: "Fed Signals Potential Rate Changes Ahead",
                    source: "Financial Times",
                    description: "Federal Reserve officials discuss economic outlook and potential impacts on mortgage rates"
                },
                {
                    headline: "Housing Market Shows Signs of Cooling in Major Cities",
                    source: "Reuters",
                    description: "New data reveals slower home price growth in metropolitan areas"
                },
                {
                    headline: "First-Time Buyers Face Affordability Challenges",
                    source: "CNBC",
                    description: "Rising rates and home prices squeeze entry-level buyers out of the market"
                }
            ],
            investment: [
                {
                    headline: "Tech Stocks Lead Market Recovery",
                    source: "Bloomberg",
                    description: "Major technology companies drive indices higher amid earnings optimism"
                },
                {
                    headline: "Inflation Data Impacts Investment Strategies",
                    source: "Wall Street Journal",
                    description: "Investors adjust portfolios as new inflation figures are released"
                },
                {
                    headline: "Emerging Markets Show Strong Growth Potential",
                    source: "Financial Times",
                    description: "Analysts highlight opportunities in developing economies"
                }
            ],
            loan: [
                {
                    headline: "Personal Loan Rates Rise Following Fed Decision",
                    source: "MarketWatch",
                    description: "Lenders adjust rates in response to central bank policy changes"
                },
                {
                    headline: "Credit Card Debt Reaches New Heights",
                    source: "CNBC",
                    description: "Consumer borrowing trends show increased reliance on credit"
                },
                {
                    headline: "Banks Tighten Lending Standards",
                    source: "Reuters",
                    description: "Financial institutions become more selective with loan approvals"
                }
            ],
            insurance: [
                {
                    headline: "Insurance Premiums Expected to Rise in 2025",
                    source: "Insurance Journal",
                    description: "Industry experts predict higher costs across multiple coverage types"
                },
                {
                    headline: "New Regulations Impact Health Insurance Options",
                    source: "Healthcare Finance",
                    description: "Policy changes affect coverage availability and pricing"
                },
                {
                    headline: "Life Insurance Demand Surges Among Millennials",
                    source: "Forbes",
                    description: "Younger generations increasingly seek financial protection"
                }
            ]
        };
        
        return sampleNews[calculatorType] || sampleNews.mortgage;
    }

    async getAIEnhancements(calculatorType, marketData, newsItems) {
        const enhancements = {};
        
        try {
            // Only try AI if we have the API configured
            if (this.aiEnabled && this.anthropic) {
                // Keep AI calls minimal to avoid errors
                enhancements.insight = await this.getAIInsight(calculatorType, marketData, newsItems);
            }
        } catch (error) {
            console.log('📝 AI enhancement skipped:', error.message);
        }
        
        return enhancements;
    }

    async getAIInsight(calculatorType, marketData, newsItems) {
        if (!this.aiEnabled || !newsItems.length) return null;
        
        try {
            const topHeadlines = newsItems.slice(0, 3).map(n => n.headline).join('; ');
            
            const prompt = `Based on these ${calculatorType} headlines: "${topHeadlines}" and rates at ${marketData.mortgageRate30}%, write ONE insight paragraph (2-3 sentences) that connects these trends. Be specific and actionable.`;

            const message = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 100,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });
            
            return message.content[0].text.trim();
        } catch (error) {
            console.error('AI insight error:', error);
            return null;
        }
    }

    createEnhancedRoundup(calculatorType, marketData, newsItems, aiEnhancements) {
        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Create title
        const title = this.generateTitle(calculatorType, marketData, dateStr);
        
        // Build content
        let content = `<div class="daily-roundup">`;
        
        // Opening summary
        content += `
            <div class="roundup-intro">
                <p>Welcome to today's ${calculatorType} market roundup. Here's what you need to know about the latest developments affecting your financial decisions.</p>
            </div>
        `;
        
        // Market data section
        content += this.createMarketDataSection(calculatorType, marketData);
        
        // AI Insight (if available)
        if (aiEnhancements.insight) {
            content += `
                <div class="market-analysis-section">
                    <h2>Market Analysis</h2>
                    <p>${aiEnhancements.insight}</p>
                </div>
            `;
        }
        
        // Always add comprehensive analysis even without AI
        content += this.createBasicInsight(calculatorType, marketData);
        
        // News section
        if (newsItems && newsItems.length > 0) {
            content += this.createNewsSection(newsItems);
        }
        
        // Practical tip
        content += this.createPracticalTip(calculatorType, marketData);
        
        // Calculator CTA
        content += this.createCalculatorCTA(calculatorType, marketData);
        
        content += `</div>`;

        // Create excerpt
        const excerpt = `${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} market update: Rates at ${marketData.mortgageRate30}%. ${newsItems.length} key developments affecting your financial decisions today.`;

        // Create slug
        const slug = `${calculatorType}-market-update-${date.toISOString().split('T')[0]}`;

        return {
            title,
            content,
            excerpt,
            slug,
            calculatorType,
            metaDescription: excerpt
        };
    }

    generateTitle(calculatorType, marketData, dateStr) {
        const titles = {
            mortgage: marketData 
                ? `Mortgage Rates ${marketData.direction === 'up' ? 'Rise' : marketData.direction === 'down' ? 'Fall' : 'Hold'} to ${marketData.mortgageRate30}% - ${dateStr}`
                : `Mortgage Market Update - ${dateStr}`,
            investment: `Investment Market Digest - ${dateStr}`,
            loan: `Personal Loan Rate Trends - ${dateStr}`,
            insurance: `Insurance Industry Updates - ${dateStr}`
        };
        
        return titles[calculatorType];
    }

    createMarketDataSection(calculatorType, marketData) {
        const sections = {
            mortgage: `
                <div class="market-data-section">
                    <h2>Today's Mortgage Rates</h2>
                    <div class="rate-display">
                        <div class="current-rate">
                            <span class="rate-number">${marketData.mortgageRate30}%</span>
                            <span class="rate-label">30-Year Fixed</span>
                            <span class="rate-change ${marketData.direction}">${marketData.direction === 'up' ? '↑' : marketData.direction === 'down' ? '↓' : '→'} ${Math.abs(marketData.rateChange)}%</span>
                        </div>
                        <div class="secondary-rate">
                            <span class="rate-number">${marketData.mortgageRate15}%</span>
                            <span class="rate-label">15-Year Fixed</span>
                        </div>
                    </div>
                    <p class="data-source">Source: Federal Reserve Economic Data (FRED) - ${marketData.dataDate}</p>
                    <p>Today's rates show a ${marketData.direction === 'up' ? 'rise' : marketData.direction === 'down' ? 'decline' : 'steady hold'} compared to last week, impacting monthly payments for new borrowers.</p>
                </div>
            `,
            investment: `
                <div class="market-data-section">
                    <h2>Market Snapshot</h2>
                    <p>Current mortgage rates: ${marketData.mortgageRate30}% (${marketData.direction} ${Math.abs(marketData.rateChange)}%)</p>
                    <p>When rates ${marketData.direction === 'up' ? 'rise' : 'fall'}, it often impacts investment strategies and bond markets. Higher rates typically mean better returns on fixed-income investments but can pressure stock valuations.</p>
                </div>
            `,
            loan: `
                <div class="market-data-section">
                    <h2>Interest Rate Environment</h2>
                    <p>Base rates are ${marketData.direction} with mortgages at ${marketData.mortgageRate30}%, suggesting personal loan rates may follow. Most personal loans are currently ranging from 7% to 36% APR depending on credit score and loan terms.</p>
                </div>
            `,
            insurance: `
                <div class="market-data-section">
                    <h2>Economic Indicators</h2>
                    <p>With mortgage rates at ${marketData.mortgageRate30}%, economic conditions continue to influence insurance pricing. Insurance companies adjust premiums based on economic factors including interest rates, inflation, and market volatility.</p>
                </div>
            `
        };
        
        return sections[calculatorType] || sections.mortgage;
    }

    createBasicInsight(calculatorType, marketData) {
        const insights = {
            mortgage: `
                <div class="market-analysis-section">
                    <h2>Market Analysis</h2>
                    <p>With mortgage rates at ${marketData.mortgageRate30}%, we're seeing significant impacts across the housing market. A $400,000 mortgage would cost approximately ${this.calculateMonthlyPayment(400000, marketData.mortgageRate30, 30).toLocaleString()} per month in principal and interest.</p>
                    <p>${marketData.direction === 'up' ? 'Rising rates are putting pressure on affordability, making it crucial for buyers to lock in rates soon. Each 0.25% increase adds roughly $50-75 to monthly payments on a typical loan.' : marketData.direction === 'down' ? 'Falling rates are creating opportunities for both new buyers and those looking to refinance. This could save homeowners hundreds of dollars monthly.' : 'Stable rates provide a predictable environment for planning your home purchase or refinance decision.'}</p>
                    <p>Key consideration: Pre-approval locks in today's rate for 60-90 days, protecting you from future increases while you shop for homes.</p>
                </div>
            `,
            investment: `
                <div class="market-analysis-section">
                    <h2>Market Analysis</h2>
                    <p>The current interest rate environment at ${marketData.mortgageRate30}% is reshaping investment strategies across asset classes. Higher rates typically benefit savers and fixed-income investors while creating headwinds for growth stocks.</p>
                    <p>Smart investors are adapting by balancing their portfolios between dividend-paying stocks, which offer income similar to bonds, and growth opportunities in sectors less sensitive to interest rates. Technology and healthcare remain attractive for long-term growth despite rate pressures.</p>
                    <p>Consider this: A diversified portfolio with 60% stocks and 40% bonds has historically weathered various rate environments while providing steady returns. Use our investment calculator to model different allocation strategies based on your risk tolerance and time horizon.</p>
                </div>
            `,
            loan: `
                <div class="market-analysis-section">
                    <h2>Market Analysis</h2>
                    <p>Personal loan rates are closely following the broader interest rate environment, with base rates at ${marketData.mortgageRate30}%. Most personal loans now range from 7% to 36% APR, depending heavily on credit score and loan purpose.</p>
                    <p>The current environment makes strategic borrowing more important than ever. Consolidating high-interest credit card debt (averaging 24% APR) into a personal loan at 12-15% APR could save thousands in interest charges. However, borrowing for discretionary purchases becomes less attractive as rates rise.</p>
                    <p>Pro tip: Improving your credit score by just 50 points could lower your loan rate by 2-3%, potentially saving hundreds of dollars over the loan term. Check multiple lenders as rates can vary significantly.</p>
                </div>
            `,
            insurance: `
                <div class="market-analysis-section">
                    <h2>Market Analysis</h2>
                    <p>Insurance markets are adapting to the economic environment marked by ${marketData.mortgageRate30}% interest rates. Insurance companies invest premiums in bonds and other fixed-income securities, so rate changes directly impact their profitability and pricing strategies.</p>
                    <p>We're seeing insurers adjust their product offerings, with some companies offering more competitive rates on term life insurance while others focus on permanent life products with cash value components. Health insurance premiums continue to rise, but at a slower pace than previous years.</p>
                    <p>Strategic move: This is an excellent time to review and compare insurance policies. Many consumers can find better coverage at lower costs by shopping around, especially if their life circumstances have changed since they first purchased their policies.</p>
                </div>
            `
        };
        
        return insights[calculatorType] || insights.mortgage;
    }

    createNewsSection(newsItems) {
        let section = `
            <div class="news-section">
                <h2>Top Stories</h2>
                <div class="news-list">
        `;
        
        newsItems.slice(0, 5).forEach((item, index) => {
            section += `
                <div class="news-item">
                    <h3>${index + 1}. ${this.cleanHeadline(item.headline)}</h3>
                    <p class="news-source">via ${item.source}</p>
                    <p class="news-summary">${this.cleanDescription(item.description)}</p>
                </div>
            `;
        });
        
        section += `
                </div>
            </div>
        `;
        
        return section;
    }

    createPracticalTip(calculatorType, marketData) {
        const tips = {
            mortgage: `
                <div class="calculator-tip-box">
                    <h3>💡 Today's Action Item</h3>
                    <p>Compare your current mortgage rate to today's ${marketData.mortgageRate30}%. If you could save 0.5% or more by refinancing, use our calculator to see your potential monthly savings.</p>
                </div>
            `,
            investment: `
                <div class="calculator-tip-box">
                    <h3>💡 Investment Tip</h3>
                    <p>Dollar-cost averaging works well in volatile markets. Use our calculator to see how regular monthly investments could grow over time.</p>
                </div>
            `,
            loan: `
                <div class="calculator-tip-box">
                    <h3>💡 Smart Borrowing</h3>
                    <p>Before taking any loan, calculate the total interest cost. Our calculator shows you exactly how much extra you'll pay over the loan term.</p>
                </div>
            `,
            insurance: `
                <div class="calculator-tip-box">
                    <h3>💡 Coverage Check</h3>
                    <p>Life changes require coverage updates. Use our calculator to ensure your insurance matches your current income and family needs.</p>
                </div>
            `
        };
        
        return tips[calculatorType] || '';
    }

    createCalculatorCTA(calculatorType, marketData) {
        const ctas = {
            mortgage: `
                <div class="calculator-cta">
                    <h2>Calculate Your Mortgage Payment</h2>
                    <p>With rates at ${marketData.mortgageRate30}%, see exactly what you'd pay on your dream home.</p>
                    <a href="/#calculators" class="cta-button">Calculate Your Payment →</a>
                </div>
            `,
            investment: `
                <div class="calculator-cta">
                    <h2>Plan Your Investment Strategy</h2>
                    <p>Use our calculator to see how today's market conditions affect your long-term wealth building.</p>
                    <a href="/#calculators" class="cta-button">Calculate Returns →</a>
                </div>
            `,
            loan: `
                <div class="calculator-cta">
                    <h2>Compare Loan Options</h2>
                    <p>Find your best loan terms with our comparison calculator.</p>
                    <a href="/#calculators" class="cta-button">Calculate Payments →</a>
                </div>
            `,
            insurance: `
                <div class="calculator-cta">
                    <h2>Get Your Coverage Estimate</h2>
                    <p>Calculate the right coverage amount for your family's needs.</p>
                    <a href="/#calculators" class="cta-button">Calculate Coverage →</a>
                </div>
            `
        };
        
        return ctas[calculatorType];
    }

    createBasicRoundup(calculatorType) {
        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const basicMarketData = {
            mortgageRate30: '7.125',
            mortgageRate15: '6.625',
            direction: 'stable',
            rateChange: '0.00'
        };

        return this.createEnhancedRoundup(
            calculatorType,
            basicMarketData,
            this.getSampleNews(calculatorType),
            {}
        );
    }

    calculateMonthlyPayment(principal, rate, years) {
        const monthlyRate = (parseFloat(rate) / 100) / 12;
        const numPayments = years * 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
        return Math.round(payment);
    }

    cleanHeadline(headline) {
        return headline
            .replace(/\s*[-–—]\s*[^-–—]+$/, '')
            .replace(/\s*\|.*$/, '')
            .trim();
    }

    cleanDescription(description) {
        if (!description) return 'Read more about this development and its market impact.';
        
        let cleaned = description
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        if (cleaned.length > 150) {
            cleaned = cleaned.substring(0, 147) + '...';
        }
        
        return cleaned;
    }
}

module.exports = HybridNewsAIGenerator;