const { EmbedBuilder } = require('discord.js');
const { saveReactionRoles } = require('../storage/reactionRoleStore');

const CUSTOM_EMOJI_PATTERN = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/;

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

function normalizeReactionRoleConfig(config) {
	return {
		guildId: String(config.guildId),
		channelId: String(config.channelId),
		messageId: String(config.messageId),
		emoji: String(config.emoji),
		emojiId: config.emojiId ? String(config.emojiId) : null,
		emojiName: config.emojiName ? String(config.emojiName) : null,
		roleId: String(config.roleId),
		title: config.title?.trim() || '반응 역할',
		description: config.description?.trim() || '',
		mode: config.mode || 'toggle',
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

function reactionMatchesConfig(reaction, config) {
	if (config.emojiId) {
		return reaction.emoji.id === config.emojiId;
	}

	return reaction.emoji.name === config.emoji;
}

function buildReactionRoleEmbed(config, role) {
	const description = config.description
		? `${config.description}\n\n${config.emoji} 반응을 누르면 <@&${role.id}> 역할을 받을 수 있습니다.`
		: `${config.emoji} 반응을 누르면 <@&${role.id}> 역할을 받을 수 있습니다.`;

	return new EmbedBuilder()
		.setTitle(config.title)
		.setDescription(description)
		.setColor(0x3BA55D)
		.addFields(
			{ name: '역할', value: `<@&${role.id}>`, inline: true },
			{ name: '이모지', value: config.emoji, inline: true },
		)
		.setFooter({ text: '반응을 제거하면 역할도 제거됩니다.' })
		.setTimestamp(new Date(config.createdAt));
}

async function handleReactionRoleAdd(reaction, user) {
	const config = getReactionRoleByMessageId(reaction.client, reaction.message.id);
	if (!config || config.guildId !== reaction.message.guildId || !reactionMatchesConfig(reaction, config)) {
		return false;
	}

	const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
	if (!member) {
		return true;
	}

	await member.roles.add(config.roleId, 'Reaction role added').catch(error => {
		console.error(`반응 역할 부여 실패 (${config.messageId}, ${user.id}):`, error);
	});

	return true;
}

async function handleReactionRoleRemove(reaction, user) {
	const config = getReactionRoleByMessageId(reaction.client, reaction.message.id);
	if (!config || config.guildId !== reaction.message.guildId || !reactionMatchesConfig(reaction, config)) {
		return false;
	}

	const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
	if (!member) {
		return true;
	}

	await member.roles.remove(config.roleId, 'Reaction role removed').catch(error => {
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
	reactionMatchesConfig,
};
