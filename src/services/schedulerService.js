const { createPartyInvite, createPartyVoiceChannel } = require('./voiceChannelService');
const { sendPartyInviteDm } = require('./dmService');
const { PARTY_STATUS, getPartyMembers, persistParties, refreshPartyMessage } = require('./partyService');

const SCHEDULER_INTERVAL_MS = 15 * 1000;

async function notifyPartyStart(client, party, failures) {
	try {
		const channel = await client.channels.fetch(party.channelId);
		if (!channel?.isTextBased()) {
			return;
		}

		const failureText = failures.length > 0
			? failures.map(userId => `<@${userId}>`).join(', ')
			: '없음';

		await channel.send({
			content: [
				`파티 **${party.title}** 가 시작되었습니다.`,
				`음성채널: <#${party.voiceChannelId}>`,
				`DM 실패 대상: ${failureText}`,
			].join('\n'),
		});
	}
	catch (error) {
		console.error(`파티 시작 안내 실패 (${party.partyId}):`, error);
	}
}

async function notifyHostOfFailure(client, party, error) {
	try {
		const host = await client.users.fetch(party.hostUserId);
		await host.send(
			`"${party.title}" 파티 시작 처리 중 오류가 발생했습니다: ${error.message}`,
		);
	}
	catch (dmError) {
		console.error(`파티 호스트 오류 DM 실패 (${party.partyId}):`, dmError);
	}
}

async function startParty(client, party) {
	if (party.status !== PARTY_STATUS.RECRUITING) {
		return;
	}

	let voiceChannel = null;

	try {
		const guild = await client.guilds.fetch(party.guildId);
		voiceChannel = await createPartyVoiceChannel(guild, party);
		const invite = await createPartyInvite(voiceChannel, party);
		const members = getPartyMembers(party);
		const failures = [];

		for (const member of members) {
			try {
				const user = await client.users.fetch(member.userId);
				await sendPartyInviteDm(user, party, invite.url);
			}
			catch (error) {
				failures.push(member.userId);
				console.error(`파티 DM 실패 (${party.partyId}/${member.userId}):`, error);
			}
		}

		party.status = PARTY_STATUS.STARTED;
		party.voiceChannelId = voiceChannel.id;
		party.inviteUrl = invite.url;
		party.startedAt = Date.now();
		party.dmFailures = failures;
		persistParties(client);

		client.tempVoiceChannels = client.tempVoiceChannels || new Map();
		client.tempVoiceChannels.set(voiceChannel.id, {
			ownerId: party.hostUserId,
			createdAt: Date.now(),
			parentChannelId: null,
		});

		await refreshPartyMessage(client, party);
		await notifyPartyStart(client, party, failures);
	}
	catch (error) {
		if (voiceChannel) {
			await voiceChannel.delete('파티 시작 실패로 생성된 임시 채널 정리').catch(channelError => {
				console.error(`실패한 파티 채널 정리 실패 (${party.partyId}):`, channelError);
			});
		}

		party.status = PARTY_STATUS.FAILED;
		party.voiceChannelId = null;
		party.inviteUrl = null;
		party.startedAt = null;
		persistParties(client);
		await refreshPartyMessage(client, party);
		await notifyHostOfFailure(client, party, error);
		console.error(`파티 시작 실패 (${party.partyId}):`, error);
	}
}

async function processDueParties(client) {
	const now = Date.now();
	const partyMap = client.partyData || new Map();

	for (const party of partyMap.values()) {
		if (party.status === PARTY_STATUS.RECRUITING && party.scheduledAt <= now) {
			await startParty(client, party);
		}
	}
}

function startPartyScheduler(client) {
	if (client.partySchedulerInterval) {
		clearInterval(client.partySchedulerInterval);
	}

	void processDueParties(client);
	client.partySchedulerInterval = setInterval(() => {
		void processDueParties(client);
	}, SCHEDULER_INTERVAL_MS);
}

module.exports = {
	processDueParties,
	startParty,
	startPartyScheduler,
};
