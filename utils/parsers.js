function parseTradeInput(inputStr) {
    /**
     * Parses strings like "2 tpass, 10 gcap", "3 pirate", "tpass"
     * Returns a list of objects: { qty: number, rawName: string }
     */
    const results = [];
    const parts = inputStr.split(',');

    for (let part of parts) {
        part = part.trim();
        if (!part) continue;

        // Match optional number followed by string
        const match = part.match(/^(\d+)?\s*(.+)$/);
        if (match) {
            const qtyStr = match[1];
            const itemName = match[2].trim();
            const qty = qtyStr ? parseInt(qtyStr, 10) : 1;
            results.push({ qty, rawName: itemName });
        }
    }

    return results;
}

module.exports = { parseTradeInput };
