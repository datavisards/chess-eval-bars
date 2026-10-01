import {useEffect, useMemo, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ChessEvalBar} from 'chess-eval-bars';
import type {EvalBarApi, Side} from 'chess-eval-bars';
import {computeChoiceComplexity} from 'ceb-examples/metrics';
import {ensureChessboard, type ChessboardApi} from './loadChessboard';
import {ensureChessJs, type ChessJsGame} from './loadChess';
import {
  StockfishEngine,
  wdlExpectedScore,
  type StockfishSnapshot,
} from './loadStockfish';
import {barFromEngine, EVAL_MAX, EVAL_MIN} from './evalMap';
import {DEMO_THEME} from './demoTheme';
import {ChessClocks} from './ChessClocks';
import {liveCompositeLayers} from './compositeEncode';

const BOARD_PX = 260;
const DEPTH = 12;
const MULTIPV = 4;
const DELTA = 0.03;
const INITIAL_WHITE = 180;
const INITIAL_BLACK = 180;
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PRESETS: {id: string; label: string; fen: string}[] = [
  {id: 'start', label: 'Start position', fen: START_FEN},
  {
    id: 'ruy',
    label: 'Ruy Lopez (…Be7)',
    fen: 'r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 b - - 0 10',
  },
  {
    id: 'sharp',
    label: 'Sharp middlegame',
    fen: 'r1b2rk1/pp1n1ppp/2p1pn2/q2p2B1/1bPP4/2N1PN2/PPQ2PPP/R3KB1R w KQ - 4 9',
  },
];

function wikipediaPieceTheme(dir: string): string {
  return `${dir.replace(/\/$/, '')}/{piece}.png`;
}

function sideFromFen(fen: string): Side {
  return fen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
}

function LiveInner() {
  const pieceTheme = wikipediaPieceTheme(useBaseUrl('/img/chesspieces/wikipedia'));
  const stockfishUrl = useBaseUrl('/stockfish/stockfish-18-lite-single.js');
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<EvalBarApi | null>(null);
  const boardApi = useRef<ChessboardApi | undefined>(undefined);
  const gameRef = useRef<ChessJsGame | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);

  const [preset, setPreset] = useState(PRESETS[0].id);
  const [fen, setFen] = useState(PRESETS[0].fen);
  const [whiteClock, setWhiteClock] = useState(INITIAL_WHITE);
  const [blackClock, setBlackClock] = useState(INITIAL_BLACK);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Loading…');
  const [snap, setSnap] = useState<StockfishSnapshot | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [choice, setChoice] = useState({
    whiteMci: 0.08,
    blackMci: 0.08,
    nViable: 4 as number | null,
  });

  const stm = sideFromFen(fen);
  const stmRef = useRef(stm);
  stmRef.current = stm;

  const mapped = useMemo(() => {
    const top = snap?.lines[0];
    if (!top) return {value: 0, min: EVAL_MIN, max: EVAL_MAX, label: '0.00'};
    return barFromEngine({
      whiteToMove: stm === 'white',
      cp: top.cp,
      mate: top.mate,
      wdl: top.wdl,
    });
  }, [snap, stm]);

  const layers = useMemo(
    () =>
      liveCompositeLayers({
        evalValue: mapped.value,
        evalMin: mapped.min,
        evalMax: mapped.max,
        evalText: mapped.label,
        whiteClock,
        blackClock,
        toMove: stm,
        whiteMci: choice.whiteMci,
        blackMci: choice.blackMci,
        nViable: choice.nViable,
      }),
    [mapped, whiteClock, blackClock, stm, choice],
  );

  function analyzeFen(nextFen: string) {
    const engine = engineRef.current;
    const game = gameRef.current;
    if (!engine) return;
    if (game?.game_over()) {
      setRunning(false);
      if (game.in_checkmate()) {
        setStatus(game.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins');
      } else {
        setStatus('Game over — draw');
      }
      return;
    }
    setStatus('Analyzing…');
    engine.analyze(nextFen, {multipv: MULTIPV, depth: DEPTH}).catch((err: Error) => {
      setEngineError(err.message || String(err));
    });
  }

  function loadPosition(nextFen: string) {
    const game = gameRef.current;
    if (!game) {
      setFen(nextFen);
      return;
    }
    const ok = game.load(nextFen);
    if (!ok) {
      setEngineError('Invalid FEN');
      return;
    }
    setEngineError(null);
    boardApi.current?.position?.(game.fen());
    setFen(game.fen());
    analyzeFen(game.fen());
  }

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const side = stmRef.current;
      if (side === 'white') {
        setWhiteClock((t) => {
          if (t <= 1) {
            setRunning(false);
            setStatus('White flagged');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackClock((t) => {
          if (t <= 1) {
            setRunning(false);
            setStatus('Black flagged');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!snap) return;
    const moves =
      snap.lines.map((line) => ({
        move: line.pv[0],
        score: line.wdl ? wdlExpectedScore(line.wdl) : undefined,
      })) ?? [];
    const cx = computeChoiceComplexity({
      moves,
      delta: DELTA,
      k: MULTIPV,
      leadingMovesByCheckpoint: snap.leadingByDepth,
      forced: moves.length === 1,
    });
    const mci = cx.moveCriticalityIndex ?? 0.08;
    const nViable = cx.viableMoveCount;
    setChoice((prev) =>
      stm === 'white'
        ? {...prev, whiteMci: mci, nViable}
        : {...prev, blackMci: mci, nViable},
    );
  }, [snap, stm]);

  useEffect(() => {
    if (!frameRef.current || !boardRef.current) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    Promise.all([ensureChessboard(), ensureChessJs()])
      .then(([Chessboard, Chess]) => {
        if (cancelled || !boardRef.current || !frameRef.current) return;

        const game = new Chess(PRESETS[0].fen);
        gameRef.current = game;

        const engine = new StockfishEngine();
        engineRef.current = engine;
        unsubscribe = engine.onUpdate((next) => {
          setSnap(next);
          const best = next.lines[0]?.pv[0];
          setStatus(`Depth ${next.depth}${best ? ` · best ${best}` : ''}`);
        });

        boardApi.current = Chessboard(boardRef.current, {
          position: game.fen(),
          pieceTheme,
          draggable: true,
          onDragStart(_source: string, piece: string) {
            if (game.game_over()) return false;
            if (
              (game.turn() === 'w' && piece.startsWith('b')) ||
              (game.turn() === 'b' && piece.startsWith('w'))
            ) {
              return false;
            }
            return true;
          },
          onDrop(source: string, target: string) {
            const whiteMoved = game.turn() === 'w';
            const move = game.move({from: source, to: target, promotion: 'q'});
            if (move === null) return 'snapback';
            if (whiteMoved && !game.game_over()) setRunning(true);
            setPreset('custom');
            setFen(game.fen());
            analyzeFen(game.fen());
            return undefined;
          },
          onSnapEnd() {
            boardApi.current?.position?.(game.fen());
          },
        });

        barRef.current = ChessEvalBar(frameRef.current, {
          theme: DEMO_THEME,
          board: boardRef.current,
          maxLength: BOARD_PX,
          maxThickness: 22,
          layers: [],
          slots: {
            top: topRef.current,
            left: leftRef.current,
            right: rightRef.current,
            bottom: bottomRef.current,
          },
        });

        requestAnimationFrame(() => {
          boardApi.current?.resize?.();
          barRef.current?.resize();
        });

        engine
          .start(stockfishUrl)
          .then(() => {
            if (!cancelled) analyzeFen(game.fen());
          })
          .catch((err: Error) => {
            if (!cancelled) {
              setEngineError(err.message || String(err));
              setStatus('Engine failed');
            }
          });
      })
      .catch((err: Error) => {
        if (!cancelled) setEngineError(err.message);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      engineRef.current?.destroy();
      engineRef.current = null;
      barRef.current?.destroy();
      barRef.current = null;
      boardApi.current?.destroy();
      boardApi.current = undefined;
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceTheme, stockfishUrl]);

  useEffect(() => {
    barRef.current?.update({
      layers,
      flipBoard: boardApi.current?.orientation() === 'black',
    });
  }, [layers]);

  function applyPreset(id: string) {
    const next = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
    setPreset(next.id);
    setRunning(false);
    loadPosition(next.fen);
  }

  function applyFen() {
    setPreset('custom');
    setRunning(false);
    loadPosition(fen.trim());
  }

  function startClock() {
    if (whiteClock <= 0 || blackClock <= 0) return;
    if (gameRef.current?.game_over()) return;
    setRunning(true);
  }

  function resetAll() {
    setRunning(false);
    setWhiteClock(INITIAL_WHITE);
    setBlackClock(INITIAL_BLACK);
    setPreset(PRESETS[0].id);
    loadPosition(PRESETS[0].fen);
  }

  function undo() {
    const game = gameRef.current;
    if (!game) return;
    game.undo();
    boardApi.current?.position?.(game.fen());
    setFen(game.fen());
    setPreset('custom');
    analyzeFen(game.fen());
  }

  function flip() {
    boardApi.current?.flip();
    barRef.current?.update({flipBoard: boardApi.current?.orientation() === 'black'});
  }

  return (
    <div className="examples-app live-demo">
      <div className="examples-stage">
        <div className="ceb-docs-stage">
          <div className="ceb-frame" ref={frameRef}>
            <div className="ceb-frame__side ceb-frame__side--top">
              <ChessClocks white={whiteClock} black={blackClock} toMove={stm} />
              <div ref={topRef} />
            </div>
            <div className="ceb-frame__side ceb-frame__side--left" ref={leftRef} />
            <div className="ceb-docs-board" ref={boardRef} />
            <div className="ceb-frame__side ceb-frame__side--right" ref={rightRef} />
            <div className="ceb-frame__side ceb-frame__side--bottom" ref={bottomRef} />
          </div>
        </div>
        <p className="examples-status">
          {engineError ? <span className="examples-error">{engineError}</span> : status}
          {` · ${stm === 'white' ? 'White' : 'Black'} to move`}
          {Number.isFinite(choice.nViable as number) ? ` · N=${choice.nViable}` : ''}
        </p>
      </div>

      <aside className="examples-config">
        <div className="examples-config-row">
          <label>
            Preset
            <select
              value={preset === 'custom' ? '' : preset}
              onChange={(e) => applyPreset(e.target.value)}>
              {preset === 'custom' ? <option value="">Custom</option> : null}
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="examples-config-row examples-config-fen">
          <label>
            FEN
            <input
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              onBlur={applyFen}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFen();
              }}
            />
          </label>
        </div>
        <div className="examples-config-clocks">
          <label>
            White (s)
            {running ? (
              <span className="examples-clock-display">{whiteClock}</span>
            ) : (
              <input
                type="number"
                min={0}
                value={whiteClock}
                onChange={(e) => setWhiteClock(Math.max(0, Number(e.target.value) || 0))}
              />
            )}
          </label>
          <label>
            Black (s)
            {running ? (
              <span className="examples-clock-display">{blackClock}</span>
            ) : (
              <input
                type="number"
                min={0}
                value={blackClock}
                onChange={(e) => setBlackClock(Math.max(0, Number(e.target.value) || 0))}
              />
            )}
          </label>
        </div>
        <div className="examples-clock-toolbar">
          {running ? (
            <button type="button" onClick={() => setRunning(false)}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={startClock}>
              Start
            </button>
          )}
          <button type="button" onClick={resetAll}>
            Reset
          </button>
          <button type="button" onClick={undo}>
            Undo
          </button>
          <button type="button" onClick={flip}>
            Flip
          </button>
        </div>
      </aside>
    </div>
  );
}

export function LiveDemo() {
  return (
    <BrowserOnly fallback={<div className="examples-fallback">Loading live demo…</div>}>
      {() => <LiveInner />}
    </BrowserOnly>
  );
}
