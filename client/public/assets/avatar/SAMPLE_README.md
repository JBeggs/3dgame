Sample Avatar Assets

Place GLB files here and the game will pick them up automatically:

- bodyA.glb
- headA.glb
- robeA.glb

Notes:
- You can copy any small glTF/GLB character part here. For a quick test, download a sample like "Fox" or "CesiumMan" from the glTF Sample Models and rename the file to one of the above. The loader will render the scene root.
- If your GLB includes animation clips named "Idle" and "Run" (or "Walk"), the avatar will auto‑blend Idle↔Run based on movement speed.
- You can change parts at runtime from the console:
  - window.gameApi.setAvatar({ bodyId: 'bodyA', colors: { primary: '#ffcc00' } })

Where to get samples:
- glTF Sample Models (Khronos): https://github.com/KhronosGroup/glTF-Sample-Models
- Mixamo characters (export as glTF): https://www.mixamo.com


