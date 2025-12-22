const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, getRequiredXpForLevel } = require('../../storage/levelStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('레벨')
		.setDescription('자신 또는 다른 사용자의 레벨과 경험치를 확인합니다.')
		.addUserOption(option =>
			option
				.setName('대상')
				.setDescription('레벨을 확인할 사용자')
				.setRequired(false),
		),
	async execute(interaction) {
		if (!interaction.guild) {
			return interaction.reply({ content: '이 명령어는 서버에서만 사용할 수 있습니다.', ephemeral: true });
		}

		const client = interaction.client;
		client.levelData = client.levelData || new Map();

		const targetUser = interaction.options.getUser('대상') || interaction.user;
		const guildId = interaction.guild.id;
		const userId = targetUser.id;

		const userData = getUserData(client.levelData, guildId, userId);
		const requiredXp = getRequiredXpForLevel(userData.level);

		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle(`📊 ${targetUser.username}님의 레벨 정보`)
			.setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
			.addFields(
				{ name: '레벨', value: `${userData.level}`, inline: true },
				{ name: '현재 XP', value: `${userData.xp} / ${requiredXp}`, inline: true },
			)
			.setFooter({ text: interaction.guild.name })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};


