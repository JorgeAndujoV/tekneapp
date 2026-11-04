// one shared player keeps voice clips in order and lets a new trial stop the previous sequence
const player = new Audio();
let current = 0;
let release: (() => void) | null = null;

export async function playClips(paths: string[]): Promise<void> {
  stopClip();
  const token = ++current;
  for (const path of paths) {
    if (token !== current) return;
    await startClip(path, token);
  }
}

function startClip(path: string, token: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      if (token !== current) return;
      release = null;
      if (error) reject(error);
      else resolve();
    };
    release = () => {
      release = null;
      resolve();
    };
    player.onended = () => finish();
    player.onerror = () => finish(new Error(`No se pudo cargar el audio "${path}".`));
    player.src = import.meta.env.BASE_URL + path;
    player.play().catch((error: unknown) =>
      finish(error instanceof Error ? error : new Error(`No se pudo reproducir "${path}".`)),
    );
  });
}

export function stopClip() {
  current++;
  player.pause();
  release?.();
  release = null;
}
