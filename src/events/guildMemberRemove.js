const { Events } = require('discord.js');
const { addLog } = require('../storage/logStore');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		const guildId = member.guild.id;
		const userId = member.user.id;

		addLog(guildId, userId, 'MEMBER_LEAVE', {
			username: member.user.username,
			displayName: member.displayName,
			roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
			joinedAt: member.joinedTimestamp,
		});
	},
};
