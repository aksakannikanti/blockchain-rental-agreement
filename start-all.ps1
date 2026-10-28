# ==============================================================================
# Blockchain Based Rental Agreement - Complete Stack Startup Script (PowerShell)
# ==============================================================================

$ProjectRoot = $PSScriptRoot

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Starting “Blockchain Based Rental Agreement” Full Stack" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. Start Hardhat Local Blockchain Node in new window
Write-Host "[1/3] Launching Hardhat Blockchain Node (port 8545)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\contracts'; Write-Host '--- Hardhat Node (Chain 31337) ---' -ForegroundColor Green; npx hardhat node"

# Wait 4 seconds for node to be ready
Start-Sleep -Seconds 4

# 2. Deploy Smart Contract to local node
Write-Host "[2/3] Deploying RentalAgreement.sol to local node..." -ForegroundColor Yellow
cd "$ProjectRoot\contracts"
npx hardhat run scripts/deploy.js --network localhost

# 3. Start Node.js Express Backend & Oracle Service in new window
Write-Host "[3/3] Launching Backend & Oracle Service (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; Write-Host '--- Express & Oracle Service ---' -ForegroundColor Green; npm start"

# 4. Start React Frontend in new window
Write-Host "[4/4] Launching React Vite Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\frontend'; Write-Host '--- React Frontend ---' -ForegroundColor Green; npm run dev"

Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "• Frontend UI:       http://localhost:3000" -ForegroundColor White
Write-Host "• Backend & Oracle:  http://localhost:5000" -ForegroundColor White
Write-Host "• Hardhat RPC:       http://127.0.0.1:8545" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Green
