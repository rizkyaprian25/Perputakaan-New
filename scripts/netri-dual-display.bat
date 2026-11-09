@echo off
title Peluncur Dual-Monitor Perpustakaan NETRI
color 0A

echo =======================================================================
echo          SISTEM DUAL-MONITOR OTOMATIS - PERPUSTAKAAN NETRI
echo =======================================================================
echo.

:: 1. Deteksi Browser yang Tersedia (Chrome atau Edge)
set BROWSER_EXE=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if "%BROWSER_EXE%"=="" (
    echo [ERROR] Tidak ditemukan Google Chrome atau Microsoft Edge!
    echo Harap instal Google Chrome untuk kenyamanan mode Kiosk.
    pause
    exit /b 1
)

echo [OK] Menggunakan browser: "%BROWSER_EXE%"
echo.

:: 2. Cek Kesiapan Server Next.js (Port 3000)
echo Menunggu kesiapan server internal Perpustakaan NETRI (Port 3000)...
set /a RETRY_COUNT=0

:CEK_SERVER
curl -s -o nul http://localhost:3000/api/v1/absensi/terakhir
if %ERRORLEVEL% EQU 0 (
    goto SERVER_SIAP
)

set /a RETRY_COUNT+=1
if %RETRY_COUNT% GEQ 30 (
    echo [WARNING] Server port 3000 belum merespons setelah 60 detik.
    echo Membuka browser tetap dilanjutkan...
    goto SERVER_SIAP
)

timeout /t 2 /nobreak > nul
goto CEK_SERVER

:SERVER_SIAP
echo [OK] Server Next.js siap menerima koneksi!
echo.

:: 3. Konfigurasi Profil Browser Terpisah (Agar sesi admin tidak bocor ke layar siswa)
set "PROFILE_ADMIN=C:\netri-browser-profile\admin"
set "PROFILE_KIOSK=C:\netri-browser-profile\kiosk"

if not exist "%PROFILE_ADMIN%" mkdir "%PROFILE_ADMIN%"
if not exist "%PROFILE_KIOSK%" mkdir "%PROFILE_KIOSK%"

:: 4. Buka Layar 1 (Monitor Petugas Admin di Posisi X=0)
echo [1/2] Membuka Panel Admin di Monitor 1 (Layar Utama)...
start "" "%BROWSER_EXE%" ^
    --user-data-dir="%PROFILE_ADMIN%" ^
    --window-position=0,0 ^
    --window-size=1280,800 ^
    --app=http://localhost:3000/admin

:: Beri jeda 2 detik agar proses window pertama terinisialisasi
timeout /t 2 /nobreak > nul

:: 5. Buka Layar 2 (Monitor Siswa / Kiosk Absensi di Posisi X=1920 Fullscreen)
:: Catatan: Jika resolusi monitor 1 Anda adalah 1366x768, ganti 1920 menjadi 1366
echo [2/2] Membuka Kiosk Absensi Siswa di Monitor 2 (Fullscreen Kiosk)...
start "" "%BROWSER_EXE%" ^
    --user-data-dir="%PROFILE_KIOSK%" ^
    --window-position=1920,0 ^
    --kiosk ^
    --no-first-run ^
    --disable-translate ^
    --disable-pinch ^
    --disable-features=Translate ^
    http://localhost:3000/kiosk

echo.
echo =======================================================================
echo  SUKSES! Kedua monitor telah aktif:
echo  - Monitor 1: Admin & Meja Sirkulasi (http://localhost:3000/admin)
echo  - Monitor 2: Kiosk Absensi Siswa Fullscreen (http://localhost:3000/kiosk)
echo =======================================================================
echo.
timeout /t 3 > nul
exit
