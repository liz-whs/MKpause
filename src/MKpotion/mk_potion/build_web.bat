@echo off
cd /d "%~dp0"
python -m pip install --upgrade pygbag
python -m pygbag --build main.py
echo.
echo Pronto! Publique o conteudo de build\web\ no seu site (veja LEIA-ME_WEB.md).
pause
