# Lessons

- When the user asks to add a feature and update README, treat README work as supporting documentation after implementation, not as a substitute for building the feature.
- When a Discord command asks admins for server-specific objects such as channels or roles, prefer native slash-command options so Discord shows the server picker; keep modals only for free-text fields because modals cannot render channel/role/emoji pickers.
- When implementing mutually exclusive Discord reaction-role choices, keep both role state and reaction UI state synchronized; removing sibling roles must also remove the user's sibling reactions.
