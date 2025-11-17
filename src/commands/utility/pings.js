const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('핑').setDescription('봇 상태를 확인합니다.'),
	async execute(interaction) {
		await interaction.reply(`퐁이다, 이자식아!\n퐁: ${interaction.client.ws.ping}ms`);
	},
};