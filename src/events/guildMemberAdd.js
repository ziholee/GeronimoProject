const { Events, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const { loadWelcomeSettings } = require('../storage/welcomeStore');
const { addLog } = require('../storage/logStore');

const WELCOME_FONT_FAMILY = 'WelcomeKorean';
const SYSTEM_FONT_FALLBACKS = [
	process.env.WELCOME_FONT_PATH,
	'/System/Library/Fonts/AppleSDGothicNeo.ttc',
	'/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
	'/Library/Fonts/NanumGothic.ttf',
	'/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
	'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
	'/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
	'C:\\Windows\\Fonts\\malgun.ttf',
].filter(Boolean);

let welcomeFontRegistered = false;

function getWelcomeFontFamily() {
	if (welcomeFontRegistered) {
		return WELCOME_FONT_FAMILY;
	}

	for (const fontPath of SYSTEM_FONT_FALLBACKS) {
		if (!fs.existsSync(fontPath)) {
			continue;
		}

		try {
			registerFont(fontPath, { family: WELCOME_FONT_FAMILY });
			welcomeFontRegistered = true;
			return WELCOME_FONT_FAMILY;
		}
		catch (error) {
			console.warn(`환영 이미지 폰트 등록 실패 (${fontPath}):`, error.message);
		}
	}

	console.warn('환영 이미지용 한글 폰트를 찾지 못했습니다. 시스템 기본 폰트로 렌더링합니다.');
	return '"Apple SD Gothic Neo", "Noto Sans CJK KR", "NanumGothic", Arial, sans-serif';
}

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
		const client = member.client;
		const guild = member.guild;

		const guildId = guild.id;
		const userId = member.user.id;

		addLog(guildId, userId, 'MEMBER_JOIN', {
			username: member.user.username,
			displayName: member.displayName,
			roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
		});

		client.welcomeSettings = client.welcomeSettings || loadWelcomeSettings();
		const settings = client.welcomeSettings.get(guild.id);

		if (!settings || !settings.channelId) {
			return;
		}

		const channel = guild.channels.cache.get(settings.channelId);
		if (!channel) {
			return;
		}

		try {
			const canvas = createCanvas(1024, 400);
			const ctx = canvas.getContext('2d');

			let backgroundImage = null;
			const backgroundPath = settings.backgroundPath
				? path.resolve(__dirname, '../../data/images', settings.backgroundPath)
				: null;

			if (backgroundPath && fs.existsSync(backgroundPath)) {
				backgroundImage = await loadImage(backgroundPath);
				ctx.drawImage(backgroundImage, 0, 0, 1024, 400);
			}
			else {
				const gradient = ctx.createLinearGradient(0, 0, 1024, 400);
				gradient.addColorStop(0, '#5865F2');
				gradient.addColorStop(1, '#23272A');
				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, 1024, 400);
			}

			ctx.strokeStyle = '#FFFFFF';
			ctx.lineWidth = 5;
			ctx.strokeRect(0, 0, 1024, 400);

			const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;
			const avatarSize = 180;

			ctx.save();
			ctx.beginPath();
			ctx.arc(centerX, centerY - 20, avatarSize / 2, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();

			ctx.drawImage(avatar, centerX - avatarSize / 2, centerY - avatarSize / 2 - 20, avatarSize, avatarSize);
			ctx.restore();

			ctx.strokeStyle = '#FFFFFF';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(centerX, centerY - 20, avatarSize / 2, 0, Math.PI * 2, true);
			ctx.stroke();

			ctx.fillStyle = '#FFFFFF';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			const fontFamily = getWelcomeFontFamily();
			const fontSize = 48;
			ctx.font = `bold ${fontSize}px ${fontFamily}`;
			ctx.fillText(`환영합니다, ${member.user.username}!`, centerX, centerY + 120);

			const subFontSize = 32;
			ctx.font = `${subFontSize}px ${fontFamily}`;
			ctx.fillText(`${guild.name}에 오신 것을 환영합니다!`, centerX, centerY + 170);

			const buffer = canvas.toBuffer('image/png');
			const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

			let welcomeMessage = settings.message || `안녕하세요, ${member.user}! ${guild.name}에 오신 것을 환영합니다! 🎉`;
			welcomeMessage = welcomeMessage.replace(/{user}/g, member.user.toString());

			await channel.send({
				content: welcomeMessage,
				files: [attachment],
			});
		}
		catch (error) {
			console.error('환영 메시지 생성 실패:', error);
		}
	},
};
