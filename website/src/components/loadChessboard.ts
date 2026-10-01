export type ChessboardApi = {
  orientation: (o?: string) => string;
  position?: (fen?: string) => string;
  destroy: () => void;
  flip: () => void;
  resize?: () => void;
};

export type ChessboardFn = (id: string | HTMLElement, cfg: object) => ChessboardApi;

const JQUERY = 'https://code.jquery.com/jquery-3.5.1.min.js';
const CHESSBOARD_JS =
  'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js';
const CHESSBOARD_CSS =
  'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css';

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const inflight = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = inflight.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const win = window as Window & {
      jQuery?: unknown;
      Chessboard?: ChessboardFn;
      ChessBoard?: ChessboardFn;
    };
    if (src.includes('jquery') && win.jQuery) {
      resolve();
      return;
    }
    if (src.includes('chessboard') && typeof (win.Chessboard ?? win.ChessBoard) === 'function') {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), {once: true});
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {once: true});
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

let ready: Promise<ChessboardFn> | null = null;

export function ensureChessboard(): Promise<ChessboardFn> {
  if (!ready) {
    ready = (async () => {
      loadCss(CHESSBOARD_CSS);
      const w = window as Window & {define?: unknown};
      const amd = w.define;
      try {
        w.define = undefined;
        await loadScript(JQUERY);
        await loadScript(CHESSBOARD_JS);
      } finally {
        w.define = amd;
      }
      const fn =
        (window as Window & {Chessboard?: ChessboardFn; ChessBoard?: ChessboardFn}).Chessboard ??
        (window as Window & {ChessBoard?: ChessboardFn}).ChessBoard;
      if (typeof fn !== 'function') {
        throw new Error('Chessboard failed to load');
      }
      return fn;
    })();
  }
  return ready;
}
