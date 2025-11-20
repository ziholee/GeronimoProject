const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('채널비공개')
		.setDescription('현재 음성 채널을 비공개로 설정합니다.')
		.addBooleanOption(option =>
			option
				.setName('비공개')
				.setDescription('비공개 여부')
				.setRequired(true)),
	async execute(interaction) {
		if (!interaction.member.voice.channel) {
			await interaction.reply({ content: '음성 채널에 먼저 입장해주세요.', flags: MessageFlags.Ephemeral });
			return;
		}
		
		const voiceChannel = interaction.member.voice.channel;
		const client = interaction.client;
		
		// 임시 채널인지 확인
		if (!client.tempVoiceChannels?.has(voiceChannel.id)) {
			await interaction.reply({ content: '이 명령어는 자동 생성된 임시 채널에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
			return;
		}
		
		const channelInfo = client.tempVoiceChannels.get(voiceChannel.id);
		
		// 채널 소유자 확인
		if (channelInfo.ownerId !== interaction.user.id) {
			await interaction.reply({ content: '이 채널의 소유자만 비공개 설정을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
			return;
		}
		
		const isPrivate = interaction.options.getBoolean('비공개');
		
		try {
			if (isPrivate) {
				// 비공개 설정: @everyone의 Connect 권한 거부
				await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
					Connect: false,
				});
				await interaction.reply({ content: '채널이 비공개로 설정되었습니다. 이제 소유자만 다른 사용자를 초대할 수 있습니다.', flags: MessageFlags.Ephemeral });
			}
			else {
				// 공개 설정: @everyone의 Connect 권한 허용
				await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
					Connect: true,
				});
				await interaction.reply({ content: '채널이 공개로 설정되었습니다.', flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('채널 비공개 설정 실패:', error);
			await interaction.reply({ content: '채널 비공개 설정 중 오류가 발생했습니다.', flags: MessageFlags.Ephemeral });
		}
	},
};

