// one shared player: once a tap has started it, mobile browsers let it keep playing later clips
const player = new Audio();
let current = 0;
let release: (() => void) | null = null;

// resolves when the clip ends, fails to load, or is stopped, so the task never waits forever
export function playClip(path: string): Promise<void> {
  stopClip();
  const token = ++current;
  return new Promise((resolve) => {
    release = resolve;
    const finish = () => {
      if (token !== current) return;
      release = null;
      resolve();
    };
    player.onended = finish;
    player.onerror = finish;
    player.src = import.meta.env.BASE_URL + path;
    player.play().catch(finish);
  });
}

export function stopClip() {
  current++;
  player.pause();
  release?.();
  release = null;
}
