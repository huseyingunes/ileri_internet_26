@echo off
rem haber10da gunluk haber ajani - Windows Gorev Zamanlayici bu dosyayi calistirir.
cd /d "%~dp0.."
if not exist ".veri" mkdir ".veri"
echo ===== %date% %time% ===== >> ".veri\ajan.log"
call npm run ajan >> ".veri\ajan.log" 2>&1
