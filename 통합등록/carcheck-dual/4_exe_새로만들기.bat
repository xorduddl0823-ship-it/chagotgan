@echo off
title 성능점검 이중등록 - exe 새로 만들기
cd /d "%~dp0"

if not exist "node_modules" (
  echo 준비가 되어 있지 않습니다. [1_준비.bat] 을 먼저 실행해 주세요.
  pause
  exit /b 1
)

echo ============================================
echo   최신 코드로 exe 를 다시 만듭니다.
echo   (설치파일 대신 실행폴더 방식 - 추가 다운로드가 없어 안정적입니다)
echo ============================================
echo.

call npx electron-builder --win dir
if errorlevel 1 (
  echo.
  echo [오류] 만들기에 실패했습니다. 위 메시지를 확인해 주세요.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   완료.
echo   ..\carcheck-dual-build\win-unpacked\성능점검 이중등록.exe
echo.
echo   이 win-unpacked 폴더를 통째로 복사하면
echo   Node.js 없는 다른 PC 에서도 그대로 실행됩니다.
echo ============================================
echo.
start "" "%~dp0..\carcheck-dual-build\win-unpacked"
pause
