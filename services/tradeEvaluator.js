const Fuse = require('fuse.js');
const { parseTradeInput } = require('../utils/parsers');

class TradeEvaluator {
    constructor(items) {
        this.items = items;
        // Pre-map for exact matches and alias lookups
        this.itemMap = new Map();
        items.forEach(item => {
            this.itemMap.set(item.name.toLowerCase(), item);
            item.aliases.forEach(alias => {
                this.itemMap.set(alias.toLowerCase(), item);
            });
        });

        // Fuse for fuzzy matching
        const fuseOptions = {
            keys: ['name', 'aliases'],
            threshold: 0.4,
            includeScore: true,
            ignoreLocation: true
        };
        this.fuse = new Fuse(items, fuseOptions);
    }

    refreshItems(items) {
        this.items = items;
        this.itemMap.clear();
        items.forEach(item => {
            this.itemMap.set(item.name.toLowerCase(), item);
            item.aliases.forEach(alias => {
                this.itemMap.set(alias.toLowerCase(), item);
            });
        });

        const fuseOptions = {
            keys: ['name', 'aliases'],
            threshold: 0.4,
            includeScore: true,
            ignoreLocation: true
        };
        this.fuse = new Fuse(items, fuseOptions);
    }

    getBestMatch(query) {
        if (!query) return null;
        const queryLower = query.toLowerCase().trim();
        
        // 1. Exact match (case-insensitive)
        if (this.itemMap.has(queryLower)) {
            return this.itemMap.get(queryLower);
        }

        // 2. Fuzzy match
        const results = this.fuse.search(queryLower);
        if (results.length > 0) {
            // If the fuzzy match is very close, return it
            if (results[0].score < 0.4) {
                return results[0].item;
            }
        }

        return null;
    }

    evaluateSide(inputStr) {
        const parsedEntries = parseTradeInput(inputStr);
        const entries = [];
        let totalWorth = 0.0;
        let hasUnassigned = false;
        let hasUnknown = false;

        for (const { qty, rawName } of parsedEntries) {
            const matchedItem = this.getBestMatch(rawName);

            if (!matchedItem) {
                hasUnknown = true;
                entries.push({ qty, rawName, item: null });
                continue;
            }

            entries.push({ qty, rawName, item: matchedItem });

            if (matchedItem.worth === null) {
                hasUnassigned = true;
            } else {
                totalWorth += (matchedItem.worth * qty);
            }
        }

        return {
            entries,
            totalWorth,
            hasUnassigned,
            hasUnknown
        };
    }

    evaluate(offerStr, receiveStr) {
        const offerSide = this.evaluateSide(offerStr);
        const receiveSide = this.evaluateSide(receiveStr);

        const diff = receiveSide.totalWorth - offerSide.totalWorth;
        let verdict = "";
        let explanation = "";

        if (offerSide.hasUnknown || receiveSide.hasUnknown) {
            verdict = "Partial / Unclear";
            explanation = "Some items could not be found, so evaluation is incomplete.";
        } else if (offerSide.hasUnassigned || receiveSide.hasUnassigned) {
            verdict = "Partial / Unclear";
            explanation = "Trade involves Unassigned items. Calculate carefully, exact result is limited.";
        } else {
            if (diff > 0.05) {
                verdict = "Win";
                explanation = `You are winning by ${diff.toFixed(2)} worth.`;
            } else if (diff < -0.05) {
                verdict = "Lose";
                explanation = `He is winning by ${Math.abs(diff).toFixed(2)} worth.`;
            } else {
                verdict = "Fair";
                explanation = "Trade is fair in pure worth value.";
            }

        }

        return {
            offerSide,
            receiveSide,
            verdict,
            worthDiff: diff,
            explanation
        };
    }
}

module.exports = TradeEvaluator;
