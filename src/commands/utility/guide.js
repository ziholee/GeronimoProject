const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

const DISMISS_PREFIX = 'guide_dismiss';
const RUNTIME_PERMISSION_COMMANDS = {
	음성채널설정: PermissionFlagsBits.Administrator,
};

const GUIDE_SECTIONS = [
	{
		title: '기본 안내',
		names: ['가이드', '핑', '서버', '사용자', '밈'],
	},
	{
		title: '레벨',
		names: ['레벨', '랭킹', '레벨설정'],
	},
	{
		title: '로그',
		names: ['로그조회', '로그관리'],
	},
	{
		title: '음성 채널',
		names: ['음성채널설정', '채널이름변경', '채널인원제한', '채널비공개'],
	},
	{
		title: '커뮤니티',
		names: ['투표', '게이브어웨이', '환영메시지', '파티생성', '반응역할생성'],
	},
];

function summarizeOptions(command) {
	const options = command.data.options ?? [];
	const subcommands = options.filter(option => option.type === 1);

	if (subcommands.length > 0) {
		return `서브커맨드: ${subcommands.map(option => option.name).join(', ')}`;
	}

	const requiredOptions = options
		.filter(option => option.required)
		.map(option => option.name);

	if (requiredOptions.length > 0) {
		return `필수 옵션: ${requiredOptions.join(', ')}`;
	}

	return '추가 옵션 없이 바로 실행 가능';
}

function formatCommandLine(command) {
	const label = isRestrictedCommand(command) ? ' [관리자/권한 필요]' : '';
	return [
		`/${command.data.name}${label}: ${command.data.description}`,
		summarizeOptions(command),
	].join('\n');
}

function buildSectionValue(commands) {
	return commands.map(formatCommandLine).join('\n\n');
}

function getCommandRequiredPermissions(command) {
	const runtimePermission = RUNTIME_PERMISSION_COMMANDS[command.data.name];
	if (runtimePermission) {
		return runtimePermission;
	}

	const json = command.data.toJSON();
	if (!json.default_member_permissions) {
		return null;
	}

	return BigInt(json.default_member_permissions);
}

function isRestrictedCommand(command) {
	return getCommandRequiredPermissions(command) !== null;
}

function canSeeCommand(command, memberPermissions) {
	const requiredPermissions = getCommandRequiredPermissions(command);
	if (!requiredPermissions) {
		return true;
	}

	if (memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		return true;
	}

	return memberPermissions?.has(requiredPermissions) ?? false;
}

function getVisibleCommands(commands, memberPermissions) {
	return new Map(
		[...commands.entries()].filter(([, command]) => canSeeCommand(command, memberPermissions)),
	);
}

function buildGuideFields(commands, memberPermissions = null) {
	const visibleCommands = getVisibleCommands(commands, memberPermissions);
	const categorizedNames = new Set();
	const fields = GUIDE_SECTIONS
		.map(section => {
			const sectionCommands = section.names
				.map(name => visibleCommands.get(name))
				.filter(Boolean);

			for (const command of sectionCommands) {
				categorizedNames.add(command.data.name);
			}

			if (sectionCommands.length === 0) {
				return null;
			}

			return {
				name: section.title,
				value: buildSectionValue(sectionCommands),
				inline: false,
			};
		})
		.filter(Boolean);

	const uncategorizedCommands = [...visibleCommands.values()]
		.filter(command => !categorizedNames.has(command.data.name))
		.sort((a, b) => a.data.name.localeCompare(b.data.name, 'ko'));

	if (uncategorizedCommands.length > 0) {
		fields.push({
			name: '기타',
			value: buildSectionValue(uncategorizedCommands),
			inline: false,
		});
	}

	return fields;
}

function buildDismissRow(userId) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`${DISMISS_PREFIX}:${userId}`)
			.setLabel('가이드 닫기')
			.setStyle(ButtonStyle.Secondary),
	);
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('가이드')
		.setDescription('현재 사용 가능한 봇 명령어 가이드를 제공합니다.')),
	async execute(interaction) {
		const commands = interaction.client.commands;
		const memberPermissions = interaction.memberPermissions ?? interaction.member?.permissions ?? null;
		const fields = buildGuideFields(commands, memberPermissions);
		const visibleCommandCount = getVisibleCommands(commands, memberPermissions).size;
		const canSeeRestricted = visibleCommandCount !== commands.size
			? '내 권한으로 사용할 수 있는 명령어만 표시합니다.'
			: '관리자/권한 필요 명령어까지 모두 표시합니다.';

		const guideEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('봇 사용 가이드')
			.setDescription([
				'현재 등록된 슬래시 명령어를 기준으로 안내합니다.',
				'명령어는 채팅창에 `/`를 입력한 뒤 선택해서 사용할 수 있습니다.',
				canSeeRestricted,
			].join('\n'))
			.addFields(fields)
			.setFooter({ text: `표시 ${visibleCommandCount}개 / 전체 ${commands.size}개` })
			.setTimestamp();

		await interaction.reply({
			embeds: [guideEmbed],
			components: [buildDismissRow(interaction.user.id)],
			flags: MessageFlags.Ephemeral,
		});
	},
	async handleButtonInteraction(interaction) {
		if (!interaction.customId.startsWith(`${DISMISS_PREFIX}:`)) {
			return false;
		}

		const [, userId] = interaction.customId.split(':');
		if (userId !== interaction.user.id) {
			await interaction.reply({
				content: '이 가이드는 명령어를 실행한 사용자만 닫을 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		await interaction.deferUpdate();
		if (typeof interaction.deleteReply === 'function') {
			await interaction.deleteReply().catch(async () => {
				await interaction.editReply({
					content: '가이드를 닫았습니다.',
					embeds: [],
					components: [],
				});
			});
			return true;
		}

		await interaction.editReply({
			content: '가이드를 닫았습니다.',
			embeds: [],
			components: [],
		});
		return true;
	},
	buildGuideFields,
	canSeeCommand,
	getVisibleCommands,
};
