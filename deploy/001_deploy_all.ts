import { ethers } from "hardhat";

// Zama's deployed token addresses on Sepolia
const USDZ_ADDRESS = "0x3edf60dd017ace33a0220f78741b5581c385a1ba";
const CUSDZ_ADDRESS = "0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Using Zama cUSDZ at:", CUSDZ_ADDRESS);

  const platformFeeBps = 500; // 5%
  const disputeWindowSeconds = 3 * 24 * 60 * 60; // 3 days

  const MarketFactory = await ethers.getContractFactory("LicenseMarketplace");
  const marketplace = await MarketFactory.deploy(
    CUSDZ_ADDRESS,
    deployer.address,
    platformFeeBps,
    disputeWindowSeconds
  );
  await marketplace.waitForDeployment();
  const marketAddr = await marketplace.getAddress();

  console.log("\n═══ Deployment Summary ═══");
  console.log("Network:            ", (await ethers.provider.getNetwork()).name);
  console.log("USDZ (plaintext):   ", USDZ_ADDRESS);
  console.log("cUSDZ (confidential):", CUSDZ_ADDRESS);
  console.log("LicenseMarketplace: ", marketAddr);
  console.log("Platform Fee:       ", platformFeeBps, "bps (5%)");
  console.log("Dispute Window:     ", disputeWindowSeconds, "seconds (3 days)");
  console.log("Default Categories:  Game, Software, Subscription, Gift Card, Other");
  console.log("══════════════════════════");
  console.log("\nTo get test USDZ: call mint(yourAddress) on", USDZ_ADDRESS);
  console.log("To shield into cUSDZ: approve + wrap() on", CUSDZ_ADDRESS);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
