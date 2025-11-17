const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('가이드').setDescription('봇 사용 가이드를 제공합니다.'),
	async execute(interaction) {
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('✅ 봇 사용 가이드 ✅')
			.setDescription('봇 사용 가이드를 제공합니다.')
			.addFields(
				{ name: '명령어 사용 방법', value: '명령어를 사용하려면 /를 입력하세요.', inline: false },
				{ name: '/가이드', value: '봇 사용 가이드를 제공합니다.', inline: false },
				{ name: '/서버', value: '서버 정보를 제공합니다.', inline: false },
				{ name: '/사용자', value: '사용자 정보를 제공합니다.', inline: false },
				{ name: '/핑', value: '봇 상태를 확인합니다.', inline: false },
				{ name: '/밈', value: '랜덤 밈을 가져옵니다.', inline: false },
			)
			.setImage('https://cdn.discordapp.com/attachments/1328267471191902259/1328267474151907348/image.png?ex=67b76779&is=67b615f9&hm=78e281971b6002487042014330869338124c299180b1165018339d1a519a2952&')
			.setFooter({ text: 'developed by master ziho_', iconURL: 'https://cdn.discordapp.com/attachments/1328267471191902259/1328267474151907348/image.png?ex=67b76779&is=67b615f9&hm=78e281971b6002487042014330869338124c299180b1165018339d1a519a2952&' })
			.setTimestamp();

		await interaction.reply({ embeds: [exampleEmbed] });
	},
};