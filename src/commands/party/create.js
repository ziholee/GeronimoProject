const {
	SlashCommandBuilder,
	MessageFlags,
	PermissionFlagsBits,
} = require('discord.js');
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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('파티생성')
		.setDescription('예약된 파티 모집 메시지를 생성합니다.')
		.addStringOption(option =>
			option
				.setName('제목')
				.setDescription('파티 제목')
				.setRequired(true)
				.setMaxLength(100),
		)
		.addStringOption(option =>
			option
				.setName('설명')
				.setDescription('파티 설명')
				.setRequired(false)
				.setMaxLength(500),
		)
		.addStringOption(option =>
			option
				.setName('집합시간')
				.setDescription('형식: YYYY-MM-DD HH:mm 또는 MM-DD HH:mm')
				.setRequired(true),
		)
		.addStringOption(option =>
			option
				.setName('모집마감시간')
				.setDescription('형식: YYYY-MM-DD HH:mm 또는 MM-DD HH:mm')
				.setRequired(false),
		)
		.addIntegerOption(option =>
			option
				.setName('최대인원')
				.setDescription('최대 모집 인원')
				.setRequired(false)
				.setMinValue(1)
				.setMaxValue(99),
		)
		.addStringOption(option =>
			option
				.setName('채널이름')
				.setDescription('생성될 음성채널 이름')
				.setRequired(false)
				.setMaxLength(100),
		),
	async execute(interaction) {
		const title = interaction.options.getString('제목', true).trim();
		const description = interaction.options.getString('설명')?.trim() || '';
		const scheduledInput = interaction.options.getString('집합시간', true);
		const recruitCloseInput = interaction.options.getString('모집마감시간');
		const maxMembers = interaction.options.getInteger('최대인원');
		const channelName = interaction.options.getString('채널이름');

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
			await interaction.reply({
				content: '파티 기능을 사용하려면 봇에 `채널 관리`와 `초대 링크 만들기` 권한이 필요합니다.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!interaction.channel.permissionsFor(botMember).has(requiredChannelPermissions)) {
			await interaction.reply({
				content: '현재 채널에서 파티 모집 메시지를 만들 권한이 부족합니다. `메시지 보내기`, `임베드 링크`, `반응 추가`, `메시지 기록 읽기` 권한을 확인해주세요.',
				flags: MessageFlags.Ephemeral,
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
			maxMembers,
			voiceChannelName: channelName,
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
			await interaction.reply({
				content: '파티 모집 메시지를 생성하는 중 오류가 발생했습니다. 봇 권한과 채널 설정을 확인해주세요.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.reply({
			content: [
				'파티 모집 메시지를 생성했습니다.',
				`집합 시간: ${formatDiscordTimestamp(scheduledAt)}`,
				`모집 메시지: ${recruitMessage.url}`,
			].join('\n'),
			flags: MessageFlags.Ephemeral,
		});
	},
};
