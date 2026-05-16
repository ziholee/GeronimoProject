# TODO

- [x] Find outdated command names and removed feature references in README
- [x] Update README command documentation to match the current slash-command structure
- [x] Verify README command references against the live command registry

- [x] Inspect the current `/가이드` command and compare it with actually loaded slash commands
- [x] Update `/가이드` to reflect current commands while fitting the existing project structure
- [x] Verify the guide output shape and command coverage after the change

- [x] Confirm all webhook-related code and documentation references in the project
- [x] Remove webhook slash commands and webhook storage module
- [x] Clean README mentions of webhook data files and storage modules
- [x] Verify no project-owned `webhook` references remain after removal

- [x] Review current `discord.js` structure against current v14 patterns and capture compatibility notes
- [x] Read `docs/prd.md` and map the party scheduling MVP onto the existing project architecture
- [x] Add persistent party scheduling storage/service/event/command files without removing existing features
- [x] Update client intents/partials/bootstrap only where required for reaction-based party participation and scheduler recovery
- [x] Update README for the new party scheduling feature and required bot permissions
- [x] Verify the implementation with lint/runtime checks and record the review result

- [x] Identify sensitive and machine-local files currently tracked by Git
- [x] Update `.gitignore` to exclude secrets, local state, and OS metadata
- [x] Remove already tracked sensitive/local files from Git index without deleting working copies
- [x] Review final Git status and summarize the protection changes
- [x] Add a safe sample config file for future setup
- [x] Update README to document the sample-config workflow
- [x] Inspect the deploy failure from report.md and identify the invalid slash-command definition
- [x] Reorder slash-command options to satisfy Discord required-before-optional validation
- [x] Verify all registered command definitions for option-order validity after the fix

- [x] Check installed Discord library versions against current discord.js v14 documentation
- [x] Review client intents/partials, event handling, and slash-command deploy/runtime paths for v14 compatibility
- [x] Identify potential runtime bugs or maintenance risks in current bot code
- [x] Run available static/runtime verification and capture results
- [x] Document the discord.js compatibility review findings

- [x] Add guild-only context restrictions and runtime guards for guild-only slash commands
- [x] Harden partial message update handling and deferred interaction error replies
- [x] Add a safe deploy dry-run path for command verification
- [x] Normalize deprecated ephemeral reply options where touched
- [x] Update Discord package patch versions and verify command loading/lint status
- [x] Document the fix results

- [x] Fix log export deferred error handling so `editReply` does not receive unsupported ephemeral flags

- [x] Convert `/파티생성` from slash options to a Discord modal workflow
- [x] Parse modal input for title, schedule, description, recruit close time, max members, and voice channel name
- [x] Route party modal submissions through `interactionCreate`
- [x] Verify modal command JSON, lint, and dry-run command registration

- [x] Update README for modal-based `/파티생성`, current discord.js version, and safe deploy dry-run workflow
- [x] Verify README command documentation against the live command registry after the modal change

- [x] Fix broken Korean text rendering in generated welcome images
- [x] Register a Korean-capable font for node-canvas with cross-platform fallbacks
- [x] Render a sample welcome image locally and verify lint

- [x] Document planned modal-based reaction-role feature design in README
- [x] Make clear the reaction-role command is a planned feature, not a currently registered command

- [x] Implement persistent reaction-role storage
- [x] Add modal-based `/반응역할생성` slash command
- [x] Connect reaction-role modal submissions through `interactionCreate`
- [x] Grant and remove roles from reaction add/remove events
- [x] Update README from planned reaction-role design to current feature documentation
- [x] Verify reaction-role command loading, lint, and dry-run registration

- [x] Add `/반응역할생성` to `/가이드` command categories
- [x] Make `/가이드` show uncategorized loaded commands so future additions are not hidden
- [x] Update README current slash-command section against the 19-command registry
- [x] Verify `/가이드` output and README cover all loaded slash commands

# Review

- README still referenced removed webhook features and older English-style command names such as `/level` and `/voice setup`
- Updated README to describe the currently loaded Korean slash commands and current feature set only
- Verified README command references against the live registry of 18 loaded slash commands and removed stale webhook references

- `/가이드` was still hardcoding removed webhook commands and omitted newer command structure details
- Updated the guide command to build sections from the live slash command registry instead of a stale manual list
- Verified against the live command registry; the guide now reflects 18 currently loaded slash commands and summarizes subcommands or required options

- Webhook feature references were limited to two utility slash commands, one JSON-backed storage module, and README documentation entries
- Removed `/웹훅포스트`, `/웹훅설정`, and `src/storage/webhookStore.js`
- Removed README mentions of `data/webhookSettings.json` and `webhookStore.js`
- Verified with project search and command collection reload; remaining `webhook` mentions exist only in this task log

- Current `discord.js` setup already follows the modern v14 pattern of file-based command/event loading plus a separate deploy script; reaction-based party recruitment requires additional reaction intent/partials support
- Added `partyStore`, `partyService`, `schedulerService`, `dmService`, and `voiceChannelService` to implement the PRD MVP without removing existing commands or event flows
- Added `/파티생성` plus reaction-based participation events and persisted party state in `data/parties.json` so reservations recover after restart
- Verified the new files with targeted `npx eslint ...` and a `node -e "require(...)"` module load check; full-repo lint still fails because of many pre-existing unrelated lint issues
- Added ignore rules for `.env`, `config.json`, `.DS_Store`, and runtime data JSON files under `data/`
- Removed already tracked local files from the Git index with `git rm --cached`, preserving working copies
- Verified ignore coverage with `git check-ignore -v`
- Added `config.example.json` and updated setup docs so future configuration uses a tracked template instead of sharing secrets
- `report.md` captured a Discord command registration failure caused by a required option being declared after an optional option
- Reordered `/파티생성` so required options (`제목`, `집합시간`) come before optional options, matching Discord API validation rules
- Verified the full local command registry with a JSON inspection script; `party/create.js` was the only invalid definition and no option-order violations remain
- Current lockfile installs `discord.js@14.24.2`, `@discordjs/rest@2.6.0`, and `discord-api-types@0.38.33`; npm currently reports newer `discord.js@14.26.4`, `@discordjs/rest@2.6.1`, and `discord-api-types@0.38.47`
- The code largely uses v14-era APIs (`GatewayIntentBits`, `Partials`, `Events`, `SlashCommandBuilder`, `MessageFlags`) and command JSON generation succeeds for 18 commands with no required-after-optional option ordering violations
- Latest discord.js docs mark `InteractionReplyOptions.ephemeral` and `fetchReply` as deprecated; several older commands still use them and should move to `flags: MessageFlags.Ephemeral` plus `withResponse`/explicit response fetch patterns
- Several commands are global guild-oriented commands but do not set modern command contexts; guild-only commands should be restricted with current context APIs so DM/user-install contexts cannot hit code paths that assume `interaction.guild`, `interaction.member`, or `interaction.channel`
- Potential runtime risks found: partial `messageUpdate` handling can dereference `newMessage.author` when missing, `logmanage` can reply again after a deferred export error, welcome messages only use cached channels, and deploy script ignores `--dry-run` while attempting a real global PUT
- Verification: `npm ls` and direct `require('discord.js').version` confirm installed 14.24.2; command registry inspection passed; `npm test` fails because no test script exists; ESLint currently fails with 67 style/static errors, mostly pre-existing formatting plus a few unused variables
- Added `commandContext` helpers so guild-only slash commands deploy with Guild/GuildInstall metadata and are still rejected at runtime if invoked outside a guild
- Hardened `messageUpdate` against partial fetch failures and missing authors, and fixed `logmanage` so errors after `deferReply` use the existing interaction response
- Added a real `--dry-run` branch to `deploy-commands.js`; dry-run now validates and lists commands without calling Discord's registration API
- Updated Discord packages to `discord.js@14.26.4`, `@discordjs/rest@2.6.1`, and `discord-api-types@0.38.47`; `npm audit fix` also resolved transitive advisories and final audit reports 0 vulnerabilities
- Normalized touched commands away from deprecated `ephemeral: true` reply options and cleaned lint issues in the touched surface plus remaining project lint blockers
- Verification after fixes: command registry inspection passes for 18 commands with no option-order violations, `npm run deploy -- --dry-run` passes without network mutation, `npx eslint src` passes, direct `require('discord.js').version` reports 14.26.4, and `npm test` still fails because the project has no real test script
- Fixed the reviewed log export error path so deferred interactions call `editReply({ content })` without unsupported `Ephemeral` flags, while initial replies still use `MessageFlags.Ephemeral`
- Verification after that targeted fix: `npx eslint src/commands/utility/logmanage.js src`, `npm run deploy -- --dry-run`, and a direct `logmanage` command load check all pass
- Converted `/파티생성` into a modal-first workflow; the slash command now opens a five-field modal for title, scheduled time, description, recruit close time, and combined max-member/channel-name settings
- Modal submissions are routed through `interactionCreate` to `party/create.js`, then reuse the existing party validation, persistence, recruitment embed, and reaction setup flow
- The combined settings input accepts examples like `5, 발로란트 내전`, `인원=5, 채널=발로란트 내전`, or just a channel name; out-of-range max-member values now produce a validation error instead of being treated as a channel name
- Verification after modal conversion: `npx eslint src/commands/party/create.js src/events/interactionCreate.js src`, modal `toJSON()` construction, command registry inspection for 18 commands, and `npm run deploy -- --dry-run` all pass
- Updated README to document the modal-based `/파티생성` flow, safe `npm run deploy -- --dry-run` verification step, and current `discord.js` version `v14.26.4`
- Verified README mentions all 18 currently loaded slash commands and no longer contains the stale `discord.js v14.24.2` version string
- Fixed welcome image Korean text rendering by registering a Korean-capable font with node-canvas before drawing text
- The welcome image font loader checks `WELCOME_FONT_PATH` first, then common macOS/Linux/Windows Korean font paths, and falls back to named system families if no file is found
- Verification after the welcome font fix: `npx eslint src/events/guildMemberAdd.js src`, direct `guildMemberAdd` module load, and a local `/tmp/welcome-font-test.png` render with Korean text all pass
- Added a README design section for the planned modal-based reaction-role feature, including `/반응역할생성` modal fields, persistence shape, reaction add/remove handling, permission requirements, and follow-up management commands
- Verified the planned reaction-role command is not listed under current slash commands, while README still mentions all 18 currently loaded commands
- Implemented the actual modal-based `/반응역할생성` command, persistent `data/reactionRoles.json` storage, and add/remove reaction event handling for automatic role grant/removal
- Updated `interactionCreate` so reaction-role modal submissions are routed alongside existing party and giveaway modals
- Updated README from planned-design wording to current feature documentation and added `/반응역할생성` to the live slash-command list
- Captured the correction in `tasks/lessons.md`: feature requests with README updates should be implemented first and documented afterward
- Verification after implementation: `npx eslint src`, command registry inspection for 19 commands with no option-order violations, `npm run deploy -- --dry-run`, direct reaction-role command/service load checks, README command coverage, and `git diff --check` all pass
- Updated `/가이드` so `/반응역할생성` appears in the 커뮤니티 section
- Added an uncategorized fallback section in `/가이드` so future loaded commands are not hidden if a category list is missed
- Updated README's current slash-command section to state the live 19-command count and point users to `/가이드`
- Verification after guide/README refresh: `/가이드` field generation covers all 19 commands with no overlong fields, README command coverage has no missing commands, `npx eslint src/commands/utility/guide.js src`, `npm run deploy -- --dry-run`, and `git diff --check` all pass
