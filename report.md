18개의 슬래시 명령어를 (글로벌)로 등록하는 중...
DiscordAPIError[50035]: Invalid Form Body
0.options[2][APPLICATION_COMMAND_OPTIONS_REQUIRED_INVALID]: Required options must be placed before non-required options
    at handleErrors (C:\Users\JB\Desktop\discord_bot\node_modules\@discordjs\rest\dist\index.js:762:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async SequentialHandler.runRequest (C:\Users\JB\Desktop\discord_bot\node_modules\@discordjs\rest\dist\index.js:1163:23)
    at async SequentialHandler.queueRequest (C:\Users\JB\Desktop\discord_bot\node_modules\@discordjs\rest\dist\index.js:994:14)
    at async _REST.request (C:\Users\JB\Desktop\discord_bot\node_modules\@discordjs\rest\dist\index.js:1307:22)
    at async C:\Users\JB\Desktop\discord_bot\src\deploy-commands.js:37:16 {
  requestBody: {
    files: undefined,
    json: [
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object]
    ]
  },
  rawError: {
    message: 'Invalid Form Body',
    code: 50035,
    errors: { '0': [Object] }
  },
  code: 50035,
  status: 400,
  method: 'PUT',
  url: 'https://discord.com/api/v10/applications/1248510726830821376/commands'
}