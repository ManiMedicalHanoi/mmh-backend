@echo off
chcp 65001 >nul
title Tai nhanh ho so thau - MMH
cd /d "%~dp0"
where py >/dev/null 2>/dev/null && (set PY=py) || (set PY=python)
%PY% -c "import playwright" 2>/dev/null || (
  echo Lan dau: dang cai thu vien Playwright...
  %PY% -m pip install --upgrade playwright
)
%PY% tai_nhanh.py
pause
