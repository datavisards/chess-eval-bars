import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Window } from 'happy-dom';
import type { EvalBarApi } from '../src/index.js';

const window = new Window();
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  getComputedStyle: window.getComputedStyle.bind(window),
});

const { ChessEvalBar } = await import('../src/index.js');

function mount(html = '<div id="bar"></div>'): HTMLElement {
  document.body.innerHTML = html;
  const node = document.querySelector('#bar');
  if (!(node instanceof HTMLElement)) throw new Error('missing #bar');
  return node;
}

function shareOf(bar: EvalBarApi): number {
  return Number(bar.el.dataset.share);
}

function caption(root: ParentNode, text: string): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>('.ceb__label')].find(
    (node) => !node.hidden && node.textContent === text,
  );
}

describe('ChessEvalBar', { concurrency: false }, () => {
test('a single bar uses the documented defaults', () => {
  const bar = ChessEvalBar(mount(), {});
  assert.equal(bar.el, document.querySelector('#bar'));
  assert.ok(bar.el.classList.contains('ceb--vertical'));
  assert.ok(bar.el.classList.contains('ceb-theme-lichess'));
  assert.ok(bar.el.classList.contains('ceb--white-bottom'));
  assert.equal(shareOf(bar), 0.5);
  assert.equal(bar.el.querySelector('.ceb__label')?.textContent, '50%');
  assert.equal(bar.el.querySelector<HTMLElement>('.ceb__tick--zero')?.hidden, true);
  assert.equal(bar.el.getAttribute('aria-label'), 'Bar 50%');
  assert.equal(bar.el.style.getPropertyValue('--ceb-length').trim(), '400px');
  assert.equal(bar.el.style.getPropertyValue('--ceb-thickness').trim(), '28px');
  bar.destroy();
  assert.equal(bar.el.querySelector('.ceb__track'), null);
});

test('length encoding normalizes, maps, then reverses', () => {
  const host = mount();
  const bar = ChessEvalBar(host, {
    encoding: { length: { value: 0.5, min: -4, max: 4 } },
    label: { text: '+0.50' },
  });
  assert.equal(shareOf(bar), 0.5625);
  assert.equal(bar.el.querySelector('.ceb__tick--zero')?.hasAttribute('hidden'), false);
  assert.equal(bar.el.querySelector('.ceb__label')?.textContent, '+0.50');

  bar.update({ encoding: { length: { value: 4 } } });
  assert.equal(shareOf(bar), 1);

  bar.update({
    encoding: {
      length: { value: 1, min: 0, max: 1, map: (t) => t * 0.25, reverse: true },
    },
  });
  assert.equal(shareOf(bar), 0.75);
  bar.destroy();
});

test('label false hides the caption and a missing value stays at half', () => {
  const bar = ChessEvalBar(mount(), {
    label: false,
    encoding: { length: { min: -2, max: 2 } },
  });
  assert.equal(shareOf(bar), 0.5);
  assert.equal(bar.el.querySelector<HTMLElement>('.ceb__label')?.hidden, true);
  bar.destroy();
});

test('orientation, flip, theme, and animation update the bar', () => {
  const bar = ChessEvalBar(mount(), {
    encoding: { length: { value: 1, min: 0, max: 1 } },
    animate: false,
  });
  assert.ok(bar.el.classList.contains('ceb--no-animate'));

  bar.update({orientation: 'horizontal'});
  assert.ok(bar.el.classList.contains('ceb--horizontal'));
  assert.ok(bar.el.classList.contains('ceb--white-left'));

  bar.update({flipBoard: true});
  assert.ok(bar.el.classList.contains('ceb--white-right'));

  bar.update({theme: 'midnight'});
  assert.ok(bar.el.classList.contains('ceb-theme-midnight'));

  bar.update({theme: {name: 'custom', white: '#fffaf0', black: '#1b1b1b'}});
  assert.equal(bar.el.style.getPropertyValue('--ceb-white').trim(), '#fffaf0');
  bar.destroy();
});

test('thickness fractions scale each side and can be removed', () => {
  const bar = ChessEvalBar(mount(), {
    encoding: {
      length: { value: 0.5 },
      thickness: { white: 1, black: 0.4 },
    },
  });
  assert.ok(bar.el.classList.contains('ceb--cross-scale'));
  assert.equal(bar.el.style.getPropertyValue('--ceb-black-cross').trim(), '40.0%');

  bar.update({ encoding: { thickness: undefined } });
  assert.equal(bar.el.classList.contains('ceb--cross-scale'), false);
  assert.equal(bar.el.style.getPropertyValue('--ceb-black-cross').trim(), '100.0%');
  bar.destroy();
});

test('anchor white sits in the white half and foot sits past the white end', () => {
  const bar = ChessEvalBar(mount(), {
    encoding: { length: { value: 0.5, min: -4, max: 4 } },
    label: { text: '+0.50', position: 'center', anchor: 'white' },
  });
  const label = bar.el.querySelector<HTMLElement>('.ceb__label');
  assert.equal(label?.style.top, '71.88%');
  assert.equal(label?.style.left, '50%');

  bar.update({ label: { text: 'EE', position: 'foot', anchor: 'advantage' } });
  assert.match(bar.el.querySelector<HTMLElement>('.ceb__label')?.style.top ?? '', /100%/);

  bar.update({ label: { text: 'EE', position: 'outside', anchor: 'black', side: 'left' } });
  const outside = bar.el.querySelector<HTMLElement>('.ceb__label');
  assert.match(outside?.style.left ?? '', /0%/);
  assert.equal((outside?.style.top ?? '').includes('100%'), false);
  bar.destroy();
});

test('a frame places layers and draws every annotation mark', () => {
  const root = mount('<div id="bar"></div><div id="board" style="width:200px;height:200px"></div>');
  const board = document.querySelector('#board');
  if (!(board instanceof HTMLElement)) throw new Error('missing board');

  const bar = ChessEvalBar(root, {
    board,
    layers: [
      {
        attach: 'right',
        encoding: { length: { value: 0, min: -4, max: 4 } },
        label: '+0.00',
      },
      {
        attach: 'bottom',
        encoding: {
          length: { value: 0.95 },
          thickness: { white: 0.16, black: 0.78 },
        },
        annotations: {
          length: { metricLabel: 'EE', metricText: true },
          thickness: {
            metricLabel: 'ATP',
            metricText: { white: '0.16', black: true },
          },
          n: { metricText: 'N=3' },
        },
      },
    ],
  });

  assert.ok(bar.el.classList.contains('ceb-frame'));
  assert.equal(bar.el.querySelectorAll('.ceb').length, 2);
  assert.ok(caption(bar.el, '+0.00'));
  assert.ok(caption(bar.el, 'EE'));
  assert.ok(caption(bar.el, '95%'));
  assert.ok(caption(bar.el, 'ATP'));
  assert.ok(caption(bar.el, '0.16'));
  assert.ok(caption(bar.el, 'N=3'));
  assert.equal(
    [...bar.el.querySelectorAll<HTMLElement>('.ceb__seg-label--black')].some(
      (node) => !node.hidden && node.textContent,
    ),
    false,
  );

  const primary = () => bar.el.querySelector<HTMLElement>('.ceb');
  assert.equal(Number(primary()?.dataset.share), 0.5);
  bar.update({encoding: {length: {value: 4}}});
  assert.equal(Number(primary()?.dataset.share), 1);

  const bottom = bar.el.querySelector('.ceb-frame__side--bottom .ceb');
  assert.ok(bottom instanceof HTMLElement);
  assert.equal(bottom.style.getPropertyValue('--ceb-white-cross').trim(), '16.0%');
  bar.destroy();
});

test('a classic layer keeps percent format and label offset', () => {
  const bar = ChessEvalBar(mount(), {
    layers: [
      {
        attach: 'right',
        encoding: {length: {value: 0.55}},
        label: {format: 'percent', fontSize: 10},
      },
      {
        attach: 'right',
        encoding: {length: {value: 0.5, min: -4, max: 4}},
        label: {text: '+0.50', position: 'outside', side: 'right', offset: {x: -6, y: 0}},
      },
    ],
  });
  const labels = [...bar.el.querySelectorAll<HTMLElement>('.ceb__label')];
  assert.equal(labels[0]?.hidden, false);
  assert.equal(labels[0]?.textContent, '55%');
  assert.match(labels[1]?.style.transform ?? '', /-6px/);
  bar.destroy();
});

test('attachToBoard places the bar beside the board', () => {
  document.body.innerHTML = '<div id="board"></div>';
  const board = document.querySelector('#board');
  if (!(board instanceof HTMLElement)) throw new Error('missing board');
  const bar = ChessEvalBar.attachToBoard(board, {
    attach: 'right',
    encoding: { length: { value: 0.25, min: 0, max: 1 } },
    label: { text: '25%' },
  });
  assert.equal(shareOf(bar), 0.25);
  assert.ok(board.parentElement?.classList.contains('ceb-layout'));
  assert.equal(board.parentElement?.lastElementChild, bar.el);
  bar.destroy();
});

test('to-move sits at the end of the side about to play', () => {
  const blackTurn = ChessEvalBar(mount(), {
    toMove: 'black',
    encoding: {length: {value: 0.5, min: -4, max: 4}},
    label: {text: 'N=1', position: 'outside', anchor: 'to-move', side: 'left'},
  });
  const blackEnd = blackTurn.el.querySelector<HTMLElement>('.ceb__label')?.style.top ?? '';
  blackTurn.destroy();

  const whiteTurn = ChessEvalBar(mount(), {
    toMove: 'white',
    encoding: {length: {value: 0.5, min: -4, max: 4}},
    label: {text: 'N=1', position: 'outside', anchor: 'to-move', side: 'left'},
  });
  const whiteEnd = whiteTurn.el.querySelector<HTMLElement>('.ceb__label')?.style.top ?? '';
  whiteTurn.destroy();

  assert.equal(blackEnd.includes('100%'), false);
  assert.match(whiteEnd, /100%/);
});

test('themes lists the built-in names and a missing container throws', () => {
  assert.deepEqual(Object.keys(ChessEvalBar.themes).sort(), [
    'broadcast',
    'chesscom',
    'classic',
    'high-contrast',
    'lichess',
    'midnight',
  ]);
  assert.throws(() => ChessEvalBar('#missing'), /could not find container/);
});
});
