import {useState, type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import type {CodeSnippet} from './compositeEncode';

function codeBlocks(code: string | CodeSnippet[]): CodeSnippet[] {
  return typeof code === 'string' ? [{language: 'js', text: code}] : code;
}

export function ExampleCard({
  title,
  lede,
  code,
  children,
}: {
  title: string;
  lede?: string;
  code: string | CodeSnippet[];
  children: ReactNode;
}) {
  const [tab, setTab] = useState<'result' | 'code'>('result');
  return (
    <article className="example-card">
      <header className="example-card__head">
        <h3>{title}</h3>
      </header>
      <div className="example-card__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'result'}
          className={tab === 'result' ? 'is-active' : undefined}
          onClick={() => setTab('result')}
        >
          Result
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'code'}
          className={tab === 'code' ? 'is-active' : undefined}
          onClick={() => setTab('code')}
        >
          Code
        </button>
      </div>
      <div className="example-card__body">
        {tab === 'code' ? (
          codeBlocks(code).map((block, i) => (
            <CodeBlock key={i} language={block.language}>
              {block.text}
            </CodeBlock>
          ))
        ) : (
          <>
            {children}
            {lede ? <p className="example-card__caption">{lede}</p> : null}
          </>
        )}
      </div>
    </article>
  );
}
