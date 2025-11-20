const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(oldState, newState) {
		// 음성 채널 자동 생성 기능
		const client = newState.client;

		// 자동 생성 채널 목록 가져오기
		client.voiceMasterChannels = client.voiceMasterChannels || new Map();
		client.tempVoiceChannels = client.tempVoiceChannels || new Map();

		// 사용자가 음성 채널에 입장한 경우
		if (newState.channel) {
			const channelId = newState.channel.id;

			const guildChannels = client.voiceMasterChannels.get(newState.guild.id);

			// 자동 생성 채널인지 확인
			if (guildChannels?.has(channelId)) {
				// 임시 음성 채널 생성
				const guild = newState.guild;
				const parent = newState.channel.parent;
				const user = newState.member?.user;

				if (!user) return;

				try {
					// Voice Channel
					const tempChannel = await guild.channels.create({
						name: `${user.username}의 채널`,
						type: ChannelType.GuildVoice,
						parent: parent?.id,
						permissionOverwrites: [
							{
								id: user.id,
								allow: [
									PermissionFlagsBits.ManageChannels,
									PermissionFlagsBits.Connect,
									PermissionFlagsBits.Speak,
								],
							},
							{
								id: guild.roles.everyone.id,
								allow: [
									PermissionFlagsBits.Connect,
									PermissionFlagsBits.Speak,
								],
							},
						],
					});

					// 사용자를 새 채널로 이동
					await newState.setChannel(tempChannel);

					try {
						const embed = new EmbedBuilder()
							.setTitle('임시 음성 채널 관리 안내')
							.setColor(0x5865f2)
							.setDescription(
								'아래 슬래시 명령어를 사용해 채널을 바로 관리할 수 있습니다. (채널 소유자만 실행 가능)',
							)
							.addFields(
								{
									name: '/채널이름변경',
									value: '현재 음성 채널의 이름을 변경합니다.',
								},
								{
									name: '/채널인원제한',
									value: '최대 수용 인원을 설정하거나 제한을 해제합니다.',
								},
								{
									name: '/채널비공개',
									value: '채널을 공개/비공개로 전환합니다.',
								},
							)
							.setFooter({ text: '모든 명령은 이 음성 채널 채팅창에서 바로 실행할 수 있습니다.' });

						await tempChannel.send({
							content: `<@${user.id}> 임시 음성 채널이 준비되었습니다!`,
							embeds: [embed],
						});
					}
					catch (error) {
						console.error('음성 채널 안내 메시지 전송 실패:', error);
					}

					// 임시 채널 정보 저장
					client.tempVoiceChannels.set(tempChannel.id, {
						ownerId: user.id,
						createdAt: Date.now(),
						parentChannelId: channelId,
					});

					console.log(`임시 음성 채널 생성: ${tempChannel.name} (${tempChannel.id})`);
				}
				catch (error) {
					console.error('임시 음성 채널 생성 실패:', error);
				}
			}
		}

		// 사용자가 음성 채널에서 나간 경우
		if (oldState.channel) {
			const channelId = oldState.channel.id;

			// 임시 채널인지 확인
			if (client.tempVoiceChannels.has(channelId)) {
				const channel = oldState.channel;
				// 채널이 비어있는지 확인
				if (channel.members.size === 0) {
					try {
						await channel.delete();
						client.tempVoiceChannels.delete(channelId);
						console.log(`임시 음성 채널 삭제: ${channel.name} (${channelId})`);
					}
					catch (error) {
						console.error('임시 음성 채널 삭제 실패:', error);
					}
				}
			}
		}
	},
};

