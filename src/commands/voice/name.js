const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('채널이름변경')
		.setDescription('현재 음성 채널의 이름을 변경합니다.')
		.addStringOption(option =>
			option
				.setName('이름')
				.setDescription('변경할 채널 이름')
				.setRequired(true)
				.setMaxLength(100))),
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
			await interaction.reply({ content: '이 채널의 소유자만 이름을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
			return;
		}

		const newName = interaction.options.getString('이름');

		try {
			await voiceChannel.setName(newName);
			await interaction.reply({ content: `채널 이름이 \`${newName}\`로 변경되었습니다.`, flags: MessageFlags.Ephemeral });
		}
		catch (error) {
			console.error('채널 이름 변경 실패:', error);
			await interaction.reply({ content: '채널 이름 변경 중 오류가 발생했습니다.', flags: MessageFlags.Ephemeral });
		}
	},
};
