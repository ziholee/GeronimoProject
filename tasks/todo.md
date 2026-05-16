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

- [x] Review lessons and current slash-command interaction flow
- [x] Confirm command registration JSON and lint are currently clean
- [x] Identify slash commands and modal paths that can exceed Discord's interaction ACK window
- [x] Defer slow slash/modal work before external API calls, guild/member fetches, message sends, or reactions
- [x] Verify dry-run command registration, lint, and targeted deferred-reply behavior
- [x] Document review results for the interaction failure fix

- [x] Read `zira_discord_bot_analysis.md` and compare it with the current reaction-role implementation
- [x] Keep `/반응역할생성` modal flow while adding Zira-style role modes
- [x] Support `normal`, `once`, `remove`, and grouped `toggle` behavior in reaction add/remove events
- [x] Persist any new reaction-role config fields without breaking existing `data/reactionRoles.json`
- [x] Update README and `/가이드` wording for the expanded reaction-role behavior
- [x] Verify lint, command dry-run, and targeted reaction-role mode behavior
- [x] Document review results for the Zira-inspired reaction-role improvement

- [x] Confirm Discord modal cannot contain a channel picker, so channel selection must happen as a slash-command option
- [x] Add a required target channel option to `/반응역할생성`
- [x] Carry the selected channel through the reaction-role setup session
- [x] Send the reaction-role embed and reaction to the selected channel instead of the command channel
- [x] Update README for the new target-channel workflow
- [x] Verify command JSON, lint, and targeted modal channel behavior

- [x] Capture the correction that server-specific objects should use Discord picker options instead of typed IDs
- [x] Move reaction-role role selection from modal text input to a native slash-command role option
- [x] Move reaction-role mode selection from modal text input to slash-command choices
- [x] Keep only free-text reaction-role fields in the modal
- [x] Verify the slash option to modal handoff for selected channel, role, mode, and toggle group

- [x] Add a reaction-role setup panel after the slash command for emoji selection
- [x] Support server custom emoji selection through a Discord select menu
- [x] Support common Unicode emoji click selection plus manual emoji input fallback
- [x] Route reaction-role select menu/button interactions through `interactionCreate`
- [x] Verify selected/manual emoji flows create the reaction-role message correctly

- [x] Clarify in README that channel and role are selected through slash-command pickers, not inside the modal
- [x] Clarify in README that the final modal only contains free-text fields after picker selections

- [x] Make `/가이드` filter commands by the caller's permissions
- [x] Keep administrator/manage-role commands visible to eligible admins while hiding them from regular users
- [x] Make `/가이드` replies private so admin-only command lists are not exposed in public channels
- [x] Verify guide filtering for regular, administrator, and manage-role users

- [x] Refresh README against the current command registry and recent guide/reaction-role behavior
- [x] Add any missing bot permission notes introduced by the picker-based reaction-role flow
- [x] Verify README command coverage and formatting after the refresh

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
- The interaction failure risk was in slash/modal paths that do external HTTP, guild/member fetches, channel message sends, or reaction creation before acknowledging the interaction
- Updated `/밈`, `/서버`, `/랭킹`, `/로그조회`, `/파티생성` modal submission, and `/반응역할생성` modal submission to defer first on slow paths and finish with `editReply`
- Kept fast validation replies immediate where they can fail before slow work, so users still get quick validation feedback without unnecessary loading states
- Verification after the interaction fix: targeted fake-interaction checks confirm defer-before-edit behavior, `npx eslint src` passes, `npm run deploy -- --dry-run` validates all 19 commands, and `git diff --check` passes
- `zira_discord_bot_analysis.md` showed the biggest gap in the current reaction-role feature was mode support: the bot only behaved like a single normal add/remove reaction despite exposing a mode field
- Expanded `/반응역할생성` so the modal accepts `normal`, `once`, `remove`, and `toggle:그룹명`; Korean aliases such as `일반`, `인증`, `제거`, and `토글` are also accepted
- Updated reaction add/remove handling so normal adds/removes roles, once grants and keeps roles, remove removes roles, and toggle removes sibling roles in the same group
- Added `groupName` persistence with backward-compatible normalization for existing `data/reactionRoles.json` records
- Updated README and the command description used by `/가이드` to document the new Zira-style modes and extra permissions for once/remove/external emoji cases
- Verification after the Zira-inspired improvement: targeted mode parser and fake reaction checks pass, `npx eslint src` passes, `npm run deploy -- --dry-run` validates all 19 commands, and `git diff --check` passes
- Improved `/반응역할생성` so server-specific values are chosen through Discord UI instead of typed IDs: `채널` uses a channel picker, `역할` uses a role picker, and `동작방식` uses fixed slash-command choices
- Added a short-lived reaction-role setup session so the selected channel, role, mode, and toggle group survive the emoji selection and details modal flow
- Added an emoji setup panel with server custom emoji select options, common Unicode emoji select options, and a manual input button for emojis not shown in the lists
- Routed reaction-role select-menu and manual-input button interactions through `interactionCreate`
- Reduced the final modal to free-text details: title, description, and only an emoji field when the manual input path is chosen
- Updated README to document the new picker-first workflow and the remaining Discord limitation that full arbitrary emoji picking is not exposed by slash/modals
- Verification after the picker workflow update: targeted picker handoff checks pass, `npx eslint src` passes, `npm run deploy -- --dry-run` validates all 19 commands, and `git diff --check` passes
- README now explicitly states that Discord modals cannot render channel/role pickers, so `/반응역할생성` uses slash-command pickers for `채널`, `역할`, and `동작방식`, while the modal only asks for free-text details
- Updated `/가이드` so it filters visible commands by the caller's permissions: regular users see public commands only, `Manage Roles` users also see `/반응역할생성`, and administrators see every loaded command
- Made `/가이드` replies private with `MessageFlags.Ephemeral`, so admin-only command lists are visible only to the requester
- Added a `가이드 닫기` button that deletes the guide reply when possible, with a fallback that clears the guide content
- Documented the private, permission-aware `/가이드` behavior in README
- Verification after the guide visibility update: permission-filter checks pass, dismiss-button checks pass, `npx eslint src` passes, and `npm run deploy -- --dry-run` validates all 19 commands
- Refreshed README after the latest guide/reaction-role changes: the command list now describes permission-aware `/가이드`, the bot invite permissions include `Manage Messages` and `Use External Emojis`, and all 19 loaded slash commands are still referenced
- Verification after the README refresh: command coverage script reports 19 commands and no missing README references, and `git diff --check` passes
