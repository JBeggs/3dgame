export type InputState = {
  forward: number;
  right: number;
  jump: boolean;
  action: boolean;
};

type InputAPI = {
  state: InputState;
  attach: () => void;
  detach: () => void;
  setVector: (right: number, forward: number) => void;
  setJump: (v: boolean) => void;
  setAction: (v: boolean) => void;
};

let singleton: InputAPI | null = null;

export function getInput(): InputAPI {
  if (singleton) return singleton;

  const state: InputState = { forward: 0, right: 0, jump: false, action: false };
  const keys = new Set<string>();

  function recalc() {
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    state.forward = clamp((up ? 1 : 0) + (down ? -1 : 0));
    state.right = clamp((right ? 1 : 0) + (left ? -1 : 0));
  }

  function onKeyDown(e: KeyboardEvent) {
    console.log('⌨️ Key:', e.code); // Simpler debug logging
    // ensure canvas has focus even if UI clicked
    if (document.activeElement && (document.activeElement as HTMLElement).blur) {
      try { (document.activeElement as HTMLElement).blur(); } catch {}
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
      try { e.preventDefault(); } catch {}
    }
    keys.add(e.code);
    if (e.code === 'Space') state.jump = true;
    if (e.code === 'KeyE') state.action = true;
    recalc();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
    if (e.code === 'Space') state.jump = false;
    if (e.code === 'KeyE') state.action = false;
    recalc();
  }

  function setVector(right: number, forward: number) {
    state.right = clamp(right);
    state.forward = clamp(forward);
  }
  function setJump(v: boolean) {
    state.jump = v;
  }
  // Optional: consumer can set action programmatically (e.g., touch button)
  function setAction(v: boolean) { state.action = v; }

  // Gamepad support
  let gamepadInterval: number | null = null;
  let attached = false; // Prevent double attach/detach
  function pollGamepad() {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad
    if (gamepad) {
      // Only log when buttons are pressed or axes moved significantly
      const hasInput = gamepad.buttons.some(b => b.pressed) || Math.abs(gamepad.axes[0]) > 0.1 || Math.abs(gamepad.axes[1]) > 0.1;
      if (hasInput) {
        console.log('Gamepad input:', gamepad.id, 'axes:', [gamepad.axes[0], gamepad.axes[1]], 'buttons:', gamepad.buttons.map(b => b.pressed));
      }
      // Left stick for movement
      const leftX = gamepad.axes[0] || 0;
      const leftY = gamepad.axes[1] || 0;
      // Apply deadzone
      const deadzone = 0.15;
      const magnitude = Math.hypot(leftX, leftY);
      if (magnitude > deadzone) {
        const normalizedX = leftX / magnitude;
        const normalizedY = leftY / magnitude;
        const adjustedMagnitude = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
        setVector(normalizedX * adjustedMagnitude, -normalizedY * adjustedMagnitude);
      } else {
        // Only reset if no keyboard input is active
        if (!keys.has('KeyW') && !keys.has('KeyS') && !keys.has('KeyA') && !keys.has('KeyD') && 
            !keys.has('ArrowUp') && !keys.has('ArrowDown') && !keys.has('ArrowLeft') && !keys.has('ArrowRight')) {
          setVector(0, 0);
        }
      }
      
      // Face buttons (A = 0, B = 1, X = 2, Y = 3)
      const aButton = gamepad.buttons[0]?.pressed || false;
      const bButton = gamepad.buttons[1]?.pressed || false;
      
      // A button for jump, B button for action
      if (aButton && !state.jump) state.jump = true;
      if (!aButton && state.jump) state.jump = false;
      if (bButton && !state.action) state.action = true;
      if (!bButton && state.action) state.action = false;
    }
  }

  singleton = {
    state,
    attach() {
      if (attached) {
        console.log('⚠️ Input already attached, skipping');
        return;
      }
      console.log('🔗 Attaching input system...');
      attached = true;
      
      window.addEventListener('keydown', onKeyDown, { passive: false });
      window.addEventListener('keyup', onKeyUp, { passive: true });
      document.addEventListener('keydown', onKeyDown, { passive: false });
      document.addEventListener('keyup', onKeyUp, { passive: true });
      
      // Start gamepad polling
      gamepadInterval = window.setInterval(pollGamepad, 16); // ~60fps
      console.log('✅ Input system attached successfully');
    },
    detach() {
      if (!attached) {
        console.log('⚠️ Input already detached, skipping');
        return;
      }
      console.log('🔌 Detaching input system...');
      attached = false;
      
      window.removeEventListener('keydown', onKeyDown as any);
      window.removeEventListener('keyup', onKeyUp as any);
      document.removeEventListener('keydown', onKeyDown as any);
      document.removeEventListener('keyup', onKeyUp as any);
      
      // Stop gamepad polling
      if (gamepadInterval) {
        clearInterval(gamepadInterval);
        gamepadInterval = null;
      }
      console.log('✅ Input system detached successfully');
    },
    setVector,
    setJump,
    setAction,
  };
  return singleton;
}

function clamp(v: number) { return Math.max(-1, Math.min(1, v)); }


