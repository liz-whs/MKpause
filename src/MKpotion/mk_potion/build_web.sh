#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python3 -m pip install --upgrade pygbag
python3 -m pygbag --build main.py
echo
echo "Pronto! Publique o conteúdo de build/web/ no seu site (veja LEIA-ME_WEB.md)."
