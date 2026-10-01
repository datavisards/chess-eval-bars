import type {
  LabelAnchor,
  LabelConfig,
  LabelPosition,
  LabelSide,
  Orientation,
  WhiteOn,
} from "./types";

type ResolvedLabelPosition = "end" | "center" | "outside" | "cap" | "foot";

const DEFAULT_INSET = 8;

const DEFAULT_LABEL: LabelConfig = {
  format: "percent",
  position: "auto",
  anchor: "advantage",
  rotate: "auto",
  side: undefined,
};

export function normalizeLabel(label: boolean | LabelConfig | undefined): LabelConfig | false {
  if (label === false) return false;
  if (label === true || label === undefined) return { ...DEFAULT_LABEL };
  return {
    ...DEFAULT_LABEL,
    ...label,
    format: label.format ?? "percent",
    position: label.position ?? "auto",
    anchor: label.anchor ?? "advantage",
    rotate: label.rotate ?? "auto",
  };
}

export function labelText(fill: number, label: LabelConfig): string {
  if (label.text !== undefined) return label.text;
  if (label.format === "none") return "";
  return `${Math.round(fill * 100)}%`;
}

export function resolveMark(
  mark: boolean | string | LabelConfig | undefined,
  autoText: string,
  defaults: LabelConfig,
): LabelConfig | false {
  if (mark === false || mark === undefined) return false;
  const extra: LabelConfig = typeof mark === "string" ? {text: mark} : typeof mark === "object" ? mark : {};
  return {
    ...defaults,
    ...extra,
    text: extra.text ?? autoText,
  };
}

export function resolveRotate(
  rotate: LabelConfig["rotate"],
  orientation: Orientation,
  position: ResolvedLabelPosition,
  anchor?: LabelAnchor,
): number {
  if (rotate === "auto" || rotate === undefined) {
    const alongBar = anchor === "white-mid" || anchor === "black-mid";
    if (position === "cap" || position === "foot") return alongBar && orientation === "vertical" ? -90 : 0;
    if (position === "outside") return orientation === "vertical" ? -90 : 0;
    return orientation === "vertical" ? -90 : 0;
  }
  return rotate;
}

function defaultOutsideSide(orientation: Orientation, explicit?: LabelSide): LabelSide {
  if (orientation === "vertical") {
    if (explicit === "left" || explicit === "right") return explicit;
    return "right";
  }
  if (explicit === "top" || explicit === "bottom") return explicit;
  return "bottom";
}

function whiteAtStart(orientation: Orientation, whiteOn: WhiteOn): boolean {
  return orientation === "vertical" ? whiteOn === "bottom" : whiteOn === "left";
}

function placedAnchor(anchor: LabelAnchor, toMove?: "white" | "black"): LabelAnchor {
  if (anchor !== "to-move") return anchor;
  return toMove === "black" ? "black" : "white";
}

function atWhiteEnd(
  orientation: Orientation,
  whiteOn: WhiteOn,
  anchor: LabelAnchor,
  onWhite: boolean,
): boolean {
  if (anchor === "advantage") return onWhite;
  if (anchor === "white") return whiteAtStart(orientation, whiteOn);
  if (anchor === "black") return !whiteAtStart(orientation, whiteOn);
  return whiteAtStart(orientation, whiteOn);
}

function usesFillInk(position: ResolvedLabelPosition): boolean {
  return position === "end";
}

function cssSize(value: number | string | undefined, fallback: string): string {
  if (value === undefined) return fallback;
  return typeof value === "number" ? `${value}px` : value;
}

function rotatedAabb(width: number, height: number, deg: number): {width: number; height: number} {
  const r = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

function applyTypography(el: HTMLElement, label: LabelConfig): void {
  el.style.fontSize = cssSize(label.fontSize, "11px");
  if (label.fontWeight !== undefined) el.style.fontWeight = String(label.fontWeight);
  if (label.fontFamily) el.style.fontFamily = label.fontFamily;
  if (label.color) el.style.color = label.color;
}

function measureUnrotated(el: HTMLElement, label: LabelConfig, text: string): {width: number; height: number} {
  void el.offsetWidth;
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  if (width > 0 && height > 0) return {width, height};
  const fs = typeof label.fontSize === "number"
    ? label.fontSize
    : parseFloat(String(label.fontSize ?? 11)) || 11;
  const chars = (text || el.textContent || "").length || 4;
  return {width: chars * fs * 0.62 + 8, height: fs + 4};
}

export function applyLabel(
  el: HTMLElement,
  root: HTMLElement,
  opts: {
    label: LabelConfig;
    text: string;
    orientation: Orientation;
    whiteOn: WhiteOn;
    onWhite: boolean;
    thickness: number;
    mids?: {white: number; black: number};
    reserveSpace?: boolean;
    className?: string;
    toMove?: "white" | "black";
  },
): ResolvedLabelPosition {
  const { label, orientation, whiteOn, onWhite, thickness } = opts;
  const text = label.text ?? opts.text;
  const allowReserve = opts.reserveSpace !== false;
  const mids = opts.mids ?? {white: 0.75, black: 0.25};
  const anchor = placedAnchor(label.anchor ?? "advantage", opts.toMove);

  el.removeAttribute("style");
  el.className = ["ceb__label", opts.className ?? ""].filter(Boolean).join(" ");

  el.textContent = text;

  el.hidden = !text;
  if (el.hidden) {
    root.classList.remove("ceb--label-outside", "ceb--label-outside-start");
    return "end";
  }

  applyTypography(el, label);
  el.style.transform = "none";

  const measured = measureUnrotated(el, label, text);
  const rawW = measured.width;
  const rawH = measured.height;

  let position = (label.position ?? "auto") as LabelPosition | ResolvedLabelPosition;

  const tryInside: ResolvedLabelPosition = position === "center" ? "center" : "end";
  const rotateInside = resolveRotate(label.rotate, orientation, tryInside, anchor);
  const cross = orientation === "vertical"
    ? rotatedAabb(rawW, rawH, rotateInside).width
    : rotatedAabb(rawW, rawH, rotateInside).height;

  if (position === "auto") {
    const fits = cross === 0 || cross <= thickness - 2;
    position = fits ? tryInside : "outside";
  }

  const resolved = position as ResolvedLabelPosition;
  const rotate = resolveRotate(label.rotate, orientation, resolved, anchor);
  const side = defaultOutsideSide(orientation, label.side);
  const aabb = rotatedAabb(rawW, rawH, rotate);
  paintBox(el, label, {
    orientation,
    whiteOn,
    onWhite,
    position: resolved,
    rotate,
    side,
    aabb,
    mids,
    anchor,
  });

  el.classList.add(`ceb__label--${resolved}`);
  el.classList.add(`ceb__label--${anchor}`);
  if (usesFillInk(resolved)) {
    const onFillWhite =
      anchor === "white" || anchor === "white-mid"
        ? true
        : anchor === "black" || anchor === "black-mid"
          ? false
          : onWhite;
    el.classList.add(onFillWhite ? "ceb__label--on-white" : "ceb__label--on-black");
  }
  el.style.setProperty("--ceb-label-rot", `${rotate}deg`);
  if (label.hover) {
    el.dataset.hover = label.hover;
  } else {
    delete el.dataset.hover;
  }
  if (allowReserve && resolved === "outside") {
    root.classList.add("ceb--label-outside");
    const startSide = side === "left" || side === "top";
    root.classList.toggle("ceb--label-outside-start", startSide);
  } else {
    root.classList.remove("ceb--label-outside", "ceb--label-outside-start");
  }
  return resolved;
}

function paintBox(
  el: HTMLElement,
  label: LabelConfig,
  layout: {
    orientation: Orientation;
    whiteOn: WhiteOn;
    onWhite: boolean;
    position: ResolvedLabelPosition;
    rotate: number;
    side: LabelSide;
    aabb: {width: number; height: number};
    mids: {white: number; black: number};
    anchor: LabelAnchor;
  },
): void {
  const inset = label.inset ?? DEFAULT_INSET;
  const ox = label.offset?.x ?? 0;
  const oy = label.offset?.y ?? 0;
  const endAnchor: LabelAnchor =
    layout.anchor === "white-mid" || layout.anchor === "black-mid" ? "advantage" : layout.anchor;
  const whiteEnd = atWhiteEnd(
    layout.orientation,
    layout.whiteOn,
    endAnchor,
    layout.onWhite,
  );
  const halfW = (layout.aabb.width || 12) / 2;
  const halfH = (layout.aabb.height || 12) / 2;
  const midPct =
    layout.anchor === "white-mid"
      ? layout.mids.white * 100
      : layout.anchor === "black-mid"
        ? layout.mids.black * 100
        : null;

  applyTypography(el, label);

  el.style.right = "auto";
  el.style.bottom = "auto";
  el.style.transformOrigin = "center center";

  let top: string;
  let left: string;

  if (midPct !== null) {
    if (layout.position === "outside") {
      if (layout.orientation === "vertical") {
        top = `${midPct}%`;
        left =
          layout.side === "left"
            ? `calc(0% - ${inset + halfW}px)`
            : `calc(100% + ${inset + halfW}px)`;
      } else {
        left = `${midPct}%`;
        top =
          layout.side === "top"
            ? `calc(0% - ${inset + halfH}px)`
            : `calc(100% + ${inset + halfH}px)`;
      }
    } else if (layout.orientation === "vertical") {
      top = `${midPct}%`;
      left = "50%";
    } else {
      left = `${midPct}%`;
      top = "50%";
    }
  } else if (layout.position === "center") {
    const half =
      layout.anchor === "white" ? layout.mids.white : layout.anchor === "black" ? layout.mids.black : null;
    if (half !== null && layout.orientation === "vertical") {
      top = `${(half * 100).toFixed(2)}%`;
      left = "50%";
    } else if (half !== null) {
      left = `${(half * 100).toFixed(2)}%`;
      top = "50%";
    } else {
      top = "50%";
      left = "50%";
    }
  } else if (layout.position === "outside") {
    if (layout.orientation === "vertical") {
      top = whiteEnd
        ? `calc(100% - ${inset + halfH}px)`
        : `${inset + halfH}px`;
      left =
        layout.side === "left"
          ? `calc(0% - ${inset + halfW}px)`
          : `calc(100% + ${inset + halfW}px)`;
    } else {
      left = whiteEnd
        ? `${inset + halfW}px`
        : `calc(100% - ${inset + halfW}px)`;
      top =
        layout.side === "top"
          ? `calc(0% - ${inset + halfH}px)`
          : `calc(100% + ${inset + halfH}px)`;
    }
  } else if (layout.position === "cap" || layout.position === "foot") {
    const atWhite =
      layout.anchor === "white" ? true : layout.anchor === "black" ? false : layout.position === "foot";
    if (layout.orientation === "vertical") {
      left = "50%";
      const whiteAtBottom = layout.whiteOn === "bottom";
      const pastWhite = whiteAtBottom
        ? `calc(100% + ${inset + halfH}px)`
        : `calc(0% - ${inset + halfH}px)`;
      const pastBlack = whiteAtBottom
        ? `calc(0% - ${inset + halfH}px)`
        : `calc(100% + ${inset + halfH}px)`;
      top = atWhite ? pastWhite : pastBlack;
    } else {
      top = "50%";
      const whiteAtLeft = layout.whiteOn === "left";
      const pastWhite = whiteAtLeft
        ? `calc(0% - ${inset + halfW}px)`
        : `calc(100% + ${inset + halfW}px)`;
      const pastBlack = whiteAtLeft
        ? `calc(100% + ${inset + halfW}px)`
        : `calc(0% - ${inset + halfW}px)`;
      left = atWhite ? pastWhite : pastBlack;
    }
  } else if (layout.orientation === "vertical") {
    left = "50%";
    top = whiteEnd
      ? `calc(100% - ${inset + halfH}px)`
      : `${inset + halfH}px`;
  } else {
    top = "50%";
    left = whiteEnd
      ? `${inset + halfW}px`
      : `calc(100% - ${inset + halfW}px)`;
  }

  el.style.top = top;
  el.style.left = left;
  el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) rotate(${layout.rotate}deg)`;
}
