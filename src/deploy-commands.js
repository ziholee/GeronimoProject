const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { clientId, token } = require('../config.json');

const commands = [];

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
		console.log(`${commands.length}개의 슬래시 명령어를 등록하는 중...`);

		// 글로벌 명령어로 등록
		const data = await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log(`${data.length}개의 슬래시 명령어가 성공적으로 등록되었습니다.`);
	}
	catch (error) {
		console.error(error);
	}
})();

