const { Events } = require('discord.js');
const {
	PARTY_REACTION_EMOJI,
	getPartyByMessageId,
	refreshPartyMessage,
	removePartyMember,
} = require('../services/partyService');
const { handleReactionRoleRemove } = require('../services/reactionRoleService');

module.exports = {
	name: Events.MessageReactionRemove,
	async execute(reaction, user) {
		if (user.bot) {
			return;
		}

		let currentReaction = reaction;
		if (reaction.partial) {
			currentReaction = await reaction.fetch().catch(() => null);
			if (!currentReaction) {
				return;
			}
		}

		if (!currentReaction.message?.guildId) {
			return;
		}

		if (currentReaction.emoji.name === PARTY_REACTION_EMOJI) {
			const party = getPartyByMessageId(currentReaction.client, currentReaction.message.id);
			if (party) {
				if (party.hostUserId === user.id) {
					return;
				}

				if (!removePartyMember(currentReaction.client, party, user.id)) {
					return;
				}

				await refreshPartyMessage(currentReaction.client, party);
				return;
			}
		}

		await handleReactionRoleRemove(currentReaction, user);
	},
};
