const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('사용자').setDescription('사용자 정보를 제공합니다.'),
	async execute(interaction) {
		// interaction.user는 명령을 실행한 사용자를 나타내는 객체입니다
		// interaction.member는 특정 길드에서 사용자를 나타내는 GuildMember 객체입니다
		if (!interaction.member) {
			await interaction.reply('이 명령어는 서버에서만 사용할 수 있습니다.');
			return;
		}
		await interaction.reply(
			`${interaction.user.username}님의 ${interaction.guild.name} 서버 가입 날짜는 ${interaction.member.joinedAt}입니다.`,
		);
	},
};