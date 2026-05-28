const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

const VOTE_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const MAX_CHOICES = VOTE_EMOJIS.length;
const MAX_CHOICE_LENGTH = 100;

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('투표')
		.setDescription('투표를 생성합니다.')
		.addStringOption(option =>
			option.setName('제목')
				.setDescription('투표 제목')
				.setMaxLength(100)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지1')
				.setDescription('첫 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지2')
				.setDescription('두 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('선택지3')
				.setDescription('세 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지4')
				.setDescription('네 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지5')
				.setDescription('다섯 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지6')
				.setDescription('여섯 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지7')
				.setDescription('일곱 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지8')
				.setDescription('여덟 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지9')
				.setDescription('아홉 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addStringOption(option =>
			option.setName('선택지10')
				.setDescription('열 번째 선택지')
				.setMaxLength(MAX_CHOICE_LENGTH))
		.addBooleanOption(option =>
			option.setName('무기명')
				.setDescription('투표자를 숨길지 선택합니다.'))
		.addBooleanOption(option =>
			option.setName('중복허용')
				.setDescription('한 사람이 여러 선택지에 투표할 수 있게 합니다.'))
		.addIntegerOption(option =>
			option.setName('종료시간')
				.setDescription('자동 종료까지 걸리는 시간(분), 1-1440')
				.setMinValue(1)
				.setMaxValue(1440))),
	async execute(interaction) {
		try {
			const title = interaction.options.getString('제목');
			const isAnonymous = interaction.options.getBoolean('무기명') ?? false;
			const allowMultiple = interaction.options.getBoolean('중복허용') ?? false;
			const endTimeMinutes = interaction.options.getInteger('종료시간');

			const choices = Array.from({ length: MAX_CHOICES }, (_, index) =>
				interaction.options.getString(`선택지${index + 1}`)?.trim(),
			).filter(Boolean);

			if (choices.length < 2) {
				await interaction.reply({ content: '최소 2개 이상의 선택지가 필요합니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			if (new Set(choices).size !== choices.length) {
				await interaction.reply({ content: '중복된 선택지는 사용할 수 없습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			const endTime = endTimeMinutes ? new Date(Date.now() + endTimeMinutes * 60 * 1000) : null;
			const { embed, buttonRows } = createVoteEmbed(title, choices, isAnonymous, allowMultiple, endTime, interaction.user.username);

			await interaction.reply({ embeds: [embed], components: buttonRows });
			const fetchedReply = await interaction.fetchReply();
			const messageId = fetchedReply.id;

			interaction.client.voteData = interaction.client.voteData || new Map();
			const voteData = {
				choices,
				voters: new Map(),
				isAnonymous,
				allowMultiple,
				creatorId: interaction.user.id,
				messageId,
				channelId: interaction.channel.id,
				guild: interaction.guild,
				ended: false,
				endTime,
			};
			interaction.client.voteData.set(messageId, voteData);

			if (endTimeMinutes) {
				const savedChannelId = interaction.channel.id;
				const savedClient = interaction.client;
				setTimeout(async () => {
					try {
						const vote = savedClient.voteData?.get(messageId);
						if (vote && !vote.ended) {
							await endVote(savedClient, messageId, vote, savedChannelId);
						}
					}
					catch (error) {
						console.error('투표 자동 종료 처리 중 오류:', error);
					}
				}, endTimeMinutes * 60 * 1000);
			}
		}
		catch (error) {
			console.error('투표 생성 중 오류:', error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({ content: '투표 생성 중 오류가 발생했습니다. 다시 시도해 주세요.', flags: MessageFlags.Ephemeral }).catch(() => null);
			}
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
				name: `${VOTE_EMOJIS[result.index]} ${result.choice}`,
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

function createVoteEmbed(title, choices, isAnonymous, allowMultiple, endTime, creatorName) {
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
				name: `${VOTE_EMOJIS[index]} ${choice}`,
				value: '0표',
				inline: false,
			})),
		)
		.setFooter({ text: `투표 생성자: ${creatorName}` })
		.setTimestamp();

	const buttonRows = [];
	for (let i = 0; i < choices.length; i += 5) {
		const buttons = choices.slice(i, i + 5).map((choice, index) =>
			new ButtonBuilder()
				.setCustomId(`vote_${i + index}`)
				.setLabel(choice.length > 80 ? choice.substring(0, 77) + '...' : choice)
				.setStyle(ButtonStyle.Primary)
				.setEmoji(VOTE_EMOJIS[i + index]));
		buttonRows.push(new ActionRowBuilder().addComponents(buttons));
	}

	const settingsRow = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('vote_toggle_anonymous')
				.setLabel(isAnonymous ? '무기명' : '기명')
				.setStyle(isAnonymous ? ButtonStyle.Success : ButtonStyle.Primary)
				.setEmoji(isAnonymous ? '🔒' : '📊'),
			new ButtonBuilder()
				.setCustomId('vote_toggle_multiple')
				.setLabel(allowMultiple ? '중복허용' : '중복불가')
				.setStyle(allowMultiple ? ButtonStyle.Success : ButtonStyle.Secondary)
				.setEmoji(allowMultiple ? '✅' : '❌'),
			new ButtonBuilder()
				.setCustomId('vote_set_time')
				.setLabel('종료시간')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('⏰'),
			new ButtonBuilder()
				.setCustomId('vote_add_choice')
				.setLabel('선택지 추가')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('➕')
				.setDisabled(choices.length >= 10),
		);
	buttonRows.push(settingsRow);

	const endButton = new ButtonBuilder()
		.setCustomId('end_vote')
		.setLabel('투표 종료')
		.setStyle(ButtonStyle.Danger)
		.setEmoji('⏹️');
	buttonRows.push(new ActionRowBuilder().addComponents(endButton));

	return { embed, buttonRows };
}

function updateVoteEmbed(originalEmbed, vote) {
	const endTimeText = vote.endTime ? `<t:${Math.floor(vote.endTime.getTime() / 1000)}:R> 종료` : '수동 종료';

	const title = (originalEmbed?.title && typeof originalEmbed.title === 'string')
		? originalEmbed.title.replace(/^[^\s]+\s/, '').replace(/^🔒\s/, '').replace(/^📊\s/, '')
		: '투표';
	const rawFooter = originalEmbed?.footer;
	const footer = (rawFooter && typeof rawFooter === 'object' && rawFooter.text)
		? { text: String(rawFooter.text), iconURL: rawFooter.iconURL }
		: { text: '투표' };
	const timestamp = originalEmbed?.timestamp != null ? originalEmbed.timestamp : Date.now();

	const embed = new EmbedBuilder()
		.setColor(vote.isAnonymous ? 0x00FF00 : 0x0099FF)
		.setTitle(vote.isAnonymous ? `🔒 ${title}` : `📊 ${title}`)
		.setDescription(
			`${vote.isAnonymous ? '무기명' : '기명'} 투표입니다. 아래 버튼을 눌러 투표하세요.\n` +
			`${vote.allowMultiple ? '✅ 중복 투표 허용' : '❌ 중복 투표 불가'}\n` +
			`⏰ ${endTimeText}`,
		)
		.setFooter(footer)
		.setTimestamp(timestamp);

	const fields = vote.choices.map((choice, index) => {
		const voteCount = vote.voters?.get(index)?.size || 0;
		const voters = vote.voters?.get(index);

		let value = `${voteCount}표`;
		if (!vote.isAnonymous && voters && voters.size > 0) {
			const voterNames = Array.from(voters)
				.map(id => {
					const member = vote.guild?.members.cache.get(id);
					return member ? member.displayName : `<@${id}>`;
				})
				.slice(0, 10);

			value += `\n투표자: ${voterNames.join(', ')}`;
			if (voters.size > 10) {
				value += ` 외 ${voters.size - 10}명`;
			}
		}

		return {
			name: `${VOTE_EMOJIS[index]} ${choice}`,
			value,
			inline: false,
		};
	});
	embed.setFields(fields);

	const buttonRows = [];
	for (let i = 0; i < vote.choices.length; i += 5) {
		const buttons = vote.choices.slice(i, i + 5).map((choice, index) =>
			new ButtonBuilder()
				.setCustomId(`vote_${i + index}`)
				.setLabel(choice.length > 80 ? choice.substring(0, 77) + '...' : choice)
				.setStyle(ButtonStyle.Primary)
				.setEmoji(VOTE_EMOJIS[i + index]));
		buttonRows.push(new ActionRowBuilder().addComponents(buttons));
	}

	const settingsRow = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('vote_toggle_anonymous')
				.setLabel(vote.isAnonymous ? '무기명' : '기명')
				.setStyle(vote.isAnonymous ? ButtonStyle.Success : ButtonStyle.Primary)
				.setEmoji(vote.isAnonymous ? '🔒' : '📊'),
			new ButtonBuilder()
				.setCustomId('vote_toggle_multiple')
				.setLabel(vote.allowMultiple ? '중복허용' : '중복불가')
				.setStyle(vote.allowMultiple ? ButtonStyle.Success : ButtonStyle.Secondary)
				.setEmoji(vote.allowMultiple ? '✅' : '❌'),
			new ButtonBuilder()
				.setCustomId('vote_set_time')
				.setLabel('종료시간')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('⏰'),
			new ButtonBuilder()
				.setCustomId('vote_add_choice')
				.setLabel('선택지 추가')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('➕')
				.setDisabled(vote.choices.length >= 10),
		);
	buttonRows.push(settingsRow);

	const endButton = new ButtonBuilder()
		.setCustomId('end_vote')
		.setLabel('투표 종료')
		.setStyle(ButtonStyle.Danger)
		.setEmoji('⏹️');
	buttonRows.push(new ActionRowBuilder().addComponents(endButton));

	return { embed, buttonRows };
}

module.exports.createVoteEmbed = createVoteEmbed;
module.exports.updateVoteEmbed = updateVoteEmbed;
module.exports.endVote = endVote;
