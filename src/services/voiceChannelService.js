const { ChannelType } = require('discord.js');

async function createPartyVoiceChannel(guild, party) {
	return guild.channels.create({
		name: party.voiceChannelName || party.title,
		type: ChannelType.GuildVoice,
		parent: party.parentChannelId || undefined,
		reason: `파티 예약 시작: ${party.title}`,
	});
}

async function createPartyInvite(voiceChannel, party) {
	return voiceChannel.createInvite({
		maxAge: 0,
		maxUses: 0,
		unique: true,
		reason: `파티 초대 링크 생성: ${party.title}`,
	});
}

module.exports = {
	createPartyInvite,
	createPartyVoiceChannel,
};
