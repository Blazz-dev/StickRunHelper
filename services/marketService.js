const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MarketService {
    constructor() {
        const dbPath = path.resolve('data', 'market.db');
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        // Table for listings
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_tag TEXT,
                item_name TEXT NOT NULL,
                category TEXT,
                price REAL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table for user profiles (IGN) - added UNIQUE constraint
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                ign TEXT NOT NULL UNIQUE,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    saveUser(userId, ign) {
        // This will throw if IGN unique constraint is violated
        const stmt = this.db.prepare(`
            INSERT INTO users (user_id, ign) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET ign = excluded.ign, updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(userId, ign);
    }

    getUser(userId) {
        const stmt = this.db.prepare(`SELECT * FROM users WHERE user_id = ?`);
        return stmt.get(userId);
    }

    isIgnTaken(ign) {
        const stmt = this.db.prepare(`SELECT 1 FROM users WHERE LOWER(ign) = LOWER(?) LIMIT 1`);
        return !!stmt.get(ign);
    }

    addListing(userId, userTag, itemName, category, price, notes) {
        const stmt = this.db.prepare(`
            INSERT INTO listings (user_id, user_tag, item_name, category, price, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, userTag, itemName, category, price, notes);
    }

    getListingsByCategory(category) {
        const stmt = this.db.prepare(`
            SELECT l.*, u.ign 
            FROM listings l
            LEFT JOIN users u ON l.user_id = u.user_id
            WHERE l.category = ? 
            ORDER BY l.created_at DESC 
            LIMIT 20
        `);
        return stmt.all(category);
    }

    getAllListings() {
        const stmt = this.db.prepare(`
            SELECT l.*, u.ign 
            FROM listings l
            LEFT JOIN users u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC 
            LIMIT 25
        `);
        return stmt.all();
    }

    adminChangeIgn(userId, newIgn) {
        const stmt = this.db.prepare(`
            INSERT INTO users (user_id, ign) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET ign = excluded.ign, updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(userId, newIgn);
    }

    removeListing(id) {
        const stmt = this.db.prepare(`DELETE FROM listings WHERE id = ?`);
        return stmt.run(id);
    }

    removeOldListings(days = 7) {
        const stmt = this.db.prepare(`
            DELETE FROM listings 
            WHERE created_at < datetime('now', ?)
        `);
        return stmt.run(`-${days} days`);
    }
}

module.exports = new MarketService();
