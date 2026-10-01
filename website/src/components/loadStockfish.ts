export type StockfishLine = {
  multipv: number;
  depth: number;
  /** Centipawns, side to move. */
  cp?: number;
  mate?: number;
  /** WDL permille, side to move. */
  wdl?: {win: number; draw: number; loss: number};
  pv: string[];
};

export type StockfishSnapshot = {
  depth: number;
  lines: StockfishLine[];
  /** Best move at each completed depth. */
  leadingByDepth: string[];
};

type Listener = (snap: StockfishSnapshot) => void;

function parseInfo(line: string): StockfishLine | null {
  if (!line.startsWith("info ") || !/\bscore\b/.test(line) || !/\bpv\b/.test(line)) {
    return null;
  }
  const depth = Number(line.match(/\bdepth\s+(\d+)/)?.[1] ?? 0);
  const multipv = Number(line.match(/\bmultipv\s+(\d+)/)?.[1] ?? 1);
  const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
  const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
  const wdlMatch = line.match(/\bwdl\s+(\d+)\s+(\d+)\s+(\d+)/);
  const pvIdx = line.indexOf(" pv ");
  const pv = pvIdx >= 0 ? line.slice(pvIdx + 4).trim().split(/\s+/).filter(Boolean) : [];
  if (!pv.length) return null;
  return {
    multipv,
    depth,
    cp: cpMatch ? Number(cpMatch[1]) : undefined,
    mate: mateMatch ? Number(mateMatch[1]) : undefined,
    wdl: wdlMatch
      ? {win: Number(wdlMatch[1]), draw: Number(wdlMatch[2]), loss: Number(wdlMatch[3])}
      : undefined,
    pv,
  };
}

/** Expected score in [0, 1] from WDL permille. */
export function wdlExpectedScore(wdl: {win: number; draw: number; loss: number}): number {
  const sum = wdl.win + wdl.draw + wdl.loss;
  if (sum <= 0) return 0.5;
  return (wdl.win + 0.5 * wdl.draw) / sum;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private listeners = new Set<Listener>();
  private lines = new Map<number, StockfishLine>();
  private leadingByDepth: string[] = [];
  private lastDepth = 0;
  private analyzing = false;
  private gen = 0;

  async start(workerUrl = "/stockfish/stockfish-18-lite-single.js"): Promise<void> {
    if (this.worker) return;
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = (ev) => this.onMessage(String(ev.data ?? ""));
    this.worker.onerror = (err) => {
      console.error("Stockfish worker error", err);
    };
    this.post("uci");
    await this.waitFor("uciok");
    this.post("setoption name UCI_ShowWDL value true");
    this.post("isready");
    await this.waitFor("readyok");
  }

  onUpdate(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async analyze(fen: string, opts: {multipv?: number; depth?: number} = {}): Promise<void> {
    await this.start();
    const multipv = opts.multipv ?? 4;
    const depth = opts.depth ?? 14;
    const myGen = ++this.gen;
    if (this.analyzing) {
      this.post("stop");
      await this.waitFor("bestmove", 1500).catch(() => undefined);
    }
    if (myGen !== this.gen) return;
    this.lines.clear();
    this.leadingByDepth = [];
    this.lastDepth = 0;
    this.analyzing = true;
    this.post(`setoption name MultiPV value ${multipv}`);
    this.post("ucinewgame");
    this.post(`position fen ${fen}`);
    this.post(`go depth ${depth}`);
  }

  stop(): void {
    if (!this.worker) return;
    this.post("stop");
    this.analyzing = false;
  }

  destroy(): void {
    this.gen += 1;
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.listeners.clear();
  }

  private post(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private onMessage(line: string): void {
    const info = parseInfo(line);
    if (info) {
      this.lines.set(info.multipv, info);
      if (info.multipv === 1 && info.depth > this.lastDepth && info.pv[0]) {
        this.lastDepth = info.depth;
        this.leadingByDepth.push(info.pv[0]);
      }
      this.emit();
      return;
    }
    if (line.startsWith("bestmove")) {
      this.analyzing = false;
      this.emit();
    }
  }

  private emit(): void {
    const lines = [...this.lines.values()].sort((a, b) => a.multipv - b.multipv);
    const depth = lines.reduce((d, l) => Math.max(d, l.depth), 0);
    const snap: StockfishSnapshot = {
      depth,
      lines,
      leadingByDepth: [...this.leadingByDepth],
    };
    for (const fn of this.listeners) fn(snap);
  }

  private waitFor(token: string, ms = 20000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Stockfish worker missing"));
        return;
      }
      const t = window.setTimeout(() => {
        this.worker?.removeEventListener("message", onMsg);
        reject(new Error(`Timeout waiting for ${token}`));
      }, ms);
      const onMsg = (ev: MessageEvent) => {
        const text = String(ev.data ?? "");
        if (text.includes(token)) {
          window.clearTimeout(t);
          this.worker?.removeEventListener("message", onMsg);
          resolve(text);
        }
      };
      this.worker.addEventListener("message", onMsg);
    });
  }
}
