const { Events } = require('discord.js');
const { startPartyScheduler } = require('../services/schedulerService');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		startPartyScheduler(client);
		console.log(`준비 완료! ${client.user.tag}로 로그인했습니다.`);
	},
};
