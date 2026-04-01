const { Events } = require('discord.js');
const {
	PARTY_REACTION_EMOJI,
	addPartyMember,
	getPartyByMessageId,
	refreshPartyMessage,
} = require('../services/partyService');

module.exports = {
	name: Events.MessageReactionAdd,
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
		if (!party) {
			return;
		}

		const result = addPartyMember(reaction.client, party, user.id);
		if (!result.ok) {
			await reaction.users.remove(user.id).catch(() => null);
			return;
		}

		await refreshPartyMessage(reaction.client, party);
	},
};
