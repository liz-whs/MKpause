@echo off
cd /d "%~dp0"
python -m pip install --upgrade pygbag
python -m pygbag main.py
