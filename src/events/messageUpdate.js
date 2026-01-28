const { Events } = require('discord.js');
const { addLog } = require('../storage/logStore');

module.exports = {
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage) {
		if (!newMessage.guild) return;
		if (newMessage.author.bot) return;
		if (oldMessage.content === newMessage.content) return;

		const guildId = newMessage.guild.id;
		const userId = newMessage.author.id;

		addLog(guildId, userId, 'MESSAGE_EDIT', {
			messageId: newMessage.id,
			channelId: newMessage.channel.id,
			channelName: newMessage.channel.name,
			oldContent: oldMessage.content?.substring(0, 500) || '',
			newContent: newMessage.content?.substring(0, 500) || '',
		});
	},
};
