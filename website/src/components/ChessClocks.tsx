import {formatClock} from './compositeEncode';
import type {Side} from 'ceb-examples/metrics';

export function ChessClocks({
  white,
  black,
  toMove,
}: {
  white: number;
  black: number;
  toMove: Side;
}) {
  return (
    <div className="ceb-clocks" role="group" aria-label={`Player clocks. ${toMove === 'black' ? 'Black' : 'White'} to move.`}>
      <div
        className={`ceb-clocks__face ceb-clocks__face--white${toMove === 'white' ? ' is-active' : ''}`}>
        <span className="ceb-clocks__who">
          <span className="ceb-clocks__name">White</span>
        </span>
        <span className="ceb-clocks__time">{formatClock(white)}</span>
      </div>
      <div
        className={`ceb-clocks__face ceb-clocks__face--black${toMove === 'black' ? ' is-active' : ''}`}>
        <span className="ceb-clocks__who">
          <span className="ceb-clocks__name">Black</span>
        </span>
        <span className="ceb-clocks__time">{formatClock(black)}</span>
      </div>
    </div>
  );
}
