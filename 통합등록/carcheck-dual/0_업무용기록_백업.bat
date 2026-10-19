@echo off
title 업무용 기록 백업
cd /d "%~dp0"
chcp 65001 >nul
node tools\backup-data.js
pause
