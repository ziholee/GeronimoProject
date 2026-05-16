const { SlashCommandBuilder } = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder().setName('사용자').setDescription('사용자 정보를 제공합니다.')),
	async execute(interaction) {
		await interaction.reply(
			`${interaction.user.username}님의 ${interaction.guild.name} 서버 가입 날짜는 ${interaction.member.joinedAt}입니다.`,
		);
	},
};
