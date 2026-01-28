const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.join(__dirname, '../../data/webhookSettings.json');

function ensureDataFile() {
	if (!fs.existsSync(dataPath)) {
		fs.writeFileSync(dataPath, JSON.stringify({}, null, 2), 'utf8');
	}
}

function loadWebhookSettings() {
	ensureDataFile();
	try {
		const data = fs.readFileSync(dataPath, 'utf8');
		return JSON.parse(data);
	}
	catch (error) {
		console.error('웹훅 설정 로드 오류:', error);
		return {};
	}
}

function saveWebhookSettings(settings) {
	ensureDataFile();
	try {
		fs.writeFileSync(dataPath, JSON.stringify(settings, null, 2), 'utf8');
		return true;
	}
	catch (error) {
		console.error('웹훅 설정 저장 오류:', error);
		return false;
	}
}

function setWebhookUrl(guildId, channelId, webhookUrl) {
	const settings = loadWebhookSettings();
	if (!settings[guildId]) {
		settings[guildId] = {};
	}
	settings[guildId][channelId] = webhookUrl;
	return saveWebhookSettings(settings);
}

function getWebhookUrl(guildId, channelId) {
	const settings = loadWebhookSettings();
	return settings[guildId]?.[channelId] || null;
}

function deleteWebhookUrl(guildId, channelId) {
	const settings = loadWebhookSettings();
	if (settings[guildId]?.[channelId]) {
		delete settings[guildId][channelId];
		if (Object.keys(settings[guildId]).length === 0) {
			delete settings[guildId];
		}
		return saveWebhookSettings(settings);
	}
	return false;
}

module.exports = {
	loadWebhookSettings,
	saveWebhookSettings,
	setWebhookUrl,
	getWebhookUrl,
	deleteWebhookUrl,
};
