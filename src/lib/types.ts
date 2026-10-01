export type Side = "white" | "black";
export type Orientation = "vertical" | "horizontal";
export type AttachSide = "left" | "right" | "top" | "bottom";
export type WhiteOn = "bottom" | "top" | "left" | "right";
export type ThemeName =
  | "classic"
  | "lichess"
  | "chesscom"
  | "midnight"
  | "broadcast"
  | "high-contrast";
export type MapFn = (normalized: number) => number;

export interface ThicknessReading {
  value: number;
  min?: number;
  max?: number;
}

export type ThicknessShare = number | ThicknessReading;

export interface LengthEncoding {
  value?: number;
  min?: number;
  max?: number;
  map?: MapFn;
  reverse?: boolean;
}

export interface ThicknessEncoding {
  white?: ThicknessShare;
  black?: ThicknessShare;
  map?: MapFn;
  reverse?: boolean;
}

export interface BarEncoding {
  length?: LengthEncoding;
  thickness?: ThicknessEncoding;
}

export type MetricMark = boolean | string | LabelConfig;

export interface LengthMarks {
  metricLabel?: MetricMark;
  metricText?: MetricMark;
}

export interface ThicknessMarks {
  metricLabel?: MetricMark;
  metricText?: {
    white?: MetricMark;
    black?: MetricMark;
  };
}

export interface LayerAnnotations {
  length?: LengthMarks;
  thickness?: ThicknessMarks;
  n?: {
    metricText?: MetricMark;
  };
}

export interface BarLayer {
  attach: AttachSide;
  maxThickness?: number;
  gap?: number;
  encoding?: BarEncoding;
  label?: string | LabelConfig;
  hover?: string;
  annotations?: LayerAnnotations;
  theme?: ThemeName | Partial<Theme>;
  toMove?: Side;
}

export interface FrameSlots {
  top?: HTMLElement | null;
  left?: HTMLElement | null;
  right?: HTMLElement | null;
  bottom?: HTMLElement | null;
}

export type LabelFormat = "percent" | "none";
export type LabelPosition = "auto" | "outside" | "end" | "center" | "cap" | "foot";
export type LabelAnchor = "white" | "advantage" | "black" | "white-mid" | "black-mid" | "to-move";
export type LabelSide = "left" | "right" | "top" | "bottom";
export type LabelRotate = number | "auto";

export interface LabelConfig {
  text?: string;
  format?: LabelFormat;
  position?: LabelPosition;
  anchor?: LabelAnchor;
  side?: LabelSide;
  rotate?: LabelRotate;
  offset?: { x?: number; y?: number };
  inset?: number;
  fontSize?: number | string;
  fontWeight?: number | string;
  fontFamily?: string;
  color?: string;
  hover?: string;
}

export interface Theme {
  name: ThemeName | string;
  white: string;
  black: string;
  track?: string;
  border?: string;
  zeroLine?: string;
  labelColor?: string;
  labelOnWhite?: string;
  labelOnBlack?: string;
  fontFamily?: string;
  radius?: number;
}

export type BoardRef = string | HTMLElement;

export interface ChessEvalBarConfig {
  encoding?: BarEncoding;
  orientation?: Orientation;
  flipBoard?: boolean;
  maxLength?: number | "auto";
  maxThickness?: number;
  board?: BoardRef;
  attach?: AttachSide;
  label?: boolean | LabelConfig;
  hover?: string;
  theme?: ThemeName | Partial<Theme>;
  showZeroLine?: boolean;
  animate?: boolean | number;
  className?: string;
  ariaLabel?: string;
  layers?: BarLayer[];
  slots?: FrameSlots;
  toMove?: Side;
}

export interface EvalBarApi {
  el: HTMLElement;
  resize: () => EvalBarApi;
  update: (patch: Partial<ChessEvalBarConfig>) => EvalBarApi;
  destroy: () => void;
}
