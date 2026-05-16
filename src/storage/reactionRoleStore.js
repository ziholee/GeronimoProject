const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'reactionRoles.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function normalizeReactionRole(config) {
	const mode = config.mode || 'normal';
	const roleIds = [...new Set(
		(Array.isArray(config.roleIds) && config.roleIds.length > 0
			? config.roleIds
			: [config.roleId])
			.filter(Boolean)
			.map(roleId => String(roleId)),
	)];
	const [roleId] = roleIds;

	return {
		guildId: String(config.guildId),
		channelId: String(config.channelId),
		messageId: String(config.messageId),
		emoji: String(config.emoji),
		emojiId: config.emojiId ? String(config.emojiId) : null,
		emojiName: config.emojiName ? String(config.emojiName) : null,
		roleId,
		roleIds,
		title: config.title || '반응 역할',
		description: config.description || '',
		mode,
		groupName: config.groupName ? String(config.groupName) : null,
		createdBy: String(config.createdBy),
		createdAt: Number(config.createdAt) || Date.now(),
	};
}

function loadReactionRoles() {
	try {
		ensureDataDir();
		if (!fs.existsSync(FILE_PATH)) {
			return new Map();
		}

		const raw = fs.readFileSync(FILE_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		return new Map(
			Object.entries(parsed).map(([messageId, config]) => [
				messageId,
				normalizeReactionRole({ ...config, messageId }),
			]),
		);
	}
	catch (error) {
		console.error('reactionRoleStore 로드 실패:', error);
		return new Map();
	}
}

function saveReactionRoles(reactionRoles) {
	try {
		ensureDataDir();
		const serialized = {};
		for (const [messageId, config] of reactionRoles.entries()) {
			serialized[messageId] = normalizeReactionRole(config);
		}
		fs.writeFileSync(FILE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
	}
	catch (error) {
		console.error('reactionRoleStore 저장 실패:', error);
	}
}

module.exports = {
	loadReactionRoles,
	saveReactionRoles,
};
