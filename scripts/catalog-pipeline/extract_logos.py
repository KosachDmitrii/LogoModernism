#!/usr/bin/env python3
"""Crop individual logo images from catalog page PNGs using Vision bbox data."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print(
        "Install dependencies: pip install -r scripts/catalog-pipeline/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)

DEFAULT_PIPELINE = Path(__file__).resolve().parents[2] / "data" / "catalog-pipeline"


def crop_box_pixels(box: dict, width: int, height: int) -> tuple[int, int, int, int]:
    xmin = int(box["xmin"] / 1000 * width)
    ymin = int(box["ymin"] / 1000 * height)
    xmax = int(box["xmax"] / 1000 * width)
    ymax = int(box["ymax"] / 1000 * height)
    xmin = max(0, min(width - 1, xmin))
    ymin = max(0, min(height - 1, ymin))
    xmax = max(xmin + 1, min(width, xmax))
    ymax = max(ymin + 1, min(height, ymax))
    return xmin, ymin, xmax, ymax


def resolve_crop_box(candidate: dict) -> dict | None:
    if candidate.get("cropBox"):
        return candidate["cropBox"]
    raw = candidate.get("rawVision") or {}
    entry = raw.get("entry") or {}
    bbox = entry.get("logo_bbox")
    if bbox and all(k in bbox for k in ("xmin", "ymin", "xmax", "ymax")):
        return bbox
    return None


def extract_logos(pipeline_dir: Path, force: bool = False) -> dict:
    candidates_path = pipeline_dir / "candidates.json"
    if not candidates_path.exists():
        raise FileNotFoundError(f"Missing {candidates_path} — run catalog:analyze first")

    candidates = json.loads(candidates_path.read_text())
    logos_dir = pipeline_dir / "logos"
    logos_dir.mkdir(parents=True, exist_ok=True)

    cropped = 0
    skipped = 0
    missing_bbox = 0

    for candidate in candidates:
        crop_box = resolve_crop_box(candidate)
        if not crop_box:
            missing_bbox += 1
            continue

        page_path = candidate.get("pageImagePath")
        if not page_path:
            missing_bbox += 1
            continue

        page_file = pipeline_dir / page_path
        if not page_file.exists():
            skipped += 1
            continue

        logo_rel = f"logos/{candidate['id']}.png"
        logo_file = pipeline_dir / logo_rel

        if logo_file.exists() and not force:
            candidate["logoImagePath"] = logo_rel
            cropped += 1
            continue

        with Image.open(page_file) as image:
            width, height = image.size
            box = crop_box_pixels(crop_box, width, height)
            crop = image.crop(box)
            crop.save(logo_file, format="PNG", optimize=True)

        candidate["logoImagePath"] = logo_rel
        candidate["cropBox"] = crop_box
        cropped += 1

    candidates_path.write_text(json.dumps(candidates, indent=2))

    return {
        "cropped": cropped,
        "skipped": skipped,
        "missing_bbox": missing_bbox,
        "logos_dir": str(logos_dir),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop logo images from catalog page PNGs")
    parser.add_argument("--out", default=str(DEFAULT_PIPELINE), help="Pipeline directory")
    parser.add_argument("--force", action="store_true", help="Re-crop even if logo PNG exists")
    args = parser.parse_args()

    stats = extract_logos(Path(args.out), force=args.force)
    print(
        f"Cropped {stats['cropped']} logos → {stats['logos_dir']} "
        f"(skipped {stats['skipped']}, missing bbox {stats['missing_bbox']})"
    )


if __name__ == "__main__":
    main()
