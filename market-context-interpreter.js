class MarketContextInterpreter {
    async getCurrentMarketData() {
        // Return same format as your current system
        return {
            rates: {
                mortgage: {
                    thirtyYear: "7.125",
                    fifteenYear: "6.625",
                    weeklyChange: "0.05"
                }
            }
        };
    }
}

module.exports = MarketContextInterpreter;