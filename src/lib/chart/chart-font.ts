export const CHART_FONT = "IBM Plex Sans";
export const FONT_BODY = 400;
export const FONT_RANK = 600;

export function isRankLine(line: string): boolean {
  return /^[PN][1-6]$/.test(line);
}

export function chartFontCss(
  weight: number = FONT_BODY,
  px: number,
): string {
  return `${weight} ${px}px "${CHART_FONT}"`;
}

let cachedFace = "";

export async function chartFontFaceCss(): Promise<string> {
  if (cachedFace) return cachedFace;
  try {
    const res = await fetch("/fonts/IBMPlexSans.woff2");
    if (!res.ok) throw new Error("font");
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    cachedFace = `@font-face{font-family:"IBM Plex Sans";font-style:normal;font-weight:100 700;src:url(data:font/woff2;base64,${btoa(binary)}) format("woff2");}`;
  } catch {
    cachedFace = `@font-face{font-family:"IBM Plex Sans";src:local("IBM Plex Sans");font-weight:100 700;}`;
  }
  return cachedFace;
}

export const SVG_FONT =
  `font-family="IBM Plex Sans" font-variant-numeric="tabular-nums lining-nums"`;
