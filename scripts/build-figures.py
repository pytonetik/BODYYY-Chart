#!/usr/bin/env python3
"""Build black/white glow+sketch plates from the attached 4-view PNG."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("/workspace/attachments/1000323344.jpg")
OUT = Path("/workspace/public/figures")

FIGURE_SIZE = {
    "anterior": (368, 831),
    "posterior": (364, 831),
    "left": (154, 834),
    "right": (154, 832),
}
ORDER = ["anterior", "posterior", "left", "right"]
VIEW_H = 1600  # longest side target per view
PLATE = (1920, 1183)  # matches current display plate

# Layout fractions copied from geometry.ts so the composite maps 1:1 onto PLATE.
FIGURE_H = 760
VIEW_GAP = 36
LABEL_H = 32
SIDE_FRAC = 0.22
VERT_FRAC = 0.16
VIEW_ASPECT = {
    "anterior": 368 / 831,
    "posterior": 364 / 831,
    "left": 154 / 834,
    "right": 154 / 832,
}


def plate_slots(pw: int, ph: int):
    row_w = sum(FIGURE_H * VIEW_ASPECT[i] for i in ORDER) + VIEW_GAP * 3
    plate_w = row_w / (1 - 2 * SIDE_FRAC)
    plate_h = (FIGURE_H + LABEL_H) / (1 - 2 * VERT_FRAC)
    sx, sy = pw / plate_w, ph / plate_h
    x = plate_w * SIDE_FRAC * sx
    y = plate_h * VERT_FRAC * sy
    h = FIGURE_H * sy
    slots = {}
    for i in ORDER:
        w = FIGURE_H * VIEW_ASPECT[i] * sx
        slots[i] = (x, y, w, h)
        x += w + VIEW_GAP * sx
    return slots


def upscale(img: Image.Image, factor: float) -> Image.Image:
    w, h = img.size
    return img.resize((max(1, round(w * factor)), max(1, round(h * factor))), Image.Resampling.LANCZOS)


def clean_halo(gray: np.ndarray) -> np.ndarray:
    """Force exterior to pure black; keep interior line detail; kill grey fog."""
    h, w = gray.shape
    lum = gray.astype(np.uint8)
    vis = np.zeros((h, w), dtype=np.uint8)
    stack_y = [0, 0, h - 1, h - 1]
    stack_x = [0, w - 1, 0, w - 1]
    # seed entire border
    for x in range(w):
        stack_y.extend((0, h - 1))
        stack_x.extend((x, x))
    for y in range(h):
        stack_y.extend((y, y))
        stack_x.extend((0, w - 1))
    while stack_x:
        x = stack_x.pop()
        y = stack_y.pop()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x]:
            continue
        if lum[y, x] > 26:
            continue
        vis[y, x] = 1
        stack_y.extend((y - 1, y + 1, y, y))
        stack_x.extend((x, x, x - 1, x + 1))

    vis_b = vis.astype(bool)
    halo = vis_b.copy()
    halo[1:-1, 1:-1] |= vis_b[:-2, 1:-1] | vis_b[2:, 1:-1] | vis_b[1:-1, :-2] | vis_b[1:-1, 2:]
    fringe = halo & ~vis_b & (lum < 70)
    exterior = vis_b | fringe

    out = lum.astype(np.float32)
    out[exterior] = 0
    interior = ~exterior
    line = interior & (lum >= 18)
    boosted = np.clip((lum[line].astype(np.float32) - 12) * (255.0 / 200.0) + 48, 0, 255)
    out[line] = np.maximum(out[line], boosted)
    out[interior & (lum < 18)] = 0
    return np.clip(out, 0, 255).astype(np.uint8)


def content_boxes(gray: np.ndarray):
    """Split the 4-across plate by empty columns."""
    ink = gray > 20
    col = ink.mean(axis=0) > 0.008
    row = ink.mean(axis=1) > 0.004
    def runs(mask):
        out = []
        i = 0
        n = len(mask)
        while i < n:
            if not mask[i]:
                i += 1
                continue
            j = i
            while j < n and mask[j]:
                j += 1
            if j - i > 20:
                out.append((i, j))
            i = j
        return out
    ys = runs(row)
    xs = runs(col)
    y0, y1 = ys[0] if ys else (0, gray.shape[0])
    if len(xs) != 4:
        raise SystemExit(f"expected 4 figure columns, got {xs}")
    boxes = {}
    pad = 4
    for name, (x0, x1) in zip(ORDER, xs):
        boxes[name] = (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(gray.shape[1], x1 + pad),
            min(gray.shape[0], y1 + pad),
        )
    return boxes


def fit_aspect(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Letterbox onto target aspect without stretching anatomy."""
    w, h = img.size
    scale = min(tw / w, th / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (tw, th), 0)
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def invert_clean(gray: np.ndarray) -> np.ndarray:
    """White page, black lines; no grey fog."""
    out = np.full_like(gray, 255)
    ink = gray >= 18
    # Map light lines to dark ink, keep pure white elsewhere.
    out[ink] = np.clip(255 - (gray[ink].astype(np.float32) * 1.05), 0, 255).astype(np.uint8)
    return out


def rdp(points: list[tuple[int, int]], eps: float) -> list[tuple[int, int]]:
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    mag = (dx * dx + dy * dy) ** 0.5 or 1
    best, idx = -1.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        dist = abs(dy * px - dx * py + bx * ay - by * ax) / mag
        if dist > best:
            best, idx = dist, i
    if best > eps:
        left = rdp(points[: idx + 1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]


def body_mask(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape
    ink = gray > 22
    dil = ink.copy()
    dil[1:-1, 1:-1] |= ink[:-2, 1:-1] | ink[2:, 1:-1] | ink[1:-1, :-2] | ink[1:-1, 2:]
    vis = np.zeros((h, w), dtype=np.uint8)
    sy, sx = [0, 0, h - 1, h - 1], [0, w - 1, 0, w - 1]
    while sx:
        x = sx.pop()
        y = sy.pop()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x] or dil[y, x]:
            continue
        vis[y, x] = 1
        sy.extend((y - 1, y + 1, y, y))
        sx.extend((x, x, x - 1, x + 1))
    return vis == 0


def contour_path(gray: np.ndarray, scale_x: float, scale_y: float, eps: float) -> str:
    ink = gray > 22
    h, w = ink.shape
    left: list[tuple[int, int]] = []
    right: list[tuple[int, int]] = []
    for y in range(h):
        xs = np.flatnonzero(ink[y])
        if xs.size == 0:
            continue
        left.append((int(xs[0]), y))
        right.append((int(xs[-1]), y))
    if len(left) < 8:
        return ""
    pts = left + right[::-1] + [left[0]]
    simple = rdp(pts, eps)
    if len(simple) < 4:
        simple = pts[:: max(1, len(pts) // 200)]
    cmds = [f"M{simple[0][0] * scale_x:.1f} {simple[0][1] * scale_y:.1f}"]
    for px, py in simple[1:]:
        cmds.append(f"L{px * scale_x:.1f} {py * scale_y:.1f}")
    cmds.append("Z")
    return " ".join(cmds)


def to_rgb(gray: np.ndarray, bg: int) -> Image.Image:
    rgb = np.stack([gray, gray, gray], axis=-1)
    if bg == 0:
        return Image.fromarray(rgb, "RGB")
    return Image.fromarray(rgb, "RGB")


def save_webp(img: Image.Image, path: Path, lossless: bool = True):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="WEBP", lossless=lossless, quality=95, method=6)


def main():
    sys.setrecursionlimit(20000)
    src = Image.open(SRC).convert("L")
    arr0 = np.array(src)
    print("cleaning", arr0.shape)
    cleaned = clean_halo(arr0)
    boxes0 = content_boxes(cleaned)
    y0, y1 = boxes0["anterior"][1], boxes0["anterior"][3]
    src_h = max(1, y1 - y0)
    factor = VIEW_H / src_h
    print("upscale", factor)
    hi = upscale(Image.fromarray(cleaned, "L"), factor)
    gray = np.array(hi)
    boxes = {k: tuple(int(round(v * factor)) for v in box) for k, box in boxes0.items()}
    H, W = gray.shape
    for k, (x0, y0, x1, y1) in list(boxes.items()):
        boxes[k] = (max(0, x0), max(0, y0), min(W, x1), min(H, y1))

    views_black: dict[str, Image.Image] = {}
    views_white: dict[str, Image.Image] = {}
    vectors = {}

    for name, (tw, th) in FIGURE_SIZE.items():
        x0, y0, x1, y1 = boxes[name]
        crop = gray[y0:y1, x0:x1]
        # Target pixel size: height VIEW_H, width from FIGURE_SIZE aspect.
        aspect = tw / th
        out_h = VIEW_H
        out_w = max(1, round(VIEW_H * aspect))
        fitted = fit_aspect(Image.fromarray(crop, "L"), out_w, out_h)
        b = np.array(fitted)
        views_black[name] = Image.fromarray(b, "L")
        views_white[name] = Image.fromarray(invert_clean(b), "L")

        sx, sy = tw / out_w, th / out_h
        sil = contour_path(b, sx, sy, eps=1.8)
        vectors[name] = {
            "w": tw,
            "h": th,
            "sil": sil,
            "layers": [{"o": 1, "d": sil}] if sil else [],
        }
        print(name, "crop", crop.shape, "out", out_w, out_h, "sil", len(sil))

    slots = plate_slots(*PLATE)

    def compose(kind: str) -> Image.Image:
        bg = 0 if kind == "black" else 255
        canvas = Image.new("L", PLATE, bg)
        srcs = views_black if kind == "black" else views_white
        for name, (x, y, w, h) in slots.items():
            fig = srcs[name].resize((max(1, round(w)), max(1, round(h))), Image.Resampling.LANCZOS)
            canvas.paste(fig, (round(x), round(y)))
        return canvas.convert("RGB")

    black_plate = compose("black")
    white_plate = compose("white")

    for style in ("glow", "sketch"):
        save_webp(black_plate, OUT / f"black-{style}.webp")
        save_webp(white_plate, OUT / f"white-{style}.webp")
        for name in ORDER:
            b_rgb = views_black[name].convert("RGB")
            w_rgb = views_white[name].convert("RGB")
            save_webp(b_rgb, OUT / f"black-{style}-{name}.webp")
            save_webp(w_rgb, OUT / f"white-{style}-{name}.webp")
        (OUT / f"{style}.json").write_text(json.dumps(vectors, separators=(",", ":")))
        print("wrote", style)

    print("done")


if __name__ == "__main__":
    main()
