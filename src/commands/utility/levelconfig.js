const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadLevelConfig, saveLevelConfig } = require('../../storage/levelStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('레벨설정')
		.setDescription('레벨/XP 시스템 설정을 관리합니다. (관리자 전용)')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subcommand =>
			subcommand
				.setName('쿨타임')
				.setDescription('XP 획득 쿨타임을 설정합니다.')
				.addIntegerOption(option =>
					option
						.setName('초')
						.setDescription('메시지당 XP를 다시 받을 수 있는 쿨타임(초)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('알림채널')
				.setDescription('레벨업 알림을 보낼 채널을 설정합니다.')
				.addChannelOption(option =>
					option
						.setName('채널')
						.setDescription('레벨업 알림을 보낼 텍스트 채널 (비워두면 현재 채널 사용)')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('알림토글')
				.setDescription('레벨업 알림을 켜거나 끕니다.')
				.addBooleanOption(option =>
					option
						.setName('사용')
						.setDescription('true: 켜기, false: 끄기')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('확인')
				.setDescription('현재 레벨 시스템 설정을 확인합니다.'),
		),
	async execute(interaction) {
		if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '이 명령어는 서버 관리자만 사용할 수 있습니다.',
				ephemeral: true,
			});
		}

		const client = interaction.client;
		client.levelConfig = client.levelConfig || loadLevelConfig();

		const guildId = interaction.guild.id;
		const subcommand = interaction.options.getSubcommand();
		const config = client.levelConfig.get(guildId) || {
			cooldownMs: 60_000,
			levelUpNotice: true,
			levelUpChannelId: null,
		};

		if (subcommand === '쿨타임') {
			const seconds = interaction.options.getInteger('초');
			if (seconds <= 0) {
				return interaction.reply({
					content: '쿨타임은 1초 이상이어야 합니다.',
					ephemeral: true,
				});
			}

			config.cooldownMs = seconds * 1000;
			client.levelConfig.set(guildId, config);
			saveLevelConfig(client.levelConfig);

			return interaction.reply({
				content: `XP 획득 쿨타임이 **${seconds}초**로 설정되었습니다.`,
				ephemeral: true,
			});
		}

		if (subcommand === '알림채널') {
			const channel = interaction.options.getChannel('채널');
			if (!channel) {
				// null 설정: 알림을 발생한 채널에 보냄
				config.levelUpChannelId = null;
			}
			else {
				if (!channel.isTextBased()) {
					return interaction.reply({
						content: '텍스트 채널만 설정할 수 있습니다.',
						ephemeral: true,
					});
				}
				config.levelUpChannelId = channel.id;
			}

			client.levelConfig.set(guildId, config);
			saveLevelConfig(client.levelConfig);

			return interaction.reply({
				content: channel
					? `레벨업 알림 채널이 ${channel} 로 설정되었습니다.`
					: '레벨업 알림 채널이 초기화되었습니다. (레벨업이 발생한 채널에 알림이 전송됩니다.)',
				ephemeral: true,
			});
		}

		if (subcommand === '알림토글') {
			const enabled = interaction.options.getBoolean('사용');
			config.levelUpNotice = enabled;
			client.levelConfig.set(guildId, config);
			saveLevelConfig(client.levelConfig);

			return interaction.reply({
				content: `레벨업 알림이 **${enabled ? '활성화' : '비활성화'}**되었습니다.`,
				ephemeral: true,
			});
		}

		if (subcommand === '확인') {
			const cooldownSeconds = Math.floor((config.cooldownMs ?? 60_000) / 1000);
			const channel =
				config.levelUpChannelId &&
				interaction.guild.channels.cache.get(config.levelUpChannelId);

			const embed = new EmbedBuilder()
				.setColor(0x3498db)
				.setTitle('레벨 시스템 설정')
				.addFields(
					{
						name: 'XP 쿨타임',
						value: `${cooldownSeconds}초`,
						inline: true,
					},
					{
						name: '레벨업 알림',
						value: config.levelUpNotice === false ? '비활성화' : '활성화',
						inline: true,
					},
					{
						name: '알림 채널',
						value: channel ? channel.toString() : '레벨업이 발생한 채널',
						inline: false,
					},
				)
				.setTimestamp();

			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
	},
};


