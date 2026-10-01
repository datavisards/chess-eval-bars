import {useEffect, useRef} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ChessEvalBar} from 'chess-eval-bars';
import type {BarLayer} from 'chess-eval-bars';
import {ensureChessboard, type ChessboardApi} from './loadChessboard';
import {DEMO_THEME} from './demoTheme';
import {ChessClocks} from './ChessClocks';
import type {DemoClocks} from './compositeEncode';

const BOARD_PX = 220;

function wikipediaPieceTheme(dir: string): string {
  return `${dir.replace(/\/$/, '')}/{piece}.png`;
}

function Inner({
  fen,
  layers,
  clocks,
}: {
  fen: string;
  layers: BarLayer[];
  clocks?: DemoClocks;
}) {
  const pieceTheme = wikipediaPieceTheme(useBaseUrl('/img/chesspieces/wikipedia'));
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const node = boardRef.current;
    if (!frame || !node) return;
    let bar: ReturnType<typeof ChessEvalBar> | undefined;
    let board: ChessboardApi | undefined;
    let cancelled = false;
    ensureChessboard()
      .then((Chessboard) => {
        if (cancelled || !frameRef.current || !boardRef.current) return;
        board = Chessboard(boardRef.current, {position: fen, pieceTheme});
        bar = ChessEvalBar(frameRef.current, {
          theme: DEMO_THEME,
          maxThickness: 22,
          board: boardRef.current,
          maxLength: 'auto',
          layers,
          slots: {
            top: topRef.current,
            left: leftRef.current,
            right: rightRef.current,
            bottom: bottomRef.current,
          },
        });
        requestAnimationFrame(() => {
          board?.resize?.();
          bar?.resize();
        });
      })
      .catch((err: Error) => {
        if (!cancelled) console.error(err);
      });
    return () => {
      cancelled = true;
      bar?.destroy();
      board?.destroy();
    };
  }, [fen, layers, pieceTheme]);

  return (
    <div className="board-row example-card__board">
      <div className="ceb-docs-stage">
        <div className="ceb-frame" ref={frameRef}>
          <div className="ceb-frame__side ceb-frame__side--top">
            {clocks ? (
              <>
                <div className="ceb-docs-turn">
                  {clocks.toMove === 'black' ? 'Black' : 'White'} to move
                </div>
                <ChessClocks white={clocks.white} black={clocks.black} toMove={clocks.toMove} />
              </>
            ) : null}
            <div ref={topRef} />
          </div>
          <div className="ceb-frame__side ceb-frame__side--left" ref={leftRef} />
          <div className="ceb-docs-board" ref={boardRef} />
          <div className="ceb-frame__side ceb-frame__side--right" ref={rightRef} />
          <div className="ceb-frame__side ceb-frame__side--bottom" ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

export function StaticCompositeBoard({
  fen,
  layers,
  clocks,
}: {
  fen: string;
  layers: BarLayer[];
  clocks?: DemoClocks;
}) {
  return (
    <BrowserOnly fallback={<div style={{width: BOARD_PX, height: BOARD_PX}} />}>
      {() => <Inner fen={fen} layers={layers} clocks={clocks} />}
    </BrowserOnly>
  );
}
