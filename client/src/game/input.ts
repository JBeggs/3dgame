export type InputState = {
  forward: number;
  right: number;
  jump: boolean;
};

export function createInput(): { state: InputState; attach: () => void; detach: () => void } {
  const state: InputState = { forward: 0, right: 0, jump: false };
  const keys = new Set<string>();

  function recalc() {
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    state.forward = (up ? 1 : 0) + (down ? -1 : 0);
    state.right = (right ? 1 : 0) + (left ? -1 : 0);
  }

  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.code);
    if (e.code === 'Space') state.jump = true;
    recalc();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
    if (e.code === 'Space') state.jump = false;
    recalc();
  }

  return {
    state,
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}


