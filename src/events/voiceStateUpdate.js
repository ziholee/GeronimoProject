const { Events } = require('discord.js');

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
			
			// 자동 생성 채널인지 확인
			if (client.voiceMasterChannels.has(channelId)) {
				// 임시 음성 채널 생성
				const guild = newState.guild;
				const parent = newState.channel.parent;
				const user = newState.member?.user;
				
				if (!user) return;
				
				try {
					const tempChannel = await guild.channels.create({
						name: `${user.username}의 채널`,
						type: 2, // Voice Channel
						parent: parent?.id,
						permissionOverwrites: [
							{
								id: user.id,
								allow: ['ManageChannels', 'Connect', 'Speak'],
							},
							{
								id: guild.roles.everyone.id,
								allow: ['Connect', 'Speak'],
							},
						],
					});
					
					// 사용자를 새 채널로 이동
					await newState.setChannel(tempChannel);
					
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

