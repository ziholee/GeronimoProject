const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const { riotApiKey } = require('../../config.json');

client.on('messageCreate', async (message) => {
	if (message.content.startsWith('!상점 ')) {
		const summonerName = message.content.split(' ')[1];
		try {
			// 1. 소환사 정보 조회
			const summonerRes = await axios.get(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`, {
				headers: { 'X-Riot-Token': riotApiKey },
			});

			const encryptedId = summonerRes.data.id;

			// 2. 상점 정보(API 예시 - 실제 지원되는 API 확인 필요)
			const shopRes = await axios.get(`https://kr.api.riotgames.com/some/store/endpoint/${encryptedId}`, {
				headers: { 'X-Riot-Token': riotApiKey },
			});

			// 3. 임베드 생성
			const embed = new EmbedBuilder()
				.setTitle(`${summonerName}의 라이엇 상점`)
				.setColor(0xff4654);

			shopRes.data.items.forEach(item => {
				embed.addFields({ name: item.name, value: `가격: ${item.price} RP`, inline: true });
			});

			await message.channel.send({ embeds: [embed] });
		}
		catch (error) {
			console.error(error);
			message.channel.send('라이엇 API 호출 중 오류가 발생했습니다.');
		}
	}
});

client.login(token);
