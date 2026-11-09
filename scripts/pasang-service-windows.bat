@echo off
title Pemasang Windows Service Perpustakaan NETRI (NSSM)
color 0B

echo =======================================================================
echo     PEMASANG WINDOWS SERVICE OTOMATIS - PERPUSTAKAAN NETRI
echo =======================================================================
echo.
echo Skrip ini akan mendaftarkan aplikasi Perpustakaan NETRI sebagai
echo background service Windows yang otomatis berjalan saat komputer nyala.
echo.

:: 1. Periksa Hak Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Skrip ini WAJIB dijalankan sebagai Administrator!
    echo Klik kanan file ini lalu pilih "Run as Administrator".
    echo.
    pause
    exit /b 1
)

:: 2. Periksa Keberadaan NSSM
set NSSM_EXE=
if exist "%SystemRoot%\System32\nssm.exe" (
    set "NSSM_EXE=%SystemRoot%\System32\nssm.exe"
) else if exist "%~dp0nssm.exe" (
    set "NSSM_EXE=%~dp0nssm.exe"
)

if "%NSSM_EXE%"=="" (
    echo [ERROR] nssm.exe tidak ditemukan di C:\Windows\System32 ataupun di folder scripts!
    echo.
    echo Silakan unduh nssm-2.24 dari https://nssm.cc/download
    echo Salin file nssm.exe (versi win64) ke folder: C:\Windows\System32\nssm.exe
    echo.
    pause
    exit /b 1
)

echo [OK] NSSM ditemukan: "%NSSM_EXE%"
echo.

:: 3. Periksa Node.js & npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm tidak terdeteksi di PATH sistem!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('where npm.cmd') do set NPM_CMD=%%i
echo [OK] npm command: "%NPM_CMD%"

set "APP_DIR=e:\Web\Perputakaan New"
if not exist "%APP_DIR%" (
    set "APP_DIR=%~dp0.."
)
echo [OK] Direktori Proyek: "%APP_DIR%"
echo.

:: 4. Build Aplikasi Terlebih Dahulu
echo Memulai proses build Next.js (npm run build)...
cd /d "%APP_DIR%"
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build gagal! Perbaiki galat sebelum memasang service.
    pause
    exit /b 1
)
echo [OK] Build produksi selesai dengan sukses!
echo.

:: 5. Hentikan service lama jika sudah pernah dibuat
"%NSSM_EXE%" stop NetriServer >nul 2>&1
"%NSSM_EXE%" remove NetriServer confirm >nul 2>&1

:: 6. Daftarkan Service Baru
echo Mendaftarkan service 'NetriServer' ke Windows...
"%NSSM_EXE%" install NetriServer "%NPM_CMD%" "run start"
"%NSSM_EXE%" set NetriServer AppDirectory "%APP_DIR%"
"%NSSM_EXE%" set NetriServer Description "Perpustakaan NETRI Next.js Production Web Server"
"%NSSM_EXE%" set NetriServer Start SERVICE_AUTO_START
"%NSSM_EXE%" set NetriServer AppStdout "%APP_DIR%\server-out.log"
"%NSSM_EXE%" set NetriServer AppStderr "%APP_DIR%\server-err.log"

:: Restart otomatis jika crash
"%NSSM_EXE%" set NetriServer AppRestartDelay 3000

echo.
echo Menjalankan service NetriServer...
"%NSSM_EXE%" start NetriServer

echo.
echo =======================================================================
echo  SERVICE BERHASIL DIPASANG DAN DIAKTIFKAN!
echo  Nama Service: NetriServer
echo  Log Output  : %APP_DIR%\server-out.log
echo  Log Error   : %APP_DIR%\server-err.log
echo =======================================================================
echo.
pause
