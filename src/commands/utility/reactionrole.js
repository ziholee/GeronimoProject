const {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');
const {
	addReactionRole,
	buildReactionRoleEmbed,
	deleteReactionRole,
	parseEmojiInput,
	parseRoleId,
} = require('../../services/reactionRoleService');

const MODAL_PREFIX = 'reaction_role_create';
const SUPPORTED_MODE = 'toggle';

function hasManageRolePermission(interaction) {
	return interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)
		|| interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function getBotMember(guild) {
	return guild.members.me ?? guild.members.fetchMe().catch(() => null);
}

async function resolveRole(interaction, roleInput) {
	const roleId = parseRoleId(roleInput);
	if (!roleId) {
		return { error: '역할은 역할 멘션 또는 역할 ID로 입력해주세요.' };
	}

	if (roleId === interaction.guild.id) {
		return { error: '`@everyone` 역할은 반응 역할 대상으로 사용할 수 없습니다.' };
	}

	const role = interaction.guild.roles.cache.get(roleId)
		?? await interaction.guild.roles.fetch(roleId).catch(() => null);
	if (!role) {
		return { error: '입력한 역할을 서버에서 찾을 수 없습니다.' };
	}

	if (role.managed) {
		return { error: '봇/연동 서비스가 관리하는 역할은 수동으로 부여할 수 없습니다.' };
	}

	const botMember = await getBotMember(interaction.guild);
	if (!botMember) {
		return { error: '봇의 서버 멤버 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' };
	}

	if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
		return { error: '반응 역할을 사용하려면 봇에 `역할 관리` 권한이 필요합니다.' };
	}

	if (botMember.roles.highest.comparePositionTo(role) <= 0) {
		return { error: '봇의 최고 역할이 부여하려는 역할보다 위에 있어야 합니다.' };
	}

	return { role, botMember };
}

async function createReactionRoleFromInput(interaction, values) {
	if (!hasManageRolePermission(interaction)) {
		await interaction.reply({
			content: '반응 역할은 `역할 관리` 권한이 있는 사용자만 생성할 수 있습니다.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const title = values.title.trim();
	const description = values.description.trim();
	const emojiConfig = parseEmojiInput(values.emojiInput);
	const mode = values.modeInput.trim().toLowerCase() || SUPPORTED_MODE;

	if (!emojiConfig) {
		await interaction.reply({
			content: '이모지를 입력해주세요. 일반 이모지 또는 `<:name:id>` 형식을 사용할 수 있습니다.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (mode !== SUPPORTED_MODE) {
		await interaction.reply({
			content: '현재 지원하는 동작 방식은 `toggle`입니다.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const roleResult = await resolveRole(interaction, values.roleInput);
	if (roleResult.error) {
		await interaction.reply({
			content: roleResult.error,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const { role, botMember } = roleResult;
	const requiredChannelPermissions = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.ReadMessageHistory,
	];

	if (!interaction.channel?.permissionsFor(botMember)?.has(requiredChannelPermissions)) {
		await interaction.reply({
			content: '현재 채널에서 반응 역할 메시지를 만들 권한이 부족합니다. `메시지 보내기`, `임베드 링크`, `반응 추가`, `메시지 기록 읽기` 권한을 확인해주세요.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const pendingConfig = {
		guildId: interaction.guild.id,
		channelId: interaction.channel.id,
		messageId: '0',
		emoji: emojiConfig.emoji,
		emojiId: emojiConfig.emojiId,
		emojiName: emojiConfig.emojiName,
		roleId: role.id,
		title,
		description,
		mode,
		createdBy: interaction.user.id,
		createdAt: Date.now(),
	};

	let reactionRoleMessage;
	try {
		reactionRoleMessage = await interaction.channel.send({
			embeds: [buildReactionRoleEmbed(pendingConfig, role)],
		});

		const config = addReactionRole(interaction.client, {
			...pendingConfig,
			messageId: reactionRoleMessage.id,
		});

		await reactionRoleMessage.react(config.emoji);
	}
	catch (error) {
		console.error('반응 역할 메시지 생성 실패:', error);
		if (reactionRoleMessage) {
			deleteReactionRole(interaction.client, reactionRoleMessage.id);
		}

		await interaction.reply({
			content: '반응 역할 메시지를 생성하는 중 오류가 발생했습니다. 이모지 접근 권한과 봇 권한을 확인해주세요.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.reply({
		content: [
			'반응 역할 메시지를 생성했습니다.',
			`역할: <@&${role.id}>`,
			`메시지: ${reactionRoleMessage.url}`,
		].join('\n'),
		flags: MessageFlags.Ephemeral,
	});
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('반응역할생성')
		.setDescription('모달로 이모지 반응 역할 메시지를 생성합니다.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)),
	async execute(interaction) {
		if (!hasManageRolePermission(interaction)) {
			await interaction.reply({
				content: '반응 역할은 `역할 관리` 권한이 있는 사용자만 생성할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const modal = new ModalBuilder()
			.setCustomId(`${MODAL_PREFIX}:${interaction.user.id}`)
			.setTitle('반응 역할 생성');

		const titleInput = new TextInputBuilder()
			.setCustomId('title')
			.setLabel('제목')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('예: 게임 알림 역할')
			.setRequired(true)
			.setMaxLength(100);

		const descriptionInput = new TextInputBuilder()
			.setCustomId('description')
			.setLabel('설명')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('아래 이모지를 누르면 알림 역할을 받을 수 있습니다.')
			.setRequired(false)
			.setMaxLength(500);

		const emojiInput = new TextInputBuilder()
			.setCustomId('emoji')
			.setLabel('이모지')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('예: 🎮 또는 <:name:id>')
			.setRequired(true)
			.setMaxLength(100);

		const roleInput = new TextInputBuilder()
			.setCustomId('role')
			.setLabel('역할')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('역할 멘션 또는 역할 ID')
			.setRequired(true)
			.setMaxLength(100);

		const modeInput = new TextInputBuilder()
			.setCustomId('mode')
			.setLabel('동작 방식')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('기본값: toggle')
			.setRequired(false)
			.setMaxLength(20);

		modal.addComponents(
			new ActionRowBuilder().addComponents(titleInput),
			new ActionRowBuilder().addComponents(descriptionInput),
			new ActionRowBuilder().addComponents(emojiInput),
			new ActionRowBuilder().addComponents(roleInput),
			new ActionRowBuilder().addComponents(modeInput),
		);

		await interaction.showModal(modal);
	},
	async handleModalSubmit(interaction) {
		if (!interaction.customId.startsWith(`${MODAL_PREFIX}:`)) {
			return false;
		}

		const [, userId] = interaction.customId.split(':');
		if (userId !== interaction.user.id) {
			await interaction.reply({
				content: '이 반응 역할 생성 모달은 실행한 사용자만 제출할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (!interaction.inGuild()) {
			await interaction.reply({
				content: '이 명령어는 서버에서만 사용할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		await createReactionRoleFromInput(interaction, {
			title: interaction.fields.getTextInputValue('title'),
			description: interaction.fields.getTextInputValue('description') || '',
			emojiInput: interaction.fields.getTextInputValue('emoji'),
			roleInput: interaction.fields.getTextInputValue('role'),
			modeInput: interaction.fields.getTextInputValue('mode') || '',
		});
		return true;
	},
};
