// financial-intelligence-network.js
// Main orchestrator for domain-specific content generation

const MortgageIQGenerator = require('./mortgage-iq-generator');
const WealthBuilderGenerator = require('./wealth-builder-generator');
const CreditMasterGenerator = require('./credit-master-generator');
const ProtectionPlannerGenerator = require('./protection-planner-generator');
const PatternMemoryBank = require('./pattern-memory-bank');
const MarketContextInterpreter = require('./market-context-interpreter');

class FinancialIntelligenceNetwork {
    constructor(db) {
        this.db = db;
        
        // Initialize shared intelligence
        this.patternMemory = new PatternMemoryBank(db);
        this.marketContext = new MarketContextInterpreter();
        
        // Initialize domain specialists
        this.generators = {
            mortgage: new MortgageIQGenerator(db, this.patternMemory, this.marketContext),
            investment: new WealthBuilderGenerator(db, this.patternMemory, this.marketContext),
            loan: new CreditMasterGenerator(db, this.patternMemory, this.marketContext),
            insurance: new ProtectionPlannerGenerator(db, this.patternMemory, this.marketContext)
        };
        
        this.crossPollinationEnabled = true;
    }

    async generateDailyRoundup(calculatorType) {
        console.log(`🧠 Financial Intelligence Network: Generating ${calculatorType} content`);
        
        try {
            // Load forbidden patterns to avoid repetition
            await this.patternMemory.loadRecentPatterns();
            
            // Get current market context
            const marketData = await this.marketContext.getCurrentMarketData();
            
            // Generate domain-specific content
            const generator = this.generators[calculatorType];
            if (!generator) {
                throw new Error(`Unknown calculator type: ${calculatorType}`);
            }
            
            const article = await generator.generateSpecializedContent(marketData);
            
            // Store new patterns to avoid future repetition
            await this.patternMemory.storeArticlePatterns(article);
            
            return article;
            
        } catch (error) {
            console.error('Financial Intelligence Network error:', error);
            throw error;
        }
    }

    async generateCrossPollinatedContent() {
        // Future feature: Generate content that connects multiple domains
        console.log('🔄 Generating cross-domain insights...');
        // Implementation coming in Phase 3
    }
}

module.exports = FinancialIntelligenceNetwork;