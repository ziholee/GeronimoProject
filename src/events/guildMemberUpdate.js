const { Events } = require('discord.js');
const { addLog } = require('../storage/logStore');

module.exports = {
	name: Events.GuildMemberUpdate,
	async execute(oldMember, newMember) {
		const guildId = newMember.guild.id;
		const userId = newMember.user.id;

		if (oldMember.displayName !== newMember.displayName) {
			addLog(guildId, userId, 'NICKNAME_CHANGE', {
				oldNickname: oldMember.displayName,
				newNickname: newMember.displayName,
			});
		}

		const oldRoles = oldMember.roles.cache.map(r => r.id).sort();
		const newRoles = newMember.roles.cache.map(r => r.id).sort();

		if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
			const addedRoles = newRoles.filter(id => !oldRoles.includes(id));
			const removedRoles = oldRoles.filter(id => !newRoles.includes(id));

			if (addedRoles.length > 0 || removedRoles.length > 0) {
				addLog(guildId, userId, 'ROLE_CHANGE', {
					addedRoles: addedRoles.map(id => {
						const role = newMember.roles.cache.get(id);
						return { id, name: role?.name || 'Unknown' };
					}),
					removedRoles: removedRoles.map(id => {
						const role = oldMember.roles.cache.get(id);
						return { id, name: role?.name || 'Unknown' };
					}),
				});
			}
		}
	},
};
