const { SlashCommandBuilder } = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder().setName('서버').setDescription('서버 정보를 제공합니다.')),
	async execute(interaction) {
		await interaction.deferReply();

		// interaction.guild는 명령이 실행된 길드를 나타내는 객체입니다
		const owner = await interaction.guild.fetchOwner();
		await interaction.editReply(
			`현재 ${interaction.guild.name} 서버에 ${interaction.guild.memberCount}명의 멤버가 있습니다.\n` +
			`서버 이름: ${interaction.guild.name}\n` +
			`서버 주인: ${owner.user.username}\n` +
			`서버 창설일: ${interaction.guild.createdAt}\n` +
			`서버 아이콘: ${interaction.guild.iconURL() || '없음'}`,
		);
	},
};
