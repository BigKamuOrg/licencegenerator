@echo off
echo ========================================
echo Docker Compose Yeniden Baslatiliyor...
echo ========================================
echo.

echo Mevcut container'lar durduruluyor...
docker-compose down

echo.
echo Container'lar yeniden baslatiliyor...
docker-compose up -d

if errorlevel 1 (
    echo.
    echo HATA: Docker Compose yeniden baslatilamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Docker Compose basariyla yeniden baslatildi!
echo ========================================
echo.
echo Servisler:
echo   - Backend:  http://localhost:5070
echo   - Frontend: http://localhost:5071
echo.
pause

