const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'parties.json');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

function normalizeMember(member) {
	return {
		userId: String(member.userId),
		joinedAt: Number(member.joinedAt) || Date.now(),
		status: member.status || 'JOINED',
	};
}

function normalizeParty(party) {
	return {
		partyId: String(party.partyId),
		guildId: String(party.guildId),
		channelId: String(party.channelId),
		messageId: party.messageId ? String(party.messageId) : null,
		hostUserId: String(party.hostUserId),
		title: party.title || '이름 없는 파티',
		description: party.description || '',
		scheduledAt: Number(party.scheduledAt),
		recruitCloseAt: party.recruitCloseAt ? Number(party.recruitCloseAt) : null,
		maxMembers: party.maxMembers ? Number(party.maxMembers) : null,
		status: party.status || 'RECRUITING',
		voiceChannelId: party.voiceChannelId ? String(party.voiceChannelId) : null,
		inviteUrl: party.inviteUrl || null,
		voiceChannelName: party.voiceChannelName || null,
		parentChannelId: party.parentChannelId ? String(party.parentChannelId) : null,
		startedAt: party.startedAt ? Number(party.startedAt) : null,
		dmFailures: Array.isArray(party.dmFailures) ? party.dmFailures.map(String) : [],
		members: Array.isArray(party.members) ? party.members.map(normalizeMember) : [],
	};
}

function loadParties() {
	try {
		ensureDataDir();
		if (!fs.existsSync(FILE_PATH)) {
			return new Map();
		}

		const raw = fs.readFileSync(FILE_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		return new Map(
			Object.entries(parsed).map(([partyId, party]) => [partyId, normalizeParty({ ...party, partyId })]),
		);
	}
	catch (error) {
		console.error('partyStore 로드 실패:', error);
		return new Map();
	}
}

function saveParties(parties) {
	try {
		ensureDataDir();
		const serialized = {};
		for (const [partyId, party] of parties.entries()) {
			serialized[partyId] = normalizeParty(party);
		}
		fs.writeFileSync(FILE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
	}
	catch (error) {
		console.error('partyStore 저장 실패:', error);
	}
}

module.exports = {
	loadParties,
	saveParties,
};
