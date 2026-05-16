const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MessageFlags,
	PermissionFlagsBits,
} = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');

const GIVEAWAY_EMOJI = '🎉';
const DEFAULT_DURATION_MINUTES = 60;
const MAX_DURATION_MINUTES = 1440;
const DEFAULT_WINNERS_COUNT = 1;
const MAX_WINNERS_COUNT = 10;

const PARTICIPANT_DISPLAY_LIMIT = 20;

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('게이브어웨이')
		.setDescription('임베드 UI를 통해 리액션 게이브어웨이를 설정합니다.')),
	async execute(interaction) {
		const setups = ensureSetupStore(interaction.client);
		const setupId = interaction.id;
		const setup = {
			id: setupId,
			ownerId: interaction.user.id,
			ownerTag: interaction.user.tag,
			channelId: interaction.channel.id,
			prize: null,
			duration: DEFAULT_DURATION_MINUTES,
			winnersCount: DEFAULT_WINNERS_COUNT,
			message: null,
		};

		setups.set(setupId, setup);

		const embed = buildSetupEmbed(setup);
		const components = buildSetupComponents(setup);

		await interaction.reply({
			embeds: [embed],
			components,
		});

		const replyMessage = await interaction.fetchReply();
		setup.message = replyMessage;
	},
	handleButtonInteraction: async (interaction) => {
		if (interaction.customId.startsWith('giveaway_end|')) {
			const [, messageId] = interaction.customId.split('|');
			const metadata = interaction.client.activeGiveaways?.get(messageId);

			if (!metadata) {
				await interaction.reply({
					content: '이 게이브어웨이를 찾을 수 없습니다. 이미 종료되었을 수 있습니다.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const isOwner = interaction.user.id === metadata.ownerId;
			const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;

			if (!isOwner && !isAdmin) {
				await interaction.reply({
					content: '게이브어웨이 생성자 또는 관리자만 종료할 수 있습니다.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const channel = interaction.channel ?? (await interaction.client.channels.fetch(metadata.channelId).catch(() => null));
			if (!channel) {
				await interaction.reply({
					content: '채널 정보를 찾을 수 없어 종료할 수 없습니다.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const giveawayMessage = channel.messages?.cache.get(messageId) ?? (await channel.messages.fetch(messageId).catch(() => null));
			if (!giveawayMessage) {
				await interaction.reply({
					content: '메시지를 찾을 수 없어 종료할 수 없습니다.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const timeoutId = interaction.client.giveawayTimeouts?.get(messageId);
			if (timeoutId) {
				clearTimeout(timeoutId);
				interaction.client.giveawayTimeouts.delete(messageId);
			}

			await finalizeGiveaway(interaction.client, giveawayMessage, metadata);
			await interaction.reply({ content: '게이브어웨이를 종료했습니다.', flags: MessageFlags.Ephemeral });
			return true;
		}

		if (!interaction.customId.startsWith('giveaway|')) {
			return false;
		}

		const [, action, setupId] = interaction.customId.split('|');
		const setup = interaction.client.giveawaySetups?.get(setupId);

		if (!setup) {
			await interaction.reply({
				content: '이 설정 세션을 찾을 수 없습니다. 다시 /게이브어웨이를 실행해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (interaction.user.id !== setup.ownerId) {
			await interaction.reply({
				content: '게이브어웨이를 생성한 사용자만 설정을 변경할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		switch (action) {
		case 'set_prize':
			await showPrizeModal(interaction, setupId);
			return true;
		case 'set_winners':
			await showWinnersModal(interaction, setupId, setup.winnersCount);
			return true;
		case 'set_duration':
			await showDurationModal(interaction, setupId, setup.duration);
			return true;
		case 'cancel':
			await interaction.update({
				embeds: [buildStatusEmbed('⚠️ 설정이 취소되었습니다.', '필요하면 다시 /게이브어웨이를 실행하세요.')],
				components: [],
			});
			interaction.client.giveawaySetups.delete(setupId);
			return true;
		case 'start': {
			if (!setup.prize) {
				await interaction.reply({
					content: '상품을 먼저 설정해주세요.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const giveawayMessage = await startGiveaway(interaction, setup);
			if (!giveawayMessage) {
				return true;
			}

			interaction.client.giveawaySetups.delete(setupId);
			await interaction.update({
				embeds: [
					buildStatusEmbed(
						'✅ 게이브어웨이가 시작되었습니다.',
						`메시지로 이동: ${giveawayMessage.url}\n당첨자는 ${setup.duration}분 뒤에 추첨됩니다.`,
					),
				],
				components: [],
			});
			return true;
		}
		default:
			return false;
		}
	},
	handleModalSubmit: async (interaction) => {
		if (!interaction.customId.startsWith('giveaway_modal|')) {
			return false;
		}

		const [, field, setupId] = interaction.customId.split('|');
		const setup = interaction.client.giveawaySetups?.get(setupId);

		if (!setup) {
			await interaction.reply({
				content: '이 설정 세션을 찾을 수 없습니다. 다시 /게이브어웨이를 실행해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (interaction.user.id !== setup.ownerId) {
			await interaction.reply({
				content: '게이브어웨이를 생성한 사용자만 값을 변경할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (field === 'prize') {
			const value = interaction.fields.getTextInputValue('prize').trim();
			setup.prize = value;
			await updateSetupMessage(setup);
			await interaction.reply({
				content: `상품이 **${value}**(으)로 설정되었습니다.`,
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (field === 'duration') {
			const inputValue = interaction.fields.getTextInputValue('duration').trim();
			const parsed = Number.parseInt(inputValue, 10);
			if (Number.isNaN(parsed)) {
				await interaction.reply({
					content: '숫자로 된 분(minute) 단위 값을 입력해주세요.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const clamped = Math.min(Math.max(parsed, 1), MAX_DURATION_MINUTES);
			setup.duration = clamped;
			await updateSetupMessage(setup);
			await interaction.reply({
				content: `진행 시간이 ${clamped}분으로 설정되었습니다.`,
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		if (field === 'winners') {
			const inputValue = interaction.fields.getTextInputValue('winners').trim();
			const parsed = Number.parseInt(inputValue, 10);
			if (Number.isNaN(parsed)) {
				await interaction.reply({
					content: '숫자로 된 당첨 인원 수를 입력해주세요.',
					flags: MessageFlags.Ephemeral,
				});
				return true;
			}

			const clamped = Math.min(Math.max(parsed, 1), MAX_WINNERS_COUNT);
			setup.winnersCount = clamped;
			await updateSetupMessage(setup);
			await interaction.reply({
				content: `당첨 인원이 ${clamped}명으로 설정되었습니다.`,
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		return false;
	},
};

function ensureSetupStore(client) {
	if (!client.giveawaySetups) {
		client.giveawaySetups = new Map();
	}
	if (!client.giveawayTimeouts) {
		client.giveawayTimeouts = new Map();
	}
	if (!client.activeGiveaways) {
		client.activeGiveaways = new Map();
	}
	return client.giveawaySetups;
}

function buildSetupEmbed(setup) {
	return new EmbedBuilder()
		.setColor(0xF1C40F)
		.setTitle('🎉 게이브어웨이 설정')
		.setDescription('버튼을 눌러 상품과 시간을 입력한 뒤, 시작 버튼을 눌러주세요.')
		.addFields(
			{
				name: '상품',
				value: setup.prize ? `🏆 ${setup.prize}` : '아직 설정되지 않았습니다.',
				inline: false,
			},
			{
				name: '진행 시간',
				value: `${setup.duration}분`,
				inline: false,
			},
			{
				name: '당첨 인원',
				value: `${setup.winnersCount}명`,
				inline: false,
			},
		)
		.setFooter({ text: `설정자: ${setup.ownerTag}` })
		.setTimestamp();
}

function buildSetupComponents(setup) {
	return [
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`giveaway|set_prize|${setup.id}`)
				.setLabel('상품 입력')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`giveaway|set_winners|${setup.id}`)
				.setLabel('당첨 인원')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`giveaway|set_duration|${setup.id}`)
				.setLabel('기간 설정')
				.setStyle(ButtonStyle.Secondary),
		),
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`giveaway|start|${setup.id}`)
				.setLabel('시작')
				.setStyle(ButtonStyle.Success)
				.setDisabled(!setup.prize),
			new ButtonBuilder()
				.setCustomId(`giveaway|cancel|${setup.id}`)
				.setLabel('취소')
				.setStyle(ButtonStyle.Danger),
		),
	];
}

async function updateSetupMessage(setup) {
	if (!setup.message) {
		return false;
	}

	try {
		await setup.message.edit({
			embeds: [buildSetupEmbed(setup)],
			components: buildSetupComponents(setup),
		});
		return true;
	}
	catch (error) {
		console.error('게이브어웨이 설정 메시지 업데이트 실패:', error);
		return false;
	}
}

async function showPrizeModal(interaction, setupId) {
	const modal = new ModalBuilder()
		.setCustomId(`giveaway_modal|prize|${setupId}`)
		.setTitle('상품 입력');

	const prizeInput = new TextInputBuilder()
		.setCustomId('prize')
		.setLabel('상품 이름')
		.setPlaceholder('예: Nitro 1개월, 게임 코드 등')
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMaxLength(100);

	modal.addComponents(new ActionRowBuilder().addComponents(prizeInput));
	await interaction.showModal(modal);
}

async function showDurationModal(interaction, setupId, currentValue) {
	const modal = new ModalBuilder()
		.setCustomId(`giveaway_modal|duration|${setupId}`)
		.setTitle('기간 설정');

	const durationInput = new TextInputBuilder()
		.setCustomId('duration')
		.setLabel('진행 시간 (분 단위)')
		.setPlaceholder(`1 ~ ${MAX_DURATION_MINUTES}`)
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMaxLength(4)
		.setValue(String(currentValue ?? DEFAULT_DURATION_MINUTES));

	modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
	await interaction.showModal(modal);
}

async function showWinnersModal(interaction, setupId, currentValue) {
	const modal = new ModalBuilder()
		.setCustomId(`giveaway_modal|winners|${setupId}`)
		.setTitle('당첨 인원 설정');

	const winnersInput = new TextInputBuilder()
		.setCustomId('winners')
		.setLabel('당첨 인원 수')
		.setPlaceholder(`1 ~ ${MAX_WINNERS_COUNT}`)
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMaxLength(2)
		.setValue(String(currentValue ?? DEFAULT_WINNERS_COUNT));

	modal.addComponents(new ActionRowBuilder().addComponents(winnersInput));
	await interaction.showModal(modal);
}

async function startGiveaway(buttonInteraction, setup) {
	const channel = buttonInteraction.channel;
	if (!channel) {
		await buttonInteraction.reply({
			content: '채널 정보를 찾을 수 없어 게이브어웨이를 시작할 수 없습니다.',
			flags: MessageFlags.Ephemeral,
		});
		return null;
	}

	const endTimestamp = Math.floor((Date.now() + setup.duration * 60 * 1000) / 1000);

	const embed = new EmbedBuilder()
		.setColor(0xF1C40F)
		.setTitle('🎉 게이브어웨이가 시작되었습니다!')
		.setDescription(
			`이 메시지에 ${GIVEAWAY_EMOJI} 리액션을 달면 참여가 완료됩니다.\n` +
			`⏰ 종료: <t:${endTimestamp}:R>\n` +
			`🏆 상품: **${setup.prize}**\n` +
			`🎯 당첨자 수: ${setup.winnersCount}명`,
		)
		.setFooter({ text: `${setup.ownerTag} 님이 시작했습니다.` })
		.setTimestamp();

	const giveawayMessage = await channel.send({ embeds: [embed] });
	const controlRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`giveaway_end|${giveawayMessage.id}`)
			.setLabel('게이브어웨이 종료')
			.setStyle(ButtonStyle.Danger),
	);
	await giveawayMessage.edit({ components: [controlRow] });
	await giveawayMessage.react(GIVEAWAY_EMOJI);

	const metadata = {
		messageId: giveawayMessage.id,
		channelId: channel.id,
		ownerId: setup.ownerId,
		ownerTag: setup.ownerTag,
		prize: setup.prize,
		duration: setup.duration,
		winnersCount: setup.winnersCount,
		startedAt: Date.now(),
	};

	buttonInteraction.client.activeGiveaways.set(giveawayMessage.id, metadata);

	const timeoutId = setTimeout(
		() => finalizeGiveaway(buttonInteraction.client, giveawayMessage, metadata),
		setup.duration * 60 * 1000,
	);
	buttonInteraction.client.giveawayTimeouts.set(giveawayMessage.id, timeoutId);

	return giveawayMessage;
}

async function finalizeGiveaway(client, giveawayMessage, metadata) {
	try {
		const message = await giveawayMessage.fetch().catch(() => null);
		const channel = message?.channel ?? (await client.channels.fetch(metadata.channelId).catch(() => null));

		if (!channel) {
			return;
		}

		let entrants = [];

		if (message) {
			const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
			if (reaction) {
				const users = await reaction.users.fetch();
				const filtered = users.filter(user => !user.bot && user.id !== client.user.id);

				if (!filtered.has(metadata.ownerId)) {
					filtered.delete(metadata.ownerId);
				}

				entrants = Array.from(filtered.values());
			}
		}

		if (message) {
			await message.delete().catch(error => {
				console.error('게이브어웨이 메시지를 삭제할 수 없습니다:', error);
			});
		}

		const winnerCount = Math.min(metadata.winnersCount ?? DEFAULT_WINNERS_COUNT, entrants.length);

		if (winnerCount === 0) {
			await channel.send({
				embeds: [
					buildResultEmbed({
						prize: metadata.prize,
						ownerTag: metadata.ownerTag,
						duration: metadata.duration,
						winners: [],
						participants: entrants,
					}),
				],
			});
			return;
		}

		const winners = pickWinners(entrants, winnerCount);

		await channel.send({
			embeds: [
				buildResultEmbed({
					prize: metadata.prize,
					ownerTag: metadata.ownerTag,
					duration: metadata.duration,
					winners,
					participants: entrants,
				}),
			],
		});
	}
	catch (error) {
		console.error('게이브어웨이 종료 처리 중 오류:', error);
	}
	finally {
		client.giveawayTimeouts?.delete(giveawayMessage.id);
		client.activeGiveaways?.delete(giveawayMessage.id);
	}
}

function buildStatusEmbed(title, description) {
	return new EmbedBuilder()
		.setColor(0x5865F2)
		.setTitle(title)
		.setDescription(description)
		.setTimestamp();
}

function pickWinners(entrants, count) {
	const pool = [...entrants];
	const result = [];

	while (pool.length > 0 && result.length < count) {
		const index = Math.floor(Math.random() * pool.length);
		const [picked] = pool.splice(index, 1);
		result.push(picked);
	}

	return result;
}

function buildResultEmbed({ prize, ownerTag, duration, winners, participants }) {
	const participantMentions = participants.length > 0
		? participants.slice(0, PARTICIPANT_DISPLAY_LIMIT).map(user => `<@${user.id}>`).join(', ')
		: '없음';

	const remaining = participants.length - Math.min(participants.length, PARTICIPANT_DISPLAY_LIMIT);
	const participantField = remaining > 0 ? `${participantMentions} 외 ${remaining}명` : participantMentions;

	const winnerField = winners.length > 0
		? winners.map(user => `<@${user.id}>`).join(', ')
		: '없음';

	return new EmbedBuilder()
		.setColor(winners.length > 0 ? 0x57F287 : 0xED4245)
		.setTitle('🎉 게이브어웨이 결과')
		.addFields(
			{ name: '상품', value: `**${prize}**`, inline: true },
			{ name: '진행 시간', value: `${duration}분`, inline: true },
			{ name: '참여자 수', value: `${participants.length}명`, inline: true },
			{ name: '당첨 인원', value: `${winners.length}명`, inline: true },
			{ name: '당첨자', value: winnerField, inline: false },
			{ name: '참여자 목록', value: participantField, inline: false },
		)
		.setFooter({ text: `${ownerTag} 님이 진행했습니다.` })
		.setTimestamp();
}
