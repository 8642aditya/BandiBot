require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

let statusChannelId = '1361631725209522277'; // Replace with your channel ID

// Function to send a message to the status channel
async function sendStatusUpdate(message) {
    const statusChannel = client.channels.cache.get(statusChannelId);
    if (statusChannel) {
        await statusChannel.send(message).catch(console.error); // Send to channel
    }
}

client.once('ready', () => {
    console.log(`${client.user.tag} is now online!`);

    // Send message to channel when the bot is online
    sendStatusUpdate(`🚀 Bot ${client.user.tag} is now online and ready to serve!`);

    // Optionally, you can set a bot presence here (like playing a game)
    client.user.setPresence({
        activities: [{ name: 'Ready to serve!', type: 0 }],
        status: 'online',
    });
});

// Error handler to send errors to the status channel
client.on('error', (error) => {
    console.error('Bot encountered an error:', error);

    // Send error message to status channel
    sendStatusUpdate(`❗ Error occurred: ${error.message}`);
});

// Disconnection handler to notify when the bot goes offline
client.on('disconnect', () => {
    console.log('Bot has been disconnected.');

    // Send disconnect message to status channel
    sendStatusUpdate('⚠️ Bot has been disconnected from Discord!');
});

// Reconnection handler to notify when the bot reconnects
client.on('reconnecting', () => {
    console.log('Bot is attempting to reconnect.');

    // Send reconnect message to status channel
    sendStatusUpdate('🔄 Bot is attempting to reconnect...');
});

// Log when the bot is back online after a reconnect
client.on('ready', () => {
    console.log('Bot reconnected successfully.');
    sendStatusUpdate('✅ Bot has successfully reconnected!');
});

client.login(process.env.DISCORD_TOKEN);
