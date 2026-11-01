#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 -m pip install --upgrade pygbag
python3 -m pygbag main.py
