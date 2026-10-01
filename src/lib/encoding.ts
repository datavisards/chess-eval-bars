import type {BarEncoding, LengthEncoding, ThicknessEncoding} from "./types";

type Encoded = {encoding?: BarEncoding};

export function resolveLength(primary: Encoded, fallback?: Encoded): LengthEncoding {
  const a = primary.encoding?.length;
  const b = fallback?.encoding?.length;
  return {
    value: a?.value ?? b?.value,
    min: a?.min ?? b?.min,
    max: a?.max ?? b?.max,
    map: a?.map ?? b?.map,
    reverse: a?.reverse ?? b?.reverse,
  };
}

export function resolveThickness(encoding?: BarEncoding): ThicknessEncoding {
  return encoding?.thickness ?? {};
}

export function lengthHasValue(source: Encoded): boolean {
  return typeof resolveLength(source).value === "number";
}

export function usesThickness(encoding?: BarEncoding): boolean {
  const t = encoding?.thickness;
  return t !== undefined && (t.white !== undefined || t.black !== undefined);
}

export function mergeEncoding(base?: BarEncoding, patch?: BarEncoding): BarEncoding | undefined {
  if (patch === undefined) return base;
  if (base === undefined) return patch;
  const length = base.length || patch.length ? {...base.length, ...patch.length} : undefined;
  const thickness =
    "thickness" in patch
      ? patch.thickness
        ? {...base.thickness, ...patch.thickness}
        : undefined
      : base.thickness;
  if (!length && !thickness) return undefined;
  return thickness ? {length, thickness} : {length};
}

export function withLengthValue(encoding: BarEncoding | undefined, value: number): BarEncoding {
  return {
    ...encoding,
    length: {...encoding?.length, value},
  };
}
