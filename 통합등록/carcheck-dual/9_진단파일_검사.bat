@echo off
title 진단 기록 파일 검사
cd /d "%~dp0"
chcp 65001 >nul
node tools\diag-check.js
pause
