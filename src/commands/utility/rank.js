const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLevelData } = require('../../storage/levelStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('랭킹')
		.setDescription('서버 내 레벨/XP 상위 10명의 랭킹을 확인합니다.'),
	async execute(interaction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: '이 명령어는 서버에서만 사용할 수 있습니다.',
				ephemeral: true,
			});
		}

		const client = interaction.client;
		// 서버 재시작 등으로 메모리가 비었을 수 있으니 파일에서 한 번 보정 로드
		client.levelData = client.levelData || loadLevelData();

		const guildId = interaction.guild.id;
		const guildMap = client.levelData.get(guildId);

		if (!guildMap || guildMap.size === 0) {
			return interaction.reply({
				content: '아직 레벨 데이터가 없습니다.',
				ephemeral: true,
			});
		}

		const limit = 10;

		const membersData = Array.from(guildMap.entries()).map(([userId, data]) => ({
			userId,
			level: data.level,
			xp: data.xp,
		}));

		// 레벨 우선, 동일 레벨이면 XP 많은 순
		membersData.sort((a, b) => {
			if (b.level !== a.level) return b.level - a.level;
			return b.xp - a.xp;
		});

		const top = membersData.slice(0, limit);

		const lines = await Promise.all(
			top.map(async (entry, index) => {
				const member = await interaction.guild.members
					.fetch(entry.userId)
					.catch(() => null);
				const name = member?.displayName || `<@${entry.userId}>`;
				return `**${index + 1}위** - ${name} : 레벨 **${entry.level}**, XP **${entry.xp}**`;
			}),
		);

		const embed = new EmbedBuilder()
			.setColor(0xf1c40f)
			.setTitle(`🏆 ${interaction.guild.name} 레벨 랭킹 TOP ${top.length}`)
			.setDescription(lines.join('\n'))
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};


