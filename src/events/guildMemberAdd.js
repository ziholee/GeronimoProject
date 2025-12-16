const { Events, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const { loadWelcomeSettings } = require('../storage/welcomeStore');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
		const client = member.client;
		const guild = member.guild;

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

			const fontSize = 48;
			ctx.font = `bold ${fontSize}px Arial`;
			ctx.fillText(`환영합니다, ${member.user.username}!`, centerX, centerY + 120);

			const subFontSize = 32;
			ctx.font = `${subFontSize}px Arial`;
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

