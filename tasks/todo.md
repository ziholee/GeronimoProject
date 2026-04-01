# TODO

- [x] Identify sensitive and machine-local files currently tracked by Git
- [x] Update `.gitignore` to exclude secrets, local state, and OS metadata
- [x] Remove already tracked sensitive/local files from Git index without deleting working copies
- [x] Review final Git status and summarize the protection changes

# Review

- Added ignore rules for `.env`, `config.json`, `.DS_Store`, and runtime data JSON files under `data/`
- Removed already tracked local files from the Git index with `git rm --cached`, preserving working copies
- Verified ignore coverage with `git check-ignore -v`
