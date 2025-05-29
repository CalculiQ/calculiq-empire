// hybrid-news-ai-generator.js
// News roundup with minimal, reliable AI enhancement

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
        } else {
            this.aiEnabled = false;
            console.log('📝 Running without AI enhancements');
        }
    }

    async generateDailyRoundup(calculatorType) {
        console.log(`📰 Generating ${calculatorType} roundup for ${new Date().toDateString()}`);
        
        try {
            // Get real data (always works)
            const marketData = await this.fetchMarketData();
            const newsItems = await this.fetchRelevantNews(calculatorType);
            
            // Try to enhance with AI (optional)
            let aiEnhancements = {};
            if (this.aiEnabled) {
                aiEnhancements = await this.getAIEnhancements(calculatorType, marketData, newsItems);
            }
            
            // Generate the roundup
            const roundup = this.createEnhancedRoundup(calculatorType, marketData, newsItems, aiEnhancements);
            
            return roundup;
            
        } catch (error) {
            console.error('Roundup generation error:', error);
            return this.createDataOnlyRoundup(calculatorType);
        }
    }

    async getAIEnhancements(calculatorType, marketData, newsItems) {
        const enhancements = {};
        
        try {
            // 1. Creative headline (quick, simple)
            enhancements.headline = await this.getAIHeadline(calculatorType, marketData);
            
            // 2. One key insight (valuable, brief)
            enhancements.insight = await this.getAIInsight(calculatorType, marketData, newsItems);
            
            // 3. Calculator tip (actionable, specific)
            enhancements.tip = await this.getCalculatorTip(calculatorType, marketData);
            
            console.log('✨ AI enhancements added');
        } catch (error) {
            console.log('📝 Continuing without AI enhancements');
        }
        
        return enhancements;
    }

    async getAIHeadline(calculatorType, marketData) {
        if (!this.aiEnabled) return null;
        
        try {
            const prompt = `Write a compelling headline for today's ${calculatorType} market update.
Current rate: ${marketData.mortgageRate30}% (${marketData.direction} ${Math.abs(marketData.rateChange)}%)
Requirements:
- Under 70 characters
- Include the specific rate
- Action-oriented
- No questions
Just return the headline text, nothing else.`;

            const message = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 50,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });
            
            return message.content[0].text.trim();
        } catch (error) {
            return null; // Use default headline
        }
    }

    async getAIInsight(calculatorType, marketData, newsItems) {
        if (!this.aiEnabled || !newsItems.length) return null;
        
        try {
            const topHeadlines = newsItems.slice(0, 3).map(n => n.headline).join('; ');
            
            const prompt = `Based on these ${calculatorType} headlines: "${topHeadlines}" and rates at ${marketData.mortgageRate30}% (${marketData.direction}), write ONE insight paragraph (2-3 sentences) that connects these trends and gives readers a unique perspective. Be specific and actionable. No generic advice.`;

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
            return null;
        }
    }

    async getCalculatorTip(calculatorType, marketData) {
        if (!this.aiEnabled) return null;
        
        try {
            const tips = {
                mortgage: `With rates at ${marketData.mortgageRate30}%, write a 15-word tip about comparing loan terms.`,
                investment: `Given market conditions, write a 15-word tip about dollar-cost averaging timing.`,
                loan: `For current rates, write a 15-word tip about credit score impact on rates.`,
                insurance: `Write a 15-word tip about coverage amount calculation in today's economy.`
            };
            
            const prompt = tips[calculatorType] + ' Just return the tip text.';

            const message = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 30,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });
            
            return message.content[0].text.trim();
        } catch (error) {
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

        // Use AI headline or fall back to default
        const title = aiEnhancements.headline || this.generateDefaultTitle(calculatorType, marketData, dateStr);
        
        // Build content
        let content = `<div class="daily-roundup">`;
        
        // Market data section
        if (marketData) {
            content += this.createMarketDataSection(calculatorType, marketData);
        }
        
        // AI Insight (if available)
        if (aiEnhancements.insight) {
            content += `
                <div class="ai-insight-section">
                    <h2>Market Analysis</h2>
                    <p>${aiEnhancements.insight}</p>
                </div>
            `;
        }
        
        // News section
        if (newsItems && newsItems.length > 0) {
            content += this.createNewsSection(newsItems);
        }
        
        // Calculator tip (if available)
        if (aiEnhancements.tip) {
            content += `
                <div class="calculator-tip-box">
                    <p><strong>💡 Calculator Tip:</strong> ${aiEnhancements.tip}</p>
                </div>
            `;
        }
        
        // Calculator CTA
        content += this.createCalculatorCTA(calculatorType, marketData);
        
        content += `</div>`;

        // Create excerpt
        const excerpt = aiEnhancements.insight 
            ? aiEnhancements.insight.substring(0, 150) + '...'
            : `Daily ${calculatorType} market update: Rates ${marketData?.direction || 'updated'}, latest news for ${date.toLocaleDateString()}.`;

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

    async fetchMarketData() {
        try {
            const fredKey = process.env.FRED_API_KEY || 'a0e7018e6c8ef001490b9dcb2196ff3c';
            
            const ratesResponse = await axios.get(
                `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${fredKey}&limit=2&sort_order=desc&file_type=json`
            );
            
            const currentRate = parseFloat(ratesResponse.data.observations[0].value);
            const previousRate = parseFloat(ratesResponse.data.observations[1].value);
            const change = (currentRate - previousRate).toFixed(3);
            
            return {
                mortgageRate30: currentRate.toFixed(3),
                rateChange: change,
                direction: change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged',
                dataDate: ratesResponse.data.observations[0].date
            };
            
        } catch (error) {
            console.error('Market data error:', error);
            return null;
        }
    }

    async fetchRelevantNews(calculatorType) {
        try {
            const queries = {
                mortgage: 'mortgage rates OR housing market OR home prices OR real estate',
                investment: 'stock market OR S&P 500 OR investing OR dow jones',
                loan: 'interest rates OR personal loans OR consumer credit OR lending',
                insurance: 'insurance rates OR life insurance OR insurance industry'
            };

            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: queries[calculatorType],
                    sortBy: 'publishedAt',
                    language: 'en',
                    pageSize: 5,
                    apiKey: this.newsApiKey,
                    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                }
            });

            if (response.data.articles) {
                return response.data.articles.map(article => ({
                    headline: article.title,
                    source: article.source.name,
                    url: article.url,
                    description: article.description
                }));
            }
            
        } catch (error) {
            console.error('News fetch error:', error);
            return [];
        }
    }

    generateDefaultTitle(calculatorType, marketData, dateStr) {
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
                    </div>
                    <p class="data-source">Source: Federal Reserve Economic Data (FRED) - ${marketData.dataDate}</p>
                </div>
            `,
            investment: `
                <div class="market-data-section">
                    <h2>Market Snapshot</h2>
                    <p>Current mortgage rates: ${marketData.mortgageRate30}% (${marketData.direction} ${Math.abs(marketData.rateChange)}%)</p>
                    <p>When rates ${marketData.direction === 'up' ? 'rise' : 'fall'}, it often impacts investment strategies and bond markets.</p>
                </div>
            `,
            loan: `
                <div class="market-data-section">
                    <h2>Interest Rate Environment</h2>
                    <p>Base rates are ${marketData.direction} with mortgages at ${marketData.mortgageRate30}%, suggesting personal loan rates may follow.</p>
                </div>
            `,
            insurance: `
                <div class="market-data-section">
                    <h2>Economic Indicators</h2>
                    <p>With mortgage rates at ${marketData.mortgageRate30}%, economic conditions continue to influence insurance pricing.</p>
                </div>
            `
        };
        
        return sections[calculatorType] || sections.mortgage;
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
                    ${item.description ? `<p class="news-summary">${this.cleanDescription(item.description)}</p>` : ''}
                </div>
            `;
        });
        
        section += `
                </div>
            </div>
        `;
        
        return section;
    }

    createCalculatorCTA(calculatorType, marketData) {
        const ctas = {
            mortgage: `
                <div class="calculator-cta">
                    <h2>Calculate Your Mortgage Payment</h2>
                    <p>With rates at ${marketData?.mortgageRate30 || 'current levels'}%, see exactly what you'd pay on your dream home.</p>
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

    createDataOnlyRoundup(calculatorType) {
        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        return {
            title: `${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} Market Data - ${dateStr}`,
            content: `
                <div class="daily-roundup">
                    <h2>Market Conditions</h2>
                    <p>Today's financial markets continue to show movement. Check our calculator for the latest analysis based on your specific situation.</p>
                    
                    <div class="calculator-cta">
                        <h2>Get Your Personalized Analysis</h2>
                        <a href="/#calculators" class="cta-button">Launch ${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} Calculator →</a>
                    </div>
                </div>
            `,
            excerpt: `Daily ${calculatorType} market update for ${date.toLocaleDateString()}.`,
            slug: `${calculatorType}-update-${date.toISOString().split('T')[0]}`,
            calculatorType,
            metaDescription: `${calculatorType} market update and calculator for ${dateStr}`
        };
    }

    cleanHeadline(headline) {
        return headline
            .replace(/\s*[-–—]\s*[^-–—]+$/, '')
            .replace(/\s*\|.*$/, '')
            .trim();
    }

    cleanDescription(description) {
        if (!description) return '';
        
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