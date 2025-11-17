const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('채널인원제한')
		.setDescription('현재 음성 채널의 최대 인원을 설정합니다.')
		.addIntegerOption(option =>
			option
				.setName('인원')
				.setDescription('최대 인원 수 (0으로 설정하면 제한 없음)')
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(99)),
	async execute(interaction) {
		if (!interaction.member.voice.channel) {
			await interaction.reply({ content: '음성 채널에 먼저 입장해주세요.', ephemeral: true });
			return;
		}
		
		const voiceChannel = interaction.member.voice.channel;
		const client = interaction.client;
		
		// 임시 채널인지 확인
		if (!client.tempVoiceChannels?.has(voiceChannel.id)) {
			await interaction.reply({ content: '이 명령어는 자동 생성된 임시 채널에서만 사용할 수 있습니다.', ephemeral: true });
			return;
		}
		
		const channelInfo = client.tempVoiceChannels.get(voiceChannel.id);
		
		// 채널 소유자 확인
		if (channelInfo.ownerId !== interaction.user.id) {
			await interaction.reply({ content: '이 채널의 소유자만 인원 제한을 설정할 수 있습니다.', ephemeral: true });
			return;
		}
		
		const limit = interaction.options.getInteger('인원');
		
		try {
			await voiceChannel.setUserLimit(limit === 0 ? null : limit);
			const message = limit === 0 
				? '채널 인원 제한이 해제되었습니다.' 
				: `채널 최대 인원이 ${limit}명으로 설정되었습니다.`;
			await interaction.reply({ content: message, ephemeral: true });
		}
		catch (error) {
			console.error('채널 인원 제한 설정 실패:', error);
			await interaction.reply({ content: '채널 인원 제한 설정 중 오류가 발생했습니다.', ephemeral: true });
		}
	},
};

