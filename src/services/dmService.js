const { EmbedBuilder } = require('discord.js');

function buildPartyInviteDm(party, inviteUrl) {
	return new EmbedBuilder()
		.setColor(0x57f287)
		.setTitle(`파티 집합 알림 | ${party.title}`)
		.setDescription('예약된 파티가 시작되었습니다. 아래 링크로 바로 참여해주세요.')
		.addFields(
			{ name: '집합 시간', value: `<t:${Math.floor(party.scheduledAt / 1000)}:F>`, inline: true },
			{ name: '음성채널 링크', value: inviteUrl, inline: false },
		)
		.setTimestamp();
}

async function sendPartyInviteDm(user, party, inviteUrl) {
	await user.send({
		embeds: [buildPartyInviteDm(party, inviteUrl)],
	});
}

module.exports = {
	sendPartyInviteDm,
};
