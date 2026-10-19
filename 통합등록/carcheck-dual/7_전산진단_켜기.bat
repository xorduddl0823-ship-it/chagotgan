@echo off
title 전산 진단 켜기
cd /d "%~dp0"
chcp 65001 >nul
node tools\diag-on.js
pause
