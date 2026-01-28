const { SlashCommandBuilder, EmbedBuilder, WebhookClient, MessageFlags } = require('discord.js');
const { getWebhookUrl } = require('../../storage/webhookStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('웹훅포스트')
		.setDescription('웹훅을 통해 트위터 스타일의 고급 알림을 전송합니다.')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('웹훅 URL (설정된 웹훅이 있으면 생략 가능)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('내용')
				.setDescription('포스트 내용')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('제목')
				.setDescription('포스트 제목 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('이미지')
				.setDescription('이미지 URL (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('썸네일')
				.setDescription('썸네일 이미지 URL (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('색상')
				.setDescription('임베드 색상 (16진수 코드, 예: 1DA1F2)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('필드1제목')
				.setDescription('첫 번째 필드 제목 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('필드1내용')
				.setDescription('첫 번째 필드 내용 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('필드2제목')
				.setDescription('두 번째 필드 제목 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('필드2내용')
				.setDescription('두 번째 필드 내용 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('푸터')
				.setDescription('푸터 텍스트 (선택사항)')
				.setRequired(false)),
	async execute(interaction) {
		let webhookUrl = interaction.options.getString('url');
		const content = interaction.options.getString('내용');
		const title = interaction.options.getString('제목');
		const imageUrl = interaction.options.getString('이미지');
		const thumbnailUrl = interaction.options.getString('썸네일');
		const colorHex = interaction.options.getString('색상');
		const field1Title = interaction.options.getString('필드1제목');
		const field1Value = interaction.options.getString('필드1내용');
		const field2Title = interaction.options.getString('필드2제목');
		const field2Value = interaction.options.getString('필드2내용');
		const footer = interaction.options.getString('푸터');

		if (!content) {
			await interaction.reply({ 
				content: '내용은 필수입니다.', 
				flags: MessageFlags.Ephemeral 
			});
			return;
		}

		if (!webhookUrl) {
			const savedUrl = getWebhookUrl(interaction.guild.id, interaction.channel.id);
			if (savedUrl) {
				webhookUrl = savedUrl;
			}
			else {
				await interaction.reply({ 
					content: '웹훅 URL을 입력하거나 `/웹훅설정` 명령어로 먼저 설정해주세요.', 
					flags: MessageFlags.Ephemeral 
				});
				return;
			}
		}

		try {
			const webhookClient = new WebhookClient({ url: webhookUrl });

			const embed = new EmbedBuilder()
				.setDescription(content)
				.setTimestamp()
				.setColor(colorHex ? parseInt(colorHex.replace('#', ''), 16) : 0x1DA1F2);

			if (title) {
				embed.setTitle(title);
			}

			if (thumbnailUrl) {
				embed.setThumbnail(thumbnailUrl);
			}

			if (imageUrl) {
				embed.setImage(imageUrl);
			}

			if (field1Title && field1Value) {
				embed.addFields({ name: field1Title, value: field1Value, inline: false });
			}

			if (field2Title && field2Value) {
				embed.addFields({ name: field2Title, value: field2Value, inline: false });
			}

			if (footer) {
				embed.setFooter({ text: footer });
			}
			else {
				embed.setFooter({ 
					text: `${interaction.user.username}`, 
					iconURL: interaction.user.displayAvatarURL() 
				});
			}

			await webhookClient.send({
				embeds: [embed],
			});

			await interaction.reply({ 
				content: '✅ 웹훅 포스트가 성공적으로 전송되었습니다!', 
				flags: MessageFlags.Ephemeral 
			});
		}
		catch (error) {
			console.error('웹훅 전송 오류:', error);
			await interaction.reply({ 
				content: `❌ 웹훅 전송 중 오류가 발생했습니다: ${error.message}`, 
				flags: MessageFlags.Ephemeral 
			});
		}
	},
};
