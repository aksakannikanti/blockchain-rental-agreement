@echo off
title Blockchain Based Rental Agreement - Launcher
echo ====================================================================
echo Starting Blockchain Based Rental Agreement Full Stack
echo ====================================================================

set PROJECT_ROOT=%~dp0

echo [1/3] Starting Hardhat Blockchain Node in new window...
start "1. Hardhat Node (Port 8545)" cmd /k "cd /d %PROJECT_ROOT%contracts && npx hardhat node"

timeout /t 5 /nobreak >nul

echo [2/3] Deploying RentalAgreement.sol to local node...
cd /d %PROJECT_ROOT%contracts
call npx hardhat run scripts/deploy.js --network localhost

echo [3/4] Starting Backend & Oracle Service in new window...
start "2. Backend & Oracle (Port 5000)" cmd /k "cd /d %PROJECT_ROOT%backend && npm start"

echo [4/4] Starting React Frontend in new window...
start "3. React Frontend (Port 3000)" cmd /k "cd /d %PROJECT_ROOT%frontend && npm run dev"

echo ====================================================================
echo Full stack launched!
echo Access Web UI: http://localhost:3000
echo ====================================================================
pause
