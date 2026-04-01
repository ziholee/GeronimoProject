# Discord 봇 프로젝트

Discord.js v14를 기반으로 한 다기능 Discord 봇입니다. 레벨링 시스템, 음성 채널 관리, 환영 메시지, 파티 예약 모집, 로그 관리 등 다양한 기능을 제공합니다.

## 주요 기능

- **레벨링 시스템**: 메시지 기반 XP 및 레벨 시스템
- **음성 채널 관리**: 자동 생성되는 임시 음성 채널 관리 (Voice Master)
- **환영 메시지**: 새 멤버 환영 메시지 자동 전송
- **파티 예약 시스템**: 예약 시간에 맞춰 음성채널 생성 및 참가자 DM 초대
- **사용자 로그 시스템**: 서버 사용자들의 모든 활동 로그 기록 및 관리 (관리자 전용)
- **커뮤니티 명령어**: 투표, 게이브어웨이, 파티 모집 지원
- **유틸리티 명령어**: 서버 정보, 사용자 정보, 밈, 가이드 등

## 필수 요구사항

- **Node.js**: v18.0.0 이상 (권장: v18.x 또는 v20.x)
- **npm**: Node.js와 함께 설치됨
- **Discord 봇 토큰**: [Discord Developer Portal](https://discord.com/developers/applications)에서 생성

## 설치 방법

### 1. 프로젝트 클론 또는 다운로드

```bash
# Git을 사용하는 경우
git clone <repository-url>
cd discord_bot

# 또는 ZIP 파일을 다운로드한 경우
# 압축을 풀고 해당 디렉토리로 이동
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 설정 파일 생성

프로젝트 루트 디렉토리에서 `config.example.json`을 복사해 `config.json` 파일을 만든 뒤 값을 채워 넣습니다:

```bash
cp config.example.json config.json
```

`config.json` 예시는 다음과 같습니다:

```json
{
    "clientId": "YOUR_BOT_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID",
    "token": "YOUR_BOT_TOKEN"
}
```

#### 설정 값 가져오기

1. **Bot Token (토큰)**:
   - [Discord Developer Portal](https://discord.com/developers/applications) 접속
   - 애플리케이션 선택 → 왼쪽 메뉴에서 "Bot" 클릭
   - "Reset Token" 또는 "Copy" 버튼으로 토큰 복사
   - ⚠️ **주의**: 토큰을 절대 공개하지 마세요!

2. **Client ID (봇 ID)**:
   - 같은 페이지에서 "Application ID" 복사
   - 또는 "OAuth2" → "General"에서 확인

3. **Guild ID (서버 ID)**:
   - Discord에서 개발자 모드 활성화 (설정 → 고급 → 개발자 모드)
   - 서버 이름 우클릭 → "ID 복사"

### 4. 데이터 디렉토리 확인

`data` 폴더가 존재하는지 확인하고, 없으면 자동으로 생성됩니다. 다음 파일들이 필요합니다:

- `data/leveling.json` - 레벨 데이터 (자동 생성)
- `data/levelConfig.json` - 레벨 설정 (자동 생성)
- `data/voiceMasterChannels.json` - 음성 채널 설정 (자동 생성)
- `data/welcomeSettings.json` - 환영 메시지 설정 (자동 생성)
- `data/userLogs.json` - 사용자 활동 로그 데이터 (자동 생성)
- `data/parties.json` - 파티 예약 및 참여 데이터 (자동 생성)
- `data/images/` - 이미지 저장 폴더 (필요시)

## 실행 방법

### 1. 명령어 배포 (최초 1회 또는 명령어 변경 시)

봇을 실행하기 전에 슬래시 명령어를 Discord에 등록해야 합니다:

```bash
npm run deploy
```

성공 메시지가 표시되면 명령어가 등록된 것입니다.

### 2. 봇 실행

```bash
npm start
```

봇이 정상적으로 실행되면 콘솔에 "Ready!" 메시지가 표시됩니다.

### 3. 봇을 서버에 초대

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 애플리케이션 선택 → "OAuth2" → "URL Generator"
3. Scopes에서 `bot`과 `applications.commands` 선택
4. Bot Permissions에서 필요한 권한 선택:
   - `Send Messages` (메시지 보내기)
   - `Manage Channels` (채널 관리)
   - `Create Instant Invite` (초대 링크 만들기)
   - `Connect` (음성 채널 연결)
   - `Speak` (음성 채널에서 말하기)
   - `Attach Files` (파일 첨부)
   - `Embed Links` (링크 임베드)
   - `Add Reactions` (반응 추가)
   - `Read Message History` (메시지 기록 읽기)
5. 생성된 URL로 봇을 서버에 초대

## 프로젝트 구조

```
discord_bot/
├── config.example.json      # 커밋 가능한 설정 예시 파일
├── config.json              # 로컬 전용 봇 설정 파일 (Git 추적 제외)
├── package.json             # 프로젝트 의존성 및 스크립트
├── src/
│   ├── index.js            # 메인 진입점, 봇 초기화 및 실행
│   ├── deploy-commands.js  # 슬래시 명령어 배포 스크립트
│   ├── commands/           # 명령어 파일들
│   │   ├── party/         # 파티 예약 모집 명령어
│   │   ├── utility/       # 유틸리티 명령어
│   │   └── voice/         # 음성 채널 관련 명령어
│   ├── events/            # 이벤트 핸들러
│   │   ├── ready.js       # 봇 준비 완료 이벤트
│   │   ├── interactionCreate.js  # 슬래시 명령어 처리
│   │   ├── messageReactionAdd.js # 파티 참여 반응 처리
│   │   ├── messageReactionRemove.js # 파티 참여 취소 처리
│   │   ├── messageCreate.js      # 메시지 이벤트 (레벨링 등)
│   │   ├── messageUpdate.js      # 메시지 수정 이벤트 (로그 기록)
│   │   ├── messageDelete.js      # 메시지 삭제 이벤트 (로그 기록)
│   │   ├── guildMemberAdd.js     # 새 멤버 환영
│   │   ├── guildMemberRemove.js  # 멤버 퇴장 이벤트 (로그 기록)
│   │   ├── guildMemberUpdate.js  # 멤버 정보 변경 이벤트 (로그 기록)
│   │   └── voiceStateUpdate.js   # 음성 채널 상태 변경
│   ├── services/          # 기능 서비스 계층
│   │   ├── partyService.js
│   │   ├── schedulerService.js
│   │   ├── dmService.js
│   │   └── voiceChannelService.js
│   └── storage/           # 데이터 저장소 모듈
│       ├── levelStore.js  # 레벨 데이터 관리
│       ├── voiceMasterStore.js  # 음성 채널 데이터 관리
│       ├── welcomeStore.js      # 환영 메시지 설정 관리
│       ├── logStore.js          # 사용자 로그 데이터 관리
│       └── partyStore.js        # 파티 예약 데이터 관리
└── data/                  # 데이터 저장 폴더
    ├── leveling.json      # 사용자 레벨/XP 데이터
    ├── levelConfig.json   # 레벨 시스템 설정
    ├── voiceMasterChannels.json  # 음성 채널 설정
    ├── welcomeSettings.json      # 환영 메시지 설정
    ├── userLogs.json             # 사용자 활동 로그 데이터
    ├── parties.json              # 파티 예약/참여 데이터
    └── images/            # 이미지 파일 저장소
```

## 주요 기능 설명

### 레벨링 시스템

- 사용자가 메시지를 보낼 때마다 XP 획득
- 일정 XP 달성 시 자동 레벨업
- `/레벨` 명령어로 자신의 레벨 확인
- `/랭킹` 명령어로 서버 내 순위 확인
- `/레벨설정` 명령어로 레벨링 설정 관리

### 음성 채널 관리 (Voice Master)

- 특정 음성 채널에 입장하면 자동으로 임시 음성 채널 생성
- 생성된 채널에서 사용자가 나가면 자동 삭제
- `/음성채널설정` 명령어로 Voice Master 채널 설정
- `/채널인원제한` 명령어로 채널 인원 제한 설정
- `/채널이름변경` 명령어로 채널 이름 변경
- `/채널비공개` 명령어로 채널 공개/비공개 설정

### 환영 메시지

- 새 멤버가 서버에 입장하면 자동으로 환영 메시지 전송
- `/환영메시지` 명령어로 환영 메시지 설정 관리
- 지원 서브커맨드: `채널설정`, `배경설정`, `배경목록`, `메시지설정`, `설정확인`, `초기화`

### 파티 예약 시스템

- `/파티생성` 명령어로 파티 모집 임베드 생성
- 생성자는 자동으로 참여자에 포함되며, 다른 멤버는 모집 메시지에 `✅` 반응으로 참여
- 모집 마감 또는 최대 인원 초과 시 추가 참여 자동 제한
- 예약 시간이 되면 봇이 음성채널을 생성하고 초대 링크를 만들어 참가자 전원에게 DM 전송
- 생성된 파티 음성채널은 기존 임시 음성채널 정리 로직을 재사용해 비면 자동 삭제

#### `/파티생성` 옵션

- `제목` (필수)
- `설명` (선택)
- `집합시간` (필수, `YYYY-MM-DD HH:mm` 또는 `MM-DD HH:mm`)
- `모집마감시간` (선택, 동일 형식)
- `최대인원` (선택)
- `채널이름` (선택)

### 사용자 로그 시스템 (관리자 전용)

- 서버 사용자들의 모든 활동을 자동으로 기록
- **기록되는 활동**:
  - 메시지 전송/수정/삭제
  - 서버 입장/퇴장
  - 닉네임 변경
  - 역할 변경
  - 음성 채널 입장/퇴장
- `/로그조회` 명령어로 로그 조회:
  - 특정 사용자의 로그 조회
  - 서버 전체 로그 조회
  - 타입별 필터링 지원
  - 개수 제한 설정 가능
- `/로그관리` 명령어로 로그 관리:
  - 로그 통계 확인
  - 사용자별/전체/타입별 로그 삭제
  - JSON 파일로 로그 내보내기

## 현재 슬래시 명령어

- 기본 안내: `/가이드`, `/핑`, `/서버`, `/사용자`, `/밈`
- 레벨: `/레벨`, `/랭킹`, `/레벨설정`
- 로그: `/로그조회`, `/로그관리`
- 음성 채널: `/음성채널설정`, `/채널이름변경`, `/채널인원제한`, `/채널비공개`
- 커뮤니티: `/투표`, `/게이브어웨이`, `/환영메시지`, `/파티생성`

## 문제 해결

### 봇이 응답하지 않을 때

1. 봇이 온라인 상태인지 확인 (Discord에서 확인)
2. 봇에게 필요한 권한이 있는지 확인
3. 콘솔에 에러 메시지가 있는지 확인
4. `config.json` 파일의 토큰이 올바른지 확인

### 명령어가 등록되지 않을 때

1. `npm run deploy` 명령어를 다시 실행
2. 봇이 서버에 초대되어 있는지 확인
3. `clientId`가 올바른지 확인
4. 봇에 `applications.commands` 스코프가 있는지 확인
5. 새 기능이 추가됐다면 글로벌 명령어 전파에 수 분 이상 걸릴 수 있으니 잠시 기다린 뒤 다시 확인

### 레벨 데이터가 저장되지 않을 때

1. `data` 폴더에 쓰기 권한이 있는지 확인
2. `data` 폴더가 존재하는지 확인 (없으면 자동 생성됨)
3. 콘솔에 에러 메시지 확인

## 보안 주의사항

- ⚠️ **절대 `config.json` 파일을 Git에 커밋하지 마세요!**
- 이 저장소는 `config.json`을 Git 추적에서 제외하도록 설정되어 있습니다.
- 팀원과 설정 형식을 공유할 때는 `config.example.json`만 사용하세요.
- 토큰이 노출되면 즉시 Discord Developer Portal에서 토큰을 재설정하세요

## 개발 정보

- **Discord.js 버전**: v14.24.2
- **Node.js 권장 버전**: v18.x 또는 v20.x
- **패키지 관리자**: npm
- **파티 시스템 저장 방식**: `data/parties.json` 기반 영속화 + ready 시 스케줄러 복구

## 라이선스

ISC
