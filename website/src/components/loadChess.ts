export type ChessJsGame = {
  fen: () => string;
  turn: () => 'w' | 'b';
  game_over: () => boolean;
  in_checkmate: () => boolean;
  in_draw: () => boolean;
  move: (move: {from: string; to: string; promotion?: string}) => object | null;
  undo: () => object | null;
  reset: () => void;
  load: (fen: string) => boolean;
};

export type ChessJsCtor = new (fen?: string) => ChessJsGame;

const CHESS_JS = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';

const inflight = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = inflight.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const win = window as Window & {Chess?: ChessJsCtor};
    if (typeof win.Chess === 'function') {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), {once: true});
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });

  inflight.set(src, promise);
  return promise;
}

let ready: Promise<ChessJsCtor> | null = null;

export function ensureChessJs(): Promise<ChessJsCtor> {
  if (!ready) {
    ready = (async () => {
      const w = window as Window & {define?: unknown};
      const amd = w.define;
      try {
        w.define = undefined;
        await loadScript(CHESS_JS);
      } finally {
        w.define = amd;
      }
      const Chess = (window as Window & {Chess?: ChessJsCtor}).Chess;
      if (typeof Chess !== 'function') {
        throw new Error('chess.js failed to load');
      }
      return Chess;
    })();
  }
  return ready;
}
