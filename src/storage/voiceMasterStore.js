const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'voiceMasterChannels.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function loadVoiceMasterChannels() {
	try {
		ensureDataDir();
		if (!fs.existsSync(FILE_PATH)) {
			return new Map();
		}

		const raw = fs.readFileSync(FILE_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		const result = new Map();

		for (const [guildId, channelIds] of Object.entries(parsed)) {
			result.set(guildId, new Set(channelIds));
		}

		return result;
	}
	catch (error) {
		console.error('voiceMasterChannels 로드 실패:', error);
		return new Map();
	}
}

function saveVoiceMasterChannels(map) {
	try {
		ensureDataDir();
		const serialized = {};
		for (const [guildId, channelSet] of map.entries()) {
			serialized[guildId] = Array.from(channelSet);
		}
		fs.writeFileSync(FILE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
	}
	catch (error) {
		console.error('voiceMasterChannels 저장 실패:', error);
	}
}

module.exports = {
	loadVoiceMasterChannels,
	saveVoiceMasterChannels,
};


