const {
	ActionRowBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	MessageFlags,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const { guildOnlyCommand } = require('../../utils/commandContext');
const {
	PARTY_REACTION_EMOJI,
	buildPartyEmbed,
	createParty,
	formatDiscordTimestamp,
	parseDateInput,
	persistParties,
} = require('../../services/partyService');

function validateTimes(scheduledAt, recruitCloseAt) {
	const now = Date.now();

	if (scheduledAt <= now) {
		return '집합 시간은 현재보다 미래여야 합니다.';
	}

	if (recruitCloseAt && recruitCloseAt >= scheduledAt) {
		return '모집 마감 시간은 집합 시간보다 빨라야 합니다.';
	}

	return null;
}

function parseModalSettings(input) {
	const value = input.trim();
	if (!value) {
		return { maxMembers: null, channelName: null };
	}

	const result = {
		maxMembers: null,
		channelName: null,
	};
	const tokens = value.split(',').map(token => token.trim()).filter(Boolean);

	for (const token of tokens) {
		const maxMembersMatch = token.match(/^(?:최대\s*인원|인원|max|members?)?\s*[:=]?\s*(\d+)\s*명?$/i);
		if (maxMembersMatch && result.maxMembers === null) {
			const maxMembers = Number(maxMembersMatch[1]);
			if (maxMembers < 1 || maxMembers > 99) {
				return { error: '최대 인원은 1명 이상 99명 이하로 입력해주세요.' };
			}
			result.maxMembers = maxMembers;
			continue;
		}

		const channelNameMatch = token.match(/^(?:채널\s*이름|채널|channel|name)\s*[:=]\s*(.+)$/i);
		const channelName = channelNameMatch ? channelNameMatch[1].trim() : token;
		if (channelName && result.channelName === null) {
			result.channelName = channelName;
		}
	}

	return result;
}

async function createPartyFromInput(interaction, values) {
	const title = values.title.trim();
	const description = values.description.trim();
	const scheduledInput = values.scheduledInput.trim();
	const recruitCloseInput = values.recruitCloseInput.trim();
	const settings = parseModalSettings(values.settingsInput);

	if (settings.error) {
		await interaction.reply({
			content: settings.error,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const scheduledAt = parseDateInput(scheduledInput);
	const recruitCloseAt = recruitCloseInput ? parseDateInput(recruitCloseInput) : null;

	if (!scheduledAt) {
		await interaction.reply({
			content: '집합 시간 형식이 올바르지 않습니다. `YYYY-MM-DD HH:mm` 또는 `MM-DD HH:mm` 형식을 사용해주세요.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (recruitCloseInput && !recruitCloseAt) {
		await interaction.reply({
			content: '모집 마감 시간 형식이 올바르지 않습니다. `YYYY-MM-DD HH:mm` 또는 `MM-DD HH:mm` 형식을 사용해주세요.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const timeError = validateTimes(scheduledAt, recruitCloseAt);
	if (timeError) {
		await interaction.reply({
			content: timeError,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const botMember = interaction.guild.members.me;
	const requiredGuildPermissions = [
		PermissionFlagsBits.ManageChannels,
		PermissionFlagsBits.CreateInstantInvite,
	];
	const requiredChannelPermissions = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.AddReactions,
		PermissionFlagsBits.ReadMessageHistory,
	];

	if (!botMember.permissions.has(requiredGuildPermissions)) {
		await interaction.editReply({
			content: '파티 기능을 사용하려면 봇에 `채널 관리`와 `초대 링크 만들기` 권한이 필요합니다.',
		});
		return;
	}

	if (!interaction.channel.permissionsFor(botMember).has(requiredChannelPermissions)) {
		await interaction.editReply({
			content: '현재 채널에서 파티 모집 메시지를 만들 권한이 부족합니다. `메시지 보내기`, `임베드 링크`, `반응 추가`, `메시지 기록 읽기` 권한을 확인해주세요.',
		});
		return;
	}

	const party = createParty({
		guildId: interaction.guild.id,
		channelId: interaction.channel.id,
		hostUserId: interaction.user.id,
		title,
		description,
		scheduledAt,
		recruitCloseAt,
		maxMembers: settings.maxMembers,
		voiceChannelName: settings.channelName,
		parentChannelId: interaction.channel.parentId,
	});

	let recruitMessage;

	try {
		recruitMessage = await interaction.channel.send({
			embeds: [buildPartyEmbed(party)],
		});

		party.messageId = recruitMessage.id;
		const parties = interaction.client.partyData || new Map();
		parties.set(party.partyId, party);
		interaction.client.partyData = parties;
		persistParties(interaction.client);

		await recruitMessage.react(PARTY_REACTION_EMOJI);
	}
	catch (error) {
		console.error(`파티 모집 메시지 생성 실패 (${party.partyId}):`, error);
		await interaction.editReply({
			content: '파티 모집 메시지를 생성하는 중 오류가 발생했습니다. 봇 권한과 채널 설정을 확인해주세요.',
		});
		return;
	}

	await interaction.editReply({
		content: [
			'파티 모집 메시지를 생성했습니다.',
			`집합 시간: ${formatDiscordTimestamp(scheduledAt)}`,
			`모집 메시지: ${recruitMessage.url}`,
		].join('\n'),
	});
}

module.exports = {
	guildOnly: true,
	data: guildOnlyCommand(new SlashCommandBuilder()
		.setName('파티생성')
		.setDescription('모달로 예약된 파티 모집 메시지를 생성합니다.')),
	async execute(interaction) {
		const modal = new ModalBuilder()
			.setCustomId(`party_create:${interaction.user.id}`)
			.setTitle('파티 생성');

		const titleInput = new TextInputBuilder()
			.setCustomId('title')
			.setLabel('제목')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(100);

		const scheduledInput = new TextInputBuilder()
			.setCustomId('scheduled_at')
			.setLabel('집합 시간')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('YYYY-MM-DD HH:mm 또는 MM-DD HH:mm')
			.setRequired(true)
			.setMaxLength(20);

		const descriptionInput = new TextInputBuilder()
			.setCustomId('description')
			.setLabel('설명')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setMaxLength(500);

		const recruitCloseInput = new TextInputBuilder()
			.setCustomId('recruit_close_at')
			.setLabel('모집 마감 시간')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('비워두면 집합 시간까지')
			.setRequired(false)
			.setMaxLength(20);

		const settingsInput = new TextInputBuilder()
			.setCustomId('settings')
			.setLabel('최대 인원, 채널 이름')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('예: 5, 발로란트 내전')
			.setRequired(false)
			.setMaxLength(120);

		modal.addComponents(
			new ActionRowBuilder().addComponents(titleInput),
			new ActionRowBuilder().addComponents(scheduledInput),
			new ActionRowBuilder().addComponents(descriptionInput),
			new ActionRowBuilder().addComponents(recruitCloseInput),
			new ActionRowBuilder().addComponents(settingsInput),
		);

		await interaction.showModal(modal);
	},
	async handleModalSubmit(interaction) {
		if (!interaction.customId.startsWith('party_create:')) {
			return false;
		}

		const [, userId] = interaction.customId.split(':');
		if (userId !== interaction.user.id) {
			await interaction.reply({
				content: '이 파티 생성 모달은 실행한 사용자만 제출할 수 있습니다.',
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		await createPartyFromInput(interaction, {
			title: interaction.fields.getTextInputValue('title'),
			scheduledInput: interaction.fields.getTextInputValue('scheduled_at'),
			description: interaction.fields.getTextInputValue('description') || '',
			recruitCloseInput: interaction.fields.getTextInputValue('recruit_close_at') || '',
			settingsInput: interaction.fields.getTextInputValue('settings') || '',
		});
		return true;
	},
};
