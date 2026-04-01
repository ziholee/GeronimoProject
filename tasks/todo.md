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
