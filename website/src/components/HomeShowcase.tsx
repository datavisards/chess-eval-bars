import {HERO_EXAMPLE, HOMEPAGE_LAYERS} from './compositeEncode';
import {StaticCompositeBoard} from './StaticCompositeBoard';

export default function HomeShowcase() {
  return (
    <div className="showcase showcase-home">
      <StaticCompositeBoard
        fen={HERO_EXAMPLE.fen}
        layers={HOMEPAGE_LAYERS}
        clocks={HERO_EXAMPLE.clocks}
      />
    </div>
  );
}
