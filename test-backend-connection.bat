@echo off
echo ========================================
echo Backend Baglanti Testi
echo ========================================
echo.

echo 1. Backend container durumu:
docker ps | findstr license_backend
if errorlevel 1 (
    echo [HATA] Backend container calisiyor gibi gorunmuyor!
    echo Backend container'i baslatmak icin: docker-compose up -d backend
    echo.
) else (
    echo [OK] Backend container calisiyor
    echo.
)

echo 2. Frontend container'dan backend'e baglanti testi:
docker exec license_frontend wget -qO- --timeout=5 http://backend:5070/health 2>nul
if errorlevel 1 (
    echo [HATA] Frontend container'dan backend'e baglanilamiyor!
    echo.
    echo Backend container loglari:
    docker logs --tail 10 license_backend
    echo.
) else (
    echo [OK] Backend'e baglanti basarili
    echo.
)

echo 3. Network durumu:
docker network inspect license_network 2>nul | findstr -A 5 "Containers"
echo.

echo 4. Nginx yapilandirma testi:
docker exec license_frontend nginx -t 2>&1
echo.

pause

