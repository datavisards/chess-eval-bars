import { createEvalBar } from "./bar";
import {
  boardSize,
  clearCebVars,
  el,
  empty,
  observeSize,
  requireElement,
  resolveElement,
  stripCebClasses,
} from "./dom";
import { hideHoverTooltip } from "./tooltip";
import { encode, encodeShare, zeroLineAt } from "./fill";
import { resolveLength, resolveThickness, lengthHasValue, usesThickness, mergeEncoding, withLengthValue } from "./encoding";
import { resolveTheme, themeToCssVars } from "./themes";
import { resolveMark } from "./label";
import {
  configuredMaxLength,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_THICKNESS,
  resolveMaxThickness,
  tracksBoardLength,
} from "./layout";
import type {
  AttachSide,
  BarLayer,
  BoardRef,
  ChessEvalBarConfig,
  EvalBarApi,
  LabelConfig,
  LayerAnnotations,
  Orientation,
} from "./types";
import type { BarRenderConfig } from "./render";

const SIDES: AttachSide[] = ["left", "right", "top", "bottom"];

function resolveBoardElement(board?: BoardRef): HTMLElement | null {
  return board ? resolveElement(board) : null;
}

function barLengthPx(cfg: ChessEvalBarConfig): number {
  const boardEl = resolveBoardElement(cfg.board);
  const size = configuredMaxLength(cfg);
  if (boardEl && (size === "auto" || size === undefined)) {
    return boardSize(boardEl);
  }
  return typeof size === "number" ? size : DEFAULT_MAX_LENGTH;
}

function orientationFor(attach: AttachSide): Orientation {
  return attach === "top" || attach === "bottom" ? "horizontal" : "vertical";
}

function outsideSide(attach: AttachSide): LabelConfig["side"] {
  if (attach === "right") return "right";
  if (attach === "top") return "top";
  if (attach === "bottom") return "bottom";
  return "left";
}

const OVERLAY: LabelConfig = {
  fontSize: 10,
  fontWeight: 800,
  inset: 2,
};

function layerShare(layer: BarLayer, cfg?: ChessEvalBarConfig): number | undefined {
  const ch = resolveLength(layer, cfg);
  if (typeof ch.value !== "number") return undefined;
  return encode(ch.value, ch.min ?? 0, ch.max ?? 1, {map: ch.map, reverse: ch.reverse});
}

function layerZeroLine(layer: BarLayer, cfg?: ChessEvalBarConfig): number | undefined {
  if (lengthHasValue(layer)) {
    const ch = resolveLength(layer, cfg);
    return zeroLineAt(ch.min ?? 0, ch.max ?? 1, {map: ch.map, reverse: ch.reverse});
  }
  if (cfg && lengthHasValue(cfg)) {
    const ch = resolveLength(cfg);
    return zeroLineAt(ch.min ?? 0, ch.max ?? 1, {map: ch.map, reverse: ch.reverse});
  }
  return undefined;
}

function layerLabelStyle(layer: BarLayer): LabelConfig {
  return layer.label && typeof layer.label === "object" ? layer.label : {};
}

function layerLabel(layer: BarLayer): LabelConfig {
  const style = layerLabelStyle(layer);
  const text = typeof layer.label === "string" ? layer.label : style.text;
  return {
    ...style,
    ...(text !== undefined ? {text} : {}),
    position: style.position ?? "end",
    rotate: style.rotate ?? "auto",
    fontSize: style.fontSize ?? 11,
    fontWeight: style.fontWeight ?? 700,
  };
}

function layerIsEval(layer: BarLayer): boolean {
  return !lengthHasValue(layer) && !usesThickness(layer.encoding) && !layer.label;
}

function withPrimaryLayerValue(layers: BarLayer[], value: number): BarLayer[] {
  let updated = false;
  return layers.map((layer) => {
    if (updated) return layer;
    if (layerIsEval(layer)) {
      updated = true;
      return layer;
    }
    if (lengthHasValue(layer) || usesThickness(layer.encoding)) {
      updated = true;
      return {
        ...layer,
        encoding: withLengthValue(layer.encoding, value),
      };
    }
    return layer;
  });
}

function shareNow(cfg: ChessEvalBarConfig): number {
  const ch = resolveLength(cfg);
  if (typeof ch.value === "number") {
    return encode(ch.value, ch.min ?? 0, ch.max ?? 1, {map: ch.map, reverse: ch.reverse});
  }
  return 0.5;
}

function asNormalizedShare(patch: BarRenderConfig, share: number): BarRenderConfig {
  return {
    ...patch,
    encoding: {
      length: {value: share, min: 0, max: 1, map: undefined, reverse: undefined},
      thickness: undefined,
    },
  };
}

function lengthTextFallback(cfg: ChessEvalBarConfig, share: number): string {
  const userLabel = typeof cfg.label === "object" && cfg.label ? cfg.label : {};
  if (userLabel.text) return userLabel.text;
  if (userLabel.format === "none") return "";
  return `${Math.round(share * 100)}%`;
}

function buildLayerAnnotations(
  cfg: ChessEvalBarConfig,
  layer: BarLayer,
  annotations: LayerAnnotations | undefined,
  share: number,
): NonNullable<BarRenderConfig["annotations"]> {
  const lengthMarks = {...(annotations?.length ?? {})};
  const thickMarks = {...(annotations?.thickness ?? {})};
  const nMark = annotations?.n?.metricText;
  const whiteMark = thickMarks.metricText?.white;
  const blackMark = thickMarks.metricText?.black;
  const nameSide = outsideSide(layer.attach);
  const along = layer.attach === "top" || layer.attach === "bottom" ? 0 : -90;
  const userLabel = typeof cfg.label === "object" && cfg.label ? cfg.label : {};
  const lengthAuto = lengthTextFallback(cfg, share);
  const hasLengthName = lengthMarks.metricLabel !== undefined && lengthMarks.metricLabel !== false;
  const hasThickName = thickMarks.metricLabel !== undefined && thickMarks.metricLabel !== false;
  const hasWhiteText = whiteMark !== undefined && whiteMark !== false;
  const hasBlackText = blackMark !== undefined && blackMark !== false;
  const lengthTextMark =
    cfg.label === false || lengthMarks.metricText === false
      ? false
      : lengthMarks.metricText !== undefined
        ? lengthMarks.metricText
        : typeof layer.label === "string"
          ? layer.label
          : layer.label?.text
            ? layer.label
            : undefined;

  return {
    lengthLabel: hasLengthName
      ? resolveMark(lengthMarks.metricLabel, "", {
          ...OVERLAY,
          position: "foot",
          rotate: 0,
        })
      : false,
    lengthText:
      lengthTextMark === false || lengthTextMark === undefined
        ? false
        : resolveMark(lengthTextMark, lengthAuto, {
            ...OVERLAY,
            format: userLabel.format,
            position: "cap",
            rotate: 0,
          }),
    thicknessLabel: hasThickName
      ? resolveMark(thickMarks.metricLabel, "", {
          ...OVERLAY,
          position: "outside",
          anchor: "black",
          side: nameSide,
          rotate: along,
        })
      : false,
    countText:
      nMark !== undefined && nMark !== false
        ? resolveMark(nMark, "", {
            ...OVERLAY,
            position: "outside",
            anchor: "white",
            side: nameSide,
            rotate: along,
          })
        : false,
    whiteText: hasWhiteText
      ? resolveMark(whiteMark, "", {
          ...OVERLAY,
          position: "center",
          anchor: "white-mid",
          rotate: along,
        })
      : false,
    blackText: hasBlackText
      ? resolveMark(blackMark, "", {
          ...OVERLAY,
          position: "center",
          anchor: "black-mid",
          rotate: along,
        })
      : false,
  };
}

function applyLayerGap(
  node: HTMLElement,
  attach: AttachSide,
  gap: number,
  overflow: {top: number; right: number; bottom: number; left: number} = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
): void {
  node.style.marginTop = "0";
  node.style.marginRight = "0";
  node.style.marginBottom = "0";
  node.style.marginLeft = "0";
  if (attach === "left") {
    if (overflow.left) node.style.marginLeft = `${overflow.left}px`;
    node.style.marginRight = `${overflow.right + gap}px`;
  } else if (attach === "right") {
    if (overflow.right) node.style.marginRight = `${overflow.right}px`;
    node.style.marginLeft = `${overflow.left + gap}px`;
  } else if (attach === "top") {
    if (overflow.top) node.style.marginTop = `${overflow.top}px`;
    node.style.marginBottom = `${overflow.bottom + gap}px`;
  } else {
    if (overflow.bottom) node.style.marginBottom = `${overflow.bottom}px`;
    node.style.marginTop = `${overflow.top + gap}px`;
  }
}

function labelOverflow(host: HTMLElement): {top: number; right: number; bottom: number; left: number} {
  const pad = {top: 0, right: 0, bottom: 0, left: 0};
  const bar = host.getBoundingClientRect();
  if (bar.width < 1 && bar.height < 1) return pad;
  const labels = host.querySelectorAll<HTMLElement>(".ceb__label");
  for (const label of labels) {
    if (label.hidden) continue;
    if (
      !label.classList.contains("ceb__label--outside") &&
      !label.classList.contains("ceb__label--cap") &&
      !label.classList.contains("ceb__label--foot")
    ) {
      continue;
    }
    const rect = label.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) continue;
    pad.left = Math.max(pad.left, Math.ceil(bar.left - rect.left));
    pad.right = Math.max(pad.right, Math.ceil(rect.right - bar.right));
    pad.top = Math.max(pad.top, Math.ceil(bar.top - rect.top));
    pad.bottom = Math.max(pad.bottom, Math.ceil(rect.bottom - bar.bottom));
  }
  return pad;
}

function orderedLayers<T extends {attach: AttachSide}>(layers: T[], side: AttachSide): T[] {
  if (side === "left" || side === "top") return [...layers].reverse();
  return layers;
}

function evalConfigFrom(cfg: ChessEvalBarConfig): ChessEvalBarConfig {
  const {layers: _l, slots: _sl, hover: _h, ...rest} = cfg;
  return rest;
}

function layerTheme(cfg: ChessEvalBarConfig, layer: BarLayer): ChessEvalBarConfig["theme"] {
  return layer.theme ?? cfg.theme;
}

function defaultLayers(cfg: ChessEvalBarConfig): BarLayer[] {
  if (cfg.layers && cfg.layers.length > 0) return cfg.layers;
  return [{attach: cfg.attach ?? "left", maxThickness: resolveMaxThickness(undefined, cfg)}];
}

export function createLayeredBar(
  container: string | HTMLElement,
  config: ChessEvalBarConfig = {},
): EvalBarApi {
  const root = requireElement(container);
  let cfg: ChessEvalBarConfig = { ...config };
  let userClasses = new Set<string>();

  const evalHost = el("div");
  const evalBar = createEvalBar(evalHost, evalConfigFrom(cfg));
  const baseUpdate = evalBar.update as (patch: Partial<BarRenderConfig>) => EvalBarApi;
  const baseDestroy = evalBar.destroy.bind(evalBar);
  const api = evalBar;
  api.el = root;

  let boardObserver: {disconnect: () => void} | null = null;
  let extraEvalBars: EvalBarApi[] = [];
  let boardElMarked: HTMLElement | null = null;

  function applyHover(node: HTMLElement, hover?: string): void {
    if (hover) {
      node.dataset.hover = hover;
    } else {
      delete node.dataset.hover;
      node.removeAttribute("title");
    }
  }

  function applyUserClassName(next?: string): void {
    for (const cls of userClasses) root.classList.remove(cls);
    userClasses = new Set((next ?? "").split(/\s+/).filter(Boolean));
    for (const cls of userClasses) root.classList.add(cls);
  }

  function getSlot(side: AttachSide): HTMLElement {
    const provided = cfg.slots?.[side];
    if (provided) {
      provided.classList.add("ceb-frame__side", `ceb-frame__side--${side}`);
      return provided;
    }
    let slot = root.querySelector(`:scope > .ceb-frame__side--${side}`) as HTMLElement | null;
    if (!slot) {
      slot = el("div", `ceb-frame__side ceb-frame__side--${side}`);
      root.appendChild(slot);
    }
    return slot;
  }

  function renderStandalone(layer: BarLayer, reuseEval: boolean): HTMLElement {
    const orientation = cfg.orientation ?? orientationFor(layer.attach);
    const lengthPx = barLengthPx(cfg);
    const isEval = layerIsEval(layer);
    const thick = resolveMaxThickness(layer, isEval ? cfg : undefined, isEval ? DEFAULT_MAX_THICKNESS : 16);
    const length = configuredMaxLength(cfg) ?? (resolveBoardElement(cfg.board) ? "auto" : lengthPx);
    if (isEval) {
      const host = reuseEval ? evalHost : el("div");
      const patch = {
        ...evalConfigFrom(cfg),
        theme: layerTheme(cfg, layer),
        orientation,
        maxThickness: thick,
        maxLength: length,
        sideScale: {white: 1, black: 1},
        annotations: undefined,
        hover: layer.hover ?? cfg.hover,
        toMove: layer.toMove ?? cfg.toMove,
      };
      if (reuseEval) baseUpdate(patch);
      else extraEvalBars.push(createEvalBar(host, patch));
      applyHover(host, layer.hover ?? cfg.hover);
      return host;
    }
    const host = reuseEval ? evalHost : el("div");
    const share = layerShare(layer, cfg) ?? 0.5;
    const zeroAt = layerZeroLine(layer, cfg);
    const patch: BarRenderConfig = asNormalizedShare(
      {
        ...evalConfigFrom(cfg),
        theme: layerTheme(cfg, layer),
        orientation,
        maxThickness: thick,
        maxLength: length,
        sideScale: {white: 1, black: 1},
        showZeroLine: cfg.showZeroLine ?? zeroAt !== undefined,
        zeroLineAt: zeroAt ?? 0.5,
        annotations: undefined,
        label: layerLabel(layer),
        hover: layer.hover,
        toMove: layer.toMove ?? cfg.toMove,
      },
      share,
    );
    if (reuseEval) baseUpdate(patch);
    else extraEvalBars.push(createEvalBar(host, patch));
    applyHover(host, layer.hover);
    return host;
  }

  function renderComposite(layer: BarLayer, reuse: boolean): HTMLElement {
    const share = layerShare(layer, cfg) ?? shareNow(cfg);
    const zeroAt = layerZeroLine(layer, cfg);
    const thick = resolveThickness(layer.encoding);
    const sideScale = usesThickness(layer.encoding)
      ? {
          white: encodeShare(thick.white, 1, {map: thick.map, reverse: thick.reverse}),
          black: encodeShare(thick.black, 1, {map: thick.map, reverse: thick.reverse}),
        }
      : {white: 1, black: 1};
    const orientation = cfg.orientation ?? orientationFor(layer.attach);
    const host = reuse ? evalHost : el("div");
    const patch: BarRenderConfig = asNormalizedShare(
      {
        ...evalConfigFrom(cfg),
        theme: layerTheme(cfg, layer),
        orientation,
        maxThickness: resolveMaxThickness(layer, cfg),
        maxLength: configuredMaxLength(cfg) ?? (resolveBoardElement(cfg.board) ? "auto" : barLengthPx(cfg)),
        sideScale,
        showZeroLine: cfg.showZeroLine ?? zeroAt !== undefined,
        zeroLineAt: zeroAt ?? 0.5,
        annotations: buildLayerAnnotations(cfg, layer, layer.annotations, share),
        label: false,
        hover: layer.hover,
        toMove: layer.toMove ?? cfg.toMove,
      },
      share,
    );
    if (reuse) baseUpdate(patch);
    else extraEvalBars.push(createEvalBar(host, patch));
    applyHover(host, layer.hover);
    return host;
  }

  function layout(): void {
    const theme = resolveTheme(cfg.theme);
    const boardEl = resolveBoardElement(cfg.board);
    stripCebClasses(root);
    root.classList.add("ceb-frame", `ceb-theme-${theme.name}`);
    applyUserClassName(cfg.className);
    if (boardElMarked && boardElMarked !== boardEl) {
      boardElMarked.classList.remove("ceb-frame__board");
      boardElMarked = null;
    }
    if (boardEl) {
      boardEl.classList.add("ceb-frame__board");
      boardElMarked = boardEl;
    }
    clearCebVars(root);
    Object.entries(themeToCssVars(theme)).forEach(([k, v]) => root.style.setProperty(k, v));

    extraEvalBars.forEach((bar) => bar.destroy());
    extraEvalBars = [];

    for (const side of SIDES) {
      const slot =
        cfg.slots?.[side] ??
        (root.querySelector(`:scope > .ceb-frame__side--${side}`) as HTMLElement | null);
      if (slot) empty(slot);
    }

    const layers = defaultLayers(cfg);
    const primaryLayer = layers[0];
    const work = layers.map((layer) => ({
      thick: usesThickness(layer.encoding),
      attach: layer.attach,
      gap: layer.gap ?? (usesThickness(layer.encoding) ? 8 : 6),
      layer,
    }));

    for (const side of SIDES) {
      const onSide = work.filter((item) => item.attach === side);
      if (!onSide.length) continue;
      const slot = getSlot(side);
      for (const item of orderedLayers(onSide, side)) {
        const reuse = item.layer === primaryLayer;
        const marks = item.thick || item.layer.annotations !== undefined;
        const node = marks
          ? renderComposite(item.layer, reuse)
          : renderStandalone(item.layer, reuse);
        slot.appendChild(node);
        applyLayerGap(node, side, item.gap, labelOverflow(node));
      }
    }
  }

  function syncBoardObserver(): void {
    boardObserver?.disconnect();
    boardObserver = null;
    const boardEl = resolveBoardElement(cfg.board);
    const tracksBoard = tracksBoardLength(cfg, Boolean(boardEl));
    if (
      tracksBoard &&
      boardEl &&
      typeof ResizeObserver !== "undefined"
    ) {
      boardObserver = observeSize(boardEl, () => layout());
    }
  }

  api.resize = () => {
    layout();
    return api;
  };
  api.update = (patch) => {
    cfg = {
      ...cfg,
      ...patch,
      encoding: mergeEncoding(cfg.encoding, patch.encoding) ?? patch.encoding ?? cfg.encoding,
    };
    const nextValue = patch.encoding?.length?.value;
    if (
      typeof nextValue === "number" &&
      !("layers" in patch) &&
      cfg.layers?.length
    ) {
      cfg.layers = withPrimaryLayerValue(cfg.layers, nextValue);
    }
    layout();
    if (
      "board" in patch ||
      "slots" in patch ||
      "maxLength" in patch
    ) {
      syncBoardObserver();
    }
    return api;
  };
  api.destroy = () => {
    hideHoverTooltip(root);
    boardObserver?.disconnect();
    boardObserver = null;
    extraEvalBars.forEach((bar) => bar.destroy());
    extraEvalBars = [];
    baseDestroy();
    for (const side of SIDES) {
      const provided = cfg.slots?.[side];
      const slot = provided ?? (root.querySelector(`:scope > .ceb-frame__side--${side}`) as HTMLElement | null);
      if (!slot) continue;
      empty(slot);
      if (!provided) slot.remove();
      else {
        slot.classList.remove("ceb-frame__side", `ceb-frame__side--${side}`);
      }
    }
    if (boardElMarked) {
      boardElMarked.classList.remove("ceb-frame__board");
      boardElMarked = null;
    }
    stripCebClasses(root);
    applyUserClassName(undefined);
    clearCebVars(root);
  };

  layout();
  syncBoardObserver();
  return api;
}
