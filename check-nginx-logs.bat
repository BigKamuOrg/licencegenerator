@echo off
echo ========================================
echo Nginx Log Kontrolu
echo ========================================
echo.

echo Son 30 satir error log:
docker exec license_frontend tail -n 30 /var/log/nginx/error.log
echo.

echo Son 20 satir access log:
docker exec license_frontend tail -n 20 /var/log/nginx/access.log
echo.

pause

