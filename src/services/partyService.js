const { EmbedBuilder } = require('discord.js');
const { saveParties } = require('../storage/partyStore');

const PARTY_STATUS = {
	RECRUITING: 'RECRUITING',
	STARTED: 'STARTED',
	FAILED: 'FAILED',
};

const PARTY_REACTION_EMOJI = '✅';

function ensurePartyMap(client) {
	client.partyData = client.partyData || new Map();
	return client.partyData;
}

function persistParties(client) {
	saveParties(ensurePartyMap(client));
}

function createPartyId() {
	return `party_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPartyMembers(party) {
	return Array.isArray(party.members) ? party.members.filter(member => member.status === 'JOINED') : [];
}

function getPartyByMessageId(client, messageId) {
	for (const party of ensurePartyMap(client).values()) {
		if (party.messageId === messageId) {
			return party;
		}
	}
	return null;
}

function findMemberIndex(party, userId) {
	return party.members.findIndex(member => member.userId === userId && member.status === 'JOINED');
}

function isRecruitingClosed(party, now = Date.now()) {
	if (party.status !== PARTY_STATUS.RECRUITING) {
		return true;
	}
	if (party.recruitCloseAt && now > party.recruitCloseAt) {
		return true;
	}
	return now >= party.scheduledAt;
}

function canJoinParty(party, userId, now = Date.now()) {
	if (isRecruitingClosed(party, now)) {
		return { ok: false, reason: '모집이 마감되었습니다.' };
	}

	if (findMemberIndex(party, userId) !== -1) {
		return { ok: false, reason: '이미 참여한 파티입니다.' };
	}

	if (party.maxMembers && getPartyMembers(party).length >= party.maxMembers) {
		return { ok: false, reason: '최대 인원에 도달했습니다.' };
	}

	return { ok: true };
}

function addPartyMember(client, party, userId) {
	const check = canJoinParty(party, userId);
	if (!check.ok) {
		return check;
	}

	party.members.push({
		userId,
		joinedAt: Date.now(),
		status: 'JOINED',
	});
	persistParties(client);

	return { ok: true };
}

function removePartyMember(client, party, userId) {
	const memberIndex = findMemberIndex(party, userId);
	if (memberIndex === -1) {
		return false;
	}

	party.members.splice(memberIndex, 1);
	persistParties(client);
	return true;
}

function formatDiscordTimestamp(timestamp, style = 'F') {
	return `<t:${Math.floor(timestamp / 1000)}:${style}>`;
}

function formatStatus(status) {
	if (status === PARTY_STATUS.STARTED) {
		return '시작됨';
	}
	if (status === PARTY_STATUS.FAILED) {
		return '시작 실패';
	}
	return '모집중';
}

function buildPartyEmbed(party) {
	const members = getPartyMembers(party);
	const memberMentions = members.length > 0
		? members.map(member => `<@${member.userId}>`).join('\n')
		: '아직 참여자가 없습니다.';

	const recruitCloseText = party.recruitCloseAt
		? formatDiscordTimestamp(party.recruitCloseAt)
		: '집합 시간까지';

	const maxMembersText = party.maxMembers ? `${members.length}/${party.maxMembers}` : `${members.length}/제한 없음`;

	const embed = new EmbedBuilder()
		.setColor(
			party.status === PARTY_STATUS.STARTED
				? 0x57f287
				: party.status === PARTY_STATUS.FAILED
					? 0xed4245
					: 0x5865f2,
		)
		.setTitle(`파티 모집 | ${party.title}`)
		.setDescription(party.description || '설명이 없습니다.')
		.addFields(
			{ name: '생성자', value: `<@${party.hostUserId}>`, inline: true },
			{ name: '집합 시간', value: formatDiscordTimestamp(party.scheduledAt), inline: true },
			{ name: '모집 마감', value: recruitCloseText, inline: true },
			{ name: '상태', value: formatStatus(party.status), inline: true },
			{ name: '현재 참여 인원', value: maxMembersText, inline: true },
			{ name: '채널 이름', value: party.voiceChannelName || party.title, inline: true },
			{ name: '참여 방법', value: `${PARTY_REACTION_EMOJI} 반응을 눌러 참여하세요.`, inline: false },
			{ name: '참여자 목록', value: memberMentions, inline: false },
		)
		.setFooter({ text: `Party ID: ${party.partyId}` })
		.setTimestamp();

	if (party.status === PARTY_STATUS.STARTED && party.inviteUrl) {
		embed.addFields({
			name: '음성채널 초대 링크',
			value: party.inviteUrl,
			inline: false,
		});
	}

	if (party.status === PARTY_STATUS.FAILED) {
		embed.addFields({
			name: '안내',
			value: '음성채널 또는 초대 링크 생성에 실패했습니다. 서버 권한 설정을 확인해주세요.',
			inline: false,
		});
	}

	return embed;
}

async function refreshPartyMessage(client, party) {
	if (!party.channelId || !party.messageId) {
		return;
	}

	try {
		const channel = await client.channels.fetch(party.channelId);
		if (!channel?.isTextBased()) {
			return;
		}

		const message = await channel.messages.fetch(party.messageId);
		await message.edit({ embeds: [buildPartyEmbed(party)] });
	}
	catch (error) {
		console.error(`파티 메시지 갱신 실패 (${party.partyId}):`, error);
	}
}

function parseDateInput(input) {
	const value = input.trim();
	const normalized = value.replace(/\./g, '-').replace(/\//g, '-').replace('T', ' ');
	const match = normalized.match(
		/^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/,
	);

	if (!match) {
		return null;
	}

	const now = new Date();
	const year = match[1] ? Number(match[1]) : now.getFullYear();
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hours = Number(match[4]);
	const minutes = Number(match[5]);

	const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.getFullYear() !== year ||
		parsed.getMonth() !== month - 1 ||
		parsed.getDate() !== day ||
		parsed.getHours() !== hours ||
		parsed.getMinutes() !== minutes
	) {
		return null;
	}

	return parsed.getTime();
}

function sanitizeVoiceChannelName(input) {
	return input
		.trim()
		.replace(/\s+/g, ' ')
		.slice(0, 100) || '파티 음성채널';
}

function createParty(options) {
	const partyId = createPartyId();
	const voiceChannelName = sanitizeVoiceChannelName(options.voiceChannelName || options.title);

	const party = {
		partyId,
		guildId: options.guildId,
		channelId: options.channelId,
		messageId: null,
		hostUserId: options.hostUserId,
		title: options.title,
		description: options.description || '',
		scheduledAt: options.scheduledAt,
		recruitCloseAt: options.recruitCloseAt || null,
		maxMembers: options.maxMembers || null,
		status: PARTY_STATUS.RECRUITING,
		voiceChannelId: null,
		inviteUrl: null,
		voiceChannelName,
		parentChannelId: options.parentChannelId || null,
		startedAt: null,
		dmFailures: [],
		members: [
			{
				userId: options.hostUserId,
				joinedAt: Date.now(),
				status: 'JOINED',
			},
		],
	};

	return party;
}

module.exports = {
	PARTY_REACTION_EMOJI,
	PARTY_STATUS,
	addPartyMember,
	buildPartyEmbed,
	canJoinParty,
	createParty,
	formatDiscordTimestamp,
	getPartyByMessageId,
	getPartyMembers,
	isRecruitingClosed,
	parseDateInput,
	persistParties,
	refreshPartyMessage,
	removePartyMember,
	sanitizeVoiceChannelName,
};
