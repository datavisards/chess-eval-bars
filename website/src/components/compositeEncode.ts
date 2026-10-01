import type {BarLayer} from 'chess-eval-bars';
import {clockShare, computeTimePressure} from 'ceb-examples/metrics';
import type {Side} from 'ceb-examples/metrics';
import {EVAL_MAX, EVAL_MIN} from './evalMap';

const CLOCK_REFERENCE = 600;
const CLOCK_TAU = 10;
const MCI_MAX = 0.4;
const EVAL_PAWNS = 2.8;
const EVAL_TEXT = '+2.8';
const BOARD_BAR_GAP = 12;
const COMPOSITE_THICKNESS = 34;
const HERO_WHITE_MCI = 0.18;
const HERO_BLACK_MCI = 0.04;
const HERO_N = 3;
const RTP_WHITE_S = 14;
const RTP_BLACK_S = 11;
const MCI_WHITE = 0.05;
const MCI_BLACK = 0.23;
const MCI_N = 2;

function evalLen(pawns = EVAL_PAWNS) {
  return {value: pawns, min: EVAL_MIN, max: EVAL_MAX};
}

function thick(
  white: {value: number; min?: number; max?: number},
  black: {value: number; min?: number; max?: number},
) {
  return {white, black, reverse: true as const};
}

function reading(value: number, max = 1) {
  return max === 1 ? {value} : {value, min: 0, max};
}

function lengthShare(white: number, black: number): number {
  return Number(clockShare(white, black).toFixed(3));
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatAtp(pressure01: number): string {
  return Math.min(1, Math.max(0, pressure01)).toFixed(2);
}

function formatMci(mci: number): string {
  return Math.min(MCI_MAX, Math.max(0, mci)).toFixed(2);
}

function marks(opts: {
  lengthLabel: string;
  lengthText: string;
  thickLabel: string;
  whiteText: string;
  blackText: string;
  lengthHover: string;
  thickHover: string;
  whiteHover: string;
  blackHover: string;
  nText?: string;
}): BarLayer['annotations'] {
  const out: BarLayer['annotations'] = {
    length: {
      metricLabel: {text: opts.lengthLabel, hover: opts.lengthHover},
      metricText: {text: opts.lengthText, hover: opts.lengthHover},
    },
    thickness: {
      metricLabel: {
        text: opts.thickLabel,
        side: 'right',
        position: 'outside',
        hover: opts.thickHover,
      },
      metricText: {
        white: {text: opts.whiteText, hover: opts.whiteHover},
        black: {text: opts.blackText, hover: opts.blackHover},
      },
    },
  };
  if (opts.nText) {
    out.n = {
      metricText: {
        text: opts.nText,
        position: 'outside',
        side: 'left',
        rotate: -90,
        anchor: 'to-move',
        hover: 'Viable moves',
      },
    };
  }
  return out;
}

export type DemoClocks = {
  white: number;
  black: number;
  toMove: Side;
};

export type CodeSnippet = {language: string; text: string};

export type CompositeExample = {
  id: string;
  title: string;
  lede: string;
  fen: string;
  code: string | CodeSnippet[];
  layers: BarLayer[];
  clocks?: DemoClocks;
};

const HERO_FEN = '5rk1/5ppp/8/8/8/4N3/5PPP/5RK1 w - -';
const HERO_CLOCKS: DemoClocks = {white: 24, black: 105, toMove: 'white'};
const HERO_CLOCK_INPUT = {
  white: HERO_CLOCKS.white,
  black: HERO_CLOCKS.black,
  reference: CLOCK_REFERENCE,
  playerToMove: HERO_CLOCKS.toMove,
  tau: CLOCK_TAU,
};

function rtpAtpLayer(
  clocks: {white: number; black: number; reference?: number; playerToMove?: Side; tau?: number},
  gap = 10,
): BarLayer {
  const time = computeTimePressure(clocks);
  const deltaSec = clocks.white - clocks.black;
  const lengthText =
    deltaSec === 0 ? '0s' : deltaSec > 0 ? `+${deltaSec}s` : `${deltaSec}s`;
  return {
    attach: 'left',
    encoding: {
      length: {value: lengthShare(clocks.white, clocks.black)},
      thickness: thick(reading(time.white.absolute), reading(time.black.absolute)),
    },
    maxThickness: COMPOSITE_THICKNESS,
    gap,
    annotations: marks({
      lengthLabel: 'RTP',
      lengthText,
      thickLabel: 'ATP',
      whiteText: formatAtp(time.white.absolute),
      blackText: formatAtp(time.black.absolute),
      lengthHover: 'Relative time pressure',
      thickHover: 'Absolute time pressure',
      whiteHover: 'White ATP',
      blackHover: 'Black ATP',
    }),
  };
}

function evalAtpLayer(gap = BOARD_BAR_GAP): BarLayer {
  const time = computeTimePressure(HERO_CLOCK_INPUT);
  return {
    attach: 'left',
    encoding: {
      length: evalLen(),
      thickness: thick(reading(time.white.absolute), reading(time.black.absolute)),
    },
    maxThickness: COMPOSITE_THICKNESS,
    gap,
    annotations: marks({
      lengthLabel: 'EE',
      lengthText: EVAL_TEXT,
      thickLabel: 'ATP',
      whiteText: formatAtp(time.white.absolute),
      blackText: formatAtp(time.black.absolute),
      lengthHover: 'Engine eval',
      thickHover: 'Absolute time pressure',
      whiteHover: 'White ATP',
      blackHover: 'Black ATP',
    }),
  };
}

function evalMciLayer(
  opts: {
    pawns?: number;
    evalText?: string;
    whiteMci?: number;
    blackMci?: number;
    gap?: number;
    nViable?: number;
    toMove?: Side;
  } = {},
): BarLayer {
  const pawns = opts.pawns ?? EVAL_PAWNS;
  const evalText = opts.evalText ?? (pawns === EVAL_PAWNS ? EVAL_TEXT : pawns.toFixed(2));
  const whiteMci = opts.whiteMci ?? HERO_WHITE_MCI;
  const blackMci = opts.blackMci ?? HERO_BLACK_MCI;
  const gap = opts.gap ?? 10;
  const nViable = opts.nViable;
  const toMove = opts.toMove ?? 'white';
  return {
    attach: 'left',
    encoding: {
      length: evalLen(pawns),
      thickness: thick(reading(whiteMci, MCI_MAX), reading(blackMci, MCI_MAX)),
    },
    maxThickness: COMPOSITE_THICKNESS,
    gap,
    toMove,
    annotations: marks({
      lengthLabel: 'EE',
      lengthText: evalText,
      thickLabel: 'MCI',
      whiteText: formatMci(whiteMci),
      blackText: formatMci(blackMci),
      lengthHover: 'Engine eval',
      thickHover: 'Move Criticality Index',
      whiteHover: 'White MCI',
      blackHover: 'Black MCI',
      nText: typeof nViable === 'number' ? `N=${nViable}` : undefined,
    }),
  };
}

function heroDemoLayers(): BarLayer[] {
  return [
    rtpAtpLayer(HERO_CLOCK_INPUT, 10),
    evalMciLayer({whiteMci: HERO_WHITE_MCI, blackMci: HERO_BLACK_MCI, nViable: HERO_N}),
    evalAtpLayer(),
  ];
}

function homepageThemeLayers(): BarLayer[] {
  return [
    {
      attach: 'right',
      encoding: {length: {value: 0.55}},
      maxThickness: 18,
      gap: BOARD_BAR_GAP,
      theme: 'chesscom',
      label: {format: 'percent', fontSize: 10, fontWeight: 600, rotate: 'auto'},
    },
    {
      attach: 'right',
      encoding: {length: {value: 1.2, min: EVAL_MIN, max: EVAL_MAX}},
      maxThickness: 28,
      gap: 6,
      theme: 'classic',
      label: {text: '+1.20', fontSize: 13, fontWeight: 800, rotate: 'auto'},
    },
    {
      attach: 'right',
      encoding: {length: {value: EVAL_MAX, min: EVAL_MIN, max: EVAL_MAX}},
      maxThickness: 16,
      gap: 6,
      theme: 'midnight',
      label: {text: 'M3', fontSize: 12, fontWeight: 700, position: 'end', rotate: -90},
    },
    {
      attach: 'right',
      encoding: {length: {value: 1}},
      maxThickness: 24,
      gap: 6,
      theme: 'broadcast',
      label: {text: 'TB+', fontSize: 11, fontWeight: 600, rotate: 'auto'},
    },
    {
      attach: 'right',
      encoding: {length: {value: 0.5, min: EVAL_MIN, max: EVAL_MAX}},
      maxThickness: 20,
      gap: 6,
      theme: 'high-contrast',
      label: {
        text: '+0.50',
        fontSize: 10,
        position: 'outside',
        side: 'right',
        rotate: -90,
        offset: {x: -6, y: 0},
      },
    },
  ];
}

export function liveCompositeLayers(opts: {
  evalValue: number;
  evalMin: number;
  evalMax: number;
  evalText: string;
  whiteClock: number;
  blackClock: number;
  toMove: Side;
  whiteMci: number;
  blackMci: number;
  nViable?: number | null;
}): BarLayer[] {
  const time = computeTimePressure({
    white: opts.whiteClock,
    black: opts.blackClock,
    reference: CLOCK_REFERENCE,
    playerToMove: opts.toMove,
    tau: CLOCK_TAU,
  });
  const nText = typeof opts.nViable === 'number' ? `N=${opts.nViable}` : undefined;
  return [
    {
      attach: 'left',
      encoding: {
        length: {value: opts.evalValue, min: opts.evalMin, max: opts.evalMax},
        thickness: thick(reading(time.white.absolute), reading(time.black.absolute)),
      },
      maxThickness: COMPOSITE_THICKNESS,
      gap: 10,
      annotations: marks({
        lengthLabel: 'EE',
        lengthText: opts.evalText,
        thickLabel: 'ATP',
        whiteText: formatAtp(time.white.absolute),
        blackText: formatAtp(time.black.absolute),
        lengthHover: 'Engine eval',
        thickHover: 'Absolute time pressure',
        whiteHover: 'White ATP',
        blackHover: 'Black ATP',
      }),
    },
    {
      attach: 'left',
      encoding: {
        length: {value: opts.evalValue, min: opts.evalMin, max: opts.evalMax},
        thickness: thick(reading(opts.whiteMci, MCI_MAX), reading(opts.blackMci, MCI_MAX)),
      },
      maxThickness: COMPOSITE_THICKNESS,
      gap: 10,
      toMove: opts.toMove,
      annotations: marks({
        lengthLabel: 'EE',
        lengthText: opts.evalText,
        thickLabel: 'MCI',
        whiteText: formatMci(opts.whiteMci),
        blackText: formatMci(opts.blackMci),
        lengthHover: 'Engine eval',
        thickHover: 'Move Criticality Index',
        whiteHover: 'White MCI',
        blackHover: 'Black MCI',
        nText,
      }),
    },
  ];
}

export const HOMEPAGE_LAYERS: BarLayer[] = [
  rtpAtpLayer(HERO_CLOCK_INPUT, 10),
  evalMciLayer(),
  evalAtpLayer(),
  ...homepageThemeLayers(),
  {
    attach: 'bottom',
    encoding: {length: evalLen()},
    maxThickness: 22,
    gap: 16,
    hover: 'Engine eval',
    label: {text: EVAL_TEXT, fontSize: 11, fontWeight: 700, rotate: 'auto'},
  },
];

const RTP_CLOCKS = {
  white: RTP_WHITE_S,
  black: RTP_BLACK_S,
  reference: CLOCK_REFERENCE,
  playerToMove: 'white' as Side,
  tau: CLOCK_TAU,
};

function rtpAtpLayers(): BarLayer[] {
  return [rtpAtpLayer(RTP_CLOCKS)];
}

function evalMciLayers(): BarLayer[] {
  return [
    evalMciLayer({
      pawns: 0,
      evalText: '0.00',
      whiteMci: MCI_WHITE,
      blackMci: MCI_BLACK,
      nViable: MCI_N,
      toMove: 'black',
    }),
  ];
}

const HERO_ATP = computeTimePressure(HERO_CLOCK_INPUT);
const HERO_RTP_DELTA = HERO_CLOCKS.white - HERO_CLOCKS.black;
const HERO_RTP_TEXT = `${HERO_RTP_DELTA}s`;
const HERO_SHARE = lengthShare(HERO_CLOCKS.white, HERO_CLOCKS.black);
const RTP_TIME = computeTimePressure(RTP_CLOCKS);
const RTP_SHARE = lengthShare(RTP_CLOCKS.white, RTP_CLOCKS.black);
const RTP_DELTA = RTP_CLOCKS.white - RTP_CLOCKS.black;

const HERO_DEMO_CODE = `ChessEvalBar('#frame', {
  board: '#board',
  maxThickness: ${COMPOSITE_THICKNESS},
  layers: [
    {
      attach: 'left',
      gap: 10,
      encoding: {
        length: { value: ${HERO_SHARE} },
        thickness: {
          reverse: true,
          white: { value: ${formatAtp(HERO_ATP.white.absolute)} },
          black: { value: ${formatAtp(HERO_ATP.black.absolute)} },
        },
      },
      annotations: {
        length: { metricLabel: 'RTP', metricText: '${HERO_RTP_TEXT}' },
        thickness: {
          metricLabel: 'ATP',
          metricText: {
            white: '${formatAtp(HERO_ATP.white.absolute)}',
            black: '${formatAtp(HERO_ATP.black.absolute)}',
          },
        },
      },
    },
    {
      attach: 'left',
      gap: 10,
      toMove: 'white',
      encoding: {
        length: { value: ${EVAL_PAWNS}, min: ${EVAL_MIN}, max: ${EVAL_MAX} },
        thickness: {
          reverse: true,
          white: { value: ${HERO_WHITE_MCI}, min: 0, max: ${MCI_MAX} },
          black: { value: ${HERO_BLACK_MCI}, min: 0, max: ${MCI_MAX} },
        },
      },
      annotations: {
        length: { metricLabel: 'EE', metricText: '${EVAL_TEXT}' },
        thickness: {
          metricLabel: 'MCI',
          metricText: {
            white: '${HERO_WHITE_MCI.toFixed(2)}',
            black: '${HERO_BLACK_MCI.toFixed(2)}',
          },
        },
        n: { metricText: { text: 'N=${HERO_N}', anchor: 'to-move' } },
      },
    },
    {
      attach: 'left',
      gap: ${BOARD_BAR_GAP},
      encoding: {
        length: { value: ${EVAL_PAWNS}, min: ${EVAL_MIN}, max: ${EVAL_MAX} },
        thickness: {
          reverse: true,
          white: { value: ${formatAtp(HERO_ATP.white.absolute)} },
          black: { value: ${formatAtp(HERO_ATP.black.absolute)} },
        },
      },
      annotations: {
        length: { metricLabel: 'EE', metricText: '${EVAL_TEXT}' },
        thickness: {
          metricLabel: 'ATP',
          metricText: {
            white: '${formatAtp(HERO_ATP.white.absolute)}',
            black: '${formatAtp(HERO_ATP.black.absolute)}',
          },
        },
      },
    },
  ],
})`;

const RTP_ATP_CODE = `ChessEvalBar('#frame', {
  board: '#board',
  maxThickness: ${COMPOSITE_THICKNESS},
  layers: [{
    attach: 'left',
    gap: 10,
    encoding: {
      length: { value: ${RTP_SHARE} },
      thickness: {
        reverse: true,
        white: { value: ${formatAtp(RTP_TIME.white.absolute)} },
        black: { value: ${formatAtp(RTP_TIME.black.absolute)} },
      },
    },
    annotations: {
      length: { metricLabel: 'RTP', metricText: '+${RTP_DELTA}s' },
      thickness: {
        metricLabel: 'ATP',
        metricText: {
          white: '${formatAtp(RTP_TIME.white.absolute)}',
          black: '${formatAtp(RTP_TIME.black.absolute)}',
        },
      },
    },
  }],
})`;

const EVAL_MCI_CODE = `ChessEvalBar('#frame', {
  board: '#board',
  maxThickness: ${COMPOSITE_THICKNESS},
  layers: [{
    attach: 'left',
    gap: 10,
    toMove: 'black',
    encoding: {
      length: { value: 0, min: ${EVAL_MIN}, max: ${EVAL_MAX} },
      thickness: {
        reverse: true,
        white: { value: ${MCI_WHITE}, min: 0, max: ${MCI_MAX} },
        black: { value: ${MCI_BLACK}, min: 0, max: ${MCI_MAX} },
      },
    },
    annotations: {
      length: { metricLabel: 'EE', metricText: '0.00' },
      thickness: {
        metricLabel: 'MCI',
        metricText: {
          white: '${MCI_WHITE.toFixed(2)}',
          black: '${MCI_BLACK.toFixed(2)}',
        },
      },
      n: { metricText: { text: 'N=${MCI_N}', anchor: 'to-move' } },
    },
  }],
})`;

const BASIC_CODE: CodeSnippet[] = [
  {
    language: 'html',
    text: `<link
  rel="stylesheet"
  href="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css"
/>
<link rel="stylesheet" href="chess-eval-bars/styles.css" />

<div id="board" style="width: 400px"></div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>`,
  },
  {
    language: 'js',
    text: `import { ChessEvalBar } from 'chess-eval-bars';

const board = Chessboard('board', {
  position: '5rk1/5ppp/8/8/8/4N3/5PPP/5RK1 w - -',
});

ChessEvalBar.attachToBoard('#board', {
  encoding: {
    length: { value: ${EVAL_PAWNS}, min: ${EVAL_MIN}, max: ${EVAL_MAX} },
  },
  attach: 'right',
  maxThickness: 22,
  hover: 'Engine eval',
  label: { text: '${EVAL_TEXT}', position: 'center', rotate: -90 },
});`,
  },
];

export const BASIC_EXAMPLE: CompositeExample = {
  id: 'basic',
  title: 'One eval bar',
  lede: '',
  fen: HERO_FEN,
  code: BASIC_CODE,
  layers: [
    {
      attach: 'right',
      encoding: {length: evalLen()},
      maxThickness: 22,
      hover: 'Engine eval',
      label: {text: EVAL_TEXT, position: 'center', rotate: -90, fontSize: 11, fontWeight: 700},
    },
  ],
};

export const COMPOSITE_EXAMPLES: CompositeExample[] = [
  {
    id: 'eval-atp',
    title: 'EE × ATP · EE × MCI · RTP × ATP',
    lede: 'White is a knight up (+2.8), with 24s against 105s.',
    fen: HERO_FEN,
    code: HERO_DEMO_CODE,
    layers: heroDemoLayers(),
    clocks: HERO_CLOCKS,
  },
  {
    id: 'rtp-atp',
    title: 'RTP × ATP',
    lede: '14s vs 11s. The bar shows time pressure, not the clock.',
    fen: 'r2q1rk1/ppp2ppp/2n1bn2/3pp3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 w - -',
    code: RTP_ATP_CODE,
    layers: rtpAtpLayers(),
    clocks: {white: RTP_WHITE_S, black: RTP_BLACK_S, toMove: 'white'},
  },
  {
    id: 'eval-mci',
    title: 'EE × MCI',
    lede: 'EE is 0.00. Black’s half is thinner (0.23 vs 0.05).',
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 b - -',
    code: EVAL_MCI_CODE,
    layers: evalMciLayers(),
    clocks: {white: 240, black: 240, toMove: 'black'},
  },
];

export const HERO_EXAMPLE = COMPOSITE_EXAMPLES[0];
