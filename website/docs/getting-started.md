---
title: Getting started
---

# Getting started

## Install

```bash
npm install chess-eval-bars
```

```js
import { ChessEvalBar } from 'chess-eval-bars';
import 'chess-eval-bars/styles.css';

const bar = ChessEvalBar('#evalbar', {
  encoding: {
    length: { value: 0.5, min: -4, max: 4 },
  },
  label: { text: '+0.50' },
});
bar.update({
  encoding: { length: { value: 1.2 } },
  label: { text: '+1.20' },
});
```

## Attach to a board

```js
const board = Chessboard('board', { position: 'start' });

const bar = ChessEvalBar.attachToBoard('#board', {
  encoding: {
    length: { value: 0.5, min: -4, max: 4 },
  },
  label: { text: '+0.50' },
  attach: 'right',
  theme: 'lichess',
});

board.flip();
bar.update({ flipBoard: true });
```

## Multiple bars

Use `layers`. Each layer has a side (`attach`) and an `encoding`. Omit `encoding.thickness` for a classic bar; set `white` / `black` to encode thickness per side.

```js
ChessEvalBar('#root', {
  board: '#board',
  layers: [
    {
      attach: 'left',
      encoding: { length: { value: 0.5, min: -4, max: 4 } },
      label: '+0.50',
    },
    {
      attach: 'bottom',
      encoding: {
        length: { value: 0.95 },
        thickness: {
          reverse: true,
          white: { value: 0.16 },
          black: { value: 0.78 },
        },
      },
    },
  ],
});
```
