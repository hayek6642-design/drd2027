/**
 * Zagel Web Intelligence Layer
 * Smart trigger-based web search with memory integration
 */

const memorySystem = require('./memory-system');

class WebIntelligence {
    constructor() {
        this.triggers = {
            financial: /stock|price|market|crypto|investment|earnings|dividend/i,
            news: /news|breaking|latest|update|announce|report/i,
            weather: /weather|temperature|forecast|rain|snow|climate/i,
            tech: /technology|software|ai|robot|automation|programming/i,
            health: /health|disease|medicine|treatment|doctor|vaccine/i,
            comparison: /compare|versus|better|best|difference|vs/i
        };
    }

    /**
     * Analyze query and determine if web search is needed
     */
    shouldSearch(query) {
        // Check for temporal keywords indicating need for fresh info
        const temporalKeywords = /today|now|current|latest|recent|this week|this month|tomorrow/i;
        if (temporalKeywords.test(query)) return true;

        // Check for comparison keywords
        if (this.triggers.comparison.test(query)) return true;

        // Check for real-time data (stocks, weather, news)
        for (const [category, pattern] of Object.entries(this.triggers)) {
            if (pattern.test(query)) return true;
        }

        return false;
    }

    /**
     * Categorize query
     */
    categorizeQuery(query) {
        for (const [category, pattern] of Object.entries(this.triggers)) {
            if (pattern.test(query)) {
                return category;
            }
        }
        return 'general';
    }

    /**
     * Perform intelligent web search
     */
    async searchWeb(query, userId) {
        try {
            const category = this.categorizeQuery(query);
            
            // Enhance query based on category
            const enhancedQuery = this.enhanceQuery(query, category);

            // Fetch from server
            const response = await fetch('/api/zagel/web-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: enhancedQuery,
                    maxResults: 5,
                    userId
                })
            });

            if (!response.ok) throw new Error('Web search failed');
            const data = await response.json();

            return {
                success: true,
                results: data.results,
                category,
                cached: data.cached,
                summary: this.summarizeResults(data.results)
            };
        } catch (error) {
            console.error('[WEB_INTEL] Search failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enhance query with contextual keywords
     */
    enhanceQuery(query, category) {
        const enhancements = {
            financial: ' stock market price',
            news: ' news 2024 latest',
            weather: ' weather today',
            tech: ' technology 2024',
            health: ' health latest research',
            comparison: ' comparison review'
        };

        return query + (enhancements[category] || '');
    }

    /**
     * Summarize web search results
     */
    summarizeResults(results) {
        if (!results || results.length === 0) return '';

        return results
            .slice(0, 3)
            .map(r => `${r.title}: ${r.snippet}`)
            .join(' | ');
    }

    /**
     * Integrate web results into Zagel's response
     */
    async enhanceResponse(query, userId, geminiResponse) {
        try {
            if (!this.shouldSearch(query)) {
                return geminiResponse;
            }

            // Get web results
            const webResults = await this.searchWeb(query, userId);

            if (!webResults.success) {
                return geminiResponse; // Fall back to normal response
            }

            // Inject results into response
            const enhancement = this.buildEnhancement(webResults);

            return `${geminiResponse}\n\n${enhancement}`;
        } catch (error) {
            console.error('[WEB_INTEL] Enhancement failed:', error);
            return geminiResponse; // Fall back gracefully
        }
    }

    /**
     * Build natural response enhancement
     */
    buildEnhancement(webResults) {
        const { results, summary } = webResults;

        let text = `\n---\n\n**Latest Information:**\n\n`;

        for (const result of results.slice(0, 3)) {
            text += `- [${result.title}](${result.url})\n  ${result.snippet}\n\n`;
        }

        return text;
    }
}

module.exports = new WebIntelligence();