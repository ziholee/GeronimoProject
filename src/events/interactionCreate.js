const { Events, MessageFlags, ActionRowBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { endVote, updateVoteEmbed } = require('../commands/utility/vote');
const giveawayCommand = require('../commands/utility/giveway');
const guideCommand = require('../commands/utility/guide');
const reactionRoleCommand = require('../commands/utility/reactionrole');
const partyCreateCommand = require('../commands/party/create');
const { rejectNonGuildInteraction } = require('../utils/commandContext');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// 버튼 상호작용 처리
		if (interaction.isButton()) {
			if (await guideCommand.handleButtonInteraction?.(interaction)) {
				return;
			}

			if (await reactionRoleCommand.handleComponentInteraction?.(interaction)) {
				return;
			}

			if (await giveawayCommand.handleButtonInteraction?.(interaction)) {
				return;
			}

			const customId = interaction.customId;
			const messageId = interaction.message.id;
			interaction.client.voteData = interaction.client.voteData || new Map();
			const vote = interaction.client.voteData.get(messageId);

			// 종료 버튼 처리
			if (customId === 'end_vote') {
				if (!vote) {
					await interaction.reply({ content: '투표를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (vote.ended) {
					await interaction.reply({ content: '이미 종료된 투표입니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 종료할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const channelId = interaction.channel?.id || vote.channelId;
				if (!channelId) {
					await interaction.reply({ content: '채널을 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				await endVote(interaction.client, messageId, vote, channelId);
				await interaction.editReply({ content: '투표가 종료되었습니다.' });
				return;
			}

			// 무기명/기명 토글
			if (customId === 'vote_toggle_anonymous') {
				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 설정을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				vote.isAnonymous = !vote.isAnonymous;
				vote.guild = interaction.guild;
				const { embed, buttonRows } = updateVoteEmbed(interaction.message.embeds[0], vote);
				await interaction.update({ embeds: [embed], components: buttonRows });
				return;
			}

			// 중복허용 토글
			if (customId === 'vote_toggle_multiple') {
				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 설정을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				vote.allowMultiple = !vote.allowMultiple;
				vote.guild = interaction.guild;
				const { embed, buttonRows } = updateVoteEmbed(interaction.message.embeds[0], vote);
				await interaction.update({ embeds: [embed], components: buttonRows });
				return;
			}

			// 종료시간 설정 모달
			if (customId === 'vote_set_time') {
				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 설정을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const modal = new ModalBuilder()
					.setCustomId(`vote_time_modal_${messageId}`)
					.setTitle('종료 시간 설정');

				const timeInput = new TextInputBuilder()
					.setCustomId('end_time_minutes')
					.setLabel('종료 시간 (분)')
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('1-1440 사이의 숫자를 입력하세요')
					.setRequired(true)
					.setMaxLength(4);

				modal.addComponents(new ActionRowBuilder().addComponents(timeInput));
				await interaction.showModal(modal);
				return;
			}

			// 선택지 추가 모달
			if (customId === 'vote_add_choice') {
				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (vote.choices.length >= 10) {
					await interaction.reply({ content: '최대 10개까지만 선택지를 추가할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 선택지를 추가할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const modal = new ModalBuilder()
					.setCustomId(`vote_add_choice_modal_${messageId}`)
					.setTitle('선택지 추가');

				const choiceInput = new TextInputBuilder()
					.setCustomId('new_choice')
					.setLabel('새로운 선택지')
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('추가할 선택지를 입력하세요')
					.setRequired(true)
					.setMaxLength(100);

				modal.addComponents(new ActionRowBuilder().addComponents(choiceInput));
				await interaction.showModal(modal);
				return;
			}

			// 투표 버튼 처리
			if (customId.startsWith('vote_') && /^\d+$/.test(customId.split('_')[1])) {
				const parts = customId.split('_');
				const choiceIndex = parseInt(parts[1]);

				let currentVote = vote;
				// voteData가 없으면 임베드에서 복구 시도 (봇 재시작 등)
				if (!currentVote && interaction.message.embeds?.[0]) {
					const emb = interaction.message.embeds[0];
					const choices = (emb.fields || []).map(f => {
						const m = (f.name || '').match(/^[^\s]+\s+(.+)$/);
						return m ? m[1] : f.name || '';
					}).filter(Boolean);
					if (choices.length >= 2) {
						const isAnonymous = (emb.title || '').startsWith('🔒');
						const allowMultiple = (emb.description || '').includes('중복 투표 허용');
						currentVote = {
							choices,
							voters: new Map(),
							isAnonymous,
							allowMultiple,
							creatorId: null,
							messageId,
							channelId: interaction.channel?.id,
							guild: interaction.guild,
							ended: false,
							endTime: null,
						};
						interaction.client.voteData.set(messageId, currentVote);
					}
				}

				if (!currentVote) {
					await interaction.reply({ content: '투표를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (currentVote.ended) {
					await interaction.reply({ content: '이미 종료된 투표입니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (choiceIndex >= currentVote.choices.length) {
					await interaction.reply({ content: '유효하지 않은 선택지입니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const userId = interaction.user.id;
				currentVote.guild = interaction.guild;

				if (!currentVote.voters) {
					currentVote.voters = new Map();
				}

				if (!currentVote.allowMultiple) {
					if (currentVote.voters.has(choiceIndex) && currentVote.voters.get(choiceIndex).has(userId)) {
						currentVote.voters.get(choiceIndex).delete(userId);
						if (currentVote.voters.get(choiceIndex).size === 0) {
							currentVote.voters.delete(choiceIndex);
						}
					}
					else {
						for (const [index, voters] of currentVote.voters.entries()) {
							if (index !== choiceIndex) {
								voters.delete(userId);
								if (voters.size === 0) {
									currentVote.voters.delete(index);
								}
							}
						}

						if (!currentVote.voters.has(choiceIndex)) {
							currentVote.voters.set(choiceIndex, new Set());
						}
						currentVote.voters.get(choiceIndex).add(userId);
					}
				}
				else if (currentVote.voters.has(choiceIndex) && currentVote.voters.get(choiceIndex).has(userId)) {
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

				const { embed, buttonRows } = updateVoteEmbed(interaction.message.embeds[0], currentVote);
				await interaction.update({ embeds: [embed], components: buttonRows });
				return;
			}
		}

		if (interaction.isStringSelectMenu()) {
			if (await reactionRoleCommand.handleComponentInteraction?.(interaction)) {
				return;
			}
		}

		if (interaction.isRoleSelectMenu()) {
			if (await reactionRoleCommand.handleComponentInteraction?.(interaction)) {
				return;
			}
		}

		if (interaction.isModalSubmit()) {
			if (await partyCreateCommand.handleModalSubmit?.(interaction)) {
				return;
			}

			if (await reactionRoleCommand.handleModalSubmit?.(interaction)) {
				return;
			}

			if (await giveawayCommand.handleModalSubmit?.(interaction)) {
				return;
			}

			const customId = interaction.customId;
			interaction.client.voteData = interaction.client.voteData || new Map();

			// 종료시간 설정 모달 처리
			if (customId.startsWith('vote_time_modal_')) {
				const messageId = customId.replace('vote_time_modal_', '');
				const vote = interaction.client.voteData.get(messageId);

				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 설정을 변경할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const minutes = parseInt(interaction.fields.getTextInputValue('end_time_minutes'));
				if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
					await interaction.reply({ content: '1-1440 사이의 숫자를 입력해주세요.', flags: MessageFlags.Ephemeral });
					return;
				}

				vote.endTime = new Date(Date.now() + minutes * 60 * 1000);
				vote.guild = interaction.guild;

				// 기존 타이머가 있다면 취소할 수 없으므로, 새로운 타이머만 설정
				setTimeout(async () => {
					try {
						const currentVote = interaction.client.voteData?.get(messageId);
						if (currentVote && !currentVote.ended) {
							await endVote(interaction.client, messageId, currentVote, currentVote.channelId);
						}
					}
					catch (error) {
						console.error('자동 종료 처리 중 오류:', error);
					}
				}, minutes * 60 * 1000);

				await interaction.reply({ content: `종료 시간이 ${minutes}분으로 설정되었습니다.`, flags: MessageFlags.Ephemeral });

				// 메시지 업데이트
				try {
					const message = await interaction.channel.messages.fetch(messageId);
					const originalEmbed = message.embeds[0];
					const { embed, buttonRows } = updateVoteEmbed(originalEmbed, vote);
					await message.edit({ embeds: [embed], components: buttonRows });
				}
				catch (error) {
					console.error('메시지 업데이트 실패:', error);
				}
				return;
			}

			// 선택지 추가 모달 처리
			if (customId.startsWith('vote_add_choice_modal_')) {
				const messageId = customId.replace('vote_add_choice_modal_', '');
				const vote = interaction.client.voteData.get(messageId);

				if (!vote || vote.ended) {
					await interaction.reply({ content: '투표를 찾을 수 없거나 이미 종료되었습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const isCreator = interaction.user.id === vote.creatorId;
				const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator) || false;

				if (!isCreator && !isAdmin) {
					await interaction.reply({ content: '투표 생성자 또는 서버 관리자만 선택지를 추가할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (vote.choices.length >= 10) {
					await interaction.reply({ content: '최대 10개까지만 선택지를 추가할 수 있습니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				const newChoice = interaction.fields.getTextInputValue('new_choice').trim();
				if (!newChoice || newChoice.length === 0) {
					await interaction.reply({ content: '선택지를 입력해주세요.', flags: MessageFlags.Ephemeral });
					return;
				}

				if (vote.choices.includes(newChoice)) {
					await interaction.reply({ content: '이미 존재하는 선택지입니다.', flags: MessageFlags.Ephemeral });
					return;
				}

				vote.choices.push(newChoice);
				vote.guild = interaction.guild;

				await interaction.reply({ content: `선택지 "${newChoice}"가 추가되었습니다.`, flags: MessageFlags.Ephemeral });

				// 메시지 업데이트
				try {
					const message = await interaction.channel.messages.fetch(messageId);
					const originalEmbed = message.embeds[0];
					const { embed, buttonRows } = updateVoteEmbed(originalEmbed, vote);
					await message.edit({ embeds: [embed], components: buttonRows });
				}
				catch (error) {
					console.error('메시지 업데이트 실패:', error);
				}
				return;
			}
		}

		// Autocomplete 처리
		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				return;
			}

			try {
				await command.autocomplete?.(interaction);
			}
			catch (error) {
				console.error(`Autocomplete 처리 중 오류 발생: ${error}`);
			}
			return;
		}

		// 슬래시 명령어 처리
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`${interaction.commandName}에 해당하는 명령어를 찾을 수 없습니다.`);
				return;
			}

			try {
				if (command.guildOnly && await rejectNonGuildInteraction(interaction)) {
					return;
				}

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
