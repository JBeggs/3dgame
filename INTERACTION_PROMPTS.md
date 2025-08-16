### Interaction Prompts (E to open)

What was added
- Input now includes an `action` flag (`E` key).
- Door shows a contextual prompt (“Press E to open” / “Need 1 key”).
- Logic checks `action` to unlock instead of click-only.
- Files touched: `client/src/game/input.ts`, `client/src/ui/Prompt.tsx`, `client/src/ui/Interactables.tsx`.

How to try
1. Collect the key.
2. Move cursor over the door to see the prompt; press `E` to unlock.

Next extensions
- Proximity-based prompts (radius check) instead of pointer hover.
- Gamepad ‘A’ mapping and mobile action button.


