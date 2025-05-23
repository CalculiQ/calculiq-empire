// calculiq-api.js
// Frontend API helper for CalculiQ dashboards

class CalculiQAPI {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    // Dashboard data methods
    async getDashboardData() {
        return this.get('/api/dashboard-data');
    }

    async getRevenueMetrics() {
        return this.get('/api/revenue-metrics');
    }

    async getAutomationStatus() {
        return this.get('/api/automation-status');
    }

    // Lead capture methods
    async getLeadMetrics() {
        return this.get('/api/lead-metrics');
    }

    async getLeads(limit = 10) {
        return this.get(`/api/leads?limit=${limit}`);
    }

    async captureLeadEmail(email, calculatorType, results, source = 'dashboard') {
        return this.post('/api/capture-lead-email', {
            email,
            calculatorType,
            results,
            source
        });
    }

    async captureLeadProfile(email, profile) {
        return this.post('/api/capture-lead-profile', {
            email,
            ...profile
        });
    }

    // Tracking methods
    async trackVisitor(uid) {
        return this.get(`/api/track-visitor?uid=${uid}`);
    }

    async triggerAutomation(profile) {
        return this.post('/api/trigger-automation', profile);
    }

    async startEmailSequence(email, profile) {
        return this.post('/api/email-automation', { email, profile });
    }

    // Content generation
    async generateContent(type, keywords, audience) {
        return this.post('/api/generate-content', { 
            contentType: type, 
            keywords, 
            targetAudience: audience 
        });
    }

    // Affiliate methods
    async getAffiliateRevenue(timeframe = 'month') {
        return this.get(`/api/affiliate-revenue?timeframe=${timeframe}`);
    }

    async getTopAffiliates(limit = 10) {
        return this.get(`/api/top-affiliates?limit=${limit}`);
    }

    async trackAffiliateClick(leadUid, partnerId, trackingId, clickData) {
        return this.post('/api/track-affiliate-click', {
            leadUid,
            partnerId,
            trackingId,
            clickData
        });
    }
}

// Create global instance
window.CalculiQAPI = new CalculiQAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculiQAPI;
}