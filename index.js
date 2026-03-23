require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    ApplicationCommandOptionType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DataLoader = require('./services/dataLoader');
const TradeEvaluator = require('./services/tradeEvaluator');
const marketService = require('./services/marketService');
const { 
    formatItemEmbed, 
    formatTradeEmbed, 
    formatItemListEmbed, 
    formatMarketEmbed,
    formatHelpEmbed 
} = require('./utils/formatters');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || TOKEN === "your_bot_token_here") {
    console.error("Error: DISCORD_TOKEN is missing or not set in .env");
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

const dataLoader = new DataLoader();
const tradeEvaluator = new TradeEvaluator(dataLoader.getAllItems());

const commands = [
    {
        name: 'help',
        description: 'Get a list of all available commands and how to use them.'
    },
    {
        name: 'username',
        description: 'Set your Stick Run In-Game Name (IGN) for the marketplace.',
        options: [{ name: 'ign', description: 'Your in-game username', type: ApplicationCommandOptionType.String, required: true }]
    },
    {
        name: 'price',
        description: 'Look up the price and info for a Stick Run item.',
        options: [{ name: 'item_name', description: 'Name or alias of the item', type: ApplicationCommandOptionType.String, required: true }],
    },
    {
        name: 'trade',
        description: 'Calculate a trade value between two offers.',
        options: [
            { name: 'my_offer', description: "Your items (e.g. '2 tpass, 10 gcap')", type: ApplicationCommandOptionType.String, required: true },
            { name: 'his_offer', description: "Their items (e.g. '1 mpack, 3 pirate')", type: ApplicationCommandOptionType.String, required: true }
        ],
    },
    {
        name: 'itemlist',
        description: 'Display all item names and aliases filtered by category.',
        options: [
            {
                name: 'category',
                description: 'Filter by rarity category',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: 'Events', value: 'Events' },
                    { name: 'Rares', value: 'Rares' },
                    { name: 'Premiums', value: 'Premiums' },
                    { name: 'Ultras', value: 'Ultra Rares' }
                ]
            }
        ]
    },
    {
        name: 'sell',
        description: 'List an item for sale in the marketplace.',
        options: [
            { name: 'item_name', description: 'Name of the item you are selling', type: ApplicationCommandOptionType.String, required: true },
            { name: 'price', description: 'Price in worth (numeric)', type: ApplicationCommandOptionType.Number, required: true },
            { name: 'notes', description: 'Additional notes (e.g. preferred trades)', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'market',
        description: 'Browse items that other people are selling.'
    },
    // OWNER COMMANDS (Secured with default_member_permissions)
    {
        name: 'refresh',
        description: '[OWNER] Completely restart the bot process.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    },
    {
        name: 'sync',
        description: '[OWNER] Force sync the item list with the Google Spreadsheet.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    },
    {
        name: 'changeprice',
        description: '[OWNER] Change the worth of an item.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'item_name', description: 'Name of the item', type: ApplicationCommandOptionType.String, required: true },
            { name: 'new_price', description: "New worth (numeric or 'Unassigned')", type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'setcategory',
        description: '[OWNER] Change the rarity category of an item.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'item_name', description: 'Name of the item', type: ApplicationCommandOptionType.String, required: true },
            { 
                name: 'category', 
                description: 'New category', 
                type: ApplicationCommandOptionType.String, 
                required: true,
                choices: [
                    { name: 'Events', value: 'Events' },
                    { name: 'Rares', value: 'Rares' },
                    { name: 'Premiums', value: 'Premiums' },
                    { name: 'Ultras', value: 'Ultra Rares' }
                ]
            }
        ]
    },
    {
        name: 'additem',
        description: '[OWNER] Add a new item to the database.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'name', description: 'Full name of the item', type: ApplicationCommandOptionType.String, required: true },
            { 
                name: 'category', 
                description: 'Rarity category', 
                type: ApplicationCommandOptionType.String, 
                required: true,
                choices: [
                    { name: 'Events', value: 'Events' },
                    { name: 'Rares', value: 'Rares' },
                    { name: 'Premiums', value: 'Premiums' },
                    { name: 'Ultras', value: 'Ultra Rares' }
                ]
            },
            { name: 'worth', description: "Initial worth (numeric or 'Unassigned')", type: ApplicationCommandOptionType.String, required: true },
            { name: 'aliases', description: "Aliases separated by comma (e.g. 'fbow, bow')", type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'changeusername',
        description: '[OWNER] Change any user\'s registered In-Game Name.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            { name: 'user', description: 'The user to change', type: ApplicationCommandOptionType.User, required: true },
            { name: 'new_ign', description: 'The new in-game name', type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'removelisting',
        description: '[OWNER] Remove a specific market listing by ID.',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [{ name: 'id', description: 'Listing ID (from /market)', type: ApplicationCommandOptionType.Integer, required: true }]
    }
];

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        if (GUILD_ID && GUILD_ID !== "your_guild_id_here") {
            await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
            console.log(`Synced commands to guild ${GUILD_ID}`);
        } else {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('Synced global commands');
        }
    } catch (e) { console.error(e); }

    // Initial sync from spreadsheet
    console.log("Synchronizing with Google Spreadsheet...");
    const success = await dataLoader.fetchFromSpreadsheet();
    if (success) {
        tradeEvaluator.refreshItems(dataLoader.getAllItems());
        console.log("Startup sync complete!");
    } else {
        console.log("Startup sync failed. Using local data fallback.");
    }

    // Check for restart notification
    const restartFile = path.resolve('data', 'restart_ping');
    if (fs.existsSync(restartFile)) {
        try {
            const channelId = fs.readFileSync(restartFile, 'utf-8');
            const channel = await client.channels.fetch(channelId);
            if (channel) {
                const msg = await channel.send("✅ **Bot Restart Complete!** Done.");
                setTimeout(() => msg.delete().catch(O_o => {}), 2000);
            }
            fs.unlinkSync(restartFile);
        } catch (e) {
            console.error("Failed to send restart notification:", e);
        }
    }
});

function createMarketButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('m_All').setLabel('All').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('m_Rares').setLabel('Rares').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('m_Premiums').setLabel('Premiums').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('m_Ultra Rares').setLabel('Ultras').setStyle(ButtonStyle.Primary)
    );
}

function isOwner(interaction) {
    return interaction.user.id === OWNER_ID;
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'help') {
            await interaction.reply({ embeds: [formatHelpEmbed(commands)] });
        }

        if (commandName === 'username') {
            const ign = options.getString('ign');
            const existingUser = marketService.getUser(interaction.user.id);
            if (existingUser) return interaction.reply({ content: `❌ Your account is already linked to **${existingUser.ign}**.`, ephemeral: true });
            if (marketService.isIgnTaken(ign)) return interaction.reply({ content: `❌ The name **${ign}** is already taken.`, ephemeral: true });

            marketService.saveUser(interaction.user.id, ign);
            await interaction.reply({ content: `✅ Your In-Game Name has been permanently set to **${ign}**!`, ephemeral: true });
        }

        if (commandName === 'price') {
            const itemName = options.getString('item_name');
            const matched = tradeEvaluator.getBestMatch(itemName);
            if (!matched) return interaction.reply({ content: `Item \`${itemName}\` not found.`, ephemeral: true });
            await interaction.reply({ embeds: [formatItemEmbed(matched)] });
        }

        if (commandName === 'trade') {
            const result = tradeEvaluator.evaluate(options.getString('my_offer'), options.getString('his_offer'));
            await interaction.reply({ embeds: [formatTradeEmbed(result)] });
        }

        if (commandName === 'itemlist') {
            const cat = options.getString('category');
            const items = dataLoader.getAllItems().filter(i => i.category === cat);
            await interaction.reply({ embeds: [formatItemListEmbed(cat, items)] });
        }

        if (commandName === 'sell') {
            const user = marketService.getUser(interaction.user.id);
            if (!user) return interaction.reply({ content: "❌ Register with `/username` first!", ephemeral: true });

            const itemNameInput = options.getString('item_name');
            const price = options.getNumber('price');
            const notes = options.getString('notes') || "";
            
            const matched = tradeEvaluator.getBestMatch(itemNameInput);
            if (!matched) return interaction.reply({ content: `Could not verify item \`${itemNameInput}\`.`, ephemeral: true });

            marketService.addListing(interaction.user.id, interaction.user.tag, matched.name, matched.category, price, notes);
            await interaction.reply({ content: `✅ Listed **${matched.name}** for **${price.toString().replace('.', ',')} worth**!`, ephemeral: true });
        }

        if (commandName === 'market') {
            const listings = marketService.getAllListings();
            await interaction.reply({ 
                embeds: [formatMarketEmbed("All Recent", listings)],
                components: [createMarketButtons()]
            });
        }

        // --- OWNER COMMANDS ---
        if (['refresh', 'sync', 'changeprice', 'setcategory', 'additem', 'changeusername', 'removelisting'].includes(commandName)) {
            if (!isOwner(interaction)) return interaction.reply({ content: "❌ Access Denied. Owner only.", ephemeral: true });

            if (commandName === 'refresh') {
                await interaction.reply({ content: "🔄 Bot is restarting...", ephemeral: true });
                
                // Save channel ID for notification after restart
                const restartFile = path.resolve('data', 'restart_ping');
                fs.writeFileSync(restartFile, interaction.channelId);
                
                setTimeout(() => process.exit(100), 1000); // Wait a bit for reply to send
            }

            if (commandName === 'sync') {
                await interaction.deferReply({ ephemeral: true });
                const success = await dataLoader.fetchFromSpreadsheet();
                if (success) {
                    tradeEvaluator.refreshItems(dataLoader.getAllItems());
                    await interaction.editReply({ content: "✅ Successfully synced item list with Google Spreadsheet!" });
                } else {
                    await interaction.editReply({ content: "❌ Failed to sync with spreadsheet. Check console logs." });
                }
            }

            if (commandName === 'changeprice') {
                const item = options.getString('item_name');
                const price = options.getString('new_price');
                const matched = tradeEvaluator.getBestMatch(item);
                if (!matched) return interaction.reply({ content: "Item not found.", ephemeral: true });

                dataLoader.updateItem(matched.name, 'worth', price);
                tradeEvaluator.refreshItems(dataLoader.getAllItems());
                await interaction.reply({ content: `✅ Updated **${matched.name}** worth to **${price}**.` });
            }

            if (commandName === 'setcategory') {
                const item = options.getString('item_name');
                const cat = options.getString('category');
                const matched = tradeEvaluator.getBestMatch(item);
                if (!matched) return interaction.reply({ content: "Item not found.", ephemeral: true });

                dataLoader.updateItem(matched.name, 'category', cat);
                tradeEvaluator.refreshItems(dataLoader.getAllItems());
                await interaction.reply({ content: `✅ Updated **${matched.name}** category to **${cat}**.` });
            }

            if (commandName === 'additem') {
                const name = options.getString('name');
                const cat = options.getString('category');
                const worth = options.getString('worth');
                const aliases = options.getString('aliases')?.split(',').map(s => s.trim()) || [];

                dataLoader.addItem({ name, category: cat, worth, aliases });
                tradeEvaluator.refreshItems(dataLoader.getAllItems());
                await interaction.reply({ content: `✅ Added brand new item: **${name}**!` });
            }

            if (commandName === 'changeusername') {
                const targetUser = options.getUser('user');
                const newIgn = options.getString('new_ign');
                marketService.adminChangeIgn(targetUser.id, newIgn);
                await interaction.reply({ content: `✅ Admin: Set <@${targetUser.id}> IGN to **${newIgn}**.` });
            }

            if (commandName === 'removelisting') {
                const id = options.getInteger('id');
                marketService.removeListing(id);
                await interaction.reply({ content: `✅ Admin: Removed listing ID **#${id}**.` });
            }
        }

    } else if (interaction.isButton()) {
        if (interaction.customId.startsWith('m_')) {
            const category = interaction.customId.replace('m_', '');
            let listings = (category === 'All') ? marketService.getAllListings() : marketService.getListingsByCategory(category);
            await interaction.update({ 
                embeds: [formatMarketEmbed(category === 'All' ? "All Recent" : category, listings)],
                components: [createMarketButtons()]
            });
        }
    }
});

client.login(TOKEN);
