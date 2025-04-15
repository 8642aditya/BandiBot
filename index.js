require('./monitoring.js');  // This will execute monitoring.js when the bot starts
require('dotenv').config();
const { toggleBassBoost, toggleNightcore, toggleVaporwave, applyFilter } = require('./filters');
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus
} = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

let connection;
let player = createAudioPlayer();
let currentResource;
let queue = [];
let isLooping = false;
let volume = 0.5; // default volume (50%)

const UPTIME_API_KEY = process.env.UPTIME_API_KEY;
const UPTIME_MONITOR_URL = process.env.UPTIME_MONITOR_URL;

client.once('ready', () => {
    console.log(`${client.user.tag} is now online!`);

    // Initial status rotation
    const statuses = [
        { name: '🎵 Music Time!', type: 0 },
        { name: '📀 Listening to the queue', type: 2 },
        { name: '🔁 Loops on!', type: 3 },
        { name: '🎧 Bandimusic Vibes', type: 0 },
    ];

    let i = 0;
    setInterval(() => {
        client.user.setPresence({
            activities: [statuses[i]],
            status: 'online',
        });
        i = (i + 1) % statuses.length;
    }, 30000);
});

// Handle music play and queue commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!play')) {
        const songQuery = message.content.split(' ').slice(1).join(' ');
        if (!songQuery) return message.reply("Please provide a song name or URL.");

        const { search } = await import('youtube-search-without-api-key');
        const results = await search(songQuery, { maxResults: 1, type: 'video' });

        if (!results.length) return message.reply("No results found.");

        const video = results[0];
        queue.push({ video, requestedBy: message.author });

        // Update status to show it's playing the song
        client.user.setPresence({
            activities: [{ name: `🎶 Playing: ${video.title}`, type: 0 }],
            status: 'online',
        });

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
        }

        if (player.state.status !== AudioPlayerStatus.Playing) {
            playSong(message, video);
        } else {
            message.reply(`✅ Queued: **${video.title}**`);
        }
    }

    if (message.content === '!queue') {
        if (queue.length === 0) return message.reply("The queue is empty.");
        const q = queue.map((s, i) => `${i + 1}. ${s.video.title}`).join('\n');
        message.reply(`🎶 **Queue**:\n${q}`);

        // Update status to show how many songs are in the queue
        client.user.setPresence({
            activities: [{ name: `🎶 Queue: ${queue.length} songs`, type: 0 }],
            status: 'online',
        });
    }
});

// When music stops, update the status to idle or default
player.on(AudioPlayerStatus.Idle, () => {
    if (queue.length > 0) {
        playSong({ author: queue[0].requestedBy }, queue[0].video);
    } else {
        // Update status when the queue is empty
        client.user.setPresence({
            activities: [{ name: '🎶 Waiting for music...', type: 0 }],
            status: 'idle',
        });
    }
});

// Handle actual song playing logic
async function playSong(message, video) {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
    const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
    const filteredStream = applyFilter(stream);
    const resource = createAudioResource(filteredStream, { inlineVolume: true });
    currentResource = createAudioResource(filteredStream, { inlineVolume: true });

    resource.volume.setVolume(volume);

    player.play(resource);
    connection.subscribe(player);
    currentResource = resource;

    const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${video.title}](${videoUrl})`)
        .setThumbnail(video.snippet.thumbnails.url || 'https://i.imgur.com/EZ5Gz7Z.png')
        .addFields(
            { name: 'Duration', value: video.duration_raw || 'Unknown', inline: true },
            { name: 'Views', value: video.views || 'N/A', inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    const controls1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pause').setLabel('⏸️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('resume').setLabel('▶️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('skip').setLabel('⏭️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('loop').setLabel('🔁').setStyle(ButtonStyle.Secondary)
    );

    const controls2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bassboost').setLabel('🎵 Bass Boost').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('nightcore').setLabel('🌙 Nightcore').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vaporwave').setLabel('💿 Vaporwave').setStyle(ButtonStyle.Secondary)
    );

    const volumeControl = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vol-down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vol-up').setLabel('🔊').setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [controls1, controls2, volumeControl] });

}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
        case 'pause':
            player.pause();
            return interaction.reply({ content: '⏸️ Paused.', ephemeral: true });
        case 'resume':
            player.unpause();
            return interaction.reply({ content: '▶️ Resumed.', ephemeral: true });
        case 'skip':
            player.stop();
            return interaction.reply({ content: '⏭️ Skipped.', ephemeral: true });
        case 'stop':
            queue = [];
            player.stop();
            connection.destroy();
            connection = null;
            return interaction.reply({ content: '⏹️ Stopped and left channel.', ephemeral: true });
        case 'loop':
            isLooping = !isLooping;
            return interaction.reply({ content: `🔁 Looping is now **${isLooping ? 'enabled' : 'disabled'}**.`, ephemeral: true });
        case 'vol-up':
            volume = Math.min(volume + 0.1, 1);
            if (currentResource?.volume) currentResource.volume.setVolume(volume);
            return interaction.reply({ content: `🔊 Volume: ${(volume * 100).toFixed(0)}%`, ephemeral: true });
        case 'vol-down':
            volume = Math.max(volume - 0.1, 0);
            if (currentResource?.volume) currentResource.volume.setVolume(volume);
            return interaction.reply({ content: `🔉 Volume: ${(volume * 100).toFixed(0)}%`, ephemeral: true });
            case 'bassboost':
                const bassBoostState = toggleBassBoost();
                return interaction.reply({
                    content: `🎵 Bass Boost is now **${bassBoostState ? 'enabled' : 'disabled'}**.`,
                    ephemeral: true,
                });
            case 'nightcore':
                const nightcoreState = toggleNightcore();
                return interaction.reply({
                    content: `🌙 Nightcore is now **${nightcoreState ? 'enabled' : 'disabled'}**.`,
                    ephemeral: true,
                });
            case 'vaporwave':
                const vaporwaveState = toggleVaporwave();
                return interaction.reply({
                    content: `💿 Vaporwave is now **${vaporwaveState ? 'enabled' : 'disabled'}**.`,
                    ephemeral: true,
                });
            }
            });

setInterval(() => {
    axios.post(`https://api.uptimerobot.com/v2/editMonitor`, {
        api_key: UPTIME_API_KEY,
        monitor_id: UPTIME_MONITOR_URL,
        status: 1,
    }).catch(console.error);
}, 300000); // every 5 min

client.login(process.env.DISCORD_TOKEN);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is alive!');
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});