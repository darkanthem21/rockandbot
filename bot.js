require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const axios = require('axios');
const stations = JSON.parse(fs.readFileSync('./stations.json', 'utf8'));
const sodium = require('libsodium-wrappers');

(async () => {
  await sodium.ready;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on('messageCreate', async message => {
    if (message.content.startsWith('!radio')) {
      const args = message.content.split(' ');
      const stationName = args[1];

      if (!stationName) {
        const stationList = stations.map(station => station.name).join('\n');
        message.reply(`Estaciones de radio disponibles:\n${stationList}`);
        return;
      }

      const station = stations.find(s => s.name.toLowerCase() === stationName.toLowerCase());
      if (!station) {
        message.reply('Estación de radio no encontrada.');
        return;
      }

      if (message.member.voice.channel) {
        const connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        const response = await axios({
          url: station.url,
          method: 'GET',
          responseType: 'stream'
        });

        const resource = createAudioResource(response.data);
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
          connection.destroy();
        });

        message.reply(`Reproduciendo ${station.name}`);
      } else {
        message.reply('¡Debes estar en un canal de voz para reproducir la radio!');
      }
    }
  });

  client.login(process.env.DISCORD_BOT_TOKEN);
})();
