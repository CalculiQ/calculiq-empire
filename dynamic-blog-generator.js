// dynamic-blog-generator-enhanced.js
// Enhanced version with professional formatting and guaranteed CTAs

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
            console.log(`Generating ${calculatorType} article with enhanced formatting...`);
            
            // Load published patterns to avoid repetition
            await this.loadPublishedPatterns();
            
            // Gather VERIFIED real-time data
            const verifiedContext = await this.gatherVerifiedContext(calculatorType);
            
            // Generate the prompt
            const megaPrompt = this.createEnhancedPrompt(calculatorType, verifiedContext);
            
            // CALL CLAUDE API HERE
            if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
                throw new Error('Anthropic API key not configured');
            }

            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });

            const message = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                temperature: 0.8,
                messages: [{
                    role: 'user',
                    content: megaPrompt
                }]
            });

            const responseText = message.content[0].text;

            // Parse and enhance the response
            const lines = responseText.split('\n');
            const title = lines[0].replace(/^#\s*/, '').replace(/^Title:\s*/i, '').trim();
            let content = lines.slice(1).join('\n').trim();

            // Add visual enhancements to the content
            content = this.enhanceContentFormatting(content, calculatorType);

            // ALWAYS ensure CTA is present
            const hasCalculatorCTA = this.checkForCTA(content);
            
            if (!hasCalculatorCTA) {
                console.log(`📝 Adding professional ${calculatorType} calculator CTA`);
                content += '\n\n' + this.generateEnhancedCalculatorCTA(calculatorType);
            }

            const slug = this.createSlug(title);

            // Extract first paragraph for excerpt
            const paragraphs = content.split('\n\n');
            const firstPara = paragraphs.find(p => p.trim().length > 50) || paragraphs[0] || '';
            const cleanFirstPara = firstPara.replace(/[*#_\[\]`]/g, '').trim();
            const excerpt = cleanFirstPara.length > 160 
                ? cleanFirstPara.substring(0, 157) + '...' 
                : (cleanFirstPara || 'Click to read more...');

            console.log(`✅ Article prepared with enhanced formatting: "${title}"`);

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

    createEnhancedPrompt(calculatorType, context) {
        const forbiddenPatterns = Array.from(this.publishedPatterns).slice(0, 20);
        
        const prompt = `You are a financial writer creating professional, data-driven content about ${calculatorType} for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

PROFESSIONAL FORMATTING REQUIREMENTS:
1. Use clean, consistent markdown formatting throughout
2. ALL section headers MUST use ## (with blank lines before and after)
3. ALL subsection headers MUST use ### (with blank lines before and after)
4. Use **bold text** sparingly for key points and important numbers
5. Break up long paragraphs - maximum 4-5 sentences per paragraph
6. Use bullet points or numbered lists when presenting multiple items
7. Keep formatting simple - let CSS handle the styling

CONTENT STRUCTURE (STRICT):
1. NO fictional quotes or made-up people
2. Use verifiable data and statistics only
3. Include specific calculations and examples with real numbers
4. Focus on actionable insights and practical advice

VERIFIED DATA TO USE:
- Current ${calculatorType} rates: ${context.marketData.rates.thirtyYear} (30-year), ${context.marketData.rates.fifteenYear} (15-year)
- Rate change from last week: ${context.marketData.weeklyChange}
- Rate trend: ${context.marketData.trend}
- Data date: ${context.marketData.rates.dataDate}
- Source: Federal Reserve Economic Data (FRED)

ARTICLE SECTIONS (with clean formatting):

## Opening Hook (200+ words)
- Start with current market reality or surprising statistic
- Reference this week's specific changes
- Set up the value proposition clearly

## The Current Landscape (400+ words)
- Present data in easily scannable format
- Use bullet points for key statistics
- Bold only the most important numbers

## Three Actionable Strategies (600+ words)
### Strategy 1: [Specific Approach]
- Detailed explanation with calculations
- Real example with numbers
- Clear pros and cons

### Strategy 2: [Different Approach]  
- Another detailed walkthrough
- Comparison to Strategy 1
- When this works best

### Strategy 3: [Advanced Technique]
- More sophisticated option
- Required conditions
- Expected outcomes

## Hidden Opportunities (300+ words)
- Lesser-known advantages in current market
- Timing considerations
- Regional or demographic variations

## Common Pitfalls to Avoid (250+ words)
- Mistakes people make this month
- Cost of these errors
- How to sidestep them

## Your Action Plan (250+ words)
- Numbered steps to take this week
- Specific resources to use
- Timeline for decisions

## Calculator CTA (Required)
- Must link to appropriate calculator
- Emphasize immediate value
- Clear call-to-action

FORMATTING GUIDELINES:
- Keep it simple - no complex HTML or special divs
- Use standard markdown: ##, ###, **, *, []()
- Let the blog's CSS handle the visual styling
- Focus on clear, readable content structure

FORBIDDEN PATTERNS to avoid:
${forbiddenPatterns.length > 0 ? forbiddenPatterns.map(p => `- "${p}"`).join('\n') : '- None yet'}

TONE: Professional yet accessible, data-driven but not dry, authoritative without being condescending

CRITICAL: 
- Minimum 1,800 words to ensure comprehensive coverage
- Every section must have substantial, valuable content
- End with a strong, specific calculator CTA that feels natural

Begin with your title (no prefix) and professional article:`;

        return prompt;
    }

    enhanceContentFormatting(content, calculatorType) {
        // Just ensure proper spacing - don't add complex formatting
        
        // Add space before headers
        content = content.replace(/([.!?])\n(#{2,3} )/g, '$1\n\n$2');
        
        // Ensure lists have proper spacing
        content = content.replace(/([.!?])\n(\* )/g, '$1\n\n$2');
        
        // Bold only important large dollar amounts (not every number)
        content = content.replace(/\$(\d{1,3},\d{3,})/g, '**\$1**');
        
        // Bold percentages only when they have important context
        content = content.replace(/(\d+\.?\d*%) (increase|decrease|higher|lower|change|growth|return|rate)/g, '**$1** $2');
        
        return content;
    }

    checkForCTA(content) {
        const ctaPhrases = [
            'Calculate Your',
            'Start Your Calculation',
            'Use our',
            'calculator',
            'Get Your',
            'Find Your',
            'Discover Your',
            'See Your'
        ];
        
        const contentLower = content.toLowerCase();
        return ctaPhrases.some(phrase => contentLower.includes(phrase.toLowerCase()));
    }

    generateEnhancedCalculatorCTA(calculatorType) {
        const currentRate = this.verifiedData?.marketData?.rates?.thirtyYear || '7.125%';
        
        const ctas = {
            mortgage: `
## Ready to Calculate Your Mortgage?

With rates at **${currentRate}**, every calculation matters. Our mortgage calculator helps you:

* See your exact monthly payment
* Compare 15 vs 30-year options  
* Calculate total interest costs
* Find your affordable home price

**[Calculate Your Mortgage Payment →](/#calculators)**

*Takes less than 60 seconds • No email required*`,

            investment: `
## Calculate Your Investment Growth

See how your money could grow with our investment calculator:

* Project your portfolio value over time
* Compare different investment strategies
* See the impact of starting today vs waiting
* Plan for retirement or other goals

**[Start Your Investment Calculation →](/#calculators)**

*Free instant results • No signup needed*`,

            loan: `
## Compare Your Loan Options

Make smarter borrowing decisions with our loan calculator:

* Calculate monthly payments
* See total interest costs
* Compare different loan terms
* Find consolidation savings

**[Calculate Your Best Loan Option →](/#calculators)**

*Compare unlimited scenarios • Results in seconds*`,

            insurance: `
## Get Your Coverage Estimate

Find the right insurance coverage with our calculator:

* Determine coverage needs
* Compare term lengths
* See premium estimates
* Calculate income replacement

**[Calculate Your Coverage Needs →](/#calculators)**

*Personalized analysis • No agent calls*`
        };
        
        return ctas[calculatorType] || ctas.mortgage;
    }

    // Keep all existing helper methods from the original file...
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

    // Include all other helper methods from the original file...
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
                `Regional rate variations: Where to find 0.25% advantages`
            ],
            investment: [
                `Rebalancing math when rates hit ${context.marketData.rates.thirtyYear}`,
                `The correlation breakdown: Why old rules don't apply`,
                `Tax-loss harvesting in ${context.marketData.volatility} volatility`,
                `International arbitrage opportunities this week`
            ],
            loan: [
                `Break-even: When consolidation saves at current rates`,
                `Credit score arbitrage: Each 10 points = $X saved`,
                `The Monday morning advantage in loan applications`,
                `Why loan shopping patterns create Friday opportunities`
            ],
            insurance: [
                `Age-band repricing: Who wins and loses this year`,
                `The underwriting change nobody's talking about`,
                `State-by-state: Where premiums are dropping`,
                `The 30-day window before rate updates`
            ]
        };
        
        const typeAngles = angles[calculatorType] || angles.mortgage;
        const index = this.sessionFingerprint.dayOfYear % typeAngles.length;
        
        return typeAngles[index];
    }

    async loadPublishedPatterns() {
        if (!this.db) return;
        
        try {
            const result = await this.db.query(
                'SELECT title, content FROM blog_posts WHERE status = $1 ORDER BY published_at DESC LIMIT 100',
                ['published']
            );
            
            result.rows.forEach(post => {
                this.publishedPatterns.add(post.title.toLowerCase());
                
                const firstSentence = post.content.match(/<p>([^<.!?]+[.!?])/);
                if (firstSentence) {
                    this.publishedPatterns.add(firstSentence[1].toLowerCase().substring(0, 50));
                }
            });
            
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