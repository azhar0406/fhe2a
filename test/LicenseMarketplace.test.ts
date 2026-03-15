import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const CUSDZ_ADDRESS = "0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493";

describe("LicenseMarketplace", function () {
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let marketAddr: string;

  before(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    const MarketFactory = await ethers.getContractFactory("LicenseMarketplace");
    const marketplace = await MarketFactory.deploy(
      CUSDZ_ADDRESS,
      owner.address,
      500,
      3 * 24 * 60 * 60
    );
    await marketplace.waitForDeployment();
    marketAddr = await marketplace.getAddress();
  });

  describe("Deployment", function () {
    it("should deploy with correct cUSDZ address", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      expect(await market.cUSDZ()).to.equal(CUSDZ_ADDRESS);
    });

    it("should deploy with correct config", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      expect(await market.platformFeeBps()).to.equal(500);
      expect(await market.disputeWindow()).to.equal(3 * 24 * 60 * 60);
      expect(await market.nextListingId()).to.equal(1);
    });

    it("should have default categories", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      const cats = await market.getAllCategories();
      expect(cats).to.include("Game");
      expect(cats).to.include("Software");
      expect(cats).to.include("Subscription");
      expect(cats).to.include("Gift Card");
      expect(cats).to.include("Other");
    });

    it("should return category data", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      const [names, counts, thresholds, active] = await market.getAllCategoriesWithData();
      expect(names.length).to.equal(5);
      expect(counts[0]).to.equal(0);
      expect(thresholds[0]).to.equal(5);
      expect(active[0]).to.equal(true);
    });
  });

  describe("Admin Functions", function () {
    it("should update platform fee", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await market.connect(owner).updatePlatformFee(300);
      expect(await market.platformFeeBps()).to.equal(300);
      await market.connect(owner).updatePlatformFee(500);
    });

    it("should reject fee above MAX_FEE_BPS", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await expect(market.connect(owner).updatePlatformFee(1500)).to.be.revertedWithCustomError(
        market, "FeeTooHigh"
      );
    });

    it("should add a new category", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await market.connect(owner).addCategory("Education", 3);
      const cats = await market.getAllCategories();
      expect(cats).to.include("Education");
    });

    it("should reject duplicate category", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await expect(market.connect(owner).addCategory("Game", 5)).to.be.revertedWith("Category exists");
    });

    it("should ban/unban sellers", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await market.connect(owner).banSeller(seller.address, true);
      const profile = await market.getSellerProfile(seller.address);
      expect(profile.banned).to.equal(true);
      await market.connect(owner).banSeller(seller.address, false);
    });

    it("should pause/unpause", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      await market.connect(owner).pause();
      expect(await market.paused()).to.equal(true);
      await market.connect(owner).unpause();
      expect(await market.paused()).to.equal(false);
    });

    it("should reject non-admin calls", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      const adminRole = await market.ADMIN_ROLE();
      await expect(market.connect(seller).updatePlatformFee(100)).to.be.revertedWithCustomError(
        market, "AccessControlUnauthorizedAccount"
      ).withArgs(seller.address, adminRole);
    });
  });

  describe("View Helpers", function () {
    it("should return empty listings", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      const available = await market.getAvailableListings();
      expect(available.length).to.equal(0);
    });

    it("should return revenue stats", async function () {
      const market = await ethers.getContractAt("LicenseMarketplace", marketAddr);
      const [revenue, fees, total] = await market.getRevenueStats();
      expect(revenue).to.equal(0);
      expect(fees).to.equal(0);
      expect(total).to.equal(0);
    });
  });
});
