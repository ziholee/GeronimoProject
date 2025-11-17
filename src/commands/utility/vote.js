const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('투표')
		.setDescription('투표를 생성합니다.')
		.addStringOption(option =>
			option.setName('제목')
				.setDescription('투표 제목')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지1')
				.setDescription('첫 번째 선택지')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지2')
				.setDescription('두 번째 선택지')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지3')
				.setDescription('세 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지4')
				.setDescription('네 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지5')
				.setDescription('다섯 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지6')
				.setDescription('여섯 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지7')
				.setDescription('일곱 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지8')
				.setDescription('여덟 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지9')
				.setDescription('아홉 번째 선택지 (선택사항)')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('선택지10')
				.setDescription('열 번째 선택지 (선택사항)')
				.setRequired(false))
		.addBooleanOption(option =>
			option.setName('무기명')
				.setDescription('무기명 투표 여부 (기본값: false)')
				.setRequired(false))
		.addBooleanOption(option =>
			option.setName('중복허용')
				.setDescription('중복 투표 허용 여부 (기본값: false)')
				.setRequired(false))
		.addIntegerOption(option =>
			option.setName('종료시간')
				.setDescription('투표 종료 시간 (분 단위, 선택사항)')
				.setRequired(false)
				.setMinValue(1)
				.setMaxValue(1440)),
	async execute(interaction) {
		const title = interaction.options.getString('제목');
		const isAnonymous = interaction.options.getBoolean('무기명') ?? false;
		const allowMultiple = interaction.options.getBoolean('중복허용') ?? false;
		const endTimeMinutes = interaction.options.getInteger('종료시간');

		const choices = [];
		for (let i = 1; i <= 10; i++) {
			const choice = interaction.options.getString(`선택지${i}`);
			if (choice) choices.push(choice);
		}

		if (choices.length < 2) {
			await interaction.reply({ content: '최소 2개 이상의 선택지가 필요합니다.', ephemeral: true });
			return;
		}

		const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

		// 버튼은 최대 5개씩 한 행에 배치 (Discord 제한)
		const buttonRows = [];
		for (let i = 0; i < choices.length; i += 5) {
			const buttons = choices.slice(i, i + 5).map((choice, index) =>
				new ButtonBuilder()
					.setCustomId(`vote_${i + index}_${allowMultiple ? '1' : '0'}_${isAnonymous ? '1' : '0'}`)
					.setLabel(choice.length > 80 ? choice.substring(0, 77) + '...' : choice)
					.setStyle(ButtonStyle.Primary)
					.setEmoji(emojis[i + index]));
			buttonRows.push(new ActionRowBuilder().addComponents(buttons));
		}

		// 종료 버튼 추가
		const endButton = new ButtonBuilder()
			.setCustomId(`end_vote_${interaction.user.id}`)
			.setLabel('투표 종료')
			.setStyle(ButtonStyle.Danger)
			.setEmoji('⏹️');
		buttonRows.push(new ActionRowBuilder().addComponents(endButton));

		const endTime = endTimeMinutes ? new Date(Date.now() + endTimeMinutes * 60 * 1000) : null;
		const endTimeText = endTime ? `<t:${Math.floor(endTime.getTime() / 1000)}:R> 종료` : '수동 종료';

		const embed = new EmbedBuilder()
			.setColor(isAnonymous ? 0x00FF00 : 0x0099FF)
			.setTitle(isAnonymous ? `🔒 ${title}` : `📊 ${title}`)
			.setDescription(
				`${isAnonymous ? '무기명' : '기명'} 투표입니다. 아래 버튼을 눌러 투표하세요.\n` +
				`${allowMultiple ? '✅ 중복 투표 허용' : '❌ 중복 투표 불가'}\n` +
				`⏰ ${endTimeText}`,
			)
			.addFields(
				choices.map((choice, index) => ({
					name: `${emojis[index]} ${choice}`,
					value: '0표',
					inline: false,
				})),
			)
			.setFooter({ text: `투표 생성자: ${interaction.user.username}` })
			.setTimestamp();

		await interaction.reply({ embeds: [embed], components: buttonRows });
		// messageId를 안정적으로 가져오기
		const fetchedReply = await interaction.fetchReply();
		const messageId = fetchedReply.id;

		console.log(`투표 생성: messageId=${messageId}, title=${title}, choices=${choices.length}`);

		// 투표 데이터 초기화
		interaction.client.voteData = interaction.client.voteData || new Map();
		const voteData = {
			choices,
			voters: new Map(),
			isAnonymous,
			allowMultiple,
			creatorId: interaction.user.id,
			messageId,
			channelId: interaction.channel.id,
			ended: false,
			endTime,
		};
		interaction.client.voteData.set(messageId, voteData);
		console.log(`투표 데이터 저장 완료: messageId=${messageId}, voteData.voters=${voteData.voters instanceof Map ? 'Map' : 'undefined'}`);

		// 종료 시간이 설정된 경우 타이머 설정
		if (endTimeMinutes) {
			const savedChannelId = interaction.channel.id;
			const savedClient = interaction.client;
			setTimeout(async () => {
				try {
					// 최신 투표 데이터 가져오기 (클라이언트에서 직접 가져오기)
					const vote = savedClient.voteData?.get(messageId);
					console.log(`타이머 실행: messageId=${messageId}, vote 존재=${!!vote}, vote.ended=${vote?.ended}`);

					if (vote && !vote.ended) {
						console.log(`투표 자동 종료 시작: ${messageId}`);
						console.log('타이머 시점의 투표 데이터:', {
							choices: vote.choices?.length || 0,
							votersMapSize: vote.voters?.size || 0,
							voterCounts: vote.voters ? Array.from(vote.voters.entries()).map(([idx, voters]) => ({
								index: idx,
								count: voters.size,
								voterIds: Array.from(voters),
							})) : [],
						});

						// vote 객체의 참조 확인
						const voteFromMap = savedClient.voteData.get(messageId);
						console.log(`vote 객체 참조 동일: ${vote === voteFromMap}`);
						console.log('vote.voters 참조:', vote.voters);

						await endVote(savedClient, messageId, vote, savedChannelId);
						console.log(`투표 자동 종료 완료: ${messageId}`);
					}
					else {
						console.log(`투표가 이미 종료되었거나 찾을 수 없음: ${messageId}, vote=${!!vote}, ended=${vote?.ended}`);
					}
				}
				catch (error) {
					console.error('자동 종료 처리 중 오류:', error);
				}
			}, endTimeMinutes * 60 * 1000);
		}
	},
};

// 투표 종료 함수
async function endVote(client, messageId, vote, channelId = null) {
	console.log(`endVote 호출: messageId=${messageId}, channelId=${channelId}`);
	console.log(`vote 상태: choices=${vote.choices?.length || 0}, voters.size=${vote.voters?.size || 0}, ended=${vote.ended}`);

	// voters Map의 내용 확인
	if (vote.voters) {
		const voterCounts = Array.from(vote.voters.entries()).map(([idx, voters]) => ({
			index: idx,
			count: voters.size,
			voterIds: Array.from(voters),
		}));
		console.log('투표자 데이터:', voterCounts);
	}

	if (vote.ended) {
		console.log('이미 종료된 투표입니다.');
		return;
	}

	vote.ended = true;

	try {
		// channelId가 없으면 vote 객체에서 가져오기
		const targetChannelId = channelId || vote.channelId;

		if (!targetChannelId) {
			throw new Error('채널 ID를 찾을 수 없습니다.');
		}

		let channel;
		try {
			channel = await client.channels.fetch(targetChannelId);
		}
		catch (error) {
			console.error('채널 접근 실패:', error);
			throw new Error('채널에 접근할 수 없습니다. 채널이 삭제되었거나 권한이 없습니다.');
		}

		if (!channel) {
			throw new Error('채널을 찾을 수 없습니다.');
		}

		let message;
		try {
			message = await channel.messages.fetch(messageId);
		}
		catch (error) {
			// 메시지가 삭제되었거나 찾을 수 없는 경우 (정상적인 상황일 수 있음)
			if (error.code === 10008) {
				// Unknown Message - 메시지가 이미 삭제되었을 수 있음
				message = null;
			}
			else {
				console.error('메시지 가져오기 실패:', error.message);
				message = null;
			}
		}

		// 원본 임베드에서 제목 추출
		let voteTitle = '투표';
		if (message && message.embeds[0]) {
			const originalTitle = message.embeds[0].title || '투표';
			voteTitle = originalTitle.replace(/^[^\s]+\s/, '').replace(/^🔒\s/, '').replace(/^📊\s/, '');
		}
		else if (vote.choices && vote.choices.length > 0) {
			// 메시지를 찾을 수 없으면 기본 제목 사용
			voteTitle = '투표';
		}

		const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

		// choices가 없으면 원본 메시지나 저장된 데이터에서 추출
		let choices = vote.choices;
		if (!choices || choices.length === 0) {
			if (message && message.embeds[0] && message.embeds[0].fields) {
				// 원본 임베드의 필드에서 선택지 추출
				choices = message.embeds[0].fields.map(field => {
					// "1️⃣ 선택지명" 형식에서 선택지명 추출
					const match = field.name.match(/^[^\s]+\s(.+)$/);
					return match ? match[1] : field.name;
				});
			}
			else {
				console.error('선택지를 찾을 수 없습니다. vote 객체:', vote);
				// choices가 없으면 빈 배열로 처리하되, 결과는 전송
				choices = [];
			}
		}

		// choices가 여전히 없으면 결과를 전송할 수 없음
		if (!choices || choices.length === 0) {
			console.error('선택지가 없어 결과를 생성할 수 없습니다. vote 객체:', JSON.stringify({
				choices: vote.choices,
				hasVoters: vote.voters.size > 0,
				voterCounts: Array.from(vote.voters.entries()).map(([idx, voters]) => ({ index: idx, count: voters.size })),
			}));
			// 선택지가 없어도 최소한 결과는 전송 (투표 수만 표시)
			if (vote.voters && vote.voters.size > 0) {
				// 투표 데이터가 있으면 기본 결과라도 전송
				const totalVotes = Array.from(vote.voters.values()).reduce((sum, voters) => sum + voters.size, 0);
				const errorEmbed = new EmbedBuilder()
					.setColor(0xFF0000)
					.setTitle('🏁 투표 종료')
					.setDescription(`총 ${totalVotes}표가 집계되었습니다.\n\n⚠️ 선택지 정보를 불러올 수 없어 상세 결과를 표시할 수 없습니다.`)
					.setTimestamp();

				if (message) {
					try {
						await message.delete();
					}
					catch {
						// 삭제 실패 무시
					}
				}

				try {
					await channel.send({ embeds: [errorEmbed] });
				}
				catch (error) {
					console.error('오류 임베드 전송 실패:', error);
				}
			}
			return;
		}

		// 결과 계산
		console.log(`결과 계산 시작: choices.length=${choices.length}, vote.voters.size=${vote.voters?.size || 0}`);

		const results = choices.map((choice, index) => {
			const voters = vote.voters?.get(index) || new Set();
			const voteCount = voters.size;
			const voterIds = Array.from(voters);

			console.log(`선택지 ${index} (${choice}): ${voteCount}표, 투표자 수: ${voterIds.length}`);

			return {
				choice,
				index,
				voteCount,
				voterIds,
			};
		}).sort((a, b) => b.voteCount - a.voteCount);

		console.log(`결과 계산 완료: 총 ${results.length}개 선택지, 총 투표 수: ${results.reduce((sum, r) => sum + r.voteCount, 0)}`);

		const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

		// 결과 임베드 생성
		const resultEmbed = new EmbedBuilder()
			.setColor(vote.isAnonymous ? 0x00FF00 : 0x0099FF)
			.setTitle(`🏁 투표 종료: ${voteTitle}`)
			.setDescription(`총 ${totalVotes}표가 집계되었습니다.`)
			.setTimestamp();

		// 결과 필드 추가
		for (const result of results) {
			let value = `**${result.voteCount}표**`;

			if (!vote.isAnonymous && result.voterIds.length > 0) {
				// 최대 20명 표시
				const voterNames = result.voterIds
					.map(id => {
						if (message && message.guild) {
							const member = message.guild.members.cache.get(id);
							return member ? member.displayName : `<@${id}>`;
						}
						return `<@${id}>`;
					})
					.slice(0, 20);

				value += `\n\n**투표자:**\n${voterNames.join(', ')}`;
				if (result.voterIds.length > 20) {
					value += ` 외 ${result.voterIds.length - 20}명`;
				}
			}

			resultEmbed.addFields({
				name: `${emojis[result.index]} ${result.choice}`,
				value: value || '투표 없음',
				inline: false,
			});
		}

		// 기존 메시지 삭제 (메시지가 있고 권한이 있는 경우)
		let messageDeleted = false;
		if (message) {
			try {
				await message.delete();
				messageDeleted = true;
				console.log(`원본 메시지 삭제 완료: ${messageId}`);
			}
			catch (error) {
				console.error('메시지 삭제 중 오류:', error);
				console.error('메시지 삭제 실패 상세:', {
					messageId,
					channelId: targetChannelId,
					errorCode: error.code,
					errorMessage: error.message,
				});
				// 삭제 실패해도 결과는 전송
			}
		}
		else {
			console.log(`메시지를 찾을 수 없어 삭제하지 않음: ${messageId}`);
		}

		// 결과 임베드만 새로 전송
		try {
			const sentMessage = await channel.send({ embeds: [resultEmbed] });
			console.log(`투표 결과 임베드 전송 완료: ${sentMessage.id}, 원본 메시지 삭제: ${messageDeleted}`);
		}
		catch (error) {
			console.error('결과 임베드 전송 실패:', error);
			// 오류를 다시 throw하지 않고 로그만 남김
		}
	}
	catch (error) {
		console.error('투표 종료 처리 중 오류:', error);
	}
}

module.exports.endVote = endVote;

