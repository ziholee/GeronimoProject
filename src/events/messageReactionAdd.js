const { Events } = require('discord.js');
const {
	PARTY_REACTION_EMOJI,
	addPartyMember,
	getPartyByMessageId,
	refreshPartyMessage,
} = require('../services/partyService');
const { handleReactionRoleAdd } = require('../services/reactionRoleService');

module.exports = {
	name: Events.MessageReactionAdd,
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
				const result = addPartyMember(currentReaction.client, party, user.id);
				if (!result.ok) {
					await currentReaction.users.remove(user.id).catch(() => null);
					return;
				}

				await refreshPartyMessage(currentReaction.client, party);
				return;
			}
		}

		await handleReactionRoleAdd(currentReaction, user);
	},
};
