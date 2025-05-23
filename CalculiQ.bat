@echo off
cd /d "C:\Users\Alejandro\Desktop\AutomatedRevenueEmpire"
echo 🚀 Starting CalculiQ Empire...
echo.
echo Checking if system is ready...
if not exist "automation-server.js" (
    echo ❌ Missing automation-server.js file!
    echo Make sure you're in the correct folder.
    pause
    exit
)
if not exist ".env" (
    echo ❌ Missing .env file!
    echo Create .env file with your email credentials.
    pause
    exit
)
echo ✅ Files found. Starting system...
echo.
npm run dev
echo.
echo CalculiQ Empire closed. Press any key to exit...
pause