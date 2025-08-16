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

  singleton = {
    state,
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
    setVector,
    setJump,
    setAction,
  };
  return singleton;
}

function clamp(v: number) { return Math.max(-1, Math.min(1, v)); }


