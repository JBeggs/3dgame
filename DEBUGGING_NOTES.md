### React maximum update depth exceeded

Cause here: returning new state objects each subscribe call or recreating network connections during render/frame.

Fixes applied
- Memoized the network connection once in `useMemo` inside the player controller.
- `useNet()` now uses a single mutable store reference for `useSyncExternalStore` to prevent cascading updates.
- Removed unused ReactDOM import.

If you see renderer context lost
- That often means a crash loop or too many WebGL contexts. Ensure the `<Canvas />` mounts only once and that no nested updates recreate it.

Movement feels stuck
- Lowered physics friction and linear damping on the player; added velocity-based acceleration for smoother motion.
- Increased world cell scale slightly to give more clearance in corridors.


