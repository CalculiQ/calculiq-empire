// mortgage-iq-generator.js
// Specialized mortgage content generator with deep domain expertise

const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

class MortgageIQGenerator {
    constructor(db, patternMemory, marketContext) {
        this.db = db;
        this.patternMemory = patternMemory;
        this.marketContext = marketContext;
        
        // Initialize AI if available
        if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder') {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
            this.aiEnabled = true;
        } else {
            this.aiEnabled = false;
        }
        
        // Mortgage-specific knowledge base
        this.domainKnowledge = {
            keyMetrics: ['30-year rate', '15-year rate', 'ARM rates', 'FHA rates', 'VA rates', 'Jumbo rates'],
            criticalFactors: ['credit score impact', 'down payment', 'DTI ratio', 'closing costs', 'PMI'],
            seasonalTrends: {
                spring: 'peak buying season',
                summer: 'high inventory',
                fall: 'price negotiations',
                winter: 'motivated sellers'
            },
            regulatoryTopics: ['CFPB rules', 'QM standards', 'TRID compliance', 'Fair lending']
        };
    }

    async generateSpecializedContent(marketData) {
        console.log('🏠 MortgageIQ: Crafting specialized mortgage intelligence...');
        
        try {
            // Gather mortgage-specific data
            const mortgageContext = await this.gatherMortgageContext(marketData);
            const recentNews = await this.fetchMortgageNews();
            const forbiddenPatterns = this.patternMemory.getForbiddenPatterns('mortgage');
            
            // Generate content with domain expertise
            let article;
            if (this.aiEnabled) {
                article = await this.generateAIEnhancedArticle(mortgageContext, recentNews, forbiddenPatterns);
            } else {
                article = await this.generateDataDrivenArticle(mortgageContext, recentNews);
            }
            
            return this.formatForCalculiQ(article);
            
        } catch (error) {
            console.error('MortgageIQ generation error:', error);
            return this.generateFallbackContent(marketData);
        }
    }

    async gatherMortgageContext(marketData) {
        const context = {
            currentRates: marketData.rates.mortgage,
            rateDirection: this.analyzeRateTrend(marketData),
            creditTiers: this.generateCreditScoreTiers(marketData),
            localMarkets: await this.analyzeLocalMarkets(),
            firstTimeBuyers: this.getFirstTimeBuyerInsights(marketData),
            refinanceOpportunity: this.calculateRefinanceWindow(marketData),
            season: this.getCurrentSeason(),
            regulatoryUpdates: await this.checkRegulatoryNews()
        };
        
        return context;
    }

    async generateAIEnhancedArticle(context, news, forbiddenPatterns) {
        const prompt = this.buildMortgageExpertPrompt(context, news, forbiddenPatterns);
        
        try {
            const message = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });
            
            return this.parseAIResponse(message.content[0].text);
        } catch (error) {
            console.log('AI enhancement failed, using data-driven approach');
            return this.generateDataDrivenArticle(context, news);
        }
    }

    buildMortgageExpertPrompt(context, news, forbiddenPatterns) {
        return `You are a senior mortgage analyst writing for sophisticated homebuyers. Create a compelling article based on this data:

CURRENT MARKET:
- 30-year rate: ${context.currentRates.thirtyYear}% (${context.rateDirection})
- 15-year rate: ${context.currentRates.fifteenYear}%
- Rate trend: ${context.currentRates.weeklyChange}% change

UNIQUE ANGLES TO EXPLORE:
1. Credit score sweet spots: ${JSON.stringify(context.creditTiers)}
2. ${context.season} market dynamics
3. Refinance opportunity score: ${context.refinanceOpportunity}/10
4. First-time buyer challenges: ${context.firstTimeBuyers.topChallenge}

RECENT NEWS CONTEXT:
${news.slice(0, 3).map(n => `- ${n.headline}`).join('\n')}

AVOID THESE PATTERNS (from recent articles):
${forbiddenPatterns.slice(0, 10).join('\n')}

Write an article that:
1. Opens with a specific, actionable insight
2. Connects rate changes to real monthly payment differences
3. Includes one surprising fact about the current market
4. Offers 3 specific actions readers can take this week
5. Uses concrete numbers and examples

Format with HTML tags. Make it immediately valuable to someone shopping for a home TODAY.`;
    }

    async fetchMortgageNews() {
        try {
            const newsQuery = `("mortgage rates" OR "home loans" OR "housing market" OR "real estate finance") -rent -apartment`;
            
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: newsQuery,
                    sortBy: 'publishedAt',
                    language: 'en',
                    pageSize: 10,
                    apiKey: process.env.NEWS_API_KEY || 'demo',
                    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                }
            });
            
            return this.filterMortgageRelevantNews(response.data.articles || []);
        } catch (error) {
            console.error('Mortgage news fetch error:', error);
            return [];
        }
    }

    filterMortgageRelevantNews(articles) {
        // Filter for truly mortgage-related content
        const mortgageKeywords = ['mortgage', 'home loan', 'refinance', 'housing', 'real estate', 'homebuyer'];
        const excludeKeywords = ['rent', 'tenant', 'apartment', 'stock', 'crypto'];
        
        return articles.filter(article => {
            const text = `${article.title} ${article.description}`.toLowerCase();
            const hasRelevantKeyword = mortgageKeywords.some(keyword => text.includes(keyword));
            const hasExcludedKeyword = excludeKeywords.some(keyword => text.includes(keyword));
            return hasRelevantKeyword && !hasExcludedKeyword;
        });
    }

    analyzeRateTrend(marketData) {
        const change = parseFloat(marketData.rates.mortgage.weeklyChange);
        if (change > 0.1) return 'rising sharply';
        if (change > 0) return 'edging up';
        if (change < -0.1) return 'dropping notably';
        if (change < 0) return 'easing down';
        return 'holding steady';
    }

    generateCreditScoreTiers(marketData) {
        const baseRate = parseFloat(marketData.rates.mortgage.thirtyYear);
        return {
            excellent: { score: '740+', rate: (baseRate - 0.25).toFixed(3) },
            good: { score: '680-739', rate: baseRate.toFixed(3) },
            fair: { score: '620-679', rate: (baseRate + 0.5).toFixed(3) },
            challenged: { score: 'Below 620', rate: (baseRate + 1.5).toFixed(3) }
        };
    }

    calculateRefinanceWindow(marketData) {
        // Sophisticated refinance opportunity scoring
        const currentRate = parseFloat(marketData.rates.mortgage.thirtyYear);
        if (currentRate < 6.0) return 9;
        if (currentRate < 6.5) return 7;
        if (currentRate < 7.0) return 5;
        return 3;
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    formatForCalculiQ(article) {
        const date = new Date();
        const slug = `mortgage-intelligence-${date.toISOString().split('T')[0]}`;
        
        return {
            title: article.title,
            content: this.wrapInCalculiQTemplate(article.content),
            excerpt: article.excerpt,
            slug: slug,
            calculatorType: 'mortgage',
            metaDescription: article.metaDescription || article.excerpt
        };
    }

    wrapInCalculiQTemplate(content) {
        return `
<div class="mortgage-intelligence-article">
    ${content}
    
    <div class="calculator-cta" style="margin-top: 40px; padding: 30px; background: rgba(0, 212, 255, 0.05); border-radius: 15px; text-align: center;">
        <h3>Calculate Your Exact Scenario</h3>
        <p>See how today's rates affect your specific situation with our advanced mortgage calculator.</p>
        <a href="/#calculators" class="cta-button" style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600;">Calculate My Payment →</a>
    </div>
</div>
        `;
    }

    generateFallbackContent(marketData) {
        // Fallback for when AI is unavailable
        const rate = marketData.rates.mortgage.thirtyYear;
        return {
            title: `Mortgage Market Update: Rates at ${rate}%`,
            content: `<p>Today's mortgage market analysis...</p>`,
            excerpt: `Current mortgage rates and market analysis for ${new Date().toLocaleDateString()}.`,
            slug: `mortgage-update-${new Date().toISOString().split('T')[0]}`,
            calculatorType: 'mortgage'
        };
    }

    // Additional helper methods...
    getFirstTimeBuyerInsights(marketData) {
        return {
            topChallenge: 'down payment requirements',
            avgDownPayment: '$25,000',
            programs: ['FHA', 'VA', 'USDA', 'State programs']
        };
    }

    async analyzeLocalMarkets() {
        // Stub for local market analysis
        return {
            hotMarkets: ['Austin', 'Nashville', 'Boise'],
            coolMarkets: ['San Francisco', 'New York', 'Seattle']
        };
    }

    async checkRegulatoryNews() {
        // Stub for regulatory updates
        return {
            recent: 'No major changes',
            upcoming: 'CFPB reviewing fee structures'
        };
    }

    parseAIResponse(text) {
        // Extract title and content from AI response
        const lines = text.split('\n');
        const title = lines[0].replace(/^#\s*/, '').trim();
        const content = lines.slice(1).join('\n').trim();
        
        return {
            title: title || 'Mortgage Market Intelligence',
            content: content,
            excerpt: content.substring(0, 150) + '...',
            metaDescription: `${title} - Expert mortgage analysis and current rates.`
        };
    }
}

module.exports = MortgageIQGenerator;