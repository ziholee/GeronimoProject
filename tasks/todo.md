# TODO

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

# Review

- Current `discord.js` setup already follows the modern v14 pattern of file-based command/event loading plus a separate deploy script; reaction-based party recruitment requires additional reaction intent/partials support
- Added `partyStore`, `partyService`, `schedulerService`, `dmService`, and `voiceChannelService` to implement the PRD MVP without removing existing commands or event flows
- Added `/파티생성` plus reaction-based participation events and persisted party state in `data/parties.json` so reservations recover after restart
- Verified the new files with targeted `npx eslint ...` and a `node -e "require(...)"` module load check; full-repo lint still fails because of many pre-existing unrelated lint issues
- Added ignore rules for `.env`, `config.json`, `.DS_Store`, and runtime data JSON files under `data/`
- Removed already tracked local files from the Git index with `git rm --cached`, preserving working copies
- Verified ignore coverage with `git check-ignore -v`
- Added `config.example.json` and updated setup docs so future configuration uses a tracked template instead of sharing secrets
