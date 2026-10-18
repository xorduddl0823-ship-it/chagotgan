@echo off
title 성능점검 이중등록 - 설치파일 만들기
cd /d "%~dp0"

if not exist "node_modules" (
  echo 준비가 되어 있지 않습니다. [1_준비.bat] 을 먼저 실행해 주세요.
  pause
  exit /b 1
)

echo ============================================
echo   설치파일(exe) 을 만듭니다
echo   처음에는 빌드 도구를 받느라 5~10분 걸립니다.
echo ============================================
echo.

call npm run dist
if errorlevel 1 (
  echo.
  echo [오류] 만들기에 실패했습니다. 위의 메시지를 확인해 주세요.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   완료. ..rcheck-dual-build 폴더에 두 개가 생겼습니다.
echo.
echo   CarCheckDual-Setup-0.1.0.exe     설치형 (바탕화면 아이콘 생성)
echo   CarCheckDual-Portable-0.1.0.exe  무설치 실행형 (USB 로 옮겨 사용)
echo ============================================
echo.
start "" "%~dp0..\carcheck-dual-build"
pause
