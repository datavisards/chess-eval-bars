export function parseRgb(input: string): {r: number; g: number; b: number} | null {
  const s = input.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    } else {
      h = h.slice(0, 6);
    }
    const n = parseInt(h, 16);
    if (!Number.isFinite(n)) return null;
    return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i.exec(s);
  if (rgb) return {r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3])};
  return null;
}

export function relativeLuminance(rgb: {r: number; g: number; b: number}): number {
  const lin = (c: number) => {
    const s = Math.max(0, Math.min(255, c)) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function inkOn(background: string, fallback = "#111"): string {
  const rgb = parseRgb(background);
  if (!rgb) return fallback;
  return relativeLuminance(rgb) > 0.179 ? "#111" : "#fff"; // equal WCAG contrast of #000 vs #fff
}

function contrastRatio(fg: string, bg: string): number {
  const a = parseRgb(fg);
  const b = parseRgb(bg);
  if (!a || !b) return 0;
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

export function inkOnBoth(white: string, black: string): string {
  const dark = "#111";
  const light = "#fff";
  const darkMin = Math.min(contrastRatio(dark, white), contrastRatio(dark, black));
  const lightMin = Math.min(contrastRatio(light, white), contrastRatio(light, black));
  return darkMin >= lightMin ? dark : light;
}
