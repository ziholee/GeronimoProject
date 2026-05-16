const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserLogs, getAllGuildLogs } = require('../../storage/logStore');
const { guildOnlyCommand } = require('../../utils/commandContext');

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

function formatLogEntry(log) {
	const date = new Date(log.timestamp);
	const dateStr = date.toLocaleString('ko-KR');
	let description = `**타입:** ${LOG_TYPE_NAMES[log.type] || log.type}\n**시간:** ${dateStr}\n`;

	if (log.type === 'MESSAGE_SEND' || log.type === 'MESSAGE_EDIT' || log.type === 'MESSAGE_DELETE') {
		description += `**채널:** ${log.data.channelName || log.data.channelId}\n`;
		if (log.data.content) {
			description += `**내용:** ${log.data.content.substring(0, 200)}${log.data.content.length > 200 ? '...' : ''}\n`;
		}
		if (log.type === 'MESSAGE_EDIT' && log.data.oldContent) {
			description += `**이전 내용:** ${log.data.oldContent.substring(0, 100)}${log.data.oldContent.length > 100 ? '...' : ''}\n`;
		}
	}
	else if (log.type === 'NICKNAME_CHANGE') {
		description += `**이전 닉네임:** ${log.data.oldNickname || '없음'}\n`;
		description += `**새 닉네임:** ${log.data.newNickname || '없음'}\n`;
	}
	else if (log.type === 'ROLE_CHANGE') {
		if (log.data.addedRoles?.length > 0) {
			description += `**추가된 역할:** ${log.data.addedRoles.map(r => r.name).join(', ')}\n`;
		}
		if (log.data.removedRoles?.length > 0) {
			description += `**제거된 역할:** ${log.data.removedRoles.map(r => r.name).join(', ')}\n`;
		}
	}
	else if (log.type === 'VOICE_JOIN' || log.type === 'VOICE_LEAVE') {
		description += `**채널:** ${log.data.channelName || log.data.channelId}\n`;
	}
	else if (log.type === 'MEMBER_JOIN' || log.type === 'MEMBER_LEAVE') {
		description += `**사용자명:** ${log.data.username}\n`;
		if (log.data.displayName) {
			description += `**표시명:** ${log.data.displayName}\n`;
		}
	}

	return description;
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('로그조회')
		.setDescription('사용자 활동 로그를 조회합니다. (관리자 전용)')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subcommand =>
			subcommand
				.setName('사용자')
				.setDescription('특정 사용자의 로그를 조회합니다.')
				.addUserOption(option =>
					option
						.setName('사용자')
						.setDescription('로그를 조회할 사용자')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('타입')
						.setDescription('로그 타입 필터')
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
				)
				.addIntegerOption(option =>
					option
						.setName('개수')
						.setDescription('조회할 로그 개수 (기본값: 10, 최대: 50)')
						.setRequired(false)
						.setMinValue(1)
						.setMaxValue(50),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('전체')
				.setDescription('서버의 모든 로그를 조회합니다.')
				.addStringOption(option =>
					option
						.setName('타입')
						.setDescription('로그 타입 필터')
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
				)
				.addIntegerOption(option =>
					option
						.setName('개수')
						.setDescription('조회할 로그 개수 (기본값: 20, 최대: 100)')
						.setRequired(false)
						.setMinValue(1)
						.setMaxValue(100),
				),
		)),
	async execute(interaction) {
		if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '이 명령어는 서버 관리자만 사용할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const guildId = interaction.guild.id;
		const subcommand = interaction.options.getSubcommand();
		const logType = interaction.options.getString('타입');
		const limit = interaction.options.getInteger('개수') || (subcommand === '사용자' ? 10 : 20);

		try {
			if (subcommand === '사용자') {
				const targetUser = interaction.options.getUser('사용자');
				const logs = getUserLogs(guildId, targetUser.id, {
					type: logType,
					limit,
				});

				if (logs.length === 0) {
					return interaction.reply({
						content: `${targetUser}님의 로그가 없습니다.`,
						flags: MessageFlags.Ephemeral,
					});
				}

				const embed = new EmbedBuilder()
					.setColor(0x5865f2)
					.setTitle(`📋 ${targetUser.username}님의 활동 로그`)
					.setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
					.setFooter({ text: `총 ${logs.length}개의 로그` })
					.setTimestamp();

				const fields = logs.slice(0, 10).map((log, index) => ({
					name: `#${logs.length - index}`,
					value: formatLogEntry(log),
					inline: false,
				}));

				embed.addFields(fields);

				if (logs.length > 10) {
					embed.setDescription(`최근 10개만 표시됩니다. (전체: ${logs.length}개)`);
				}

				await interaction.reply({
					embeds: [embed],
					flags: MessageFlags.Ephemeral,
				});
			}
			else if (subcommand === '전체') {
				const logs = getAllGuildLogs(guildId, {
					type: logType,
					limit,
				});

				if (logs.length === 0) {
					return interaction.reply({
						content: '서버에 로그가 없습니다.',
						flags: MessageFlags.Ephemeral,
					});
				}

				const embed = new EmbedBuilder()
					.setColor(0x5865f2)
					.setTitle('📋 서버 활동 로그')
					.setFooter({ text: `총 ${logs.length}개의 로그` })
					.setTimestamp();

				const descriptionParts = [];
				for (let i = 0; i < Math.min(logs.length, 15); i++) {
					const log = logs[i];
					const user = await interaction.guild.members.fetch(log.userId).catch(() => null);
					const userName = user?.displayName || `<@${log.userId}>`;
					const date = new Date(log.timestamp);
					const dateStr = date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
					descriptionParts.push(`**${i + 1}.** ${userName} - ${LOG_TYPE_NAMES[log.type] || log.type} (${dateStr})`);
				}

				embed.setDescription(descriptionParts.join('\n'));

				if (logs.length > 15) {
					embed.setFooter({ text: `최근 15개만 표시됩니다. (전체: ${logs.length}개)` });
				}

				await interaction.reply({
					embeds: [embed],
					flags: MessageFlags.Ephemeral,
				});
			}
		}
		catch (error) {
			console.error('로그 조회 오류:', error);
			await interaction.reply({
				content: `❌ 로그 조회 중 오류가 발생했습니다: ${error.message}`,
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
