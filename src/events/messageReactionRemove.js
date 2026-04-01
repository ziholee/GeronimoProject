const { Events } = require('discord.js');
const {
	PARTY_REACTION_EMOJI,
	getPartyByMessageId,
	refreshPartyMessage,
	removePartyMember,
} = require('../services/partyService');

module.exports = {
	name: Events.MessageReactionRemove,
	async execute(reaction, user) {
		if (user.bot) {
			return;
		}

		if (reaction.partial) {
			await reaction.fetch().catch(() => null);
		}

		if (!reaction.message?.guildId || reaction.emoji.name !== PARTY_REACTION_EMOJI) {
			return;
		}

		const party = getPartyByMessageId(reaction.client, reaction.message.id);
		if (!party || party.hostUserId === user.id) {
			return;
		}

		if (!removePartyMember(reaction.client, party, user.id)) {
			return;
		}

		await refreshPartyMessage(reaction.client, party);
	},
};
