#!/usr/bin/env python3
"""Valida links internos entre READMEs de graficos/<categoria>/<slug>/README.md.

Cobre os dois formatos usados no acervo:
  - markdown: [texto](../slug) ou [texto](../../categoria/slug)
  - html:     href="../slug" ou href="../../categoria/slug" (cartões de
    "Gráficos parecidos")

Um link é válido se, resolvido relativo à pasta do README que o contém,
aponta pra uma pasta graficos/<categoria>/<slug>/ que existe. Ignora
links absolutos (http/https) e âncoras (#...).
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAFICOS = ROOT / "graficos"

LINK_PATTERNS = [
    re.compile(r"\]\((\.\./[^)\s]+)\)"),
    re.compile(r'href="(\.\./[^"]+)"'),
]


def find_links(text: str) -> list[str]:
    links = []
    for pattern in LINK_PATTERNS:
        links.extend(pattern.findall(text))
    return links


def main() -> int:
    broken = []
    total = 0

    for readme in sorted(GRAFICOS.glob("*/*/README.md")):
        text = readme.read_text(encoding="utf-8")
        for link in find_links(text):
            total += 1
            target = (readme.parent / link).resolve()
            if not target.is_dir():
                broken.append((readme.relative_to(ROOT), link, target))

    print(f"{total} links internos verificados em "
          f"{len(list(GRAFICOS.glob('*/*/README.md')))} READMEs.")

    if broken:
        print(f"\n{len(broken)} link(s) quebrado(s):\n")
        for readme_path, link, target in broken:
            print(f"  {readme_path}")
            print(f"    -> \"{link}\" (resolve para {target}, que não existe)")
        return 1

    print("Nenhum link quebrado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
