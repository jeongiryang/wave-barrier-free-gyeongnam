"""Regenerate the static SGIS 2020 national overview; never run in the app.

Source: StatGarten maps (MIT), pinned commit below. Only path geometry is copied;
scripts, styles, URLs and other source attributes are not carried into the asset.
See docs/assets-and-licenses.md for the retained license and limitations.
"""
from pathlib import Path
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

REVISION = "d5f8ea3208f19a73a01f865847d20cc195ae91ba"
SOURCE = f"https://raw.githubusercontent.com/statgarten/maps/{REVISION}/svg/simple/" + urllib.parse.quote("전국_시도_경계.svg")

if __name__ == "__main__":
    original = ET.fromstring(urllib.request.urlopen(SOURCE, timeout=20).read())
    paths = list(original.iter("{http://www.w3.org/2000/svg}path"))
    assert len(paths) == 17 and sum(p.get("id") == "경상남도" for p in paths) == 1
    root = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg", "viewBox": original.attrib["viewBox"], "width": "800", "height": "759"})
    root.append(ET.Comment(f" SGIS 2020 / StatGarten MIT, {REVISION}; simplified regional context, not navigation "))
    for path in paths:
        selected = path.get("id") == "경상남도"
        ET.SubElement(root, "path", {"d": path.attrib["d"], "fill-rule": "evenodd", "fill": "#0a6baf" if selected else "#cbe1ed", "stroke": "#06304a", "stroke-width": "7" if selected else "1", "data-highlighted": str(selected).lower()})
    target = Path(__file__).resolve().parents[1] / "public/maps/korea-sgis-2020.svg"
    target.parent.mkdir(exist_ok=True, parents=True)
    ET.ElementTree(root).write(target, encoding="utf-8", xml_declaration=False)
    print(f"Generated {target.name}: {len(paths)} regions, {target.stat().st_size} bytes")
