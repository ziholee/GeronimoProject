const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setWebhookUrl, getWebhookUrl, deleteWebhookUrl } = require('../../storage/webhookStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('웹훅설정')
		.setDescription('웹훅 URL을 설정하거나 확인합니다. (관리자 전용)')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand(subcommand =>
			subcommand
				.setName('설정')
				.setDescription('현재 채널의 웹훅 URL을 설정합니다.')
				.addStringOption(option =>
					option.setName('url')
						.setDescription('웹훅 URL')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('확인')
				.setDescription('현재 채널의 웹훅 URL을 확인합니다.'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('삭제')
				.setDescription('현재 채널의 웹훅 URL을 삭제합니다.')),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const guildId = interaction.guild.id;
		const channelId = interaction.channel.id;

		if (subcommand === '설정') {
			const webhookUrl = interaction.options.getString('url');

			if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
				await interaction.reply({ 
					content: '❌ 유효한 Discord 웹훅 URL이 아닙니다.', 
					flags: MessageFlags.Ephemeral 
				});
				return;
			}

			const success = setWebhookUrl(guildId, channelId, webhookUrl);
			if (success) {
				await interaction.reply({ 
					content: '✅ 웹훅 URL이 설정되었습니다!', 
					flags: MessageFlags.Ephemeral 
				});
			}
			else {
				await interaction.reply({ 
					content: '❌ 웹훅 URL 설정 중 오류가 발생했습니다.', 
					flags: MessageFlags.Ephemeral 
				});
			}
		}
		else if (subcommand === '확인') {
			const webhookUrl = getWebhookUrl(guildId, channelId);
			if (webhookUrl) {
				await interaction.reply({ 
					content: `현재 채널의 웹훅 URL:\n\`${webhookUrl}\``, 
					flags: MessageFlags.Ephemeral 
				});
			}
			else {
				await interaction.reply({ 
					content: '이 채널에는 설정된 웹훅 URL이 없습니다.', 
					flags: MessageFlags.Ephemeral 
				});
			}
		}
		else if (subcommand === '삭제') {
			const success = deleteWebhookUrl(guildId, channelId);
			if (success) {
				await interaction.reply({ 
					content: '✅ 웹훅 URL이 삭제되었습니다.', 
					flags: MessageFlags.Ephemeral 
				});
			}
			else {
				await interaction.reply({ 
					content: '이 채널에는 설정된 웹훅 URL이 없습니다.', 
					flags: MessageFlags.Ephemeral 
				});
			}
		}
	},
};
