@echo off
echo ========================================
echo Docker Compose Durduruluyor...
echo ========================================
echo.

docker-compose down

if errorlevel 1 (
    echo.
    echo HATA: Docker Compose durdurulamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Docker Compose basariyla durduruldu!
echo ========================================
echo.
pause

