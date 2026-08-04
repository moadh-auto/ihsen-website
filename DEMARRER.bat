@echo off
chcp 65001 >nul
title IHSEN — Démarrage du projet

echo.
echo  ██╗██╗  ██╗███████╗███████╗███╗   ██╗
echo  ██║██║  ██║██╔════╝██╔════╝████╗  ██║
echo  ██║███████║███████╗█████╗  ██╔██╗ ██║
echo  ██║██╔══██║╚════██║██╔══╝  ██║╚██╗██║
echo  ██║██║  ██║███████║███████╗██║ ╚████║
echo  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝
echo.
echo  أزياء نسائية محتشمة — الجزائر
echo  ==========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [!] Node.js غير مثبت. جاري التثبيت تلقائياً...
    echo.

    :: Try winget first (Windows 11 built-in)
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        echo  [→] Installing Node.js LTS via winget...
        winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        echo.
        echo  [✓] Node.js installed! Please close this window and run DEMARRER.bat again.
        pause
        exit /b
    ) else (
        echo  [!] Winget not available.
        echo  [→] Please install Node.js manually from: https://nodejs.org
        echo      Download the LTS version (Windows Installer .msi)
        echo.
        start https://nodejs.org/en/download
        pause
        exit /b
    )
)

:: Node.js found
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [✓] Node.js %NODE_VER% trouvé
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  [→] Installation des dépendances (première fois, ~2 minutes)...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo  [✗] Erreur lors de npm install
        pause
        exit /b 1
    )
    echo.
    echo  [✓] Dépendances installées!
    echo.
) else (
    echo  [✓] Dépendances déjà installées
    echo.
)

:: Start dev server
echo  [→] Démarrage du serveur de développement...
echo.
echo  ==========================================
echo   Ouvrez votre navigateur sur:
echo   http://localhost:3000
echo  ==========================================
echo.
npm run dev
pause
