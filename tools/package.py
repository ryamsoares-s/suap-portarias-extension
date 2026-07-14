#!/usr/bin/env python3
"""Empacota a extensao num .zip pronto para Chrome Web Store / Edge Add-ons.
Inclui apenas os arquivos necessarios para rodar a extensao.
Uso: python3 tools/package.py"""
import json, os, zipfile

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)

with open(os.path.join(root, "manifest.json"), encoding="utf-8") as f:
    version = json.load(f)["version"]

out = os.path.join(root, f"suap-portarias-extension-v{version}.zip")
if os.path.exists(out):
    os.remove(out)

INCLUDE_FILES = ["manifest.json", "background.js", "content.js", "panel.css"]
INCLUDE_DIRS = ["icons"]

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for name in INCLUDE_FILES:
        z.write(os.path.join(root, name), name)
    for d in INCLUDE_DIRS:
        for base, _, files in os.walk(os.path.join(root, d)):
            for fn in files:
                full = os.path.join(base, fn)
                z.write(full, os.path.relpath(full, root))

print("Gerado:", os.path.basename(out))
with zipfile.ZipFile(out) as z:
    for n in z.namelist():
        print("  ", n)
