const {
	ApplicationIntegrationType,
	InteractionContextType,
	MessageFlags,
} = require('discord.js');

function guildOnlyCommand(commandBuilder) {
	return commandBuilder
		.setContexts(InteractionContextType.Guild)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall);
}

async function rejectNonGuildInteraction(interaction) {
	if (interaction.inGuild()) {
		return false;
	}

	await interaction.reply({
		content: '이 명령어는 서버에서만 사용할 수 있습니다.',
		flags: MessageFlags.Ephemeral,
	});
	return true;
}

module.exports = {
	guildOnlyCommand,
	rejectNonGuildInteraction,
};
