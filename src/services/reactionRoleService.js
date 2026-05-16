const { EmbedBuilder } = require('discord.js');
const { saveReactionRoles } = require('../storage/reactionRoleStore');

const CUSTOM_EMOJI_PATTERN = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/;
const REACTION_ROLE_MODES = new Set(['normal', 'once', 'remove', 'toggle']);

const MODE_LABELS = {
	normal: 'Normal',
	once: 'Once',
	remove: 'Remove',
	toggle: 'Toggle',
};

function ensureReactionRoleMap(client) {
	if (!client.reactionRoleData) {
		client.reactionRoleData = new Map();
	}
	return client.reactionRoleData;
}

function persistReactionRoles(client) {
	saveReactionRoles(ensureReactionRoleMap(client));
}

function parseRoleId(input) {
	const value = input.trim();
	const mentionMatch = value.match(/^<@&(\d+)>$/);
	if (mentionMatch) {
		return mentionMatch[1];
	}

	if (/^\d+$/.test(value)) {
		return value;
	}

	return null;
}

function parseEmojiInput(input) {
	const value = input.trim();
	if (!value) {
		return null;
	}

	const customEmojiMatch = value.match(CUSTOM_EMOJI_PATTERN);
	if (customEmojiMatch) {
		return {
			emoji: value,
			emojiId: customEmojiMatch[2],
			emojiName: customEmojiMatch[1],
		};
	}

	return {
		emoji: value,
		emojiId: null,
		emojiName: value,
	};
}

function normalizeReactionRoleItem(item, fallback = {}) {
	const roleId = item.roleId ?? fallback.roleId;
	const emoji = item.emoji ?? fallback.emoji;
	if (!roleId || !emoji) {
		return null;
	}

	return {
		roleId: String(roleId),
		emoji: String(emoji),
		emojiId: item.emojiId ? String(item.emojiId) : (fallback.emojiId ? String(fallback.emojiId) : null),
		emojiName: item.emojiName ? String(item.emojiName) : (fallback.emojiName ? String(fallback.emojiName) : String(emoji)),
	};
}

function normalizeReactionRoleItems(config) {
	if (Array.isArray(config.items) && config.items.length > 0) {
		return config.items
			.map(item => normalizeReactionRoleItem(item, config))
			.filter(Boolean);
	}

	const roleIds = Array.isArray(config.roleIds) && config.roleIds.length > 0
		? config.roleIds
		: [config.roleId];

	return [...new Set(roleIds.filter(Boolean).map(roleId => String(roleId)))]
		.map(roleId => normalizeReactionRoleItem({ roleId }, config))
		.filter(Boolean);
}

function normalizeReactionRoleConfig(config) {
	const rawMode = String(config.mode || 'normal').toLowerCase();
	const mode = REACTION_ROLE_MODES.has(rawMode) ? rawMode : 'normal';
	const groupName = config.groupName ? String(config.groupName).trim() : null;
	const items = normalizeReactionRoleItems(config);
	const roleIds = [...new Set(items.map(item => item.roleId))];
	const [roleId] = roleIds;
	const [firstItem] = items;

	return {
		guildId: String(config.guildId),
		channelId: String(config.channelId),
		messageId: String(config.messageId),
		emoji: firstItem?.emoji ?? String(config.emoji),
		emojiId: firstItem?.emojiId ?? (config.emojiId ? String(config.emojiId) : null),
		emojiName: firstItem?.emojiName ?? (config.emojiName ? String(config.emojiName) : null),
		roleId,
		roleIds,
		items,
		title: config.title?.trim() || '반응 역할',
		description: config.description?.trim() || '',
		mode,
		groupName: mode === 'toggle' ? groupName : null,
		createdBy: String(config.createdBy),
		createdAt: Number(config.createdAt) || Date.now(),
	};
}

function addReactionRole(client, config) {
	const reactionRoles = ensureReactionRoleMap(client);
	const normalized = normalizeReactionRoleConfig(config);
	reactionRoles.set(normalized.messageId, normalized);
	persistReactionRoles(client);
	return normalized;
}

function deleteReactionRole(client, messageId) {
	const reactionRoles = ensureReactionRoleMap(client);
	const deleted = reactionRoles.delete(messageId);
	if (deleted) {
		persistReactionRoles(client);
	}
	return deleted;
}

function getReactionRoleByMessageId(client, messageId) {
	return ensureReactionRoleMap(client).get(messageId);
}

function getToggleSiblings(client, config) {
	if (config.mode !== 'toggle' || !config.groupName) {
		return [];
	}

	return [...ensureReactionRoleMap(client).values()]
		.filter(candidate =>
			candidate.guildId === config.guildId
			&& candidate.messageId !== config.messageId
			&& candidate.mode === 'toggle'
			&& candidate.groupName === config.groupName);
}

function getReactionRoleItems(config) {
	if (Array.isArray(config.items) && config.items.length > 0) {
		return config.items;
	}

	return normalizeReactionRoleItems(config);
}

function reactionMatchesItem(reaction, item) {
	if (item.emojiId) {
		return reaction.emoji.id === item.emojiId;
	}

	return reaction.emoji.name === item.emoji;
}

function reactionMatchesConfig(reaction, config) {
	return getReactionRoleItems(config).some(item => reactionMatchesItem(reaction, item));
}

function getMatchingItems(reaction, config) {
	return getReactionRoleItems(config).filter(item => reactionMatchesItem(reaction, item));
}

function getRoleIdsFromItems(items) {
	return [...new Set(items.map(item => item.roleId).filter(Boolean))];
}

function getRoleIds(config) {
	return getRoleIdsFromItems(getReactionRoleItems(config));
}

function formatRoleMentions(config) {
	return getReactionRoleItems(config)
		.map(item => `${item.emoji} <@&${item.roleId}>`)
		.join('\n');
}

function getModeHelpText(config) {
	const roleCount = getReactionRoleItems(config).length;

	switch (config.mode) {
	case 'once':
		return `각 이모지를 누르면 연결된 역할을 한 번 부여합니다. 반응을 제거해도 역할은 유지됩니다. 연결된 역할: ${roleCount}개`;
	case 'remove':
		return `각 이모지를 누르면 연결된 역할을 제거합니다. 연결된 역할: ${roleCount}개`;
	case 'toggle':
		return `각 이모지를 누르면 연결된 역할을 받습니다. 같은 그룹에서는 하나의 선택만 유지됩니다. 연결된 역할: ${roleCount}개`;
	case 'normal':
	default:
		return `각 이모지를 누르면 연결된 역할을 받고, 반응을 제거하면 해당 역할도 제거됩니다. 연결된 역할: ${roleCount}개`;
	}
}

function getModeFooter(config) {
	switch (config.mode) {
	case 'once':
		return 'Once 모드: 역할 부여 후 반응 제거 여부와 무관하게 역할이 유지됩니다.';
	case 'remove':
		return 'Remove 모드: 반응을 누르면 지정된 역할을 제거합니다.';
	case 'toggle':
		return config.groupName
			? `Toggle 모드: ${config.groupName} 그룹에서 하나의 역할만 유지됩니다.`
			: 'Toggle 모드: 같은 그룹 이름을 쓰면 하나의 역할만 유지됩니다.';
	case 'normal':
	default:
		return 'Normal 모드: 반응 추가 시 역할 부여, 반응 제거 시 역할 제거.';
	}
}

function buildReactionRoleEmbed(config) {
	const description = config.description
		? `${config.description}\n\n${getModeHelpText(config)}`
		: getModeHelpText(config);

	const fields = [
		{ name: '역할 선택지', value: formatRoleMentions(config), inline: false },
		{ name: '모드', value: MODE_LABELS[config.mode] || MODE_LABELS.normal, inline: true },
	];

	if (config.mode === 'toggle' && config.groupName) {
		fields.push({ name: '토글 그룹', value: config.groupName, inline: true });
	}

	return new EmbedBuilder()
		.setTitle(config.title)
		.setDescription(description)
		.setColor(0x3BA55D)
		.addFields(fields)
		.setFooter({ text: getModeFooter(config) })
		.setTimestamp(new Date(config.createdAt));
}

async function removeUserReaction(reaction, userId) {
	await reaction.users.remove(userId).catch(error => {
		console.error(`반응 제거 실패 (${reaction.message.id}, ${userId}):`, error);
	});
}

async function getReactionRoleMessage(client, config) {
	const channel = client.channels.cache.get(config.channelId)
		?? await client.channels.fetch(config.channelId).catch(() => null);
	if (!channel?.messages) {
		return null;
	}

	return channel.messages.cache.get(config.messageId)
		?? await channel.messages.fetch(config.messageId).catch(() => null);
}

async function removeSiblingReaction(client, config, userId) {
	const message = await getReactionRoleMessage(client, config);
	if (!message) {
		return;
	}

	for (const item of getReactionRoleItems(config)) {
		const reaction = message.reactions.cache.find(candidate => reactionMatchesItem(candidate, item));
		if (reaction) {
			await removeUserReaction(reaction, userId);
		}
	}
}

async function removePeerItemReactions(message, items, userId) {
	for (const item of items) {
		const reaction = message.reactions.cache.find(candidate => reactionMatchesItem(candidate, item));
		if (reaction) {
			await removeUserReaction(reaction, userId);
		}
	}
}

async function handleReactionRoleAdd(reaction, user) {
	const config = getReactionRoleByMessageId(reaction.client, reaction.message.id);
	if (!config || config.guildId !== reaction.message.guildId || !reactionMatchesConfig(reaction, config)) {
		return false;
	}
	const matchingItems = getMatchingItems(reaction, config);
	const matchingRoleIds = getRoleIdsFromItems(matchingItems);
	if (matchingRoleIds.length === 0) {
		return false;
	}

	const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
	if (!member) {
		return true;
	}

	if (config.mode === 'remove') {
		await member.roles.remove(matchingRoleIds, 'Reaction role removed by remove-mode reaction').catch(error => {
			console.error(`반응 역할 제거 실패 (${config.messageId}, ${user.id}):`, error);
		});
		await removeUserReaction(reaction, user.id);
		return true;
	}

	await member.roles.add(matchingRoleIds, `Reaction role added (${config.mode})`).catch(error => {
		console.error(`반응 역할 부여 실패 (${config.messageId}, ${user.id}):`, error);
	});

	if (config.mode === 'toggle') {
		const otherItems = getReactionRoleItems(config)
			.filter(item => !matchingItems.some(matchingItem =>
				matchingItem.roleId === item.roleId
				&& matchingItem.emoji === item.emoji
				&& matchingItem.emojiId === item.emojiId));
		const otherRoleIds = getRoleIdsFromItems(otherItems);
		if (otherRoleIds.length > 0) {
			await member.roles.remove(otherRoleIds, `Reaction role toggle group ${config.groupName}`).catch(error => {
				console.error(`토글 그룹 역할 제거 실패 (${config.messageId}, ${user.id}):`, error);
			});
			await removePeerItemReactions(reaction.message, otherItems, user.id);
		}

		const siblingConfigs = getToggleSiblings(reaction.client, config);
		for (const siblingConfig of siblingConfigs) {
			await member.roles.remove(getRoleIds(siblingConfig), `Reaction role toggle group ${config.groupName}`).catch(error => {
				console.error(`토글 그룹 역할 제거 실패 (${siblingConfig.messageId}, ${user.id}):`, error);
			});
			await removeSiblingReaction(reaction.client, siblingConfig, user.id);
		}
	}

	if (config.mode === 'once') {
		await removeUserReaction(reaction, user.id);
	}

	return true;
}

async function handleReactionRoleRemove(reaction, user) {
	const config = getReactionRoleByMessageId(reaction.client, reaction.message.id);
	if (!config || config.guildId !== reaction.message.guildId || !reactionMatchesConfig(reaction, config)) {
		return false;
	}
	const matchingItems = getMatchingItems(reaction, config);
	const matchingRoleIds = getRoleIdsFromItems(matchingItems);
	if (matchingRoleIds.length === 0) {
		return false;
	}

	const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
	if (!member) {
		return true;
	}

	if (config.mode === 'once' || config.mode === 'remove') {
		return true;
	}

	await member.roles.remove(matchingRoleIds, `Reaction role removed (${config.mode})`).catch(error => {
		console.error(`반응 역할 제거 실패 (${config.messageId}, ${user.id}):`, error);
	});

	return true;
}

module.exports = {
	addReactionRole,
	buildReactionRoleEmbed,
	deleteReactionRole,
	ensureReactionRoleMap,
	handleReactionRoleAdd,
	handleReactionRoleRemove,
	parseEmojiInput,
	parseRoleId,
	persistReactionRoles,
	REACTION_ROLE_MODES,
	reactionMatchesConfig,
	removeSiblingReaction,
};
