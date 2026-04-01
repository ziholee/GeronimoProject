// 필요한 discord.js 클래스들을 가져옵니다
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token } = require('../config.json');
const { loadVoiceMasterChannels } = require('./storage/voiceMasterStore');
const { loadWelcomeSettings } = require('./storage/welcomeStore');
const { loadLevelData, loadLevelConfig } = require('./storage/levelStore');
const { loadParties } = require('./storage/partyStore');

// 새로운 클라이언트 인스턴스를 생성합니다
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent,
	],
	partials: [
		Partials.Channel,
		Partials.Message,
		Partials.Reaction,
		Partials.User,
	],
});

// 명령어 컬렉션 생성
client.commands = new Collection();

// 명령어 폴더 경로
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// 명령어 로드
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[경고] ${filePath}에 필수 속성 "data" 또는 "execute"가 없습니다.`);
		}
	}
}

// 이벤트 폴더 경로
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// 이벤트 로드
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// VoiceMaster 채널 정보 로드
client.voiceMasterChannels = loadVoiceMasterChannels();
client.tempVoiceChannels = new Map();

// 환영 메시지 설정 로드
client.welcomeSettings = loadWelcomeSettings();

// 레벨/XP 데이터 및 설정 로드
client.levelData = loadLevelData();
client.levelConfig = loadLevelConfig();
client.partyData = loadParties();

// 클라이언트의 토큰으로 Discord에 로그인합니다
client.login(token);
