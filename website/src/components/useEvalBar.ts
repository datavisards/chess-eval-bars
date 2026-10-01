import {useEffect, useRef} from 'react';
import {ChessEvalBar} from 'chess-eval-bars';
import type {ChessEvalBarConfig, EvalBarApi} from 'chess-eval-bars';

export function useEvalBar(config: ChessEvalBarConfig) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<EvalBarApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    api.current = ChessEvalBar(ref.current, config);
    return () => {
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.update(config);
  }, [config]);

  return ref;
}
