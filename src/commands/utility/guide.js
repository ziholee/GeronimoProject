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
				{ name: '/투표', value: '투표를 생성합니다.', inline: false },
				{ name: '/레벨', value: '자신 또는 다른 사용자의 레벨과 경험치를 확인합니다.', inline: false },
				{ name: '/랭킹', value: '서버 내 레벨/XP 상위 유저 랭킹을 확인합니다.', inline: false },
				{ name: '/레벨설정', value: '레벨 시스템의 쿨타임/알림 채널/알림 여부를 설정합니다. (관리자 전용)', inline: false },
				{ name: '/음성채널설정', value: '음성 채널 자동 생성 기능을 설정합니다. (관리자 전용)', inline: false },
				{ name: '/채널이름변경', value: '현재 임시 음성 채널의 이름을 변경합니다.', inline: false },
				{ name: '/채널인원제한', value: '현재 임시 음성 채널의 최대 인원을 설정합니다.', inline: false },
				{ name: '/채널비공개', value: '현재 임시 음성 채널을 비공개로 설정합니다.', inline: false },
				{ name: '/게이브어웨이', value: '지정한 시간 뒤 리액션 참가자 중 당첨자를 뽑습니다.', inline: false },
				{ name: '/환영메시지 채널설정', value: '환영 메시지를 보낼 채널을 설정합니다. (관리자 전용)', inline: false },
				{ name: '/환영메시지 배경설정', value: '환영 메시지 배경 이미지를 설정합니다. (관리자 전용)', inline: false },
				{ name: '/환영메시지 메시지설정', value: '환영 메시지 텍스트를 설정합니다. (관리자 전용)', inline: false },
				{ name: '/환영메시지 설정확인', value: '현재 환영 메시지 설정을 확인합니다. (관리자 전용)', inline: false },
				{ name: '/환영메시지 배경목록', value: '사용 가능한 배경 이미지 목록을 확인합니다. (관리자 전용)', inline: false },
				{ name: '/환영메시지 초기화', value: '환영 메시지 설정을 초기화합니다. (관리자 전용)', inline: false },
			)
			.setImage('https://cdn.discordapp.com/attachments/1328267471191902259/1328267474151907348/image.png?ex=67b76779&is=67b615f9&hm=78e281971b6002487042014330869338124c299180b1165018339d1a519a2952&')
			.setFooter({ text: 'developed by master ziho_', iconURL: 'https://cdn.discordapp.com/attachments/1328267471191902259/1328267474151907348/image.png?ex=67b76779&is=67b615f9&hm=78e281971b6002487042014330869338124c299180b1165018339d1a519a2952&' })
			.setTimestamp();

		await interaction.reply({ embeds: [exampleEmbed] });
	},
};