const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const LOG_FILE = path.join(DATA_DIR, 'userLogs.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function loadLogs() {
	try {
		ensureDataDir();
		if (!fs.existsSync(LOG_FILE)) {
			return {};
		}
		const raw = fs.readFileSync(LOG_FILE, 'utf-8');
		return JSON.parse(raw);
	}
	catch (error) {
		console.error('로그 로드 실패:', error);
		return {};
	}
}

function saveLogs(logs) {
	try {
		ensureDataDir();
		fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
		return true;
	}
	catch (error) {
		console.error('로그 저장 실패:', error);
		return false;
	}
}

function addLog(guildId, userId, logType, data) {
	const logs = loadLogs();
	if (!logs[guildId]) {
		logs[guildId] = {};
	}
	if (!logs[guildId][userId]) {
		logs[guildId][userId] = [];
	}

	const logEntry = {
		type: logType,
		timestamp: Date.now(),
		data: data,
	};

	logs[guildId][userId].push(logEntry);

	if (logs[guildId][userId].length > 10000) {
		logs[guildId][userId] = logs[guildId][userId].slice(-10000);
	}

	saveLogs(logs);
	return logEntry;
}

function getUserLogs(guildId, userId, options = {}) {
	const logs = loadLogs();
	const userLogs = logs[guildId]?.[userId] || [];

	let filtered = userLogs;

	if (options.type) {
		filtered = filtered.filter(log => log.type === options.type);
	}

	if (options.startTime) {
		filtered = filtered.filter(log => log.timestamp >= options.startTime);
	}

	if (options.endTime) {
		filtered = filtered.filter(log => log.timestamp <= options.endTime);
	}

	if (options.limit) {
		filtered = filtered.slice(-options.limit);
	}

	return filtered;
}

function getAllGuildLogs(guildId, options = {}) {
	const logs = loadLogs();
	const guildLogs = logs[guildId] || {};

	const allLogs = [];
	for (const [userId, userLogs] of Object.entries(guildLogs)) {
		for (const log of userLogs) {
			if (options.type && log.type !== options.type) continue;
			if (options.startTime && log.timestamp < options.startTime) continue;
			if (options.endTime && log.timestamp > options.endTime) continue;

			allLogs.push({
				userId,
				...log,
			});
		}
	}

	allLogs.sort((a, b) => b.timestamp - a.timestamp);

	if (options.limit) {
		return allLogs.slice(0, options.limit);
	}

	return allLogs;
}

function deleteUserLogs(guildId, userId) {
	const logs = loadLogs();
	if (logs[guildId]?.[userId]) {
		delete logs[guildId][userId];
		if (Object.keys(logs[guildId]).length === 0) {
			delete logs[guildId];
		}
		return saveLogs(logs);
	}
	return false;
}

function deleteGuildLogs(guildId) {
	const logs = loadLogs();
	if (logs[guildId]) {
		delete logs[guildId];
		return saveLogs(logs);
	}
	return false;
}

function deleteLogsByType(guildId, logType) {
	const logs = loadLogs();
	if (!logs[guildId]) return false;

	let deleted = false;
	for (const userId in logs[guildId]) {
		const originalLength = logs[guildId][userId].length;
		logs[guildId][userId] = logs[guildId][userId].filter(log => log.type !== logType);
		if (logs[guildId][userId].length !== originalLength) {
			deleted = true;
		}
		if (logs[guildId][userId].length === 0) {
			delete logs[guildId][userId];
		}
	}

	if (Object.keys(logs[guildId]).length === 0) {
		delete logs[guildId];
	}

	return deleted ? saveLogs(logs) : false;
}

function getLogStats(guildId) {
	const logs = loadLogs();
	const guildLogs = logs[guildId] || {};

	const stats = {
		totalUsers: Object.keys(guildLogs).length,
		totalLogs: 0,
		byType: {},
		byUser: {},
	};

	for (const [userId, userLogs] of Object.entries(guildLogs)) {
		stats.totalLogs += userLogs.length;
		stats.byUser[userId] = userLogs.length;

		for (const log of userLogs) {
			stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
		}
	}

	return stats;
}

module.exports = {
	addLog,
	getUserLogs,
	getAllGuildLogs,
	deleteUserLogs,
	deleteGuildLogs,
	deleteLogsByType,
	getLogStats,
	loadLogs,
	saveLogs,
};
