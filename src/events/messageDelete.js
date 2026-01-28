const { Events } = require('discord.js');
const { addLog } = require('../storage/logStore');

module.exports = {
	name: Events.MessageDelete,
	async execute(message) {
		if (!message.guild) return;
		if (message.author?.bot) return;

		const guildId = message.guild.id;
		const userId = message.author?.id;

		if (!userId) return;

		addLog(guildId, userId, 'MESSAGE_DELETE', {
			messageId: message.id,
			channelId: message.channel.id,
			channelName: message.channel.name,
			content: message.content?.substring(0, 500) || '',
			attachments: message.attachments.size > 0 ? message.attachments.map(a => a.url) : [],
		});
	},
};
