import { clamp, encode, encodeShare, zeroLineAt } from "./fill";
import { mergeEncoding, resolveLength, resolveThickness, usesThickness } from "./encoding";
import {
  applyDataset,
  boardSize,
  clearCebVars,
  el,
  observeSize,
  requireElement,
  resolveElement,
  setVars,
  stripCebClasses,
  teardownBoardAttach,
  wrapWithLayout,
} from "./dom";
import {
  configuredMaxLength,
  configuredMaxThickness,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_THICKNESS,
  tracksBoardLength,
} from "./layout";
import { resolveTheme, themeToCssVars } from "./themes";
import { hideHoverTooltip, installHoverTooltips } from "./tooltip";
import type {
  BoardRef,
  ChessEvalBarConfig,
  EvalBarApi,
  LabelConfig,
  Orientation,
  Theme,
  WhiteOn,
} from "./types";
import type { BarRenderConfig } from "./render";
import { applyLabel, labelText, normalizeLabel } from "./label";

const DEFAULTS = {
  orientation: "vertical" as Orientation,
  maxThickness: DEFAULT_MAX_THICKNESS,
  animate: 280,
};

function segmentMids(share: number, whiteOn: WhiteOn): {white: number; black: number} {
  const whiteFirst = whiteOn === "top" || whiteOn === "left";
  if (whiteFirst) {
    return {
      white: share / 2,
      black: share + (1 - share) / 2,
    };
  }
  return {
    black: (1 - share) / 2,
    white: 1 - share / 2,
  };
}

function applyAnnotation(
  node: HTMLElement,
  root: HTMLElement,
  spec: LabelConfig | false | undefined,
  fallback: string,
  opts: {
    orientation: Orientation;
    whiteOn: WhiteOn;
    onWhite: boolean;
    thickness: number;
    mids: {white: number; black: number};
    className: string;
    toMove?: "white" | "black";
  },
): void {
  if (!spec) {
    node.hidden = true;
    node.textContent = "";
    node.removeAttribute("style");
    node.className = opts.className;
    delete node.dataset.hover;
    return;
  }
  applyLabel(node, root, {
    label: spec,
    text: spec.text ?? fallback,
    orientation: opts.orientation,
    whiteOn: opts.whiteOn,
    onWhite: opts.onWhite,
    thickness: opts.thickness,
    mids: opts.mids,
    className: opts.className,
    reserveSpace: false,
    toMove: opts.toMove,
  });
}

function resolveWhiteOn(
  config: BarRenderConfig,
  orientation: Orientation,
): WhiteOn {
  const flipped = Boolean(config.flipBoard);
  if (orientation === "vertical") return flipped ? "top" : "bottom";
  return flipped ? "right" : "left";
}

function resolveBoardElement(board?: BoardRef): HTMLElement | null {
  return board ? resolveElement(board) : null;
}

function lengthFromBoard(config: BarRenderConfig): number | undefined {
  const boardEl = resolveBoardElement(config.board);
  if (boardEl) return boardSize(boardEl);
  return undefined;
}

export function createEvalBar(
  container: string | HTMLElement,
  config: BarRenderConfig = {},
): EvalBarApi {
  const root = requireElement(container);
  installHoverTooltips();
  let cfg: BarRenderConfig = { ...config };
  let userClasses = new Set<string>();

  const track = el("div", "ceb__track");
  const clip = el("div", "ceb__clip");
  const blackFill = el("div", "ceb__fill ceb__fill--black");
  const whiteFill = el("div", "ceb__fill ceb__fill--white");
  const zeroTick = el("div", "ceb__tick ceb__tick--zero");
  const labelEl = el("div", "ceb__label");
  const lengthNameEl = el("div", "ceb__caption ceb__caption--length");
  const thickNameEl = el("div", "ceb__caption ceb__caption--thickness");
  const countTextEl = el("div", "ceb__caption ceb__caption--count");
  const whiteTextEl = el("div", "ceb__seg-label ceb__seg-label--white");
  const blackTextEl = el("div", "ceb__seg-label ceb__seg-label--black");
  clip.append(blackFill, whiteFill, zeroTick);
  track.append(clip, labelEl, lengthNameEl, thickNameEl, countTextEl, whiteTextEl, blackTextEl);
  root.replaceChildren(track);

  let share = 0.5;
  let observer: {disconnect: () => void} | null = null;
  let theme: Theme = resolveTheme(cfg.theme);

  function applyUserClassName(next?: string): void {
    for (const cls of userClasses) root.classList.remove(cls);
    userClasses = new Set((next ?? "").split(/\s+/).filter(Boolean));
    for (const cls of userClasses) root.classList.add(cls);
  }

  const api: EvalBarApi = {
    el: root,
    resize() {
      render();
      return api;
    },
    update(patch) {
      const next = patch as BarRenderConfig;
      cfg = {
        ...cfg,
        ...next,
        encoding: mergeEncoding(cfg.encoding, next.encoding) ?? next.encoding ?? cfg.encoding,
      };
      if ("board" in patch || "maxLength" in patch) {
        syncObserver();
      }
      render();
      return api;
    },
    destroy() {
      hideHoverTooltip(root);
      observer?.disconnect();
      observer = null;
      root.replaceChildren();
      stripCebClasses(root);
      applyUserClassName(undefined);
      clearCebVars(root);
      root.removeAttribute("role");
      root.removeAttribute("aria-label");
      for (const key of [...Object.keys(root.dataset)]) {
        delete root.dataset[key];
      }
    },
  };

  function syncObserver() {
    observer?.disconnect();
    observer = null;
    const boardEl = resolveBoardElement(cfg.board);
    const tracksBoard = tracksBoardLength(cfg, Boolean(boardEl));
    if (
      tracksBoard &&
      boardEl &&
      typeof ResizeObserver !== "undefined"
    ) {
      observer = observeSize(boardEl, () => render());
    }
  }

  function render() {
    theme = resolveTheme(cfg.theme);
    const orientation = cfg.orientation ?? DEFAULTS.orientation;
    const whiteOn = resolveWhiteOn(cfg, orientation);
    const label = normalizeLabel(cfg.label);
    const boardLen = lengthFromBoard(cfg);
    const size = configuredMaxLength(cfg);
    const length =
      size === "auto" || (size === undefined && boardLen)
        ? boardLen ?? DEFAULT_MAX_LENGTH
        : typeof size === "number"
          ? size
          : DEFAULT_MAX_LENGTH;
    const thickness = configuredMaxThickness(cfg) ?? DEFAULTS.maxThickness;
    const animate = cfg.animate ?? DEFAULTS.animate;
    const ch = resolveLength(cfg);
    const min = ch.min ?? 0;
    const max = ch.max ?? 1;

    share =
      typeof ch.value === "number"
        ? encode(ch.value, min, max, {map: ch.map, reverse: ch.reverse})
        : 0.5;

    const whitePct = `${(share * 100).toFixed(3)}%`;
    const blackPct = `${((1 - share) * 100).toFixed(3)}%`;
    const thick = resolveThickness(cfg.encoding);
    const fromEncoding = usesThickness(cfg.encoding)
      ? {
          white: encodeShare(thick.white, 1, {map: thick.map, reverse: thick.reverse}),
          black: encodeShare(thick.black, 1, {map: thick.map, reverse: thick.reverse}),
        }
      : undefined;
    const whiteCross = cfg.sideScale?.white ?? fromEncoding?.white ?? 1;
    const blackCross = cfg.sideScale?.black ?? fromEncoding?.black ?? 1;
    const mids = segmentMids(share, whiteOn);
    const onWhite = share >= 0.5;
    const anns = cfg.annotations;
    const lengthTextCfg: LabelConfig | false =
      anns && Object.prototype.hasOwnProperty.call(anns, "lengthText")
        ? anns.lengthText ?? false
        : label;
    const text = lengthTextCfg ? labelText(share, lengthTextCfg) : "";

    stripCebClasses(root);
    const managed = [
      "ceb",
      `ceb--${orientation}`,
      `ceb--white-${whiteOn}`,
      `ceb-theme-${theme.name}`,
      animate === false || animate === 0 ? "ceb--no-animate" : "",
      whiteCross < 0.999 || blackCross < 0.999 ? "ceb--cross-scale" : "",
    ].filter(Boolean);
    for (const cls of managed) root.classList.add(cls);
    applyUserClassName(cfg.className);

    const autoZero = zeroLineAt(min, max, {map: ch.map, reverse: ch.reverse});
    const zeroAt = cfg.zeroLineAt ?? autoZero ?? 0.5;
    const showZero = cfg.showZeroLine ?? autoZero !== undefined;

    setVars(root, {
      ...themeToCssVars(theme),
      "--ceb-length": `${length}px`,
      "--ceb-thickness": `${thickness}px`,
      "--ceb-white-pct": whitePct,
      "--ceb-black-pct": blackPct,
      "--ceb-white-cross": `${(whiteCross * 100).toFixed(1)}%`,
      "--ceb-black-cross": `${(blackCross * 100).toFixed(1)}%`,
      "--ceb-white-mid": `${(mids.white * 100).toFixed(2)}%`,
      "--ceb-black-mid": `${(mids.black * 100).toFixed(2)}%`,
      "--ceb-zero-at": `${(clamp(zeroAt, 0, 1) * 100).toFixed(3)}%`,
      "--ceb-anim": typeof animate === "number" ? `${animate}ms` : "280ms",
      "--ceb-radius": themeToCssVars(theme)["--ceb-radius"],
    });

    zeroTick.hidden = !showZero;
    const place = {
      orientation,
      whiteOn,
      onWhite,
      thickness,
      mids,
    };
    if (!lengthTextCfg) {
      labelEl.hidden = true;
      labelEl.textContent = "";
    } else {
      applyLabel(labelEl, root, {
        label: lengthTextCfg,
        text,
        ...place,
        toMove: cfg.toMove,
      });
    }
    const marked = {...place, toMove: cfg.toMove};
    applyAnnotation(lengthNameEl, root, anns?.lengthLabel, "", {
      ...marked,
      className: "ceb__caption ceb__caption--length",
    });
    applyAnnotation(thickNameEl, root, anns?.thicknessLabel, "", {
      ...marked,
      className: "ceb__caption ceb__caption--thickness",
    });
    applyAnnotation(countTextEl, root, anns?.countText, "", {
      ...marked,
      className: "ceb__caption ceb__caption--count",
    });
    applyAnnotation(whiteTextEl, root, anns?.whiteText, "", {
      ...marked,
      onWhite: true,
      className: "ceb__seg-label ceb__seg-label--white",
    });
    applyAnnotation(blackTextEl, root, anns?.blackText, "", {
      ...marked,
      onWhite: false,
      className: "ceb__seg-label ceb__seg-label--black",
    });

    root.setAttribute("role", "img");
    root.setAttribute(
      "aria-label",
      cfg.ariaLabel ?? `Bar ${Math.round(share * 100)}%`,
    );
    applyDataset(root, {
      share: share.toFixed(4),
      orientation,
      whiteOn,
      hover: cfg.hover,
    });
  }

  syncObserver();
  render();
  return api;
}

export function attachEvalBarToBoard(
  board: string | HTMLElement,
  config: ChessEvalBarConfig = {},
): EvalBarApi {
  const boardEl = requireElement(board, "board");
  const attach = config.attach ?? "left";
  const vertical = attach === "left" || attach === "right";
  const layout = wrapWithLayout(
    boardEl,
    `ceb-layout ceb-layout--${vertical ? "row" : "column"}`,
  );
  const barRoot = el("div", "ceb-layout__slot");
  if (attach === "left" || attach === "top") layout.insertBefore(barRoot, boardEl);
  else layout.appendChild(barRoot);
  boardEl.classList.add("ceb-layout__board");

  const bar = createEvalBar(barRoot, {
    ...config,
    orientation: config.orientation ?? (vertical ? "vertical" : "horizontal"),
    board: boardEl,
    maxLength: configuredMaxLength(config) ?? "auto",
  });
  const baseDestroy = bar.destroy.bind(bar);
  bar.destroy = () => {
    baseDestroy();
    teardownBoardAttach(layout, boardEl, barRoot);
  };
  return bar;
}
