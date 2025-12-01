@echo off
echo ========================================
echo Docker Container Durumu
echo ========================================
echo.

echo Backend container durumu:
docker ps -a | findstr license_backend

echo.
echo Frontend container durumu:
docker ps -a | findstr license_frontend

echo.
echo Backend container loglari (son 20 satir):
docker logs --tail 20 license_backend

echo.
echo Frontend container loglari (son 20 satir):
docker logs --tail 20 license_frontend

echo.
echo Network durumu:
docker network inspect license_network 2>nul | findstr "license_backend license_frontend"

echo.
pause

