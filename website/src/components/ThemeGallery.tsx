import BrowserOnly from '@docusaurus/BrowserOnly';
import type {ChessEvalBarConfig, ThemeName} from 'chess-eval-bars';
import {EVAL_MAX, EVAL_MIN} from './evalMap';
import {useEvalBar} from './useEvalBar';

function Bar({config}: {config: ChessEvalBarConfig}) {
  const ref = useEvalBar(config);
  return <div ref={ref} />;
}

const THEMES: ThemeName[] = ['lichess', 'chesscom', 'classic', 'midnight', 'broadcast', 'high-contrast'];

export default function ThemeGallery() {
  return (
    <div className="demo-grid">
      {THEMES.map((theme) => (
        <div className="demo-card" key={theme}>
          <h3>{theme}</h3>
          <BrowserOnly fallback={<div style={{height: 180}} />}>
            {() => (
              <Bar
                config={{
                  encoding: {length: {value: 0.8, min: EVAL_MIN, max: EVAL_MAX}},
                  label: {text: '+0.80'},
                  theme,
                  maxLength: 180,
                  maxThickness: 22,
                  orientation: 'vertical',
                }}
              />
            )}
          </BrowserOnly>
        </div>
      ))}
    </div>
  );
}
