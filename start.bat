@echo off
echo ========================================
echo   TrekConnect - Starting Application
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo + Node.js is installed
echo.

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo + Backend dependencies installed
    echo.
)

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo + Frontend dependencies installed
    echo.
)

echo ========================================
echo   Starting Servers...
echo ========================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop servers
echo ========================================
echo.

REM Start backend
start "TrekConnect Backend" cmd /k "cd backend && npm start"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
start "TrekConnect Frontend" cmd /k "cd frontend && npm start"

echo.
echo + Both servers started in separate windows
echo + Close those windows to stop the servers
echo.
pause
