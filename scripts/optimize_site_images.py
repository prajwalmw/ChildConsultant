#!/usr/bin/env python3
"""Resize (where needed), recompress PNGs, and emit WebP siblings for key site images."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

IMAGES = Path(__file__).resolve().parent.parent / "public" / "images"

# (filename, max longest edge for delivery; None = only recompress at same size)
JPG_WEBP_ONLY: list[tuple[str, int | None]] = [
    ("blog-1.jpg", None),
    ("blog-2.jpg", None),
    ("blog-3.jpg", None),
]

TARGETS: list[tuple[str, int | None]] = [
    ("child_group.png", 1200),
    ("logo.png", 512),
    ("special_offer_pricing.png", 900),
    ("about_us.png", 960),
    ("dr_dietician.png", 720),
    ("dr_pediatrician.png", 720),
    ("dr_therapist.png", 720),
    ("dr_educator.png", 720),
    ("dr_yoga.png", 720),
]

WEBP_QUALITY = 82


def resize_if_needed(im: Image.Image, max_side: int | None) -> Image.Image:
    if not max_side:
        return im
    w, h = im.size
    longest = max(w, h)
    if longest <= max_side:
        return im
    scale = max_side / longest
    nw, nh = int(w * scale), int(h * scale)
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def main() -> None:
    for name, max_side in JPG_WEBP_ONLY:
        path = IMAGES / name
        if not path.exists():
            print("skip missing", path)
            continue
        im = Image.open(path).convert("RGB")
        im = resize_if_needed(im, max_side)
        webp_path = path.with_suffix(".webp")
        im.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
        print(f"OK {name} webp-only -> {webp_path.stat().st_size} bytes")

    for name, max_side in TARGETS:
        path = IMAGES / name
        if not path.exists():
            print("skip missing", path)
            continue
        im = Image.open(path)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        im = resize_if_needed(im, max_side)
        im.save(path, "PNG", optimize=True, compress_level=9)
        webp_path = path.with_suffix(".webp")
        im.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
        print(f"OK {name} -> {path.stat().st_size} bytes, webp {webp_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
