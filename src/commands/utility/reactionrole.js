const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	RoleSelectMenuBuilder,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
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
	REACTION_ROLE_MODES,
} = require('../../services/reactionRoleService');

const MODAL_PREFIX = 'reaction_role_create';
const SERVER_EMOJI_SELECT_PREFIX = 'reaction_role_server_emoji';
const COMMON_EMOJI_SELECT_PREFIX = 'reaction_role_common_emoji';
const ADDITIONAL_ROLE_SELECT_PREFIX = 'reaction_role_additional_roles';
const MANUAL_EMOJI_BUTTON_PREFIX = 'reaction_role_manual_emoji';
const DETAILS_BUTTON_PREFIX = 'reaction_role_details';
const EMOJI_MODAL_PREFIX = 'reaction_role_assign_emoji';
const SETUP_TTL_MS = 15 * 60 * 1000;
const MAX_REACTION_ROLE_COUNT = 10;

const COMMON_EMOJI_OPTIONS = [
	{ label: '확인', value: '✅', aliases: ['check', 'confirm', 'verified', 'verify', 'agree', 'yes', 'ok'] },
	{ label: '공지', value: '📢', aliases: ['notice', 'announce', 'announcement', 'alarm', 'alert'] },
	{ label: '알림', value: '🔔', aliases: ['notification', 'notify', 'alarm', 'bell', 'alert'] },
	{ label: '이벤트', value: '🎉', aliases: ['event', 'party', 'celebrate', 'celebration', 'festival'] },
	{ label: '대회/수상', value: '🏆', aliases: ['contest', 'trophy', 'award', 'winner', 'hackathon'] },
	{ label: '스터디', value: '📚', aliases: ['study', 'book', 'books', 'learn'] },
	{ label: 'AI', value: '🤖', aliases: ['ai', 'bot', 'robot'] },
	{ label: '프론트엔드', value: '💻', aliases: ['frontend', 'front', 'web', 'client'] },
	{ label: '백엔드', value: '🛠️', aliases: ['backend', 'back', 'server', 'api'] },
	{ label: '디자인', value: '🎨', aliases: ['design', 'art', 'paint', 'planning'] },
	{ label: '게임', value: '🎮', aliases: ['game', 'gaming', 'play'] },
	{ label: '음악', value: '🎵', aliases: ['music', 'song', 'sound', 'audio'] },
	{ label: '영화/애니', value: '🎬', aliases: ['movie', 'film', 'anime', 'watch'] },
	{ label: '음성채팅', value: '🎙️', aliases: ['voice', 'mic', 'microphone', 'talk'] },
	{ label: '채팅', value: '💬', aliases: ['chat', 'talk', 'message', 'community'] },
	{ label: '하트', value: '❤️', aliases: ['heart', 'love', 'like'] },
	{ label: '즐겨찾기', value: '⭐', aliases: ['star', 'favorite', 'fav'] },
	{ label: '인기/핫', value: '🔥', aliases: ['hot', 'fire', 'popular', 'trend'] },
	{ label: '웃음', value: '😂', aliases: ['fun', 'funny', 'laugh', 'meme'] },
	{ label: '빨강', value: '🔴', aliases: ['red', 'ruby'] },
	{ label: '파랑', value: '🔵', aliases: ['blue', 'sapphire'] },
	{ label: '초록', value: '🟢', aliases: ['green', 'emerald'] },
	{ label: '알림 해제', value: '🔕', aliases: ['mute', 'silent', 'unsubscribe', 'noalarm'] },
	{ label: '취소/제거', value: '❌', aliases: ['cancel', 'remove', 'delete', 'no', 'x'] },
	{ label: '차단/제외', value: '🚫', aliases: ['block', 'ban', 'deny', 'exclude'] },
];

const MODE_ALIASES = new Map([
	['normal', 'normal'],
	['일반', 'normal'],
	['once', 'once'],
	['1회', 'once'],
	['일회성', 'once'],
	['인증', 'once'],
	['remove', 'remove'],
	['제거', 'remove'],
	['toggle', 'toggle'],
	['토글', 'toggle'],
	['단일', 'toggle'],
]);

function ensureSetupStore(client) {
	if (!client.reactionRoleSetups) {
		client.reactionRoleSetups = new Map();
	}
	return client.reactionRoleSetups;
}

function getSetup(interaction, setupId) {
	return ensureSetupStore(interaction.client).get(setupId);
}

function deleteSetup(interaction, setupId) {
	ensureSetupStore(interaction.client).delete(setupId);
}

function saveSetup(interaction, setup) {
	ensureSetupStore(interaction.client).set(setup.id, setup);
	setTimeout(() => {
		interaction.client.reactionRoleSetups?.delete(setup.id);
	}, SETUP_TTL_MS).unref?.();
}

function hasManageRolePermission(interaction) {
	return interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)
		|| interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function getBotMember(guild) {
	return guild.members.me ?? guild.members.fetchMe().catch(() => null);
}

async function getTargetChannel(interaction, channelId) {
	const channel = interaction.guild.channels.cache.get(channelId)
		?? await interaction.guild.channels.fetch(channelId).catch(() => null);

	if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
		return { error: '반응 역할 메시지를 보낼 텍스트 채널을 찾을 수 없습니다.' };
	}

	return { channel };
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

async function resolveRoles(interaction, roleInputs) {
	const uniqueRoleInputs = [...new Set(roleInputs.filter(Boolean))].slice(0, MAX_REACTION_ROLE_COUNT);
	if (uniqueRoleInputs.length === 0) {
		return { error: '반응으로 부여하거나 제거할 역할을 1개 이상 선택해주세요.' };
	}

	const roles = [];
	let botMember = null;
	for (const roleInput of uniqueRoleInputs) {
		const roleResult = await resolveRole(interaction, roleInput);
		if (roleResult.error) {
			return { error: roleResult.error };
		}

		botMember = roleResult.botMember;
		roles.push(roleResult.role);
	}

	return { roles, botMember };
}

function parseModeInput(input, title) {
	const rawValue = input.trim();
	if (!rawValue) {
		return { mode: 'normal', groupName: null };
	}

	const [modeToken, groupToken] = rawValue.split(/[:=,]/, 2).map(part => part.trim());
	let mode = MODE_ALIASES.get(modeToken.toLowerCase());
	let groupName = groupToken || null;

	if (!mode) {
		const spaceMatch = rawValue.match(/^(\S+)\s+(.+)$/);
		if (spaceMatch) {
			mode = MODE_ALIASES.get(spaceMatch[1].toLowerCase());
			groupName = spaceMatch[2].trim();
		}
	}

	if (!mode || !REACTION_ROLE_MODES.has(mode)) {
		return { error: '동작 방식은 `normal`, `once`, `remove`, `toggle` 중 하나로 입력해주세요.' };
	}

	return {
		mode,
		groupName: mode === 'toggle' ? (groupName || title.trim() || '반응 역할') : null,
	};
}

function normalizeEmojiName(name) {
	return name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function formatCustomEmoji(emoji) {
	return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

function findMatchingServerEmoji(guild, option) {
	const aliases = new Set([option.label, ...option.aliases].map(normalizeEmojiName));
	return [...guild.emojis.cache.values()]
		.find(emoji => aliases.has(normalizeEmojiName(emoji.name)));
}

function buildCommonEmojiOptions(guild) {
	return COMMON_EMOJI_OPTIONS.map(option => {
		const serverEmoji = findMatchingServerEmoji(guild, option);
		if (serverEmoji) {
			return {
				label: `${option.label} (서버 이모지)`,
				value: formatCustomEmoji(serverEmoji),
				description: serverEmoji.name,
				emoji: {
					id: serverEmoji.id,
					name: serverEmoji.name,
					animated: serverEmoji.animated,
				},
			};
		}

		return {
			label: option.label,
			value: option.value,
			description: '기본 이모지',
			emoji: option.value,
		};
	});
}

function getSetupRoleIds(setup) {
	return [setup.roleId, ...(setup.additionalRoleIds || [])]
		.filter(Boolean)
		.filter((roleId, index, roleIds) => roleIds.indexOf(roleId) === index)
		.slice(0, MAX_REACTION_ROLE_COUNT);
}

function getSetupEmojiMap(setup) {
	if (!setup.emojiByRoleId) {
		setup.emojiByRoleId = {};
	}
	return setup.emojiByRoleId;
}

function getCurrentEmojiTargetRoleId(setup) {
	const emojiByRoleId = getSetupEmojiMap(setup);
	return getSetupRoleIds(setup).find(roleId => !emojiByRoleId[roleId]) || null;
}

function getRoleEmojiItems(setup) {
	const emojiByRoleId = getSetupEmojiMap(setup);
	return getSetupRoleIds(setup)
		.map(roleId => ({
			roleId,
			emojiInput: emojiByRoleId[roleId] || null,
		}));
}

function hasAllRoleEmojis(setup) {
	const items = getRoleEmojiItems(setup);
	return items.length > 0 && items.every(item => item.emojiInput);
}

function getEmojiKey(emojiConfig) {
	return emojiConfig.emojiId ? `id:${emojiConfig.emojiId}` : `name:${emojiConfig.emoji}`;
}

function assignEmojiToCurrentRole(setup, emojiInput) {
	const targetRoleId = getCurrentEmojiTargetRoleId(setup);
	if (!targetRoleId) {
		return { error: '모든 역할에 이미 이모지가 배정되었습니다.' };
	}

	const emojiConfig = parseEmojiInput(emojiInput);
	if (!emojiConfig) {
		return { error: '이모지를 입력해주세요. 일반 이모지 또는 `<:name:id>` 형식을 사용할 수 있습니다.' };
	}

	const emojiKey = getEmojiKey(emojiConfig);
	for (const item of getRoleEmojiItems(setup)) {
		if (!item.emojiInput || item.roleId === targetRoleId) {
			continue;
		}

		const existingEmojiConfig = parseEmojiInput(item.emojiInput);
		if (existingEmojiConfig && getEmojiKey(existingEmojiConfig) === emojiKey) {
			return { error: '이미 다른 역할에 배정된 이모지입니다. 역할마다 다른 이모지를 선택해주세요.' };
		}
	}

	getSetupEmojiMap(setup)[targetRoleId] = emojiInput;
	return { roleId: targetRoleId, emojiConfig };
}

function buildSetupEmbed(setup) {
	const roleItems = getRoleEmojiItems(setup);
	const currentRoleId = getCurrentEmojiTargetRoleId(setup);
	const roleLines = roleItems.map(item => `${item.emojiInput || '미지정'} <@&${item.roleId}>`);

	return new EmbedBuilder()
		.setTitle('반응 역할 설정')
		.setDescription([
			'역할마다 사용할 이모지를 하나씩 배정합니다.',
			'추가 역할을 선택한 뒤, 현재 대상 역할에 사용할 이모지를 선택해주세요.',
		].join('\n'))
		.setColor(0x5865F2)
		.addFields(
			{ name: '대상 채널', value: `<#${setup.channelId}>`, inline: true },
			{ name: '모드', value: `${setup.mode}${setup.groupName ? ` (${setup.groupName})` : ''}`, inline: true },
			{ name: '역할별 이모지', value: roleLines.join('\n') || '선택된 역할이 없습니다.', inline: false },
			{
				name: '현재 이모지를 배정할 역할',
				value: currentRoleId ? `<@&${currentRoleId}>` : '모든 역할에 이모지가 배정되었습니다.',
				inline: false,
			},
		);
}

function buildEmojiSetupComponents(interaction, setup) {
	const rows = [];
	const setupId = setup.id;
	const additionalRoleIds = setup.additionalRoleIds || [];
	const currentRoleId = getCurrentEmojiTargetRoleId(setup);
	const additionalRoleSelect = new RoleSelectMenuBuilder()
		.setCustomId(`${ADDITIONAL_ROLE_SELECT_PREFIX}:${setupId}`)
		.setPlaceholder('역할 선택지 추가/변경')
		.setMinValues(0)
		.setMaxValues(MAX_REACTION_ROLE_COUNT - 1);

	if (additionalRoleIds.length > 0) {
		additionalRoleSelect.setDefaultRoles(additionalRoleIds);
	}

	rows.push(new ActionRowBuilder().addComponents(
		additionalRoleSelect,
	));

	if (!currentRoleId) {
		rows.push(new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`${DETAILS_BUTTON_PREFIX}:${setupId}`)
				.setLabel('제목/설명 입력')
				.setStyle(ButtonStyle.Primary),
		));
		return rows;
	}

	const guildEmojis = [...interaction.guild.emojis.cache.values()]
		.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
		.slice(0, 25);

	if (guildEmojis.length > 0) {
		rows.push(new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`${SERVER_EMOJI_SELECT_PREFIX}:${setupId}`)
				.setPlaceholder('서버 이모지 선택')
				.addOptions(guildEmojis.map(emoji => ({
					label: emoji.name,
					value: emoji.id,
					emoji: {
						id: emoji.id,
						name: emoji.name,
						animated: emoji.animated,
					},
				}))),
		));
	}

	rows.push(new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`${COMMON_EMOJI_SELECT_PREFIX}:${setupId}`)
			.setPlaceholder('자주 쓰는 이모지 선택')
			.addOptions(buildCommonEmojiOptions(interaction.guild)),
	));

	rows.push(new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`${MANUAL_EMOJI_BUTTON_PREFIX}:${setupId}`)
			.setLabel('이모지 직접 입력')
			.setStyle(ButtonStyle.Secondary),
	));

	return rows;
}

function buildDetailsModal(setupId) {
	const modal = new ModalBuilder()
		.setCustomId(`${MODAL_PREFIX}:${setupId}`)
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

	modal.addComponents(
		new ActionRowBuilder().addComponents(titleInput),
		new ActionRowBuilder().addComponents(descriptionInput),
	);

	return modal;
}

function buildEmojiInputModal(setupId) {
	const modal = new ModalBuilder()
		.setCustomId(`${EMOJI_MODAL_PREFIX}:${setupId}`)
		.setTitle('역할 이모지 입력');

	const emojiInput = new TextInputBuilder()
		.setCustomId('emoji')
		.setLabel('현재 역할에 배정할 이모지')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('예: 🎮 또는 <:name:id>')
		.setRequired(true)
		.setMaxLength(100);

	modal.addComponents(new ActionRowBuilder().addComponents(emojiInput));
	return modal;
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
	const modeConfig = parseModeInput(values.modeInput, title);
	const rawItems = values.items || [];

	if (rawItems.length === 0) {
		await interaction.reply({
			content: '역할별 이모지를 1개 이상 배정해주세요.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (modeConfig.error) {
		await interaction.reply({
			content: modeConfig.error,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const parsedItems = rawItems.map(item => {
		const emojiConfig = parseEmojiInput(item.emojiInput || '');
		return emojiConfig ? { roleId: item.roleId, ...emojiConfig } : null;
	});
	if (parsedItems.some(item => !item?.emoji)) {
		await interaction.reply({
			content: '이모지를 입력해주세요. 일반 이모지 또는 `<:name:id>` 형식을 사용할 수 있습니다.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const targetChannelResult = await getTargetChannel(interaction, values.channelId);
	if (targetChannelResult.error) {
		await interaction.editReply({
			content: targetChannelResult.error,
		});
		return;
	}

	const roleInputs = parsedItems.map(item => item.roleId);
	const roleResult = await resolveRoles(interaction, roleInputs);
	if (roleResult.error) {
		await interaction.editReply({
			content: roleResult.error,
		});
		return;
	}

	const { roles, botMember } = roleResult;
	const [primaryRole] = roles;
	const roleIds = roles.map(role => role.id);
	const validRoleIds = new Set(roleIds);
	const items = parsedItems
		.filter(item => validRoleIds.has(item.roleId))
		.map(item => ({
			roleId: item.roleId,
			emoji: item.emoji,
			emojiId: item.emojiId,
			emojiName: item.emojiName,
		}));
	const { channel: targetChannel } = targetChannelResult;
	const requiredChannelPermissions = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.ReadMessageHistory,
	];

	if (modeConfig.mode === 'once' || modeConfig.mode === 'remove' || modeConfig.mode === 'toggle') {
		requiredChannelPermissions.push(PermissionFlagsBits.ManageMessages);
	}

	const usesExternalEmoji = items.some(item => item.emojiId && !interaction.guild.emojis.cache.has(item.emojiId));
	if (usesExternalEmoji) {
		requiredChannelPermissions.push(PermissionFlagsBits.UseExternalEmojis);
	}

	if (!targetChannel.permissionsFor(botMember)?.has(requiredChannelPermissions)) {
		const extraMessage = modeConfig.mode === 'once' || modeConfig.mode === 'remove' || modeConfig.mode === 'toggle'
			? ' `once`/`remove`/`toggle` 모드는 유저 반응을 정리하기 위해 `메시지 관리` 권한도 필요합니다.'
			: '';
		await interaction.editReply({
			content: `${targetChannel} 채널에서 반응 역할 메시지를 만들 권한이 부족합니다. \`메시지 보내기\`, \`임베드 링크\`, \`반응 추가\`, \`메시지 기록 읽기\` 권한을 확인해주세요.${extraMessage}`,
		});
		return;
	}

	const pendingConfig = {
		guildId: interaction.guild.id,
		channelId: targetChannel.id,
		messageId: '0',
		emoji: items[0].emoji,
		emojiId: items[0].emojiId,
		emojiName: items[0].emojiName,
		roleId: primaryRole.id,
		roleIds,
		items,
		title,
		description,
		mode: modeConfig.mode,
		groupName: modeConfig.groupName,
		createdBy: interaction.user.id,
		createdAt: Date.now(),
	};

	let reactionRoleMessage;
	try {
		reactionRoleMessage = await targetChannel.send({
			embeds: [buildReactionRoleEmbed(pendingConfig)],
		});

		for (const item of pendingConfig.items) {
			await reactionRoleMessage.react(item.emoji);
		}

		addReactionRole(interaction.client, {
			...pendingConfig,
			messageId: reactionRoleMessage.id,
		});
	}
	catch (error) {
		console.error('반응 역할 메시지 생성 실패:', error);
		if (reactionRoleMessage) {
			deleteReactionRole(interaction.client, reactionRoleMessage.id);
		}

		await interaction.editReply({
			content: '반응 역할 메시지를 생성하는 중 오류가 발생했습니다. 이모지 접근 권한과 봇 권한을 확인해주세요.',
		});
		return;
	}

	await interaction.editReply({
		content: [
			'반응 역할 메시지를 생성했습니다.',
			`채널: ${targetChannel}`,
			`역할: ${items.map(item => `${item.emoji} <@&${item.roleId}>`).join(', ')}`,
			`모드: ${modeConfig.mode}${modeConfig.groupName ? ` (${modeConfig.groupName})` : ''}`,
			`메시지: ${reactionRoleMessage.url}`,
		].join('\n'),
	});
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('반응역할생성')
		.setDescription('Zira식 normal/once/remove/toggle 반응 역할 메시지를 생성합니다.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addChannelOption(option =>
			option
				.setName('채널')
				.setDescription('반응 역할 메시지를 보낼 채널')
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
		)
		.addRoleOption(option =>
			option
				.setName('역할')
				.setDescription('반응으로 부여하거나 제거할 역할')
				.setRequired(true),
		)
		.addStringOption(option =>
			option
				.setName('동작방식')
				.setDescription('반응 역할 동작 방식')
				.setRequired(false)
				.addChoices(
					{ name: 'normal - 반응 추가/제거에 맞춰 역할 부여/제거', value: 'normal' },
					{ name: 'once - 한 번 부여하면 역할 유지', value: 'once' },
					{ name: 'remove - 반응 시 역할 제거', value: 'remove' },
					{ name: 'toggle - 같은 그룹에서 하나만 유지', value: 'toggle' },
				),
		)
		.addStringOption(option =>
			option
				.setName('토글그룹')
				.setDescription('toggle 모드에서 하나만 유지할 그룹 이름')
				.setRequired(false)
				.setMaxLength(60),
		)),
	async execute(interaction) {
		if (!hasManageRolePermission(interaction)) {
			await interaction.reply({
				content: '반응 역할은 `역할 관리` 권한이 있는 사용자만 생성할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const targetChannel = interaction.options.getChannel('채널', true);
		const role = interaction.options.getRole('역할', true);
		const mode = interaction.options.getString('동작방식') || 'normal';
		const groupName = interaction.options.getString('토글그룹') || null;
		const setup = {
			id: interaction.id,
			ownerId: interaction.user.id,
			channelId: targetChannel.id,
			roleId: role.id,
			additionalRoleIds: [],
			emojiByRoleId: {},
			mode,
			groupName,
			createdAt: Date.now(),
		};

		saveSetup(interaction, setup);

		await interaction.reply({
			embeds: [buildSetupEmbed(setup)],
			components: buildEmojiSetupComponents(interaction, setup),
			flags: MessageFlags.Ephemeral,
		});
	},
	async handleComponentInteraction(interaction) {
		const customId = interaction.customId;
		const isServerEmojiSelect = customId.startsWith(`${SERVER_EMOJI_SELECT_PREFIX}:`);
		const isCommonEmojiSelect = customId.startsWith(`${COMMON_EMOJI_SELECT_PREFIX}:`);
		const isAdditionalRoleSelect = customId.startsWith(`${ADDITIONAL_ROLE_SELECT_PREFIX}:`);
		const isManualEmojiButton = customId.startsWith(`${MANUAL_EMOJI_BUTTON_PREFIX}:`);
		const isDetailsButton = customId.startsWith(`${DETAILS_BUTTON_PREFIX}:`);

		if (!isServerEmojiSelect && !isCommonEmojiSelect && !isAdditionalRoleSelect && !isManualEmojiButton && !isDetailsButton) {
			return false;
		}

		const [, setupId] = customId.split(':');
		const setup = getSetup(interaction, setupId);
		if (!setup) {
			await interaction.reply({
				content: '반응 역할 설정 세션이 만료되었습니다. 다시 `/반응역할생성`을 실행해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (setup.ownerId !== interaction.user.id) {
			await interaction.reply({
				content: '이 반응 역할 설정은 명령어를 실행한 사용자만 계속 진행할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (isAdditionalRoleSelect) {
			setup.additionalRoleIds = [...new Set(interaction.values)]
				.filter(roleId => roleId !== setup.roleId)
				.slice(0, MAX_REACTION_ROLE_COUNT - 1);
			const roleIds = new Set(getSetupRoleIds(setup));
			for (const roleId of Object.keys(getSetupEmojiMap(setup))) {
				if (!roleIds.has(roleId)) {
					delete setup.emojiByRoleId[roleId];
				}
			}
			await interaction.update({
				embeds: [buildSetupEmbed(setup)],
				components: buildEmojiSetupComponents(interaction, setup),
			});
			return true;
		}

		if (isDetailsButton) {
			if (!hasAllRoleEmojis(setup)) {
				await interaction.reply({
					content: '모든 역할에 이모지를 먼저 배정해주세요.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			await interaction.showModal(buildDetailsModal(setupId));
			return true;
		}

		if (isManualEmojiButton) {
			await interaction.showModal(buildEmojiInputModal(setupId));
			return true;
		}

		if (isServerEmojiSelect) {
			const emojiId = interaction.values[0];
			const emoji = interaction.guild.emojis.cache.get(emojiId);
			if (!emoji) {
				await interaction.reply({
					content: '선택한 서버 이모지를 찾을 수 없습니다. 직접 입력을 사용하거나 다시 시도해주세요.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}
			const assigned = assignEmojiToCurrentRole(setup, `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`);
			if (assigned.error) {
				await interaction.reply({
					content: assigned.error,
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}
		}
		else {
			const assigned = assignEmojiToCurrentRole(setup, interaction.values[0]);
			if (assigned.error) {
				await interaction.reply({
					content: assigned.error,
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}
		}

		await interaction.update({
			embeds: [buildSetupEmbed(setup)],
			components: buildEmojiSetupComponents(interaction, setup),
		});
		return true;
	},
	async handleModalSubmit(interaction) {
		const isDetailsModal = interaction.customId.startsWith(`${MODAL_PREFIX}:`);
		const isEmojiModal = interaction.customId.startsWith(`${EMOJI_MODAL_PREFIX}:`);
		if (!isDetailsModal && !isEmojiModal) {
			return false;
		}

		const [, setupId] = interaction.customId.split(':');
		const setup = getSetup(interaction, setupId);
		if (!setup) {
			await interaction.reply({
				content: '반응 역할 설정 세션이 만료되었습니다. 다시 `/반응역할생성`을 실행해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (setup.ownerId !== interaction.user.id) {
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

		if (isEmojiModal) {
			const assigned = assignEmojiToCurrentRole(setup, interaction.fields.getTextInputValue('emoji'));
			if (assigned.error) {
				await interaction.reply({
					content: assigned.error,
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			await interaction.reply({
				embeds: [buildSetupEmbed(setup)],
				components: buildEmojiSetupComponents(interaction, setup),
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (!hasAllRoleEmojis(setup)) {
			await interaction.reply({
				content: '모든 역할에 이모지를 먼저 배정해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		await createReactionRoleFromInput(interaction, {
			title: interaction.fields.getTextInputValue('title'),
			description: interaction.fields.getTextInputValue('description') || '',
			items: getRoleEmojiItems(setup),
			modeInput: setup.groupName ? `${setup.mode}:${setup.groupName}` : setup.mode,
			channelId: setup.channelId,
		});
		deleteSetup(interaction, setupId);
		return true;
	},
	parseModeInput,
	getSetupRoleIds,
};
