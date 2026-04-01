const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const GUIDE_SECTIONS = [
	{
		title: '기본 안내',
		names: ['가이드', '핑', '서버', '사용자', '밈'],
	},
	{
		title: '레벨',
		names: ['레벨', '랭킹', '레벨설정'],
	},
	{
		title: '로그',
		names: ['로그조회', '로그관리'],
	},
	{
		title: '음성 채널',
		names: ['음성채널설정', '채널이름변경', '채널인원제한', '채널비공개'],
	},
	{
		title: '커뮤니티',
		names: ['투표', '게이브어웨이', '환영메시지', '파티생성'],
	},
];

function summarizeOptions(command) {
	const options = command.data.options ?? [];
	const subcommands = options.filter(option => option.type === 1);

	if (subcommands.length > 0) {
		return `서브커맨드: ${subcommands.map(option => option.name).join(', ')}`;
	}

	const requiredOptions = options
		.filter(option => option.required)
		.map(option => option.name);

	if (requiredOptions.length > 0) {
		return `필수 옵션: ${requiredOptions.join(', ')}`;
	}

	return '추가 옵션 없이 바로 실행 가능';
}

function formatCommandLine(command) {
	return [
		`/${command.data.name}: ${command.data.description}`,
		summarizeOptions(command),
	].join('\n');
}

function buildSectionValue(commands) {
	return commands.map(formatCommandLine).join('\n\n');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('가이드')
		.setDescription('현재 사용 가능한 봇 명령어 가이드를 제공합니다.'),
	async execute(interaction) {
		const commands = interaction.client.commands;
		const fields = GUIDE_SECTIONS
			.map(section => {
				const sectionCommands = section.names
					.map(name => commands.get(name))
					.filter(Boolean);

				if (sectionCommands.length === 0) {
					return null;
				}

				return {
					name: section.title,
					value: buildSectionValue(sectionCommands),
					inline: false,
				};
			})
			.filter(Boolean);

		const guideEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('봇 사용 가이드')
			.setDescription([
				'현재 등록된 슬래시 명령어를 기준으로 안내합니다.',
				'명령어는 채팅창에 `/`를 입력한 뒤 선택해서 사용할 수 있습니다.',
			].join('\n'))
			.addFields(fields)
			.setFooter({ text: `총 ${commands.size}개의 슬래시 명령어가 로드되었습니다.` })
			.setTimestamp();

		await interaction.reply({ embeds: [guideEmbed] });
	},
};
