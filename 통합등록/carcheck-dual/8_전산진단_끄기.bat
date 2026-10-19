@echo off
title 전산 진단 끄기
cd /d "%~dp0"
chcp 65001 >nul
node tools\diag-on.js off
pause
