const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const LEVEL_FILE = path.join(DATA_DIR, 'leveling.json');
const CONFIG_FILE = path.join(DATA_DIR, 'levelConfig.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function loadJson(filePath, defaultValue) {
	try {
		ensureDataDir();
		if (!fs.existsSync(filePath)) {
			return defaultValue;
		}

		const raw = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(raw);
	}
	catch (error) {
		console.error(`${path.basename(filePath)} 로드 실패:`, error);
		return defaultValue;
	}
}

function saveJson(filePath, data) {
	try {
		ensureDataDir();
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
	}
	catch (error) {
		console.error(`${path.basename(filePath)} 저장 실패:`, error);
	}
}

// 레벨 데이터: { [guildId]: { [userId]: { xp, level, lastMessageAt } } }
function loadLevelData() {
	const json = loadJson(LEVEL_FILE, {});
	return new Map(
		Object.entries(json).map(([guildId, users]) => [
			guildId,
			new Map(
				Object.entries(users).map(([userId, data]) => [
					userId,
					{
						xp: Number(data.xp) || 0,
						level: Number(data.level) || 0,
						lastMessageAt: Number(data.lastMessageAt) || 0,
					},
				]),
			),
		]),
	);
}

function saveLevelData(map) {
	const json = {};
	for (const [guildId, users] of map.entries()) {
		json[guildId] = {};
		for (const [userId, data] of users.entries()) {
			json[guildId][userId] = {
				xp: data.xp,
				level: data.level,
				lastMessageAt: data.lastMessageAt,
			};
		}
	}
	saveJson(LEVEL_FILE, json);
}

// 설정 데이터: { [guildId]: { cooldownMs, levelUpChannelId, levelUpNotice } }
function loadLevelConfig() {
	const json = loadJson(CONFIG_FILE, {});
	return new Map(Object.entries(json));
}

function saveLevelConfig(map) {
	const json = {};
	for (const [guildId, config] of map.entries()) {
		json[guildId] = config;
	}
	saveJson(CONFIG_FILE, json);
}

// 레벨업에 필요한 XP (Mee6 비슷한 곡선이지만 가볍게)
function getRequiredXpForLevel(level) {
	// 예시 공식: 5 * level^2 + 50 * level + 100
	return 5 * (level ** 2) + 50 * level + 100;
}

function getUserData(levelMap, guildId, userId) {
	if (!levelMap.has(guildId)) {
		levelMap.set(guildId, new Map());
	}
	const guildMap = levelMap.get(guildId);
	if (!guildMap.has(userId)) {
		guildMap.set(userId, {
			xp: 0,
			level: 0,
			lastMessageAt: 0,
		});
	}
	return guildMap.get(userId);
}

function addXp(levelMap, guildId, userId, gainedXp, now) {
	const userData = getUserData(levelMap, guildId, userId);
	userData.xp += gainedXp;
	userData.lastMessageAt = now;

	let leveledUp = false;
	let newLevel = userData.level;

	while (userData.xp >= getRequiredXpForLevel(newLevel)) {
		userData.xp -= getRequiredXpForLevel(newLevel);
		newLevel += 1;
		leveledUp = true;
	}

	userData.level = newLevel;

	return {
		userData,
		leveledUp,
	};
}

module.exports = {
	loadLevelData,
	saveLevelData,
	loadLevelConfig,
	saveLevelConfig,
	getRequiredXpForLevel,
	getUserData,
	addXp,
};


