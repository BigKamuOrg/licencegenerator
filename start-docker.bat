@echo off
echo ========================================
echo Docker Compose Baslatiliyor...
echo ========================================
echo.

REM Docker Compose'un kurulu olup olmadigini kontrol et
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Docker Compose bulunamadi!
    echo Lutfen Docker Desktop'in kurulu ve calisir durumda oldugundan emin olun.
    pause
    exit /b 1
)

REM Docker Desktop'un calisip calismadigini kontrol et
docker ps >nul 2>&1
if errorlevel 1 (
    echo HATA: Docker Desktop calisiyor gibi gorunmuyor!
    echo Lutfen Docker Desktop'i baslatin ve tekrar deneyin.
    pause
    exit /b 1
)

echo Docker Compose servisleri baslatiliyor...
docker-compose up -d

if errorlevel 1 (
    echo.
    echo HATA: Docker Compose baslatilamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Docker Compose basariyla baslatildi!
echo ========================================
echo.
echo Servisler:
echo   - Backend:  http://localhost:5070
echo   - Frontend: http://localhost:5071
echo.
echo Container durumunu gormek icin: docker-compose ps
echo Loglari gormek icin: docker-compose logs -f
echo Durdurmak icin: docker-compose down
echo.
pause

