@echo off
title Diagnostik Kesehatan Server Perpustakaan NETRI
color 0E

echo =======================================================================
echo          DIAGNOSTIK KESEHATAN SERVER PERPUSTAKAAN NETRI
echo =======================================================================
echo.

:: 1. Cek Port 3306 (MySQL)
echo [1/4] Memeriksa status Database MySQL (Port 3306)...
powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet" > "%temp%\chk_mysql.tmp"
set /p MYSQL_STATUS=<"%temp%\chk_mysql.tmp"
del "%temp%\chk_mysql.tmp"

if "%MYSQL_STATUS%"=="True" (
    echo       -> MySQL AKTIF dan siap menerima koneksi (Port 3306 OK).
) else (
    echo       -> [PERINGATAN] MySQL Port 3306 TIDAK TERDETEKSI! Pastikan service MySQL/Laragon berjalan.
)
echo.

:: 2. Cek Port 3000 (Next.js Web Server)
echo [2/4] Memeriksa status Server Web Next.js (Port 3000)...
powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet" > "%temp%\chk_next.tmp"
set /p NEXT_STATUS=<"%temp%\chk_next.tmp"
del "%temp%\chk_next.tmp"

if "%NEXT_STATUS%"=="True" (
    echo       -> Next.js Web Server AKTIF (Port 3000 OK).
) else (
    echo       -> [PERINGATAN] Port 3000 TIDAK TERDETEKSI! Server Next.js belum aktif.
)
echo.

:: 3. Cek Respons API Internal Absensi & Sirkulasi
echo [3/4] Menguji respons endpoint API internal...
curl -s -w "%%{http_code}" -o "%temp%\api_out.tmp" http://localhost:3000/api/v1/absensi/terakhir > "%temp%\chk_http.tmp"
set /p HTTP_CODE=<"%temp%\chk_http.tmp"
del "%temp%\chk_http.tmp"
del "%temp%\api_out.tmp" >nul 2>&1

if "%HTTP_CODE%"=="200" (
    echo       -> API Health Check: BERHASIL (HTTP 200 OK).
) else (
    echo       -> [INFO] HTTP Status: %HTTP_CODE%
)
echo.

:: 4. Deteksi Jumlah Monitor yang Terhubung
echo [4/4] Mendeteksi jumlah layar monitor...
powershell -Command "(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams).Count" > "%temp%\chk_mon.tmp"
set /p MON_COUNT=<"%temp%\chk_mon.tmp"
del "%temp%\chk_mon.tmp"

if "%MON_COUNT%"=="" set MON_COUNT=1
echo       -> Terdeteksi %MON_COUNT% layar monitor aktif.
if %MON_COUNT% GEQ 2 (
    echo       -> Mode Dual-Monitor siap digunakan (Admin + Kiosk).
) else (
    echo       -> [CATATAN] Hanya 1 monitor terdeteksi. Hubungkan monitor kedua ke port HDMI/VGA untuk mode Dual-Monitor.
)

echo.
echo =======================================================================
echo Diagnostik selesai! Tekan sembarang tombol untuk keluar.
echo =======================================================================
pause > nul
