const { Events, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } = require('discord.js');
const { endVote } = require('../commands/utility/vote');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// 버튼 상호작용 처리
		if (interaction.isButton()) {
			const customId = interaction.customId;
			const messageId = interaction.message.id;
			
			// 종료 버튼 처리
			if (customId.startsWith('end_vote_')) {
				const creatorId = customId.split('_')[2];
				const vote = interaction.client.voteData?.get(messageId);
				
				if (!vote) {
					await interaction.reply({ content: '투표를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
					return;
				}
				
				if (vote.ended) {
					await interaction.reply({ content: '이미 종료된 투표입니다.', flags: MessageFlags.Ephemeral });
					return;
				}
				
				// 권한 확인: 생성자 또는 서버 관리자
				const isCreator = interaction.user.id === creatorId || interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;
				
				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 종료할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}
				
				const channelId = interaction.channel?.id || interaction.channelId || vote.channelId;
				if (!channelId) {
					await interaction.reply({ content: '채널을 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
					return;
				}
				
				await endVote(interaction.client, messageId, vote, channelId);
				await interaction.reply({ content: '투표가 종료되었습니다.', flags: MessageFlags.Ephemeral });
				return;
			}
			
			if (customId.startsWith('vote_')) {
				const parts = customId.split('_');
				const choiceIndex = parseInt(parts[1]);
				const allowMultiple = parts[2] === '1';
				const isAnonymous = parts[3] === '1';
				const originalEmbed = interaction.message.embeds[0];
				
				// 투표 데이터 확인 - vote.js에서 이미 저장한 객체를 사용
				interaction.client.voteData = interaction.client.voteData || new Map();
				let currentVote = interaction.client.voteData.get(messageId);
				
				if (!currentVote) {
					// vote.js에서 저장하지 않은 경우 (하위 호환성)
					// 원본 임베드에서 선택지 추출
					const choices = originalEmbed.fields.map(field => {
						const match = field.name.match(/^[^\s]+\s(.+)$/);
						return match ? match[1] : field.name;
					});
					
					currentVote = {
						choices,
						voters: new Map(),
						isAnonymous,
						allowMultiple,
						ended: false,
					};
					interaction.client.voteData.set(messageId, currentVote);
					console.log(`[경고] 투표 데이터가 없어 새로 생성: ${messageId}, choices=${choices.length}`);
				}
				else {
					console.log(`투표 데이터 찾음: ${messageId}, choices=${currentVote.choices?.length || 0}, voters.size=${currentVote.voters?.size || 0}`);
				}
				
				// voters Map이 없으면 초기화 (이미 있는 객체의 voters를 보존)
				if (!currentVote.voters) {
					console.log(`[경고] voters Map이 없어 초기화: ${messageId}`);
					currentVote.voters = new Map();
				}
				
				// 투표가 종료되었는지 확인
				if (currentVote.ended) {
					await interaction.reply({ content: '이미 종료된 투표입니다.', flags: MessageFlags.Ephemeral });
					return;
				}
				const userId = interaction.user.id;
				
				// 중복 투표 허용 여부에 따라 처리
				if (!currentVote.allowMultiple) {
					// 같은 선택지에 이미 투표한 경우
					if (currentVote.voters.has(choiceIndex) && currentVote.voters.get(choiceIndex).has(userId)) {
						// 이미 투표한 경우 투표 취소
						currentVote.voters.get(choiceIndex).delete(userId);
						if (currentVote.voters.get(choiceIndex).size === 0) {
							currentVote.voters.delete(choiceIndex);
						}
					}
					else {
						// 다른 선택지의 기존 투표 제거
						for (const [index, voters] of currentVote.voters.entries()) {
							if (index !== choiceIndex) {
								voters.delete(userId);
								if (voters.size === 0) {
									currentVote.voters.delete(index);
								}
							}
						}
						
						// 새 투표 추가
						if (!currentVote.voters.has(choiceIndex)) {
							currentVote.voters.set(choiceIndex, new Set());
						}
						currentVote.voters.get(choiceIndex).add(userId);
					}
				}
				else {
					// 중복 투표 허용
					// 같은 선택지에 이미 투표한 경우 취소, 아니면 추가
					if (currentVote.voters.has(choiceIndex) && currentVote.voters.get(choiceIndex).has(userId)) {
						currentVote.voters.get(choiceIndex).delete(userId);
						if (currentVote.voters.get(choiceIndex).size === 0) {
							currentVote.voters.delete(choiceIndex);
						}
					}
					else {
						if (!currentVote.voters.has(choiceIndex)) {
							currentVote.voters.set(choiceIndex, new Set());
						}
						currentVote.voters.get(choiceIndex).add(userId);
					}
				}
				
				// 투표 데이터 저장 확인 (디버깅)
				console.log(`투표 버튼 클릭: messageId=${messageId}, choiceIndex=${choiceIndex}, 전체 voters.size=${currentVote.voters.size}`);
				const voterCounts = Array.from(currentVote.voters.entries()).map(([idx, voters]) => ({
					index: idx,
					count: voters.size,
					voterIds: Array.from(voters).slice(0, 5), // 최대 5명만 로그
				}));
				console.log(`투표 후 상태:`, voterCounts);
				
				// voteData에 저장된 객체가 currentVote와 같은지 확인
				const storedVote = interaction.client.voteData.get(messageId);
				console.log(`객체 참조 동일: ${currentVote === storedVote}, storedVote.voters.size=${storedVote?.voters?.size || 0}`);
				
				// Embed 업데이트
				const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
				const fields = originalEmbed.fields.map((field, index) => {
					const voteCount = currentVote.voters.get(index)?.size || 0;
					const voters = currentVote.voters.get(index);
					
					let value = `${voteCount}표`;
					if (!currentVote.isAnonymous && voters && voters.size > 0) {
						const voterNames = Array.from(voters)
							.map(id => {
								const member = interaction.guild?.members.cache.get(id);
								return member ? member.displayName : `<@${id}>`;
							})
							.slice(0, 10); // 최대 10명만 표시
						
						value += `\n투표자: ${voterNames.join(', ')}`;
						if (voters.size > 10) {
							value += ` 외 ${voters.size - 10}명`;
						}
					}
					
					return {
						name: field.name,
						value,
						inline: false,
					};
				});
				
				const updatedEmbed = EmbedBuilder.from(originalEmbed)
					.setFields(fields);
				
				await interaction.update({ embeds: [updatedEmbed] });
				return;
			}
		}

		// 슬래시 명령어 처리
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`${interaction.commandName}에 해당하는 명령어를 찾을 수 없습니다.`);
				return;
			}

			try {
				await command.execute(interaction);
			}
			catch (error) {
				console.error(`명령어 실행 중 오류 발생: ${error}`);
				const errorMessage = { content: '이 명령어를 실행하는 중 오류가 발생했습니다!', flags: MessageFlags.Ephemeral };
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage);
				}
				else {
					await interaction.reply(errorMessage);
				}
			}
		}
	},
};

