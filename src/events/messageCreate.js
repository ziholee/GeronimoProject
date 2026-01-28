const { Events, EmbedBuilder } = require('discord.js');
const {
	addXp,
	getUserData,
	getRequiredXpForLevel,
	loadLevelData,
} = require('../storage/levelStore');
const { addLog } = require('../storage/logStore');

// 기본 설정 값
const DEFAULT_COOLDOWN_MS = 60_000; // 60초
const MIN_MESSAGE_LENGTH = 3;
const PREFIX = '!';

async function findMemberByQuery(guild, query) {
	const lower = query.toLowerCase();

	// 우선 캐시에서 검색
	let member =
		guild.members.cache.find(m =>
			m.displayName.toLowerCase().includes(lower) ||
			m.user.username.toLowerCase().includes(lower),
		) || null;

	if (member) return member;

	// 캐시에 없으면 길드 멤버를 한 번 가져와서 다시 검색 (규모가 너무 크지 않다는 가정)
	try {
		const fetched = await guild.members.fetch();
		member =
			fetched.find(m =>
				m.displayName.toLowerCase().includes(lower) ||
				m.user.username.toLowerCase().includes(lower),
			) || null;
		return member;
	}
	catch {
		return null;
	}
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// DM, 봇 메시지, 시스템 메시지 무시
		if (!message.guild) return;
		if (message.author.bot) return;
		if (!message.content) return;

		const client = message.client;
		client.levelData = client.levelData || new Map();
		client.levelConfig = client.levelConfig || new Map();

		const content = message.content.trim();
		const guildId = message.guild.id;
		const userId = message.author.id;
		const now = Date.now();

		addLog(guildId, userId, 'MESSAGE_SEND', {
			messageId: message.id,
			channelId: message.channel.id,
			channelName: message.channel.name,
			content: content.substring(0, 500),
			attachments: message.attachments.size > 0 ? message.attachments.map(a => a.url) : [],
		});

		// 설정 로드
		const config = client.levelConfig.get(guildId) || {};
		const cooldownMs = Number(config.cooldownMs) || DEFAULT_COOLDOWN_MS;

		// 일반 메시지 XP 처리 (너무 짧은 메시지는 무시)
		if (content.length >= MIN_MESSAGE_LENGTH) {
			const userData = getUserData(client.levelData, guildId, userId);

			// 쿨타임 체크
			if (!userData.lastMessageAt || now - userData.lastMessageAt >= cooldownMs) {
				// 랜덤 XP (예: 5~15)
				const gainedXp = 5 + Math.floor(Math.random() * 11);
				const { userData: updatedUser, leveledUp } = addXp(
					client.levelData,
					guildId,
					userId,
					gainedXp,
					now,
				);

				// 레벨업 알림
				if (leveledUp) {
					const levelUpNotice = config.levelUpNotice ?? true;
					if (levelUpNotice) {
						let targetChannel = message.channel;
						if (config.levelUpChannelId) {
							const channel = message.guild.channels.cache.get(config.levelUpChannelId);
							if (channel && channel.isTextBased()) {
								targetChannel = channel;
							}
						}

						await targetChannel.send(
							`${message.author} 레벨 업! 현재 레벨: **${updatedUser.level}** 🎉`,
						);
					}
				}
			}
		}

		// 접두사(!) 명령어 처리
		if (content.startsWith(PREFIX)) {
			const withoutPrefix = content.slice(PREFIX.length).trim();
			if (!withoutPrefix) return;

			const [commandNameRaw, ...args] = withoutPrefix.split(/\s+/);
			const commandName = commandNameRaw.toLowerCase();

			// !레벨
			if (commandName === '레벨') {
				let targetUser = message.mentions.users.first();

				// 멘션이 없고, 뒤에 사용자명이 온 경우: 닉네임/유저명으로 검색
				if (!targetUser && args.length > 0) {
					const query = args.join(' ');
					const member = await findMemberByQuery(message.guild, query);

					if (!member) {
						await message.channel.send(`'${query}' 에 해당하는 사용자를 찾을 수 없습니다.`);
						return;
					}

					targetUser = member.user;
				}

				// 아무것도 없으면 자기 자신
				if (!targetUser) {
					targetUser = message.author;
				}

				const userData = getUserData(client.levelData, guildId, targetUser.id);
				const requiredXp = getRequiredXpForLevel(userData.level);

				const embed = new EmbedBuilder()
					.setColor(0x5865f2)
					.setTitle(`📊 ${targetUser.username}님의 레벨 정보`)
					.setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
					.addFields(
						{ name: '레벨', value: `${userData.level}`, inline: true },
						{ name: '현재 XP', value: `${userData.xp} / ${requiredXp}`, inline: true },
					)
					.setFooter({ text: message.guild.name })
					.setTimestamp();

				await message.channel.send({ embeds: [embed] });
			}
			// !랭킹
			else if (commandName === '랭킹') {
				// 서버 재시작 등으로 메모리가 비었을 수 있으니 파일에서 한 번 보정 로드
				client.levelData = client.levelData && client.levelData.size > 0
					? client.levelData
					: loadLevelData();

				const guildMap = client.levelData.get(guildId);

				if (!guildMap || guildMap.size === 0) {
					await message.channel.send('아직 레벨 데이터가 없습니다.');
					return;
				}

				const limit = 10;

				const membersData = Array.from(guildMap.entries()).map(([memberId, data]) => ({
					userId: memberId,
					level: data.level,
					xp: data.xp,
				}));

				// 레벨 우선, 동일 레벨이면 XP 많은 순
				membersData.sort((a, b) => {
					if (b.level !== a.level) return b.level - a.level;
					return b.xp - a.xp;
				});

				const top = membersData.slice(0, limit);

				const lines = await Promise.all(
					top.map(async (entry, index) => {
						const member = await message.guild.members
							.fetch(entry.userId)
							.catch(() => null);
						const name = member?.displayName || `<@${entry.userId}>`;
						return `**${index + 1}위** - ${name} : 레벨 **${entry.level}**, XP **${entry.xp}**`;
					}),
				);

				const embed = new EmbedBuilder()
					.setColor(0xf1c40f)
					.setTitle(`🏆 ${message.guild.name} 레벨 랭킹 TOP ${top.length}`)
					.setDescription(lines.join('\n'))
					.setTimestamp();

				await message.channel.send({ embeds: [embed] });
			}
		}

		// 간단하게 즉시 저장 (규모 커지면 주기적 저장으로 변경 가능)
		const { saveLevelData } = require('../storage/levelStore');
		saveLevelData(client.levelData);
	},
};


