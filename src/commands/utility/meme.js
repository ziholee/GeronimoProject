const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
	data: new SlashCommandBuilder().setName('밈').setDescription('랜덤 밈을 가져옵니다.'),
	async execute(interaction) {
		await interaction.deferReply();

		try {
			const response = await axios.get('https://meme-api.com/gimme', { timeout: 8000 });
			const meme = response.data;
			const embed = new EmbedBuilder()
				.setTitle(meme.title)
				.setImage(meme.url)
				.setColor(0x00AE86)
				.setFooter({ text: `Subreddit: ${meme.subreddit}` });
			await interaction.editReply({ embeds: [embed] });
		}
		catch (error) {
			console.error('밈 가져오기 오류:', error);
			await interaction.editReply('밈을 가져오는 중 오류가 발생했습니다.');
		}
	},
};
