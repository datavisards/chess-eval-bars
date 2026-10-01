import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ChessEvalBar} from 'chess-eval-bars';
import {
  AttachSide,
  BarLayer,
  ChessEvalBarConfig,
  EvalBarApi,
  LabelAnchor,
  LabelConfig,
  LabelPosition,
  LabelRotate,
  LabelSide,
  Side,
  ThemeName,
} from 'chess-eval-bars';
import {ensureChessboard, type ChessboardApi} from './loadChessboard';
import {DEMO_THEME} from './demoTheme';
import {EVAL_MAX, EVAL_MIN} from './evalMap';

const THEMES: ThemeName[] = ['lichess', 'chesscom', 'classic', 'midnight', 'broadcast', 'high-contrast'];
const ATTACH: AttachSide[] = ['left', 'right', 'top', 'bottom'];
const POSITIONS: LabelPosition[] = ['auto', 'end', 'center', 'outside', 'cap', 'foot'];
const ANCHORS: LabelAnchor[] = ['advantage', 'white', 'black', 'white-mid', 'black-mid', 'to-move'];
const ROTATES: Array<{id: LabelRotate; label: string}> = [
  {id: 'auto', label: 'auto'},
  {id: 0, label: '0°'},
  {id: -90, label: '−90°'},
  {id: 90, label: '90°'},
];

type MarkDraft = {
  text: string;
  position: LabelPosition;
  anchor: LabelAnchor;
  side: LabelSide;
  rotate: LabelRotate;
  fontSize: number;
  fontWeight: number;
  color: string;
  hover: string;
};

type PlaygroundTheme = ThemeName | 'demo';
type Reading = 'value' | 'sides';

type PlaygroundBar = {
  id: string;
  encodeLength: boolean;
  encodeThickness: boolean;
  lengthReading: Reading;
  thicknessReading: Reading;
  attach: AttachSide;
  toMove: Side;
  theme: PlaygroundTheme;
  maxThickness: number;
  gap: number;
  value: number;
  min: number;
  max: number;
  lengthWhite: number;
  lengthBlack: number;
  thickValue: number;
  thickMin: number;
  thickMax: number;
  white: number;
  black: number;
  reverseLength: boolean;
  reverseThickness: boolean;
  valueMark: MarkDraft;
  thickValueMark: MarkDraft;
  lengthName: MarkDraft;
  thicknessName: MarkDraft;
  whiteMark: MarkDraft;
  blackMark: MarkDraft;
};

let barSeq = 1;

function mark(partial: Partial<MarkDraft> & Pick<MarkDraft, 'text'>): MarkDraft {
  return {
    position: 'center',
    anchor: 'advantage',
    side: 'right',
    rotate: -90,
    fontSize: 11,
    fontWeight: 800,
    color: '',
    hover: '',
    ...partial,
  };
}

function newBar(partial?: Partial<PlaygroundBar>): PlaygroundBar {
  return {
    id: `bar-${barSeq++}`,
    encodeLength: true,
    encodeThickness: false,
    lengthReading: 'value',
    thicknessReading: 'sides',
    attach: 'right',
    toMove: 'white',
    theme: 'demo',
    maxThickness: 22,
    gap: 8,
    value: 0.5,
    min: EVAL_MIN,
    max: EVAL_MAX,
    lengthWhite: 0.7,
    lengthBlack: 0.3,
    thickValue: 0.5,
    thickMin: EVAL_MIN,
    thickMax: EVAL_MAX,
    white: 1,
    black: 0.4,
    reverseLength: false,
    reverseThickness: false,
    valueMark: mark({text: '+0.50', position: 'center', rotate: -90}),
    thickValueMark: mark({text: '+0.50', position: 'center', rotate: -90}),
    lengthName: mark({text: 'EE', position: 'foot', rotate: 0, fontSize: 10}),
    thicknessName: mark({
      text: 'MCI',
      position: 'outside',
      anchor: 'black',
      rotate: -90,
      fontSize: 10,
    }),
    whiteMark: mark({text: '1.00', anchor: 'white-mid', fontSize: 10}),
    blackMark: mark({text: '0.40', anchor: 'black-mid', fontSize: 10}),
    ...partial,
  };
}

function markConfig(draft: MarkDraft, text = draft.text): LabelConfig | false {
  if (!text.trim()) return false;
  return {
    text,
    position: draft.position,
    anchor: draft.anchor,
    side: draft.side,
    rotate: draft.rotate,
    fontSize: draft.fontSize,
    fontWeight: draft.fontWeight,
    color: draft.color.trim() || undefined,
    hover: draft.hover.trim() || undefined,
  };
}

function hexColor(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return '#111111';
}

function syncMarkText(draft: MarkDraft, previous: number, next: number): MarkDraft {
  return draft.text === previous.toFixed(2) ? {...draft, text: next.toFixed(2)} : draft;
}

function metricBounds(min: number, max: number): {lo: number; hi: number} {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return hi > lo ? {lo, hi} : {lo, hi: lo + 1};
}

function metricStep(min: number, max: number): number {
  const span = Math.abs(max - min) || 1;
  if (span <= 2) return 0.01;
  if (span <= 20) return 0.1;
  return 1;
}

function formatMetric(n: number, step: number): string {
  if (step >= 1) return String(Math.round(n));
  if (step >= 0.1) return n.toFixed(1);
  return n.toFixed(2);
}

function clampMetric(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(hi, Math.max(lo, value));
}

function resolvedTheme(theme: PlaygroundTheme) {
  return theme === 'demo' ? DEMO_THEME : theme;
}

function crossSides(attach: AttachSide): LabelSide[] {
  return attach === 'left' || attach === 'right' ? ['left', 'right'] : ['top', 'bottom'];
}

function effectiveSide(attach: AttachSide, side: LabelSide): LabelSide {
  const options = crossSides(attach);
  return options.includes(side) ? side : options[1];
}

function unitShare(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!(hi > lo) || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}

function sideRatio(white: number, black: number): number {
  const sum = white + black;
  return sum > 0 ? white / sum : 0.5;
}

function toLayer(bar: PlaygroundBar): BarLayer {
  const side = (draft: MarkDraft): MarkDraft => ({...draft, side: effectiveSide(bar.attach, draft.side)});
  const length =
    !bar.encodeLength
      ? {value: 0.5, min: 0, max: 1}
      : bar.lengthReading === 'sides'
        ? {value: sideRatio(bar.lengthWhite, bar.lengthBlack), min: 0, max: 1, reverse: bar.reverseLength}
        : {value: bar.value, min: bar.min, max: bar.max, reverse: bar.reverseLength};
  const thickShare = unitShare(bar.thickValue, bar.thickMin, bar.thickMax);
  return {
    attach: bar.attach,
    toMove: bar.toMove,
    theme: resolvedTheme(bar.theme),
    maxThickness: bar.maxThickness,
    gap: bar.gap,
    encoding: {
      length,
      ...(bar.encodeThickness
        ? {
            thickness:
              bar.thicknessReading === 'value'
                ? {white: thickShare, black: 1 - thickShare, reverse: bar.reverseThickness}
                : {white: bar.white, black: bar.black, reverse: bar.reverseThickness},
          }
        : {}),
    },
    annotations: {
      ...(bar.encodeLength
        ? {
            length: {
              metricLabel: markConfig(side(bar.lengthName)),
              metricText: markConfig(side(bar.valueMark)),
            },
          }
        : {}),
      ...(bar.encodeThickness
        ? {
            thickness: {
              metricLabel: markConfig(side(bar.thicknessName)),
              metricText:
                bar.thicknessReading === 'value'
                  ? {white: markConfig(side(bar.thickValueMark)), black: false}
                  : {
                      white: markConfig(side(bar.whiteMark)),
                      black: markConfig(side(bar.blackMark)),
                    },
            },
          }
        : {}),
    },
  };
}

function MarkEditor({
  legend,
  mark: draft,
  attach,
  onChange,
  collapsible = false,
  children,
}: {
  legend: string;
  mark: MarkDraft;
  attach: AttachSide;
  onChange: (patch: Partial<MarkDraft>) => void;
  collapsible?: boolean;
  children?: ReactNode;
}) {
  const sides = crossSides(attach);
  const fields = (
      <div className="pg-grid">
        {children}
        <label>
          Text
          <input value={draft.text} onChange={(e) => onChange({text: e.target.value})} />
        </label>
        <label>
          Position
          <select
            value={draft.position}
            onChange={(e) => onChange({position: e.target.value as LabelPosition})}
          >
            {POSITIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Anchor
          <select
            value={draft.anchor}
            onChange={(e) => onChange({anchor: e.target.value as LabelAnchor})}
          >
            {ANCHORS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Side
          <select
            value={effectiveSide(attach, draft.side)}
            onChange={(e) => onChange({side: e.target.value as LabelSide})}
          >
            {sides.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rotate
          <select
            value={String(draft.rotate)}
            onChange={(e) => {
              const raw = e.target.value;
              onChange({rotate: raw === 'auto' ? 'auto' : Number(raw)});
            }}
          >
            {ROTATES.map((r) => (
              <option key={String(r.id)} value={String(r.id)}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Size
          <span className="pg-slider">
            <input
              type="range"
              min={8}
              max={18}
              step={1}
              value={draft.fontSize}
              onChange={(e) => onChange({fontSize: Number(e.target.value)})}
            />
            <strong>{draft.fontSize}px</strong>
          </span>
        </label>
        <label>
          Weight
          <span className="pg-slider">
            <input
              type="range"
              min={400}
              max={800}
              step={100}
              value={draft.fontWeight}
              onChange={(e) => onChange({fontWeight: Number(e.target.value)})}
            />
            <strong>{draft.fontWeight}</strong>
          </span>
        </label>
        <label>
          Color
          <span className="pg-color">
            <input
              type="color"
              title={draft.color || 'Theme'}
              value={hexColor(draft.color)}
              onChange={(e) => onChange({color: e.target.value})}
            />
            {draft.color ? (
              <button type="button" onClick={() => onChange({color: ''})}>
                Theme
              </button>
            ) : null}
          </span>
        </label>
        <label>
          Tooltip
          <input
            value={draft.hover}
            onChange={(e) => onChange({hover: e.target.value})}
          />
        </label>
      </div>
  );
  if (!collapsible) {
    return (
      <fieldset className="pg-mark">
        <legend>{legend}</legend>
        {fields}
      </fieldset>
    );
  }
  return (
    <details className="pg-mark">
      <summary>{legend}</summary>
      {fields}
    </details>
  );
}

function BoardWithBar({config}: {config: ChessEvalBarConfig}) {
  const pieceTheme = `${useBaseUrl('/img/chesspieces/wikipedia').replace(/\/$/, '')}/{piece}.png`;
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const barApi = useRef<EvalBarApi | null>(null);
  const boardApi = useRef<ChessboardApi | undefined>(undefined);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!frameRef.current || !boardRef.current) return;
    let cancelled = false;
    ensureChessboard()
      .then((Chessboard) => {
        if (cancelled || !frameRef.current || !boardRef.current) return;
        boardApi.current = Chessboard(boardRef.current, {
          position: 'start',
          orientation: 'white',
          pieceTheme,
        });
        barApi.current = ChessEvalBar(frameRef.current, {
          ...configRef.current,
          board: boardRef.current,
          maxLength: 'auto',
          slots: {
            top: topRef.current,
            left: leftRef.current,
            right: rightRef.current,
            bottom: bottomRef.current,
          },
        });
        requestAnimationFrame(() => {
          boardApi.current?.resize?.();
          barApi.current?.resize();
        });
      })
      .catch((err: Error) => {
        if (!cancelled) console.error(err);
      });
    return () => {
      cancelled = true;
      barApi.current?.destroy();
      barApi.current = null;
      boardApi.current?.destroy();
      boardApi.current = undefined;
    };
  }, [pieceTheme]);

  useEffect(() => {
    barApi.current?.update({
      ...config,
      board: boardRef.current ?? undefined,
      maxLength: 'auto',
      slots: {
        top: topRef.current,
        left: leftRef.current,
        right: rightRef.current,
        bottom: bottomRef.current,
      },
    });
    requestAnimationFrame(() => {
      boardApi.current?.resize?.();
      barApi.current?.resize();
    });
  }, [config]);

  return (
    <div className="ceb-frame playground-frame" ref={frameRef}>
      <div className="ceb-frame__side ceb-frame__side--top" ref={topRef} />
      <div className="ceb-frame__side ceb-frame__side--left" ref={leftRef} />
      <div className="ceb-docs-board ceb-frame__board" ref={boardRef} />
      <div className="ceb-frame__side ceb-frame__side--right" ref={rightRef} />
      <div className="ceb-frame__side ceb-frame__side--bottom" ref={bottomRef} />
    </div>
  );
}

export default function EvalPlayground() {
  const [showZeroLine, setShowZeroLine] = useState(true);
  const [bars, setBars] = useState<PlaygroundBar[]>(() => [newBar()]);
  const [activeId, setActiveId] = useState(bars[0].id);

  const active = bars.find((bar) => bar.id === activeId) ?? bars[0];

  const config = useMemo<ChessEvalBarConfig>(
    () => ({
      theme: DEMO_THEME,
      showZeroLine,
      layers: bars.map(toLayer),
      maxThickness: 22,
    }),
    [showZeroLine, bars],
  );

  function updateBar(id: string, patch: Partial<PlaygroundBar>) {
    setBars((prev) => prev.map((bar) => (bar.id === id ? {...bar, ...patch} : bar)));
  }

  function updateMark(
    id: string,
    key: 'valueMark' | 'thickValueMark' | 'lengthName' | 'thicknessName' | 'whiteMark' | 'blackMark',
    patch: Partial<MarkDraft>,
  ) {
    setBars((prev) =>
      prev.map((bar) => (bar.id === id ? {...bar, [key]: {...bar[key], ...patch}} : bar)),
    );
  }

  function addBar() {
    const next = newBar({
      attach: active?.attach ?? 'left',
      theme: active?.theme ?? 'demo',
      value: 0.7,
      min: 0,
      max: 1,
      valueMark: mark({text: '0.70', position: 'center', rotate: -90}),
      lengthName: mark({text: '', position: 'foot', rotate: 0, fontSize: 10}),
    });
    setBars((prev) => [...prev, next]);
    setActiveId(next.id);
  }

  function removeBar(id: string) {
    setBars((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((bar) => bar.id !== id);
      if (id === activeId) setActiveId(next[Math.max(0, prev.findIndex((bar) => bar.id === id) - 1)]?.id ?? next[0].id);
      return next;
    });
  }

  return (
    <div className="playground">
      <div className="playground-stage">
        <div className="playground-stage-cluster">
          <BrowserOnly fallback={<div className="ceb-docs-board" />}>
            {() => <BoardWithBar config={config} />}
          </BrowserOnly>
        </div>
      </div>

      <aside className="playground-options">
        <div className="pg-chrome">
        <div className="pg-tabs" role="tablist">
          {bars.map((bar, index) => (
            <button
              key={bar.id}
              type="button"
              role="tab"
              aria-selected={bar.id === active.id}
              className={`pg-tab${bar.id === active.id ? ' is-active' : ''}`}
              onClick={() => setActiveId(bar.id)}
            >
              <span>{`Bar ${index + 1}`}</span>
              {bars.length > 1 ? (
                <span
                  className="pg-tab-x"
                  title={`Remove Bar ${index + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBar(bar.id);
                  }}
                >
                  ×
                </span>
              ) : null}
            </button>
          ))}
          <button type="button" className="pg-tab pg-tab-add" onClick={addBar}>
            +
          </button>
        </div>

        {active ? (
          <section className="pg-tab-panel" role="tabpanel">
            <fieldset className="pg-fieldset">
              <legend>Bar</legend>
              <div className="pg-grid">
                <label>
                  Theme
                  <select
                    value={active.theme}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateBar(active.id, {theme: v === 'demo' ? 'demo' : (v as ThemeName)});
                    }}
                  >
                    <option value="demo">demo (basic)</option>
                    {THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Position
                  <select
                    value={active.attach}
                    onChange={(e) => updateBar(active.id, {attach: e.target.value as AttachSide})}
                  >
                    {ATTACH.map((side) => (
                      <option key={side} value={side}>
                        {side}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  To move
                  <select
                    value={active.toMove}
                    onChange={(e) => updateBar(active.id, {toMove: e.target.value as Side})}
                  >
                    <option value="white">white</option>
                    <option value="black">black</option>
                  </select>
                </label>
                <label className="pg-check">
                  <input
                    type="checkbox"
                    checked={showZeroLine}
                    onChange={(e) => setShowZeroLine(e.target.checked)}
                  />
                  Zero line
                </label>
              </div>
            </fieldset>

            <fieldset className="pg-fieldset">
              <legend>Length</legend>
              <div className="pg-grid">
                <label className="pg-check">
                  <input
                    type="checkbox"
                    checked={active.encodeLength}
                    onChange={(e) => updateBar(active.id, {encodeLength: e.target.checked})}
                  />
                  Encode
                </label>
                {active.encodeLength ? (
                  <label>
                    From
                    <select
                      value={active.lengthReading}
                      onChange={(e) => updateBar(active.id, {lengthReading: e.target.value as Reading})}
                    >
                      <option value="value">White's value</option>
                      <option value="sides">White and black</option>
                    </select>
                  </label>
                ) : null}
                {active.encodeLength && active.lengthReading === 'value' ? (
                  <>
                    <label>
                      Min
                      <input
                        type="number"
                        step={metricStep(active.min, active.max)}
                        value={active.min}
                        onChange={(e) => {
                          const min = Number(e.target.value);
                          if (!Number.isFinite(min)) return;
                          updateBar(active.id, {min, value: clampMetric(active.value, min, active.max)});
                        }}
                      />
                    </label>
                    <label>
                      Max
                      <input
                        type="number"
                        step={metricStep(active.min, active.max)}
                        value={active.max}
                        onChange={(e) => {
                          const max = Number(e.target.value);
                          if (!Number.isFinite(max)) return;
                          updateBar(active.id, {max, value: clampMetric(active.value, active.min, max)});
                        }}
                      />
                    </label>
                    <label className="pg-check">
                      <input
                        type="checkbox"
                        checked={active.reverseLength}
                        onChange={(e) => updateBar(active.id, {reverseLength: e.target.checked})}
                      />
                      Reverse
                    </label>
                  </>
                ) : null}
                {active.encodeLength && active.lengthReading === 'sides' ? (
                  <>
                    <label>
                      White
                      <span className="pg-slider">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.lengthWhite}
                          onChange={(e) => updateBar(active.id, {lengthWhite: Number(e.target.value)})}
                        />
                        <strong>{active.lengthWhite.toFixed(2)}</strong>
                      </span>
                    </label>
                    <label>
                      Black
                      <span className="pg-slider">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.lengthBlack}
                          onChange={(e) => updateBar(active.id, {lengthBlack: Number(e.target.value)})}
                        />
                        <strong>{active.lengthBlack.toFixed(2)}</strong>
                      </span>
                    </label>
                    <label className="pg-check">
                      <input
                        type="checkbox"
                        checked={active.reverseLength}
                        onChange={(e) => updateBar(active.id, {reverseLength: e.target.checked})}
                      />
                      Reverse
                    </label>
                  </>
                ) : null}
              </div>
              {active.encodeLength ? (
                <>
                  {active.lengthReading === 'value' ? (
                    <MarkEditor
                      legend="Label"
                      collapsible
                      attach={active.attach}
                      mark={active.valueMark}
                      onChange={(patch) => updateMark(active.id, 'valueMark', patch)}
                    >
                      <label>
                        Value
                        <span className="pg-slider">
                          <input
                            type="range"
                            min={metricBounds(active.min, active.max).lo}
                            max={metricBounds(active.min, active.max).hi}
                            step={metricStep(active.min, active.max)}
                            value={clampMetric(active.value, active.min, active.max)}
                            onChange={(e) => updateBar(active.id, {value: Number(e.target.value)})}
                          />
                          <strong>{formatMetric(active.value, metricStep(active.min, active.max))}</strong>
                        </span>
                      </label>
                    </MarkEditor>
                  ) : (
                    <MarkEditor
                      legend="Label"
                      collapsible
                      attach={active.attach}
                      mark={active.valueMark}
                      onChange={(patch) => updateMark(active.id, 'valueMark', patch)}
                    />
                  )}
                  <MarkEditor
                    legend="Name"
                    collapsible
                    attach={active.attach}
                    mark={active.lengthName}
                    onChange={(patch) => updateMark(active.id, 'lengthName', patch)}
                  />
                </>
              ) : null}
            </fieldset>

            <fieldset className="pg-fieldset">
              <legend>Thickness</legend>
              <div className="pg-grid">
                <label className="pg-check">
                  <input
                    type="checkbox"
                    checked={active.encodeThickness}
                    onChange={(e) => updateBar(active.id, {encodeThickness: e.target.checked})}
                  />
                  Encode
                </label>
                {active.encodeThickness ? (
                  <label>
                    From
                    <select
                      value={active.thicknessReading}
                      onChange={(e) => updateBar(active.id, {thicknessReading: e.target.value as Reading})}
                    >
                      <option value="value">White's value</option>
                      <option value="sides">White and black</option>
                    </select>
                  </label>
                ) : null}
                <label>
                  Max thickness
                  <span className="pg-slider">
                    <input
                      type="range"
                      min={8}
                      max={40}
                      step={1}
                      value={active.maxThickness}
                      onChange={(e) => updateBar(active.id, {maxThickness: Number(e.target.value)})}
                    />
                    <strong>{active.maxThickness}px</strong>
                  </span>
                </label>
                {active.encodeThickness && active.thicknessReading === 'value' ? (
                  <>
                    <label>
                      Min
                      <input
                        type="number"
                        step={metricStep(active.thickMin, active.thickMax)}
                        value={active.thickMin}
                        onChange={(e) => {
                          const thickMin = Number(e.target.value);
                          if (!Number.isFinite(thickMin)) return;
                          updateBar(active.id, {
                            thickMin,
                            thickValue: clampMetric(active.thickValue, thickMin, active.thickMax),
                          });
                        }}
                      />
                    </label>
                    <label>
                      Max
                      <input
                        type="number"
                        step={metricStep(active.thickMin, active.thickMax)}
                        value={active.thickMax}
                        onChange={(e) => {
                          const thickMax = Number(e.target.value);
                          if (!Number.isFinite(thickMax)) return;
                          updateBar(active.id, {
                            thickMax,
                            thickValue: clampMetric(active.thickValue, active.thickMin, thickMax),
                          });
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {active.encodeThickness ? (
                  <label className="pg-check">
                    <input
                      type="checkbox"
                      checked={active.reverseThickness}
                      onChange={(e) => updateBar(active.id, {reverseThickness: e.target.checked})}
                    />
                    Reverse
                  </label>
                ) : null}
              </div>
              {active.encodeThickness && active.thicknessReading === 'value' ? (
                <>
                  <MarkEditor
                    legend="Label"
                    collapsible
                    attach={active.attach}
                    mark={active.thickValueMark}
                    onChange={(patch) => updateMark(active.id, 'thickValueMark', patch)}
                  >
                    <label>
                      Value
                      <span className="pg-slider">
                        <input
                          type="range"
                          min={metricBounds(active.thickMin, active.thickMax).lo}
                          max={metricBounds(active.thickMin, active.thickMax).hi}
                          step={metricStep(active.thickMin, active.thickMax)}
                          value={clampMetric(active.thickValue, active.thickMin, active.thickMax)}
                          onChange={(e) => updateBar(active.id, {thickValue: Number(e.target.value)})}
                        />
                        <strong>{formatMetric(active.thickValue, metricStep(active.thickMin, active.thickMax))}</strong>
                      </span>
                    </label>
                  </MarkEditor>
                  <MarkEditor
                    legend="Name"
                    collapsible
                    attach={active.attach}
                    mark={active.thicknessName}
                    onChange={(patch) => updateMark(active.id, 'thicknessName', patch)}
                  />
                </>
              ) : null}
              {active.encodeThickness && active.thicknessReading === 'sides' ? (
                <>
                  <MarkEditor
                    legend="White"
                    attach={active.attach}
                    mark={active.whiteMark}
                    onChange={(patch) => updateMark(active.id, 'whiteMark', patch)}
                  >
                    <label>
                      Value
                      <span className="pg-slider">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.white}
                          onChange={(e) => {
                            const white = Number(e.target.value);
                            updateBar(active.id, {
                              white,
                              whiteMark: syncMarkText(active.whiteMark, active.white, white),
                            });
                          }}
                        />
                        <strong>{active.white.toFixed(2)}</strong>
                      </span>
                    </label>
                  </MarkEditor>
                  <MarkEditor
                    legend="Black"
                    attach={active.attach}
                    mark={active.blackMark}
                    onChange={(patch) => updateMark(active.id, 'blackMark', patch)}
                  >
                    <label>
                      Value
                      <span className="pg-slider">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.black}
                          onChange={(e) => {
                            const black = Number(e.target.value);
                            updateBar(active.id, {
                              black,
                              blackMark: syncMarkText(active.blackMark, active.black, black),
                            });
                          }}
                        />
                        <strong>{active.black.toFixed(2)}</strong>
                      </span>
                    </label>
                  </MarkEditor>
                  <MarkEditor
                    legend="Name"
                    collapsible
                    attach={active.attach}
                    mark={active.thicknessName}
                    onChange={(patch) => updateMark(active.id, 'thicknessName', patch)}
                  />
                </>
              ) : null}
            </fieldset>
          </section>
        ) : null}
        </div>
      </aside>
    </div>
  );
}
