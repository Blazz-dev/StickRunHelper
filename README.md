# Stick Helper Discord Bot (Node.js)

A specialized item economy, trading, and marketplace Discord bot for *Stick Run*. This bot helps players calculate trade values, lookup item worth from a live Google Spreadsheet, and browse user listings.

## 🚀 Quick Start

1.  **Install Node.js**: Ensure you have Node.js (v18+) installed.
2.  **Install Dependencies**: Run `npm install` in the project folder.
3.  **Configure Environment**:
    - Rename `.env.example` to **`.env`**.
    - Fill in your `DISCORD_TOKEN`.
    - (Optional) Set `GUILD_ID` for faster slash command syncing.
    - Set your `OWNER_ID` (your Discord User ID) for admin access.
4.  **Run the Bot**:
    - **Windows**: Double-click **`start_bot.bat`**. This includes an auto-restart loop for the `/refresh` command.
    - **Manual**: Run `node index.js`.

---

## 🔒 Open Source & Security
If you are open-sourcing this project:
- **Never commit your `.env` file**. It contains your private bot token.
- The included **`.gitignore`** protects your `.env` and your local database (`market.db`).
- Use **`.env.example`** as a template for other contributors.

---

## 🛠️ Features

### User Commands
- **/help**: Complete guide to bot commands (Hides owner tools from public).
- **/username**: Register your unique in-game name (Permanent link).
- **/price**: Lookup item worth and **Tier/Rarity** (Live sync from Spreadsheet).
- **/trade**: Evaluate trade offers for Win/Loss/Fair results.
- **/itemlist**: Browse items by category.
- **/sell**: List items for sale (Requires registered IGN).
- **/market**: Browse live listings with interactive category buttons.

### Owner Commands (Secured & Hidden)
Restricted to the `OWNER_ID` in your `.env`. These are hidden from the slash menu for regular users:
- **/refresh**: Instantly restart the bot process from Discord.
- **/sync**: Force a fresh download from the Google Spreadsheet.
- **/changeprice**: Manually override an item's worth.
- **/additem**: Add a brand new item to the database.
- **/changeusername**: Admin override for any user's linked IGN.
- **/removelisting**: Moderation tool to delete marketplace posts.

---

## 📊 Data & Sync
- **Live Sync**: The bot automatically pulls prices from the configured Google Spreadsheet on startup.
- **Persistence**: Items are backed up to `data/items.json` for offline use.
- **Marketplace**: User listings and IGNs are stored in a local SQLite database (`data/market.db`).

---

## ⚖️ License
This project is open-source. Feel free to modify and adapt it for your community!
