const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'welcomeSettings.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function loadWelcomeSettings() {
	try {
		ensureDataDir();
		if (!fs.existsSync(FILE_PATH)) {
			return new Map();
		}

		const raw = fs.readFileSync(FILE_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		const result = new Map();

		for (const [guildId, settings] of Object.entries(parsed)) {
			result.set(guildId, settings);
		}

		return result;
	}
	catch (error) {
		console.error('welcomeSettings 로드 실패:', error);
		return new Map();
	}
}

function saveWelcomeSettings(map) {
	try {
		ensureDataDir();
		const serialized = {};
		for (const [guildId, settings] of map.entries()) {
			serialized[guildId] = settings;
		}
		fs.writeFileSync(FILE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
	}
	catch (error) {
		console.error('welcomeSettings 저장 실패:', error);
	}
}

module.exports = {
	loadWelcomeSettings,
	saveWelcomeSettings,
};

