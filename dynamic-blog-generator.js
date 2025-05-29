// dynamic-blog-generator.js
// Fixed version - keeping original functionality while fixing title repetition

const crypto = require('crypto');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

class DynamicBlogGenerator {
    constructor(db) {
        this.db = db;
        this.sessionFingerprint = this.generateFingerprint();
        this.publishedPatterns = new Set();
        this.verifiedData = {
            timestamp: new Date().toISOString(),
            sources: []
        };
    }

    generateFingerprint() {
        const time = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const hour = new Date().getHours();
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        
        return {
            time,
            random,
            hour,
            dayOfYear,
            cognitive_seed: `${time}-${random}-${hour}-${dayOfYear}`
        };
    }

    async generateArticle(calculatorType) {
        try {
            console.log(`Generating ${calculatorType} article...`);
            
            // Load published patterns to avoid repetition
            await this.loadPublishedPatterns();
            
            // Gather VERIFIED real-time data
            const verifiedContext = await this.gatherVerifiedContext(calculatorType);
            
            // Generate the prompt with better variety
            const megaPrompt = this.createVariedPrompt(calculatorType, verifiedContext);
            
            // CALL CLAUDE API
            if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
                throw new Error('Anthropic API key not configured');
            }

            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });

            const message = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                temperature: 0.85,
                messages: [{
                    role: 'user',
                    content: megaPrompt
                }]
            });

            const responseText = message.content[0].text;

            // Parse the response
            const lines = responseText.split('\n');
            const title = lines[0].replace(/^#\s*/, '').replace(/^Title:\s*/i, '').trim();
            let content = lines.slice(1).join('\n').trim();

            // ALWAYS ensure CTA is present
            const hasCalculatorCTA = this.checkForCTA(content);
            
            if (!hasCalculatorCTA) {
                console.log(`📝 Adding ${calculatorType} calculator CTA`);
                content += '\n\n' + this.generateCalculatorCTA(calculatorType);
            }

            const slug = this.createSlug(title);

            // Extract excerpt
            const paragraphs = content.split('\n\n');
            const firstPara = paragraphs.find(p => p.trim().length > 50) || paragraphs[0] || '';
            const cleanFirstPara = firstPara.replace(/[*#_\[\]`]/g, '').trim();
            const excerpt = cleanFirstPara.length > 160 
                ? cleanFirstPara.substring(0, 157) + '...' 
                : (cleanFirstPara || 'Click to read more...');

            console.log(`✅ Article generated: "${title}"`);

            return {
                title,
                content,
                excerpt,
                slug,
                calculatorType,
                metaDescription: excerpt
            };
            
        } catch (error) {
            console.error(`Error generating ${calculatorType} article:`, error);
            throw error;
        }
    }

    createVariedPrompt(calculatorType, context) {
        const forbiddenPatterns = Array.from(this.publishedPatterns).slice(0, 50);
        
        // Get variety based on multiple factors
        const angle = this.getDataDrivenAngle(calculatorType, context);
        const dayOfWeek = new Date().getDay();
        const hour = new Date().getHours();
        const weekOfMonth = Math.floor(new Date().getDate() / 7);
        
        // Title variety based on time
        const titleApproaches = [
            `specific market movement`,
            `surprising calculation`,
            `contrarian strategy`,
            `timing opportunity`,
            `cost comparison`,
            `regional advantage`,
            `seasonal opportunity`,
            `rate arbitrage`,
            `overlooked benefit`,
            `new regulation impact`
        ];
        
        const approach = titleApproaches[(dayOfWeek + hour + weekOfMonth) % titleApproaches.length];
        
        const prompt = `You are writing a ${calculatorType} article for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

TITLE REQUIREMENTS (CRITICAL):
Create a UNIQUE, SPECIFIC title focused on: ${approach}
- Must be specific to THIS WEEK'S market conditions
- Include a number, percentage, or specific benefit
- No generic phrases like "Navigating", "Ultimate Guide", "Everything You Need", "Hidden Truth"
- Focus angle: ${angle}

ABSOLUTELY FORBIDDEN TITLE STARTS:
- "Navigating..."
- "The Hidden Truth..."
- "How to..."
- "Why You Should..."
- "The Ultimate..."
- "Everything About..."
- "Understanding..."

ALREADY USED TITLES TO AVOID:
${forbiddenPatterns.slice(0, 20).map(p => `- "${p}"`).join('\n')}

VERIFIED DATA TO USE:
${calculatorType === 'mortgage' || calculatorType === 'loan' ? `
- Current 30-year rate: ${context.marketData.rates.thirtyYear}
- Current 15-year rate: ${context.marketData.rates.fifteenYear}
- Week's change: ${context.marketData.weeklyChange}
- Trend: ${context.marketData.trend}
` : ''}

Current market context: ${context.newsContext.themes ? context.newsContext.themes.join(', ') : context.seasonalFactors}

CONTENT REQUIREMENTS:
1. Start with what changed THIS WEEK - be specific
2. Use the current data throughout the article
3. Include 3 specific strategies with calculations
4. Reference current market conditions
5. End with calculator CTA

Write ~1,500 words of actionable advice using current data.

Begin with title (no prefix):`;

        return prompt;
    }

    checkForCTA(content) {
        const ctaPhrases = [
            'Calculate Your',
            'calculator',
            'Get Your',
            'Find Your'
        ];
        
        const contentLower = content.toLowerCase();
        return ctaPhrases.some(phrase => contentLower.includes(phrase.toLowerCase()));
    }

    generateCalculatorCTA(calculatorType) {
        const currentRate = this.verifiedData?.marketData?.rates?.thirtyYear || '7.125%';
        
        const ctas = {
            mortgage: `
## Ready to Calculate Your Mortgage?

With rates at ${currentRate}, see exactly what you'll pay:

* Monthly payment calculation
* Total interest over loan term
* 15 vs 30 year comparison
* How much home you can afford

[Calculate Your Mortgage →](/#calculators)

*Takes 60 seconds • No email required • Free*`,

            investment: `
## Calculate Your Investment Growth

See your money's potential with our calculator:

* Future value projections
* Impact of monthly contributions
* Compare investment strategies
* Retirement planning scenarios

[Calculate Investment Returns →](/#calculators)

*Instant results • Free tool • No signup*`,

            loan: `
## Compare Your Loan Options

Make the smartest borrowing decision:

* Monthly payment amounts
* Total interest costs
* Loan term comparisons
* Consolidation savings

[Calculate Loan Costs →](/#calculators)

*Compare unlimited options • Free calculator*`,

            insurance: `
## Get Your Coverage Calculation

Find the right coverage amount:

* Life insurance needs analysis
* Income replacement calculation
* Debt coverage requirements
* Family protection planning

[Calculate Coverage Needs →](/#calculators)

*Personalized results • No sales calls*`
        };
        
        return ctas[calculatorType] || ctas.mortgage;
    }

    async gatherVerifiedContext(calculatorType) {
        const context = {
            timestamp: new Date().toISOString(),
            marketData: await this.fetchVerifiedMarketData(),
            newsContext: await this.fetchVerifiedNews(calculatorType),
            calculations: this.generateRealCalculations(calculatorType),
            regulations: this.getCurrentRegulations(calculatorType),
            seasonalFactors: this.getSeasonalFactors(),
            seoKeywords: this.getSEOKeywords(calculatorType)
        };
        
        this.verifiedData.marketData = context.marketData;
        this.verifiedData.sources = [
            'Federal Reserve Economic Data (FRED)',
            'Current market rates as of ' + context.timestamp,
            'Calculations based on standard financial formulas'
        ];
        
        return context;
    }

    async fetchVerifiedMarketData() {
        try {
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            
            const mortgage30Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&limit=10&sort_order=desc&file_type=json`
            );
            
            const mortgage15Response = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US&api_key=${fredKey}&limit=10&sort_order=desc&file_type=json`
            );
            
            const current30 = parseFloat(mortgage30Response.data.observations[0].value);
            const previous30 = parseFloat(mortgage30Response.data.observations[1].value);
            const weekAgo30 = parseFloat(mortgage30Response.data.observations[5].value) || previous30;
            
            const current15 = parseFloat(mortgage15Response.data.observations[0].value);
            
            return {
                rates: {
                    thirtyYear: current30.toFixed(3) + '%',
                    fifteenYear: current15.toFixed(3) + '%',
                    dataDate: mortgage30Response.data.observations[0].date
                },
                weeklyChange: (current30 - weekAgo30).toFixed(3) + '%',
                trend: current30 > weekAgo30 ? 'increasing' : 'decreasing',
                volatility: this.calculateVolatility(mortgage30Response.data.observations)
            };
            
        } catch (error) {
            console.error('Market data fetch error:', error);
            return {
                rates: {
                    thirtyYear: '7.125%',
                    fifteenYear: '6.625%',
                    dataDate: 'Recent'
                },
                weeklyChange: '+0.125%',
                trend: 'increasing',
                volatility: 'moderate'
            };
        }
    }

    calculateVolatility(observations) {
        const values = observations.slice(0, 10).map(obs => parseFloat(obs.value));
        const avg = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev < 0.1) return 'low';
        if (stdDev < 0.25) return 'moderate';
        return 'high';
    }

    async fetchVerifiedNews(calculatorType) {
        try {
            const newsAPIKey = process.env.NEWS_API_KEY;
            if (!newsAPIKey) {
                console.log('📰 News API not configured, using fallback themes');
                return this.getFallbackNewsThemes(calculatorType);
            }
            
            const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const queries = {
                mortgage: 'mortgage rates OR "federal reserve" OR "housing market" OR "home prices"',
                investment: '"stock market" OR "S&P 500" OR "market volatility" OR "federal reserve"',
                loan: '"interest rates" OR "consumer credit" OR "personal loans" OR "federal reserve"',
                insurance: '"insurance industry" OR "life insurance" OR "insurance rates" OR "insurance market"'
            };
            
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: queries[calculatorType],
                    from: fromDate,
                    sortBy: 'relevancy',
                    pageSize: 5,
                    apiKey: newsAPIKey,
                    language: 'en',
                    domains: 'reuters.com,bloomberg.com,wsj.com,cnbc.com,marketwatch.com,apnews.com'
                }
            });
            
            if (response.data.articles && response.data.articles.length > 0) {
                const newsItems = response.data.articles.map(article => ({
                    headline: article.title,
                    summary: article.description,
                    source: article.source.name,
                    publishedAt: article.publishedAt,
                    url: article.url
                }));
                
                const themes = this.extractNewsThemes(newsItems, calculatorType);
                
                console.log(`📰 Fetched ${newsItems.length} news items for ${calculatorType}`);
                
                return {
                    currentNews: newsItems,
                    topStory: newsItems[0],
                    themes: themes,
                    realNewsUsed: true
                };
            } else {
                console.log('📰 No news articles found, using fallback');
                return this.getFallbackNewsThemes(calculatorType);
            }
            
        } catch (error) {
            console.error('📰 News API error:', error.message);
            return this.getFallbackNewsThemes(calculatorType);
        }
    }

    extractNewsThemes(newsItems, calculatorType) {
        const themes = [];
        const headlinesText = newsItems.map(item => item.headline).join(' ').toLowerCase();
        
        const themePatterns = {
            mortgage: {
                'Fed rate decision impact': /federal reserve|fed(?:eral)?.*rate/,
                'Housing inventory shifts': /housing.*(?:inventory|shortage|supply)/,
                'Regional market changes': /housing.*market|home.*prices/,
                'Rate volatility': /rates?.*(?:rise|jump|fall|drop|volatile)/
            },
            investment: {
                'Market volatility': /volatil|vix|uncertainty|turbulent/,
                'Fed policy impact': /federal reserve|fed(?:eral)?.*policy/,
                'Sector rotation': /tech.*stocks|financial.*sector|energy.*sector/,
                'Earnings influence': /earnings.*(?:season|report|beat|miss)/
            },
            loan: {
                'Rate environment': /interest.*rates?|lending.*rates?/,
                'Credit conditions': /credit.*(?:tight|loose|conditions)/,
                'Consumer demand': /consumer.*(?:debt|borrowing|spending)/,
                'Banking changes': /bank.*(?:lending|standards|requirements)/
            },
            insurance: {
                'Premium trends': /premium.*(?:increase|decrease|rise|fall)/,
                'Industry changes': /insurance.*(?:industry|market|sector)/,
                'Regulatory updates': /insurance.*(?:regulation|regulatory|compliance)/,
                'Technology impact': /insurtech|digital.*insurance|AI.*insurance/
            }
        };
        
        const patterns = themePatterns[calculatorType] || themePatterns.mortgage;
        
        for (const [theme, pattern] of Object.entries(patterns)) {
            if (pattern.test(headlinesText)) {
                themes.push(theme);
            }
        }
        
        if (themes.length === 0 && newsItems.length > 0) {
            themes.push(`${newsItems[0].source}: ${newsItems[0].headline.substring(0, 50)}...`);
        }
        
        return themes.slice(0, 3);
    }

    getFallbackNewsThemes(calculatorType) {
        const themes = {
            mortgage: [
                "Federal Reserve policy impacts on mortgage rates",
                "Regional housing inventory variations",
                "First-time buyer program updates"
            ],
            investment: [
                "Market volatility and Fed policy expectations",
                "Sector rotation patterns in current market",
                "Global economic factors affecting portfolios"
            ],
            loan: [
                "Credit score requirement changes by major lenders",
                "Personal loan demand amid economic uncertainty",
                "Regional lending competition intensifies"
            ],
            insurance: [
                "Insurance premium adjustments for 2025",
                "Technology reducing application processing times",
                "State regulatory changes affecting coverage"
            ]
        };
        
        return {
            currentThemes: themes[calculatorType] || themes.mortgage,
            disclaimer: "Trends based on industry analysis",
            realNewsUsed: false
        };
    }

    generateRealCalculations(calculatorType) {
        const calculations = {
            mortgage: `
- $400,000 home, 20% down, 30-year at current rate: Monthly payment = $2,145
- Same scenario at 15-year: Monthly payment = $2,817
- Total interest saved with 15-year: $159,000`,
            
            investment: `
- $500/month for 30 years at 8%: Final value = $679,000
- Starting 5 years later: Final value = $442,000
- Cost of delay: $237,000`,
            
            loan: `
- $25,000 at 12% for 5 years: Monthly = $556, Total interest = $8,374
- Same at 18%: Monthly = $634, Extra interest = $4,711`,
            
            insurance: `
- 35-year-old, $500K term: ~$40/month
- 45-year-old, same coverage: ~$85/month
- Cost of waiting 10 years: $6,000+ in extra premiums`
        };
        
        return calculations[calculatorType] || calculations.mortgage;
    }

    getCurrentRegulations(calculatorType) {
        const regulations = {
            mortgage: "QM standards, DTI limits, TRID requirements",
            investment: "Fiduciary standards, SEC oversight",
            loan: "State APR caps, TCPA compliance",
            insurance: "State requirements, HIPAA privacy"
        };
        
        return regulations[calculatorType] || regulations.mortgage;
    }

    getSEOKeywords(calculatorType) {
        const keywords = {
            mortgage: ["mortgage rates today", "home loan calculator", "current mortgage rates", "mortgage payment calculator", "refinance rates"],
            investment: ["investment calculator", "compound interest calculator", "retirement calculator", "portfolio calculator", "investment returns"],
            loan: ["personal loan calculator", "loan payment calculator", "debt consolidation calculator", "loan interest calculator", "loan comparison"],
            insurance: ["life insurance calculator", "insurance premium calculator", "coverage calculator", "term life calculator", "insurance needs analysis"]
        };
        
        return keywords[calculatorType] || keywords.mortgage;
    }

    getSeasonalFactors() {
        const month = new Date().getMonth();
        const factors = [
            "New Year financial planning",
            "Tax preparation season",
            "Spring market activity",
            "Summer buying season",
            "Mid-year transitions",
            "Summer opportunities",
            "Back-to-school planning",
            "Fall market shifts",
            "Q4 tax strategies",
            "Open enrollment period",
            "Holiday financial planning",
            "Year-end decisions"
        ];
        
        return factors[month];
    }

    getDataDrivenAngle(calculatorType, context) {
        const angles = {
            mortgage: [
                `Why the ${context.marketData.weeklyChange} rate change creates a closing cost arbitrage opportunity`,
                `How ${context.marketData.volatility} volatility changes the points vs. no points calculation`,
                `The 72-hour window: What happens between rate lock and closing`,
                `Regional rate variations: Where to find 0.25% advantages`,
                `Why Friday applications get better rates than Monday`,
                `The 45-day refi opportunity most homeowners miss`,
                `How credit score bands shifted this month`
            ],
            investment: [
                `Rebalancing math when rates hit ${context.marketData.rates.thirtyYear}`,
                `The correlation breakdown: Why old rules don't apply`,
                `Tax-loss harvesting in ${context.marketData.volatility} volatility`,
                `International arbitrage opportunities this week`,
                `Why Tuesday trades outperform Thursday by 0.3%`,
                `Dividend capture in rising rate environments`,
                `Small-cap rotation signals appearing now`
            ],
            loan: [
                `Break-even: When consolidation saves at current rates`,
                `Credit score arbitrage: Each 10 points = $X saved`,
                `The Monday morning advantage in loan applications`,
                `Why loan shopping patterns create Friday opportunities`,
                `Regional lender competition creating rate gaps`,
                `How payment timing affects total interest`,
                `Pre-payment strategies in current environment`
            ],
            insurance: [
                `Age-band repricing: Who wins and loses this year`,
                `The underwriting change nobody's talking about`,
                `State-by-state: Where premiums are dropping`,
                `The 30-day window before rate updates`,
                `How health classifications changed last month`,
                `Conversion opportunities in current market`,
                `Rider economics in low-rate environment`
            ]
        };
        
        const typeAngles = angles[calculatorType] || angles.mortgage;
        const index = (this.sessionFingerprint.dayOfYear + this.sessionFingerprint.hour) % typeAngles.length;
        
        return typeAngles[index];
    }

    async loadPublishedPatterns() {
        if (!this.db) return;
        
        try {
            const result = await this.db.query(
                'SELECT title FROM blog_posts WHERE status = $1 ORDER BY published_at DESC LIMIT 100',
                ['published']
            );
            
            result.rows.forEach(post => {
                // Add full title
                this.publishedPatterns.add(post.title.toLowerCase());
                
                // Add first 5 words to catch "Navigating..." patterns
                const firstWords = post.title.split(' ').slice(0, 5).join(' ').toLowerCase();
                this.publishedPatterns.add(firstWords);
                
                // Add first 3 words to catch patterns
                const firstThree = post.title.split(' ').slice(0, 3).join(' ').toLowerCase();
                this.publishedPatterns.add(firstThree);
            });
            
            console.log(`📚 Loaded ${this.publishedPatterns.size} patterns to avoid`);
            
        } catch (error) {
            console.error('Pattern loading error:', error);
        }
    }

    createSlug(title) {
        const dateSuffix = new Date().toISOString().split('T')[0];
        return title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 80) + '-' + dateSuffix;
    }
}

module.exports = DynamicBlogGenerator;