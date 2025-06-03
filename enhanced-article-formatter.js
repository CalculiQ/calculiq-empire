// enhanced-article-formatter.js
// Transforms any content into premium presentation matching calculator page aesthetic
// Drop-in replacement for basic blog formatting

class EnhancedArticleFormatter {
    constructor() {
        // Pattern detection for auto-enhancement
        this.patterns = {
            rates: /(\d+\.?\d*%)/g,
            money: /\$[\d,]+(?:\.\d{2})?/g,
            largeNumbers: /(\d{1,3}(?:,\d{3})+)/g,
            tips: /(tip|advice|remember|important|key|crucial|pro tip|strategy|consider):\s*/gi,
            warnings: /(warning|caution|avoid|risk|danger|alert):\s*/gi,
            insights: /(analysis|insight|data shows|research indicates|according to|study finds):\s*/gi,
            marketData: /(fed|federal reserve|interest rate|mortgage rate|inflation|market)/gi
        };
        
        // Calculator type detection
        this.calculatorTypes = {
            mortgage: ['mortgage', 'home', 'house', 'loan', 'rate', 'refinance'],
            investment: ['investment', 'stock', 'portfolio', 'return', 'savings', 'retirement'],
            loan: ['loan', 'credit', 'debt', 'personal loan', 'lending'],
            insurance: ['insurance', 'coverage', 'policy', 'protection', 'premium']
        };
    }

    // Main formatting method - transforms any content
    async formatArticle(rawContent, metadata = {}) {
        try {
            // Step 1: Analyze content structure
            const analysis = this.analyzeContent(rawContent, metadata);
            
            // Step 2: Apply intelligent enhancements
            const enhancedContent = this.applySmartEnhancements(rawContent, analysis);
            
            // Step 3: Wrap in premium presentation
            const styledArticle = this.wrapInAdvancedPresentation(enhancedContent, metadata, analysis);
            
            return styledArticle;
        } catch (error) {
            console.error('Article formatting error:', error);
            // Fallback to basic formatting
            return this.createFallbackPresentation(rawContent, metadata);
        }
    }

    // Analyze content to determine enhancement strategy
    analyzeContent(content, metadata) {
        const calculatorType = this.detectCalculatorType(content, metadata);
        
        return {
            calculatorType,
            hasRates: this.patterns.rates.test(content),
            hasMoneyAmounts: this.patterns.money.test(content),
            hasTips: this.patterns.tips.test(content),
            hasWarnings: this.patterns.warnings.test(content),
            hasMarketData: this.patterns.marketData.test(content),
            wordCount: content.split(' ').length,
            estimatedReadTime: Math.ceil(content.split(' ').length / 200),
            tone: this.analyzeTone(content)
        };
    }

    // Detect which calculator type this article relates to
    detectCalculatorType(content, metadata) {
        if (metadata.calculatorType) return metadata.calculatorType;
        if (metadata.category) {
            const category = metadata.category.toLowerCase();
            if (category.includes('mortgage')) return 'mortgage';
            if (category.includes('investment')) return 'investment';
            if (category.includes('loan')) return 'loan';
            if (category.includes('insurance')) return 'insurance';
        }
        
        // Analyze content for calculator type
        const contentLower = content.toLowerCase();
        let scores = { mortgage: 0, investment: 0, loan: 0, insurance: 0 };
        
        for (const [type, keywords] of Object.entries(this.calculatorTypes)) {
            keywords.forEach(keyword => {
                const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
                scores[type] += matches;
            });
        }
        
        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    }

    // Apply smart content enhancements
    applySmartEnhancements(content, analysis) {
        let enhanced = content;
        
        // Auto-enhance rates and percentages
        enhanced = enhanced.replace(this.patterns.rates, (match) => {
            return `<span class="rate-highlight">${match}</span>`;
        });
        
        // Auto-enhance money amounts
        enhanced = enhanced.replace(this.patterns.money, (match) => {
            return `<span class="money-highlight">${match}</span>`;
        });
        
        // Auto-enhance large numbers
        enhanced = enhanced.replace(this.patterns.largeNumbers, (match) => {
            if (!match.includes('$')) { // Don't double-enhance money
                return `<span class="number-highlight">${match}</span>`;
            }
            return match;
        });
        
        // Create auto-tip boxes
        enhanced = enhanced.replace(this.patterns.tips, (match, prefix) => {
            return `</p><div class="auto-tip-box"><p><strong>${prefix.charAt(0).toUpperCase() + prefix.slice(1)}:</strong> `;
        });
        
        // Close tip boxes (find next paragraph or end)
        enhanced = enhanced.replace(/(<div class="auto-tip-box"><p><strong>[^<]+<\/strong> [^<]+)<\/p>/g, '$1</p></div><p>');
        
        // Create insight blocks for analysis content
        enhanced = enhanced.replace(this.patterns.insights, (match, prefix) => {
            return `</p><div class="insight-block"><p><strong>${prefix.charAt(0).toUpperCase() + prefix.slice(1)}:</strong> `;
        });
        
        // Close insight blocks
        enhanced = enhanced.replace(/(<div class="insight-block"><p><strong>[^<]+<\/strong> [^<]+)<\/p>/g, '$1</p></div><p>');
        
        // Auto-create rate showcase if rates are prominent
        if (analysis.hasRates && analysis.calculatorType === 'mortgage') {
            enhanced = this.addRateShowcase(enhanced);
        }
        
        return enhanced;
    }

    // Add rate showcase for mortgage content
    addRateShowcase(content) {
        const rateMatch = content.match(/(\d+\.?\d*%)/);
        if (rateMatch) {
            const rate = rateMatch[1];
            const showcase = `
                <div class="rate-showcase">
                    <div class="rate-number">${rate}</div>
                    <div class="rate-label">Current Rate</div>
                    <div class="rate-change">Market Update</div>
                </div>
            `;
            
            // Insert after first paragraph
            const paragraphs = content.split('</p>');
            if (paragraphs.length > 1) {
                paragraphs.splice(1, 0, showcase);
                return paragraphs.join('</p>');
            }
        }
        return content;
    }

    // Wrap content in advanced presentation
    wrapInAdvancedPresentation(content, metadata, analysis) {
        const title = metadata.title || 'Financial Insights';
        const publishDate = metadata.published_at ? new Date(metadata.published_at).toLocaleDateString() : new Date().toLocaleDateString();
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.stripHtml(title)} - CalculiQ</title>
            <meta name="description" content="${metadata.meta_description || metadata.excerpt || 'Expert financial insights and calculations'}">
            ${this.generateAdvancedCSS()}
        </head>
        <body>
            ${this.generateNavigationBar()}
            
            <article class="calculiq-advanced-article">
                ${this.generateReadingProgress()}
                ${this.generateHeroSection(title, metadata, analysis)}
                
                <div class="article-content">
                    ${this.processContent(content)}
                </div>
                
                ${this.generateCalculatorCTA(analysis.calculatorType)}
            </article>
            
            ${this.generateFooter()}
            ${this.generateJavaScript()}
        </body>
        </html>
        `;
    }

    // Generate hero section with dynamic styling
    generateHeroSection(title, metadata, analysis) {
        const categoryIcon = {
            mortgage: '🏠',
            investment: '📈',
            loan: '💰',
            insurance: '🛡️'
        };
        
        return `
        <div class="article-hero">
            <h1 class="article-title">${this.stripHtml(title)}</h1>
            <div class="article-meta">
                <span class="meta-badge">${categoryIcon[analysis.calculatorType] || '📊'} ${analysis.calculatorType.charAt(0).toUpperCase() + analysis.calculatorType.slice(1)}</span>
                <span class="meta-badge">🗓️ ${new Date(metadata.published_at || Date.now()).toLocaleDateString()}</span>
                <span class="meta-badge">⏱️ ${analysis.estimatedReadTime} min read</span>
            </div>
        </div>
        `;
    }

    // Generate calculator-specific CTA
    generateCalculatorCTA(calculatorType) {
        const ctas = {
            mortgage: {
                title: 'Calculate Your Mortgage Payment',
                description: 'See exactly what you\'d pay with today\'s rates using our advanced mortgage calculator.',
                buttonText: 'Calculate Payment →'
            },
            investment: {
                title: 'Project Your Investment Growth',
                description: 'Use our investment calculator to see how your money could grow over time.',
                buttonText: 'Calculate Returns →'
            },
            loan: {
                title: 'Compare Loan Options',
                description: 'Find your best loan terms with our comprehensive comparison calculator.',
                buttonText: 'Compare Loans →'
            },
            insurance: {
                title: 'Calculate Coverage Needs',
                description: 'Determine the right insurance coverage for your family\'s protection.',
                buttonText: 'Calculate Coverage →'
            }
        };
        
        const cta = ctas[calculatorType] || ctas.mortgage;
        
        return `
        <div class="smart-cta">
            <h3 class="cta-title">${cta.title}</h3>
            <p class="cta-description">${cta.description}</p>
            <a href="/#calculators" class="cta-button">${cta.buttonText}</a>
        </div>
        `;
    }

    // Process content for better presentation
    processContent(content) {
        // Convert basic paragraphs to proper HTML
        let processed = content
            .split('\n\n')
            .map(para => para.trim())
            .filter(para => para.length > 0)
            .map(para => {
                if (para.startsWith('<')) return para; // Already HTML
                if (para.startsWith('#')) return this.convertHeaders(para);
                return `<p>${para}</p>`;
            })
            .join('\n\n');
        
        return processed;
    }

    // Convert markdown headers to HTML
    convertHeaders(text) {
        if (text.startsWith('### ')) {
            return `<h3>${text.substring(4)}</h3>`;
        }
        if (text.startsWith('## ')) {
            return `<h2>${text.substring(3)}</h2>`;
        }
        if (text.startsWith('# ')) {
            return `<h1>${text.substring(2)}</h1>`;
        }
        return `<p>${text}</p>`;
    }

    // Navigation bar
    generateNavigationBar() {
        return `
        <nav class="nav-bar">
            <a href="/" class="nav-link">🏠 Home</a>
            <a href="/blog" class="nav-link">📝 Blog</a>
            <a href="/#calculators" class="nav-link">🧮 Calculators</a>
        </nav>
        `;
    }

    // Reading progress indicator
    generateReadingProgress() {
        return '<div class="reading-progress" id="reading-progress"></div>';
    }

    // Footer
    generateFooter() {
        return `
        <footer class="article-footer">
            <p>Published by CalculiQ • <a href="/blog">← Back to Blog</a></p>
        </footer>
        `;
    }

    // Advanced CSS matching calculator aesthetic
    generateAdvancedCSS() {
        return `
        <style>
            :root {
                --primary-dark: #0a0e27;
                --secondary-dark: #151932;
                --accent-blue: #00d4ff;
                --accent-purple: #7b2ff7;
                --accent-gradient: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
                --text-primary: #ffffff;
                --text-secondary: #b8c5d6;
                --glass-bg: rgba(255, 255, 255, 0.08);
                --glass-border: rgba(255, 255, 255, 0.15);
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: var(--primary-dark);
                color: var(--text-primary);
                line-height: 1.6;
                min-height: 100vh;
            }
            
            /* Animated Background Grid */
            body::before {
                content: '';
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-image: 
                    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
                background-size: 50px 50px;
                animation: gridMove 20s linear infinite;
                z-index: -1;
            }
            
            @keyframes gridMove {
                0% { transform: translate(0, 0); }
                100% { transform: translate(50px, 50px); }
            }
            
            /* Navigation */
            .nav-bar {
                text-align: center;
                padding: 20px;
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid var(--glass-border);
            }
            
            .nav-link {
                color: var(--text-secondary);
                text-decoration: none;
                margin: 0 15px;
                padding: 8px 16px;
                border-radius: 20px;
                transition: all 0.3s ease;
            }
            
            .nav-link:hover {
                color: var(--text-primary);
                background: var(--glass-bg);
            }
            
            /* Main Article */
            .calculiq-advanced-article {
                max-width: 800px;
                margin: 40px auto;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: 25px;
                overflow: hidden;
                backdrop-filter: blur(20px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            /* Reading Progress */
            .reading-progress {
                height: 4px;
                background: var(--accent-gradient);
                width: 0%;
                transition: width 0.3s ease;
                position: sticky;
                top: 0;
                z-index: 100;
            }
            
            /* Hero Section */
            .article-hero {
                background: var(--accent-gradient);
                padding: 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .article-title {
                font-size: 2.2rem;
                font-weight: 800;
                color: white;
                margin-bottom: 15px;
                line-height: 1.2;
            }
            
            .article-meta {
                color: rgba(255,255,255,0.9);
                display: flex;
                justify-content: center;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .meta-badge {
                background: rgba(255,255,255,0.2);
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            /* Content Area */
            .article-content {
                padding: 40px;
            }
            
            .article-content h2 {
                background: var(--accent-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 1.8rem;
                font-weight: 700;
                margin: 40px 0 20px 0;
                position: relative;
            }
            
            .article-content h2::after {
                content: '';
                position: absolute;
                bottom: -10px; left: 0;
                width: 60px; height: 3px;
                background: var(--accent-gradient);
                border-radius: 2px;
            }
            
            .article-content p {
                color: var(--text-secondary);
                margin-bottom: 20px;
                font-size: 1.1rem;
                line-height: 1.8;
            }
            
            /* Enhanced Elements */
            .rate-highlight {
                background: var(--accent-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-weight: 700;
                font-size: 1.1em;
            }
            
            .money-highlight {
                color: var(--accent-blue);
                font-weight: 700;
                font-family: 'SF Mono', Monaco, monospace;
                background: rgba(0, 212, 255, 0.1);
                padding: 2px 6px;
                border-radius: 6px;
            }
            
            .number-highlight {
                color: var(--accent-purple);
                font-weight: 600;
            }
            
            /* Auto Tip Boxes */
            .auto-tip-box {
                background: var(--glass-bg);
                border-left: 4px solid var(--accent-purple);
                padding: 25px;
                margin: 30px 0;
                border-radius: 0 15px 15px 0;
                backdrop-filter: blur(10px);
                position: relative;
            }
            
            .auto-tip-box::before {
                content: "💡";
                position: absolute;
                left: -15px; top: 20px;
                background: var(--primary-dark);
                padding: 8px;
                border-radius: 50%;
                font-size: 1.2rem;
                border: 2px solid var(--accent-purple);
            }
            
            /* Insight Blocks */
            .insight-block {
                background: rgba(0, 212, 255, 0.05);
                border: 1px solid rgba(0, 212, 255, 0.2);
                padding: 25px;
                margin: 30px 0;
                border-radius: 15px;
                position: relative;
            }
            
            .insight-block::before {
                content: "📊";
                position: absolute;
                top: -12px; left: 25px;
                background: var(--primary-dark);
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 1.1rem;
            }
            
            /* Rate Showcase */
            .rate-showcase {
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(123, 47, 247, 0.1) 100%);
                border: 2px solid var(--accent-blue);
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            
            .rate-number {
                font-size: 3rem;
                font-weight: 900;
                background: var(--accent-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .rate-label {
                color: var(--text-primary);
                font-size: 1.2rem;
                font-weight: 600;
            }
            
            .rate-change {
                color: var(--accent-blue);
                font-size: 1rem;
                font-weight: 500;
            }
            
            /* CTA Section */
            .smart-cta {
                background: var(--glass-bg);
                border: 2px solid var(--accent-blue);
                margin: 40px 0 0 0;
                padding: 40px;
                border-radius: 20px 20px 0 0;
                text-align: center;
            }
            
            .cta-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 15px;
            }
            
            .cta-description {
                color: var(--text-secondary);
                margin-bottom: 25px;
            }
            
            .cta-button {
                background: var(--accent-gradient);
                color: white;
                padding: 18px 45px;
                border-radius: 30px;
                text-decoration: none;
                font-size: 1.1rem;
                font-weight: 600;
                display: inline-block;
                transition: all 0.3s ease;
                box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
            }
            
            .cta-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 40px rgba(123, 47, 247, 0.5);
            }
            
            /* Footer */
            .article-footer {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-secondary);
                border-top: 1px solid var(--glass-border);
            }
            
            .article-footer a {
                color: var(--accent-blue);
                text-decoration: none;
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .calculiq-advanced-article {
                    margin: 20px 10px;
                    border-radius: 15px;
                }
                
                .article-hero {
                    padding: 30px 20px;
                }
                
                .article-title {
                    font-size: 1.8rem;
                }
                
                .article-content {
                    padding: 30px 20px;
                }
                
                .rate-number {
                    font-size: 2.5rem;
                }
                
                .article-meta {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        </style>
        `;
    }

    // JavaScript for interactivity
    generateJavaScript() {
        return `
        <script>
            // Reading progress
            window.addEventListener('scroll', () => {
                const progress = document.getElementById('reading-progress');
                const article = document.querySelector('.article-content');
                
                if (progress && article) {
                    const scrolled = window.scrollY;
                    const height = article.offsetHeight;
                    const progressPercent = Math.min((scrolled / height) * 100, 100);
                    progress.style.width = progressPercent + '%';
                }
            });
            
            // Smooth scroll for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        </script>
        `;
    }

    // Utility methods
    stripHtml(text) {
        return text.replace(/<[^>]*>/g, '');
    }

    analyzeTone(content) {
        const positiveWords = ['benefit', 'advantage', 'opportunity', 'growth', 'save'];
        const urgentWords = ['now', 'today', 'immediate', 'urgent', 'rising'];
        
        const positive = positiveWords.filter(word => content.toLowerCase().includes(word)).length;
        const urgent = urgentWords.filter(word => content.toLowerCase().includes(word)).length;
        
        if (urgent > positive) return 'urgent';
        if (positive > 0) return 'positive';
        return 'neutral';
    }

    // Fallback for errors
    createFallbackPresentation(content, metadata) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${metadata.title || 'CalculiQ Article'}</title>
            <style>body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }</style>
        </head>
        <body>
            <h1>${metadata.title || 'Financial Article'}</h1>
            <div>${content}</div>
            <p><a href="/blog">← Back to Blog</a></p>
        </body>
        </html>
        `;
    }
}

module.exports = EnhancedArticleFormatter;