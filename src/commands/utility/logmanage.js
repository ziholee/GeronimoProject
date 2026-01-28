const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const { deleteUserLogs, deleteGuildLogs, deleteLogsByType, getLogStats, getAllGuildLogs } = require('../../storage/logStore');

const LOG_TYPE_NAMES = {
	MESSAGE_SEND: '메시지 전송',
	MESSAGE_EDIT: '메시지 수정',
	MESSAGE_DELETE: '메시지 삭제',
	MEMBER_JOIN: '서버 입장',
	MEMBER_LEAVE: '서버 퇴장',
	NICKNAME_CHANGE: '닉네임 변경',
	ROLE_CHANGE: '역할 변경',
	VOICE_JOIN: '음성 채널 입장',
	VOICE_LEAVE: '음성 채널 퇴장',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('로그관리')
		.setDescription('로그를 관리합니다. (관리자 전용)')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subcommand =>
			subcommand
				.setName('통계')
				.setDescription('로그 통계를 확인합니다.'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('삭제')
				.setDescription('로그를 삭제합니다.')
				.addStringOption(option =>
					option
						.setName('대상')
						.setDescription('삭제할 로그 대상')
						.setRequired(true)
						.addChoices(
							{ name: '사용자 로그', value: 'user' },
							{ name: '전체 서버 로그', value: 'guild' },
							{ name: '특정 타입 로그', value: 'type' },
						),
				)
				.addUserOption(option =>
					option
						.setName('사용자')
						.setDescription('로그를 삭제할 사용자 (사용자 로그 삭제 시 필요)')
						.setRequired(false),
				)
				.addStringOption(option =>
					option
						.setName('타입')
						.setDescription('삭제할 로그 타입 (특정 타입 삭제 시 필요)')
						.setRequired(false)
						.addChoices(
							{ name: '메시지 전송', value: 'MESSAGE_SEND' },
							{ name: '메시지 수정', value: 'MESSAGE_EDIT' },
							{ name: '메시지 삭제', value: 'MESSAGE_DELETE' },
							{ name: '서버 입장', value: 'MEMBER_JOIN' },
							{ name: '서버 퇴장', value: 'MEMBER_LEAVE' },
							{ name: '닉네임 변경', value: 'NICKNAME_CHANGE' },
							{ name: '역할 변경', value: 'ROLE_CHANGE' },
							{ name: '음성 채널 입장', value: 'VOICE_JOIN' },
							{ name: '음성 채널 퇴장', value: 'VOICE_LEAVE' },
						),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('내보내기')
				.setDescription('로그를 JSON 파일로 내보냅니다.')
				.addUserOption(option =>
					option
						.setName('사용자')
						.setDescription('특정 사용자의 로그만 내보내기 (선택사항)')
						.setRequired(false),
				)
				.addStringOption(option =>
					option
						.setName('타입')
						.setDescription('특정 타입의 로그만 내보내기 (선택사항)')
						.setRequired(false)
						.addChoices(
							{ name: '메시지 전송', value: 'MESSAGE_SEND' },
							{ name: '메시지 수정', value: 'MESSAGE_EDIT' },
							{ name: '메시지 삭제', value: 'MESSAGE_DELETE' },
							{ name: '서버 입장', value: 'MEMBER_JOIN' },
							{ name: '서버 퇴장', value: 'MEMBER_LEAVE' },
							{ name: '닉네임 변경', value: 'NICKNAME_CHANGE' },
							{ name: '역할 변경', value: 'ROLE_CHANGE' },
							{ name: '음성 채널 입장', value: 'VOICE_JOIN' },
							{ name: '음성 채널 퇴장', value: 'VOICE_LEAVE' },
						),
				),
		),
	async execute(interaction) {
		if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '이 명령어는 서버 관리자만 사용할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const guildId = interaction.guild.id;
		const subcommand = interaction.options.getSubcommand();

		try {
			if (subcommand === '통계') {
				const stats = getLogStats(guildId);

				const embed = new EmbedBuilder()
					.setColor(0x5865f2)
					.setTitle('📊 로그 통계')
					.setTimestamp();

				embed.addFields(
					{ name: '총 사용자 수', value: `${stats.totalUsers}명`, inline: true },
					{ name: '총 로그 수', value: `${stats.totalLogs}개`, inline: true },
				);

				if (Object.keys(stats.byType).length > 0) {
					const typeStats = Object.entries(stats.byType)
						.sort((a, b) => b[1] - a[1])
						.slice(0, 10)
						.map(([type, count]) => `${LOG_TYPE_NAMES[type] || type}: ${count}개`)
						.join('\n');

					embed.addFields({
						name: '타입별 통계 (상위 10개)',
						value: typeStats || '없음',
						inline: false,
					});
				}

				if (Object.keys(stats.byUser).length > 0) {
					const topUsers = Object.entries(stats.byUser)
						.sort((a, b) => b[1] - a[1])
						.slice(0, 10);

					const userStats = await Promise.all(
						topUsers.map(async ([userId, count]) => {
							const member = await interaction.guild.members.fetch(userId).catch(() => null);
							const name = member?.displayName || `<@${userId}>`;
							return `${name}: ${count}개`;
						}),
					);

					embed.addFields({
						name: '사용자별 통계 (상위 10명)',
						value: userStats.join('\n') || '없음',
						inline: false,
					});
				}

				await interaction.reply({
					embeds: [embed],
					flags: MessageFlags.Ephemeral,
				});
			}
			else if (subcommand === '삭제') {
				const target = interaction.options.getString('대상');

				if (target === 'user') {
					const user = interaction.options.getUser('사용자');
					if (!user) {
						return interaction.reply({
							content: '사용자를 지정해주세요.',
							flags: MessageFlags.Ephemeral,
						});
					}

					const deleted = deleteUserLogs(guildId, user.id);
					if (deleted) {
						await interaction.reply({
							content: `✅ ${user}님의 로그가 삭제되었습니다.`,
							flags: MessageFlags.Ephemeral,
						});
					}
					else {
						await interaction.reply({
							content: `${user}님의 로그가 없습니다.`,
							flags: MessageFlags.Ephemeral,
						});
					}
				}
				else if (target === 'guild') {
					const deleted = deleteGuildLogs(guildId);
					if (deleted) {
						await interaction.reply({
							content: '✅ 서버의 모든 로그가 삭제되었습니다.',
							flags: MessageFlags.Ephemeral,
						});
					}
					else {
						await interaction.reply({
							content: '삭제할 로그가 없습니다.',
							flags: MessageFlags.Ephemeral,
						});
					}
				}
				else if (target === 'type') {
					const logType = interaction.options.getString('타입');
					if (!logType) {
						return interaction.reply({
							content: '로그 타입을 지정해주세요.',
							flags: MessageFlags.Ephemeral,
						});
					}

					const deleted = deleteLogsByType(guildId, logType);
					if (deleted) {
						await interaction.reply({
							content: `✅ ${LOG_TYPE_NAMES[logType] || logType} 타입의 로그가 삭제되었습니다.`,
							flags: MessageFlags.Ephemeral,
						});
					}
					else {
						await interaction.reply({
							content: '삭제할 로그가 없습니다.',
							flags: MessageFlags.Ephemeral,
						});
					}
				}
			}
			else if (subcommand === '내보내기') {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				const targetUser = interaction.options.getUser('사용자');
				const logType = interaction.options.getString('타입');

				let logs;
				if (targetUser) {
					const { getUserLogs } = require('../../storage/logStore');
					logs = getUserLogs(guildId, targetUser.id, { type: logType });
					logs = logs.map(log => ({ userId: targetUser.id, ...log }));
				}
				else {
					logs = getAllGuildLogs(guildId, { type: logType });
				}

				if (logs.length === 0) {
					return interaction.editReply({
						content: '내보낼 로그가 없습니다.',
					});
				}

				const jsonData = JSON.stringify(logs, null, 2);
				const buffer = Buffer.from(jsonData, 'utf-8');
				const attachment = new AttachmentBuilder(buffer, {
					name: `logs_${guildId}_${Date.now()}.json`,
				});

				await interaction.editReply({
					content: `✅ ${logs.length}개의 로그를 내보냈습니다.`,
					files: [attachment],
				});
			}
		}
		catch (error) {
			console.error('로그 관리 오류:', error);
			await interaction.reply({
				content: `❌ 로그 관리 중 오류가 발생했습니다: ${error.message}`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
