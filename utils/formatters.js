const { EmbedBuilder } = require('discord.js');

const DEFAULT_COLOR = 0xFFD700; // Stick Run Yellow/Orange

function formatWorth(worth) {
    if (worth === null || worth === undefined) return "Unassigned";
    // Convert to string, replace dot with comma, remove trailing zeros
    return worth.toString().replace('.', ',');
}

function getVerdictColor(verdict) {
    if (verdict === "Win") return 0x00FF00; // Green
    if (verdict === "Lose") return 0xFF0000; // Red
    return DEFAULT_COLOR; 
}

function formatItemEmbed(item) {
    const worthStr = formatWorth(item.worth);
    const rarityStr = item.tier || item.category || "Unknown";
    const desc = `**Worth:** ${worthStr}\n` +
                 `**Rarity:** ${rarityStr}`;

    return new EmbedBuilder()
        .setTitle(`Item info: ${item.name}`)
        .setDescription(desc)
        .setColor(DEFAULT_COLOR)
        .setThumbnail("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_R3M71-nUq_S5M_6-o_B6o_B6o_B6o_B6o_B6o_B6o_B6o_B6o") // Stick Run Icon
        .setTimestamp();
}

function formatItemListEmbed(category, items) {
    const embed = new EmbedBuilder()
        .setTitle(`Item List: ${category}`)
        .setColor(DEFAULT_COLOR);

    const lines = items.map(item => {
        const aliasesStr = item.aliases.length > 0 ? ` [${item.aliases.join(', ')}]` : '';
        return `• **${item.name}**${aliasesStr}`;
    });

    embed.setDescription(lines.join('\n') || "*No items in this category*");
    return embed;
}

function formatMarketEmbed(category, listings) {
    const embed = new EmbedBuilder()
        .setTitle(`Marketplace: ${category}`)
        .setColor(DEFAULT_COLOR)
        .setTimestamp();

    if (listings.length === 0) {
        embed.setDescription(`*No active listings for ${category}*`);
    } else {
        listings.forEach(l => {
            const priceStr = l.price !== null ? `${formatWorth(l.price)} worth` : "Negotiable";
            // Use IGN if available, otherwise fallback to the saved user_tag
            const displayUser = l.ign ? `**${l.ign}**` : (l.user_tag ? `@${l.user_tag}` : `<@${l.user_id}>`);
            const noteStr = l.notes ? `\n> *${l.notes}*` : "";
            
            embed.addFields({
                name: `${l.item_name} - ${priceStr}`,
                value: `Seller: ${displayUser}${noteStr}`,
                inline: false
            });
        });
    }

    return embed;
}

function formatHelpEmbed(commands, isUserOwner = false) {
    const embed = new EmbedBuilder()
        .setTitle("Stick Helper Bot - Help Guide")
        .setDescription("Here is a list of all available commands to help you navigate the Stick Run economy.")
        .setColor(DEFAULT_COLOR)
        .setThumbnail("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_R3M71-nUq_S5M_6-o_B6o_B6o_B6o_B6o_B6o_B6o_B6o_B6o");

    commands.forEach(cmd => {
        if (cmd.description.includes('[OWNER]')) return;

        embed.addFields({
            name: `/${cmd.name}`,
            value: cmd.description,
            inline: false
        });
    });

    embed.setFooter({ text: "Use commands in any channel with permissions!" });
    return embed;
}

function formatTradeSide(side) {
    let lines = side.entries.map(entry => {
        if (entry.item) {
            const wStr = formatWorth(entry.item.worth);
            return `• **${entry.qty}x ${entry.item.name}** (${wStr})`;
        } else {
            return `• **${entry.qty}x ${entry.rawName}** (Not Found)`;
        }
    });

    if (lines.length === 0) lines.push('*Empty*');

    const totalStr = side.hasUnassigned ? `${formatWorth(side.totalWorth)} + Unassigned` : formatWorth(side.totalWorth);
    lines.push(`**Total Worth:** ${totalStr}`);

    return lines.join('\n');
}

function formatTradeEmbed(result) {
    const embed = new EmbedBuilder()
        .setTitle("Trade Check Result")
        .setColor(getVerdictColor(result.verdict));

    embed.addFields(
        { name: "Your Offer", value: formatTradeSide(result.offerSide), inline: false },
        { name: "You Receive", value: formatTradeSide(result.receiveSide), inline: false },
        { name: "Verdict", value: `**${result.verdict}**`, inline: false },
        { name: "Analysis", value: result.explanation, inline: false }
    );

    return embed;
}

module.exports = { formatItemEmbed, formatTradeEmbed, formatItemListEmbed, formatMarketEmbed, formatHelpEmbed };
