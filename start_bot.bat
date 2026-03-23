@echo off
setlocal
:start
cls
echo Starting Stick Helper Bot (Node.js)...

:: Check if node_modules exists
if not exist node_modules (
    echo [ERROR] node_modules not found! 
    echo Please run 'npm install' first.
    pause
    exit /b
)

echo Running index.js...
node index.js

:: If the bot exists with code 100, restart it
if %errorlevel% equ 100 (
    echo [INFO] Restarting bot...
    timeout /t 2 /nobreak > nul
    goto start
)

echo.
echo Bot has stopped (Exit Code: %errorlevel%).
pause
