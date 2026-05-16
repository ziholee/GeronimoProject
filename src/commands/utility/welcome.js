const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadWelcomeSettings, saveWelcomeSettings } = require('../../storage/welcomeStore');
const { guildOnlyCommand } = require('../../utils/commandContext');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, '../../../data');
const IMAGE_DIR = path.join(DATA_DIR, 'images');

function ensureImageDir() {
	if (!fs.existsSync(IMAGE_DIR)) {
		fs.mkdirSync(IMAGE_DIR, { recursive: true });
	}
}

function getImageFiles() {
	ensureImageDir();
	const files = fs.readdirSync(IMAGE_DIR).filter(file => {
		const ext = path.extname(file).toLowerCase();
		return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
	});
	return files;
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('환영메시지')
		.setDescription('환영 메시지 설정을 관리합니다.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subcommand =>
			subcommand
				.setName('채널설정')
				.setDescription('환영 메시지를 보낼 채널을 설정합니다.')
				.addChannelOption(option =>
					option
						.setName('채널')
						.setDescription('환영 메시지를 보낼 채널')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('배경설정')
				.setDescription('환영 메시지 배경 이미지를 설정합니다.')
				.addStringOption(option =>
					option
						.setName('이미지파일명')
						.setDescription('data/images 폴더에 있는 이미지 파일명을 입력하세요')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('배경목록')
				.setDescription('사용 가능한 배경 이미지 목록을 확인합니다.'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('메시지설정')
				.setDescription('환영 메시지 텍스트를 설정합니다.')
				.addStringOption(option =>
					option
						.setName('메시지')
						.setDescription('환영 메시지 텍스트 (사용자 멘션은 {user}로 표시)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('설정확인')
				.setDescription('현재 환영 메시지 설정을 확인합니다.'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('초기화')
				.setDescription('환영 메시지 설정을 초기화합니다.'),
		)),
	async execute(interaction) {
		if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '이 명령어는 서버 관리자만 사용할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const client = interaction.client;
		client.welcomeSettings = client.welcomeSettings || loadWelcomeSettings();

		const subcommand = interaction.options.getSubcommand();
		const guildId = interaction.guild.id;
		const settings = client.welcomeSettings.get(guildId) || {};

		if (subcommand === '채널설정') {
			const channel = interaction.options.getChannel('채널');
			if (!channel.isTextBased()) {
				return interaction.reply({ content: '텍스트 채널만 선택할 수 있습니다.', flags: MessageFlags.Ephemeral });
			}

			settings.channelId = channel.id;
			client.welcomeSettings.set(guildId, settings);
			saveWelcomeSettings(client.welcomeSettings);

			await interaction.reply({
				content: `환영 메시지 채널이 ${channel}로 설정되었습니다.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		else if (subcommand === '배경설정') {
			const fileName = interaction.options.getString('이미지파일명');
			const filePath = path.join(IMAGE_DIR, fileName);

			if (!fs.existsSync(filePath)) {
				return interaction.reply({
					content: '이미지 파일을 찾을 수 없습니다.\n`data/images` 폴더에 이미지 파일을 넣어주세요.\n사용 가능한 파일 목록: `/환영메시지 배경목록`',
					flags: MessageFlags.Ephemeral,
				});
			}

			const ext = path.extname(fileName).toLowerCase();
			if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
				return interaction.reply({
					content: '지원하는 이미지 형식이 아닙니다. (png, jpg, jpeg, gif, webp)',
					flags: MessageFlags.Ephemeral,
				});
			}

			settings.backgroundPath = fileName;
			client.welcomeSettings.set(guildId, settings);
			saveWelcomeSettings(client.welcomeSettings);

			await interaction.reply({
				content: `배경 이미지가 \`${fileName}\`로 설정되었습니다. (권장 크기: 1024x400)`,
				flags: MessageFlags.Ephemeral,
			});
		}
		else if (subcommand === '배경목록') {
			const imageFiles = getImageFiles();

			if (imageFiles.length === 0) {
				return interaction.reply({
					content: '사용 가능한 배경 이미지가 없습니다.\n`data/images` 폴더에 이미지 파일을 넣어주세요.',
					flags: MessageFlags.Ephemeral,
				});
			}

			const embed = new EmbedBuilder()
				.setTitle('사용 가능한 배경 이미지')
				.setDescription(`총 ${imageFiles.length}개의 이미지 파일`)
				.setColor(0x5865f2)
				.addFields({
					name: '파일 목록',
					value: imageFiles.map((file, index) => `${index + 1}. \`${file}\``).join('\n') || '없음',
					inline: false,
				})
				.setFooter({ text: '배경 설정: /환영메시지 배경설정 이미지파일명: [파일명]' });

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
		else if (subcommand === '메시지설정') {
			const message = interaction.options.getString('메시지');
			settings.message = message.replace(/{user}/g, '{user}');
			client.welcomeSettings.set(guildId, settings);
			saveWelcomeSettings(client.welcomeSettings);

			await interaction.reply({
				content: `환영 메시지가 설정되었습니다.\n설정된 메시지: ${message.replace(/{user}/g, interaction.user.toString())}`,
				flags: MessageFlags.Ephemeral,
			});
		}
		else if (subcommand === '설정확인') {
			const embed = new EmbedBuilder()
				.setTitle('환영 메시지 설정')
				.setColor(0x5865f2);

			if (settings.channelId) {
				const channel = interaction.guild.channels.cache.get(settings.channelId);
				embed.addFields({ name: '채널', value: channel ? channel.toString() : '채널을 찾을 수 없음', inline: true });
			}
			else {
				embed.addFields({ name: '채널', value: '설정되지 않음', inline: true });
			}

			if (settings.backgroundPath) {
				embed.addFields({ name: '배경 이미지', value: `\`${settings.backgroundPath}\``, inline: true });
			}
			else {
				embed.addFields({ name: '배경 이미지', value: '기본 배경 사용', inline: true });
			}

			if (settings.message) {
				embed.addFields({ name: '환영 메시지', value: settings.message, inline: false });
			}
			else {
				embed.addFields({ name: '환영 메시지', value: '기본 메시지 사용', inline: false });
			}

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
		else if (subcommand === '초기화') {
			client.welcomeSettings.delete(guildId);
			saveWelcomeSettings(client.welcomeSettings);

			await interaction.reply({
				content: '환영 메시지 설정이 초기화되었습니다.',
				flags: MessageFlags.Ephemeral,
			});
		}
	},
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === '이미지파일명') {
			const imageFiles = getImageFiles();
			const filtered = imageFiles
				.filter(file => file.toLowerCase().includes(focusedOption.value.toLowerCase()))
				.slice(0, 25);

			await interaction.respond(
				filtered.map(file => ({ name: file, value: file })),
			);
		}
	},
};
