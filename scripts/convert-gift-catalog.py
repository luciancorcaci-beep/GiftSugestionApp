#!/usr/bin/env python3
"""
Convert the curated Gift_Ideas_Database.xlsx spreadsheet into the bundled
src/data/giftCatalog.json used by the app at build/runtime.

This is a one-time, standalone conversion utility. It is intentionally
written using only the Python standard library (zipfile + xml.etree) so
that no xlsx/spreadsheet-parsing dependency needs to be added to the
Next.js app's package.json or runtime bundle (see Story 3.1, AC3).

Usage:
    python3 scripts/convert-gift-catalog.py \
        [path/to/Gift_Ideas_Database.xlsx] [path/to/src/data/giftCatalog.json]

Both arguments are optional; they default to the spreadsheet at the repo
root and src/data/giftCatalog.json relative to this script's location.

The .xlsx file is a zip archive of XML worksheet parts. The "Gifts" sheet
(xl/worksheets/sheet2.xml, confirmed via xl/workbook.xml's <sheets> order)
uses inline strings (no shared sharedStrings.xml part), so each text cell
carries its value directly in an <is><t>...</t></is> element, and each
numeric cell carries it in a <v>...</v> element.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
GIFTS_SHEET_PART = "xl/worksheets/sheet2.xml"

# Expected column order in the Gifts sheet (A..I).
EXPECTED_HEADERS = [
    "GiftID",
    "GiftName",
    "Description",
    "InterestCategory",
    "Keywords",
    "MinRecipientAge",
    "MaxRecipientAge",
    "RelationshipTags",
    "PriceRangeUSD",
]

COLUMN_LETTER_RE = re.compile(r"[A-Z]+")


def _column_letter(cell_ref: str) -> str:
    """Extract the column letters from a cell reference like 'C42'."""
    match = COLUMN_LETTER_RE.match(cell_ref)
    if not match:
        raise ValueError(f"Could not parse column from cell reference: {cell_ref!r}")
    return match.group()


def _cell_text(cell: ET.Element) -> str:
    """Return the textual value of a worksheet cell, handling both the
    inline-string form (t="inlineStr") and the numeric form."""
    inline = cell.find("m:is", NS)
    if inline is not None:
        text_el = inline.find("m:t", NS)
        return text_el.text if text_el is not None and text_el.text is not None else ""

    value_el = cell.find("m:v", NS)
    return value_el.text if value_el is not None and value_el.text is not None else ""


def _row_values(row: ET.Element) -> dict[str, str]:
    """Map each cell in a row to its column letter -> text value."""
    values: dict[str, str] = {}
    for cell in row.findall("m:c", NS):
        cell_ref = cell.get("r")
        if not cell_ref:
            continue
        values[_column_letter(cell_ref)] = _cell_text(cell)
    return values


def _split_list(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def read_gift_rows(xlsx_path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(xlsx_path) as archive:
        sheet_xml = archive.read(GIFTS_SHEET_PART)

    root = ET.fromstring(sheet_xml)
    sheet_data = root.find("m:sheetData", NS)
    if sheet_data is None:
        raise ValueError(f"No sheetData found in {GIFTS_SHEET_PART}")

    rows = sheet_data.findall("m:row", NS)
    if not rows:
        raise ValueError("Gifts sheet has no rows")

    header_values = _row_values(rows[0])
    header_by_column = {"A": "GiftID", "B": "GiftName", "C": "Description",
                         "D": "InterestCategory", "E": "Keywords",
                         "F": "MinRecipientAge", "G": "MaxRecipientAge",
                         "H": "RelationshipTags", "I": "PriceRangeUSD"}
    actual_headers = [header_values.get(col, "") for col in "ABCDEFGHI"]
    if actual_headers != EXPECTED_HEADERS:
        raise ValueError(
            "Unexpected Gifts sheet header row. Expected "
            f"{EXPECTED_HEADERS}, got {actual_headers}"
        )

    data_rows: list[dict[str, str]] = []
    for row in rows[1:]:
        values = _row_values(row)
        data_rows.append({header_by_column[col]: values.get(col, "") for col in "ABCDEFGHI"})

    return data_rows


def _parse_age(raw: str, field_name: str, gift_id: str) -> int:
    """Parse an age-range cell, failing with a clean, actionable message
    (naming the field and the row's giftId) rather than letting a bare
    ValueError/traceback surface, matching the missing-file and
    duplicate-giftId failure style elsewhere in this script."""
    try:
        return int(raw.strip())
    except ValueError:
        raise SystemExit(
            f"{field_name} for {gift_id!r} is not a valid integer: {raw!r}"
        ) from None


def convert_row(row: dict[str, str]) -> dict:
    relationship_raw = row["RelationshipTags"].strip()
    if relationship_raw == "All":
        relationship_tags = ["All"]
    else:
        relationship_tags = _split_list(relationship_raw)

    gift_id = row["GiftID"].strip()

    return {
        "giftId": gift_id,
        "name": row["GiftName"].strip(),
        "description": row["Description"].strip(),
        "interestCategory": row["InterestCategory"].strip(),
        "keywords": _split_list(row["Keywords"]),
        "minRecipientAge": _parse_age(row["MinRecipientAge"], "MinRecipientAge", gift_id),
        "maxRecipientAge": _parse_age(row["MaxRecipientAge"], "MaxRecipientAge", gift_id),
        "relationshipTags": relationship_tags,
        "priceRangeUsd": row["PriceRangeUSD"].strip(),
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    xlsx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else repo_root / "Gift_Ideas_Database.xlsx"
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else repo_root / "src" / "data" / "giftCatalog.json"

    if not xlsx_path.exists():
        raise SystemExit(f"Spreadsheet not found: {xlsx_path}")

    rows = read_gift_rows(xlsx_path)
    catalog = [convert_row(row) for row in rows]

    ids = [entry["giftId"] for entry in catalog]
    if len(set(ids)) != len(ids):
        duplicates = sorted({gift_id for gift_id in ids if ids.count(gift_id) > 1})
        raise SystemExit(f"Duplicate giftId values found in source spreadsheet: {duplicates}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(catalog, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Wrote {len(catalog)} gift catalog entries to {output_path}")


if __name__ == "__main__":
    main()
