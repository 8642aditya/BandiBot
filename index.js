const { Client, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Log message to Firestore
  await db.collection('messages').add({
    userId: message.author.id,
    username: message.author.username,
    content: message.content,
    timestamp: admin.firestore.Timestamp.now(),
  });

  // Example command
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
