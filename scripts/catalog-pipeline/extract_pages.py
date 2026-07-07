#!/usr/bin/env python3
"""Extract catalog pages from Logo Modernism PDF as PNG images."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install dependencies: pip install -r scripts/catalog-pipeline/requirements.txt", file=sys.stderr)
    sys.exit(1)

DEFAULT_PDF = os.path.expanduser("~/Documents/Logo Modernism by Jens Müller.pdf")
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "data" / "catalog-pipeline"


def extract(pdf_path: str, out_dir: Path, start: int, end: int | None, scale: float, skip_existing: bool) -> dict:
    doc = fitz.open(pdf_path)
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    # start/end are 0-based page indices (already converted from CLI 1-based args)
    first = max(0, start)
    last = min(end if end is not None else doc.page_count - 1, doc.page_count - 1)

    index: list[dict] = []
    matrix = fitz.Matrix(scale, scale)

    for page_num in range(first, last + 1):
        out_file = pages_dir / f"page-{page_num + 1:04d}.png"
        if skip_existing and out_file.exists():
            pix = fitz.Pixmap(str(out_file))
            index.append({
                "page": page_num + 1,
                "file": f"pages/page-{page_num + 1:04d}.png",
                "width": pix.width,
                "height": pix.height,
                "skipped": True,
            })
            continue

        page = doc[page_num]
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.save(str(out_file))
        index.append({
            "page": page_num + 1,
            "file": f"pages/page-{page_num + 1:04d}.png",
            "width": pix.width,
            "height": pix.height,
        })

    manifest = {
        "pdfPath": pdf_path,
        "totalPages": doc.page_count,
        "extractedRange": {"start": first + 1, "end": last + 1},
        "scale": scale,
        "pages": index,
    }

    manifest_path = out_dir / "pages-index.json"
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text())
        by_page = {p["page"]: p for p in existing.get("pages", [])}
        for p in index:
            by_page[p["page"]] = p
        manifest["pages"] = sorted(by_page.values(), key=lambda x: x["page"])
        manifest["totalPages"] = doc.page_count

    manifest_path.write_text(json.dumps(manifest, indent=2))
    doc.close()
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract PDF pages as PNG for catalog pipeline")
    parser.add_argument("--pdf", default=DEFAULT_PDF, help="Path to Logo Modernism PDF")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output directory")
    parser.add_argument("--start", type=int, default=1, help="Start page (1-based)")
    parser.add_argument("--end", type=int, default=None, help="End page (1-based, inclusive)")
    parser.add_argument("--scale", type=float, default=2.0, help="Render scale (2.0 = ~2048px wide)")
    parser.add_argument("--skip-existing", action="store_true", help="Skip pages already extracted")
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    manifest = extract(
        args.pdf,
        Path(args.out),
        start=args.start - 1,
        end=args.end - 1 if args.end else None,
        scale=args.scale,
        skip_existing=args.skip_existing,
    )
    print(f"Extracted {len(manifest['pages'])} pages → {args.out}")
    print(f"Manifest: {Path(args.out) / 'pages-index.json'}")


if __name__ == "__main__":
    main()
