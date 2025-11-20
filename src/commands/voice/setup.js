const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { saveVoiceMasterChannels } = require('../../storage/voiceMasterStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('음성채널설정')
		.setDescription('음성 채널 자동 생성 기능을 설정합니다.')
		.addChannelOption(option =>
			option
				.setName('채널')
				.setDescription('자동 생성 채널로 설정할 음성 채널')
				.setRequired(true)
				.addChannelTypes(2)), // Voice Channel
	async execute(interaction) {
		if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({ content: '이 명령어를 사용하려면 서버 관리자 권한이 필요합니다.', flags: MessageFlags.Ephemeral });
			return;
		}
		
		const channel = interaction.options.getChannel('채널');
		
		if (channel.type !== 2) {
			await interaction.reply({ content: '음성 채널만 설정할 수 있습니다.', flags: MessageFlags.Ephemeral });
			return;
		}
		
		// 자동 생성 채널 목록 초기화
		interaction.client.voiceMasterChannels = interaction.client.voiceMasterChannels || new Map();
		
		const guildId = interaction.guild.id;
		if (!interaction.client.voiceMasterChannels.has(guildId)) {
			interaction.client.voiceMasterChannels.set(guildId, new Set());
		}

		const guildChannels = interaction.client.voiceMasterChannels.get(guildId);

		// 채널 추가/제거
		if (guildChannels.has(channel.id)) {
			guildChannels.delete(channel.id);
			await interaction.reply({ content: `\`${channel.name}\` 채널이 자동 생성 채널 목록에서 제거되었습니다.`, flags: MessageFlags.Ephemeral });
		}
		else {
			guildChannels.add(channel.id);
			await interaction.reply({ content: `\`${channel.name}\` 채널이 자동 생성 채널로 설정되었습니다. 이 채널에 입장하면 자동으로 임시 음성 채널이 생성됩니다.`, flags: MessageFlags.Ephemeral });
		}

		saveVoiceMasterChannels(interaction.client.voiceMasterChannels);
	},
};

