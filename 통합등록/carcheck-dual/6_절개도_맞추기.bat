@echo off
rem  ASCII only. Korean text here breaks on non-UTF8 consoles,
rem  so all messages are printed by the node script instead.
cd /d "%~dp0"
chcp 65001 >nul 2>nul

set "NODE="
where node >nul 2>nul
if not errorlevel 1 set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE goto nonode

"%NODE%" "tools\diagram-tuner.js"
goto done

:nonode
echo Node.js not found. Please run 1_junbi.bat first.
echo (Node.js not on PATH and not in Program Files\nodejs)

:done
pause
