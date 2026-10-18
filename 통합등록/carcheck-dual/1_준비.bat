@echo off
title 성능점검 이중등록 - 준비
cd /d "%~dp0"

echo ============================================
echo   성능점검 이중등록 - 최초 1회 준비
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js 가 설치되어 있지 않습니다.
  echo.
  echo   https://nodejs.org  에서 LTS 버전을 설치한 뒤
  echo   이 파일을 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js %%v 확인됨
echo.
echo 필요한 파일을 내려받는 중입니다. 처음에는 몇 분 걸립니다...
echo.

call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [오류] 설치에 실패했습니다. 인터넷 연결을 확인해 주세요.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   준비 완료
echo   이제 [2_실행.bat] 으로 프로그램을 켜거나,
echo   [3_설치파일_만들기.bat] 으로 exe 를 만드세요.
echo ============================================
pause
