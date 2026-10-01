import type { ChessEvalBarConfig, LabelConfig } from "./types";

export type BarRenderConfig = ChessEvalBarConfig & {
  sideScale?: { white?: number; black?: number };
  annotations?: {
    lengthLabel?: LabelConfig | false;
    lengthText?: LabelConfig | false;
    thicknessLabel?: LabelConfig | false;
    countText?: LabelConfig | false;
    whiteText?: LabelConfig | false;
    blackText?: LabelConfig | false;
  };
  zeroLineAt?: number;
};
