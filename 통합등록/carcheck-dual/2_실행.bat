@echo off
title 성능점검 이중등록
cd /d "%~dp0"

if not exist "node_modules" (
  echo 준비가 되어 있지 않습니다. [1_준비.bat] 을 먼저 실행해 주세요.
  pause
  exit /b 1
)

call npm start
