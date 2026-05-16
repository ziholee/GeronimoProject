const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { clientId, token } = require('../config.json');

const commands = [];
const isDryRun = process.argv.includes('--dry-run');

// 명령어 폴더 경로
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// 명령어 수집
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		}
		else {
			console.log(`[경고] ${filePath}에 필수 속성 "data" 또는 "execute"가 없습니다.`);
		}
	}
}

// REST 인스턴스 생성
const rest = new REST().setToken(token);

// 명령어 배포
(async () => {
	try {
		if (isDryRun) {
			console.log(`${commands.length}개의 슬래시 명령어를 검증했습니다. Discord API에는 배포하지 않습니다.`);
			console.log(commands.map(command => `/${command.name}`).join('\n'));
			return;
		}

		console.log(`${commands.length}개의 슬래시 명령어를 (글로벌)로 등록하는 중...`);

		// 글로벌 명령어로 등록 (모든 서버에서 사용 가능, 전파 지연 가능성 있음)
		const data = await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log(`${data.length}개의 슬래시 명령어가 글로벌로 성공적으로 등록되었습니다.`);
	}
	catch (error) {
		console.error(error);
	}
})();
