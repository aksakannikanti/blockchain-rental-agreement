const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, tenant, oracleSigner] = await hre.ethers.getSigners();

  console.log("==========================================");
  console.log("Deploying RentalAgreement Smart Contract");
  console.log("==========================================");
  console.log("Deployer / Admin Address:", deployer.address);
  console.log("Designated Oracle Address:", oracleSigner.address);

  const RentalAgreement = await hre.ethers.getContractFactory("RentalAgreement");
  const rentalAgreement = await RentalAgreement.deploy(oracleSigner.address);

  await rentalAgreement.waitForDeployment();
  const contractAddress = await rentalAgreement.getAddress();

  console.log("RentalAgreement deployed successfully to:", contractAddress);
  console.log("==========================================");

  // Read compiled artifact for ABI
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/RentalAgreement.sol/RentalAgreement.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentInfo = {
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    oracleAddress: oracleSigner.address,
    abi: artifact.abi,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  // Ensure export directories exist
  const backendConfigDir = path.join(__dirname, "../../backend/config");
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/contracts");

  [backendConfigDir, frontendConfigDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Write deployment info for backend and frontend
  fs.writeFileSync(
    path.join(backendConfigDir, "RentalAgreementDeployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendConfigDir, "RentalAgreementDeployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment information saved to Backend & Frontend config!");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
