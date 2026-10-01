import {ExampleCard} from './ExampleCard';
import {StaticCompositeBoard} from './StaticCompositeBoard';
import {COMPOSITE_EXAMPLES} from './compositeEncode';

export function AdvancedExamples() {
  return (
    <div className="example-card-grid example-card-grid--advanced">
      {COMPOSITE_EXAMPLES.map((item) => (
        <ExampleCard key={item.id} title={item.title} lede={item.lede} code={item.code}>
          <StaticCompositeBoard fen={item.fen} layers={item.layers} clocks={item.clocks} />
        </ExampleCard>
      ))}
    </div>
  );
}
