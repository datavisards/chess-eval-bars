---
title: API
---

# API

```js
const bar = ChessEvalBar(container, config)
```

`container` is an element or a CSS selector. The return value is an `EvalBarApi`. Pass `layers` or `slots` to draw one or more bars in a frame around a board. Otherwise you get a single bar.

## Config

### Encoding

Fill runs from `0` to `1`. The library normalizes `value` with `min` and `max`, then applies `map`, then `reverse`.

| Option | Default | Notes |
| --- | --- | --- |
| `encoding.length` | — | `{ value, min, max, map, reverse }`. No `value` fills the bar to `0.5`. `min` / `max` default `0` / `1`. `map` receives the normalized share and must return a number in `0`–`1`. `reverse` default `false` |
| `encoding.thickness` | — | `{ white, black, map, reverse }`. Each side is a number in `0`–`1`, or `{ value, min, max }`. Omit the object to keep both sides at full thickness. `map` and `reverse` work like length |
| `label` | shown | `false` hides it. `true` or omitted shows the fill as a percent. An object is a [label](#labels). `text` replaces the percent |
| `hover` | — | Tooltip for the bar. A caption uses its own `hover` |

`update` merges `encoding`. A patch that only sets `length.value` keeps `min`, `max`, `map`, and `reverse`. Omitting `thickness` keeps the previous thickness. `thickness: undefined` removes it.

### Size and place

| Option | Default | Notes |
| --- | --- | --- |
| `orientation` | `'vertical'` | `'horizontal'`. In a frame, each layer's `attach` sets it. A frame `orientation` overrides every layer |
| `flipBoard` | `false` | White is at the bottom of a vertical bar and the left of a horizontal bar. `true` moves White to the top or the right |
| `maxLength` | `400` | Pixel length of the bar. `'auto'`, or omitting it while `board` is set, uses the board size |
| `maxThickness` | `28` | Pixel thickness. `encoding.thickness` values are fractions of this |
| `attach` | `'left'` | `'right'` · `'top'` · `'bottom'`. Used by `attachToBoard` and by a frame that has no `layers` |
| `toMove` | `'white'` | `'white'` · `'black'`. `anchor: 'to-move'` sits at this side's end. A layer can set its own |
| `board` | — | Selector or element. Supplies the length when `maxLength` tracks the board |

### Appearance

| Option | Default | Notes |
| --- | --- | --- |
| `theme` | `'lichess'` | A [theme name](theming) or a partial theme object |
| `showZeroLine` | on when `0` is strictly inside `min`…`max` | Tick where the length value is `0` |
| `animate` | `280` | Duration in ms. `false` or `0` turns animation off |
| `className` | — | Extra class on the root |
| `ariaLabel` | `Bar N%` | Accessible name. `N` is the fill percent |

### Layers

| Option | Default | Notes |
| --- | --- | --- |
| `layers` | one bar on `attach` | `BarLayer[]`. See [Bars](#bars) |
| `slots` | created on the frame | `{ top, left, right, bottom }`. Elements you already placed. The frame clears each slot when it lays out, so keep clocks and other chrome outside the slot |

## Bars

```js
ChessEvalBar('#root', {
  board: '#board',
  layers: [
    {
      attach: 'left',
      encoding: { length: { value: 0.5, min: -4, max: 4 } },
      maxThickness: 24,
      label: { text: '+0.50', position: 'end', rotate: 'auto' },
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
      maxThickness: 20,
      annotations: {
        length: { metricLabel: 'EE', metricText: '+0.95' },
        thickness: {
          metricLabel: 'ATP',
          metricText: { white: '0.16', black: '0.78' },
        },
        n: { metricText: 'N=3' },
      },
    },
  ],
})
```

A layer with `encoding.thickness` or `annotations` is a composite bar. Both sides stay full thickness until you set `encoding.thickness`. A layer with only `encoding.length` and `label` is a classic bar.

| Option | Default | Notes |
| --- | --- | --- |
| `attach` | required | `'left'` · `'right'` · `'top'` · `'bottom'`. Left and right bars are vertical. Top and bottom bars are horizontal. On the left and top, the last layer sits nearest the board. On the right and bottom, the first layer does |
| `encoding.length` | frame `encoding.length` | `{ value, min, max, map, reverse }` |
| `encoding.thickness` | full thickness | `{ white, black, map, reverse }`. A side is a number or `{ value, min, max }` |
| `label` | — | String, or a [label](#labels) object. Used when `annotations.length.metricText` is omitted |
| `hover` | — | Tooltip for this bar |
| `toMove` | frame `toMove`, or `'white'` | `'white'` · `'black'`. Used by `anchor: 'to-move'` |
| `maxThickness` | `28`, or `16` for an extra classic bar | Pixel cap. A composite bar uses this layer's value, then the frame's |
| `gap` | `6`, or `8` when thickness is encoded | Space between this bar and the board or the next bar on the same side |
| `theme` | frame `theme` | Override for this bar |
| `annotations` | — | See below |

### Annotation marks

Each mark is a string, `false`, `true`, or a [label](#labels) object.

| Mark | Field | Default place when you pass a string |
| --- | --- | --- |
| `length.metricLabel` | Name of the length metric | `foot`, horizontal |
| `length.metricText` | Length value | `cap`, horizontal. `true` shows the fill percent. `false` hides it |
| `thickness.metricLabel` | Name of the thickness metric | `outside`, anchor `black`, on the outer side of the bar |
| `thickness.metricText.white` | White's thickness value | `center`, anchor `white-mid` |
| `thickness.metricText.black` | Black's thickness value | `center`, anchor `black-mid` |
| `n.metricText` | A small count, such as viable moves (`N`) | `outside`, anchor `white`, on the same side as the thickness name |

`false` hides a mark. `true` only generates text for `length.metricText`. The other marks need a string or `{ text }`.

## Updates

```js
bar.update({
  encoding: { length: { value: 1.2 } },
  label: { text: '+1.20' },
  flipBoard: true,
  theme: 'midnight',
  orientation: 'horizontal',
})
bar.resize()
bar.destroy()
bar.el
```

`update` merges a config patch and returns the bar. A patch that only sets `length.value` keeps `min`, `max`, `map`, and `reverse`. On a frame, that value is also written onto the first layer that already encodes length or thickness.

`resize` measures the board again. `destroy` removes the bar. `el` is the root element. On a frame it is the frame, not an individual bar. Each bar’s fill share is `dataset.share` in `[0, 1]` on that bar’s element. On a single bar that element is `el`. On a frame it is each `.ceb` inside `el`.

## Labels

`position` is where the caption sits. `anchor` chooses White's fill, Black's fill, the side that is ahead (`advantage`: White when the fill is at least half), or the side to move.

| `position` | What it does |
| --- | --- |
| `'auto'` | `'end'` when the caption fits in the thickness, otherwise `'outside'` |
| `'end'` | On the bar, inset from the anchored end |
| `'center'` | Middle of the bar for `advantage`. Middle of that color's half for `white`, `black`, `white-mid`, and `black-mid` |
| `'outside'` | Beside the bar. `side` picks the perpendicular side. `anchor` picks the point along the bar |
| `'foot'` | Just past White's end. `anchor: 'black'` moves it past Black's end |
| `'cap'` | Just past Black's end. `anchor: 'white'` moves it past White's end |

`white-mid` and `black-mid` sit in the middle of that color's fill. With `'outside'`, they stay beside the bar at that point. `'to-move'` follows `toMove` on that layer, or on the frame, and sits at that side's end. It defaults to White.

`side` applies to `'outside'`. A vertical bar uses `'left'` or `'right'` (anything else becomes `'right'`). A horizontal bar uses `'top'` or `'bottom'` (anything else becomes `'bottom'`).

| Option | Default | Notes |
| --- | --- | --- |
| `text` | — | Exact string. If omitted, `format` is used |
| `format` | `'percent'` | `'none'` draws nothing |
| `position` | `'auto'` | See the table above |
| `anchor` | `'advantage'` | `'white'` · `'black'` · `'white-mid'` · `'black-mid'` · `'to-move'` |
| `side` | `'right'` on a vertical bar, `'bottom'` on a horizontal bar | `'left'` · `'right'` · `'top'` · `'bottom'` |
| `rotate` | `'auto'` | Degrees, or `'auto'`. Auto is `-90` on a vertical bar and `0` on a horizontal bar. `cap` and `foot` stay `0`, except a vertical bar anchored at `white-mid` or `black-mid`, which uses `-90` |
| `offset` | `{ x: 0, y: 0 }` | Extra pixels |
| `inset` | `8` | Padding from the bar edge. Annotation defaults use `2` |
| `fontSize` | `11` | Number (px) or a CSS size. Annotation defaults use `10` |
| `fontWeight` | `700` | Number or a CSS weight. Annotation defaults use `800` |
| `fontFamily` | theme font | |
| `color` | theme label ink | |
| `hover` | — | Tooltip for this caption |

## Helpers

```js
ChessEvalBar.attachToBoard('#board', {
  encoding: {
    length: { value: 0.5, min: -4, max: 4 },
  },
  label: { text: '+0.50' },
  attach: 'right',
})
ChessEvalBar.themes
```

`attachToBoard` wraps the board and inserts one bar. `ChessEvalBar.themes` is the built-in theme map: `lichess`, `chesscom`, `classic`, `midnight`, `broadcast`, `high-contrast`. Theme fields are on the [Theming](theming) page.
