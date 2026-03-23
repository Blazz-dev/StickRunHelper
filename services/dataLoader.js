const fs = require('fs');
const path = require('path');
const axios = require('axios');

class DataLoader {
    constructor(dataPath = 'data/items.json') {
        this.dataPath = path.resolve(dataPath);
        this.items = [];
        this.spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1ogB8rOe_xQagNbWuHuCxHYHJI56ayB8F7A7In-Pnx-c/export?format=csv';
        this.loadData();
    }

    loadData() {
        if (!fs.existsSync(this.dataPath)) {
            this.items = [];
            return;
        }

        try {
            const raw = fs.readFileSync(this.dataPath, 'utf-8');
            this.items = JSON.parse(raw).map(d => ({
                name: d.name,
                aliases: d.aliases || [],
                worth: d.worth === "Unassigned" ? null : parseFloat(d.worth),
                category: d.category || 'Normal',
                tier: d.tier || ''
            }));
        } catch (err) {
            console.error("Error loading local data:", err);
            this.items = [];
        }
    }

    async fetchFromSpreadsheet() {
        try {
            const response = await axios.get(this.spreadsheetUrl);
            const csvData = response.data;
            const lines = csvData.split(/\r?\n/);
            
            let newItems = [];
            let currentCategory = 'Other';

            for (let line of lines) {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                
                if (cols.length < 6) continue;

                const colC = cols[2]; // Tier
                const colD = cols[3]; // Name
                const colE = cols[4]; // Alias
                const colF = cols[5]; // Value

                if (colD && (colD === colD.toUpperCase()) && !colF && colD.length > 3) {
                    currentCategory = this.normalizeCategory(colD);
                    continue;
                }

                if (!colD || colD === 'Name' || colD === 'NAME') continue;

                let worth = null;
                if (colF && colF !== 'Value' && colF !== 'VALUE') {
                    const cleanWorth = colF.replace(/[^0-9.]/g, '');
                    if (cleanWorth) worth = parseFloat(cleanWorth);
                }

                newItems.push({
                    name: colD,
                    aliases: colE ? colE.split('/').map(a => a.trim()).filter(a => a) : [],
                    worth: worth,
                    category: currentCategory,
                    tier: colC || ''
                });
            }

            if (newItems.length > 0) {
                this.items = newItems;
                this.saveToFile();
                return true;
            }
            return false;
        } catch (err) {
            console.error("Error syncing with spreadsheet:", err.message);
            return false;
        }
    }

    normalizeCategory(raw) {
        if (raw.includes('ULTRA')) return 'Ultra Rares';
        if (raw.includes('RARE')) return 'Rares';
        if (raw.includes('PREMIUM')) return 'Premiums';
        if (raw.includes('EVENT')) return 'Events';
        if (raw.includes('UNIQUE')) return 'Uniques';
        return 'Other';
    }

    saveToFile() {
        try {
            const toSave = this.items.map(item => ({
                name: item.name,
                aliases: item.aliases,
                worth: item.worth === null ? "Unassigned" : item.worth,
                category: item.category,
                tier: item.tier
            }));
            const dataDir = path.dirname(this.dataPath);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(this.dataPath, JSON.stringify(toSave, null, 2), 'utf-8');
            return true;
        } catch (err) {
            return false;
        }
    }

    updateItem(itemName, field, value) {
        const item = this.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (!item) return false;
        if (field === 'worth') item.worth = value === "Unassigned" ? null : parseFloat(value.replace(',', '.'));
        else item[field] = value;
        return this.saveToFile();
    }

    addItem(newItem) {
        this.items.push({
            name: newItem.name,
            aliases: newItem.aliases || [],
            worth: newItem.worth === "Unassigned" ? null : parseFloat(newItem.worth.replace(',', '.')),
            category: newItem.category || 'Normal',
            tier: newItem.tier || ''
        });
        return this.saveToFile();
    }

    getAllItems() {
        return this.items;
    }
}

module.exports = DataLoader;
