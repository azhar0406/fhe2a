// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint256, ebool, externalEuint64, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @dev Minimal interface matching Zama's cUSDZ on Sepolia.
interface IConfidentialERC20 {
    function transferFrom(address from, address to, euint64 amount) external returns (bool);
    function transfer(address to, euint64 amount) external returns (bool);
    function balanceOf(address account) external view returns (euint64);
}

/// @title LicenseMarketplace
/// @notice G2A-style digital license marketplace powered by Zama FHE.
///         License keys & PINs encrypted on-chain. Payments in cUSDZ.
///         Escrow, disputes, resell, categories, reveal flow, revenue tracking.
contract LicenseMarketplace is ZamaEthereumConfig, AccessControl, ReentrancyGuard, Pausable {

    // ─────────────────────────────────────────────────────────────
    //  Roles
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────────────────────
    //  Enums
    // ─────────────────────────────────────────────────────────────

    enum ListingStatus { Active, Sold, Cancelled, Disputed, Resolved }

    // ─────────────────────────────────────────────────────────────
    //  Structs (split to avoid stack-too-deep)
    // ─────────────────────────────────────────────────────────────

    struct ListingCore {
        uint256 id;
        address seller;
        address buyer;
        uint64  price;           // cUSDZ (6 decimals)
        ListingStatus status;
        bool fundsReleased;
    }

    struct ListingMeta {
        string productName;
        string category;
        string description;
        string imageUrl;
        uint256 createdAt;
        uint256 soldAt;
        uint256 expiryDate;      // 0 = no expiry
    }

    struct ListingReveal {
        bool isRevealed;
    }

    /// @notice Public view struct returned by getters (no encrypted fields).
    struct ListingPublic {
        uint256 id;
        uint64  price;
        address seller;
        address buyer;
        string  productName;
        string  category;
        string  description;
        string  imageUrl;
        uint8   status;          // cast of ListingStatus
        bool    isRevealed;
        bool    fundsReleased;
        uint256 createdAt;
        uint256 soldAt;
    }

    /// @notice Full struct including encrypted handles (for owner only).
    struct ListingWithEncryption {
        uint256   id;
        uint64    price;
        address   seller;
        address   buyer;
        string    productName;
        string    category;
        string    description;
        string    imageUrl;
        uint8     status;
        bool      isRevealed;
        bool      fundsReleased;
        euint256  encryptedCode;
        euint256  encryptedPin;
    }

    struct SellerProfile {
        uint256 totalSales;
        uint256 totalDisputes;
        uint256 disputesLost;
        bool    banned;
    }

    struct CategoryInventory {
        uint256 count;
        uint256 threshold;
        bool    active;
        uint256 createdAt;
    }

    // ─────────────────────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────────────────────

    IConfidentialERC20 public immutable cUSDZ;

    // Listings — split storage
    mapping(uint256 => ListingCore)   private _cores;
    mapping(uint256 => ListingMeta)   private _metas;
    mapping(uint256 => ListingReveal) private _reveals;
    mapping(uint256 => euint256)      private _encCodes;
    mapping(uint256 => euint256)      private _encPins;
    mapping(uint256 => euint64)       private _escrow;

    uint256 public nextListingId = 1; // start at 1

    // User mappings
    mapping(address => uint256[])  public sellerListings;
    mapping(address => uint256[])  public buyerOrders;
    mapping(address => SellerProfile) public sellers;

    // Resell tracking: originalId => true if already resold (prevents double resell)
    mapping(uint256 => bool) public resold;

    // Category system
    string[] public categories;
    mapping(string => CategoryInventory) public categoryInventory;
    mapping(string => uint256[])         public categoryListings;

    // Config
    uint256 public platformFeeBps = 500;       // 5%
    uint256 public constant MAX_FEE_BPS = 1000; // 10% cap
    uint256 public disputeWindow = 3 days;

    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public totalFees;

    // ─────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────

    event ListingCreated(uint256 indexed id, address indexed seller, string productName, uint64 price, string category);
    event ListingCancelled(uint256 indexed id);
    event LicensePurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint64 price);
    event LicenseRevealed(uint256 indexed id, address indexed owner);
    event FundsReleased(uint256 indexed id, address indexed seller);
    event DisputeOpened(uint256 indexed id, address indexed buyer);
    event DisputeResolved(uint256 indexed id, bool buyerWins);
    event CategoryAdded(string category, uint256 threshold);
    event InventoryUpdated(string category, uint256 newCount);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event DisputeWindowUpdated(uint256 newWindow);
    event RevenueCollected(uint256 amount, uint256 fee);

    // ─────────────────────────────────────────────────────────────
    //  Errors
    // ─────────────────────────────────────────────────────────────

    error InvalidPrice();
    error NotSeller();
    error NotBuyer();
    error ListingNotActive();
    error ListingNotSold();
    error AlreadyReleased();
    error AlreadyRevealed();
    error NotRevealed();
    error NotPurchased();
    error DisputeWindowActive();
    error DisputeWindowExpired();
    error SellerBanned();
    error FeeTooHigh();
    error CannotBuyOwnListing();
    error CardExpired();
    error InvalidCategory();
    error AlreadyResold();

    // ─────────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────────

    modifier validListing(uint256 id) {
        require(id > 0 && id < nextListingId, "Invalid listing ID");
        _;
    }

    modifier notExpired(uint256 id) {
        uint256 exp = _metas[id].expiryDate;
        if (exp != 0 && exp <= block.timestamp) revert CardExpired();
        _;
    }

    // ─────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────

    constructor(address _cUSDZ, address _owner, uint256 _feeBps, uint256 _disputeWindowSec) {
        cUSDZ = IConfidentialERC20(_cUSDZ);
        platformFeeBps = _feeBps;
        disputeWindow = _disputeWindowSec;

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);

        // Default categories
        _addCategory("Game", 5);
        _addCategory("Software", 5);
        _addCategory("Subscription", 5);
        _addCategory("Gift Card", 5);
        _addCategory("Other", 5);
    }

    // ═════════════════════════════════════════════════════════════
    //  CATEGORY MANAGEMENT
    // ═════════════════════════════════════════════════════════════

    function addCategory(string calldata category, uint256 threshold) external onlyRole(ADMIN_ROLE) {
        require(bytes(category).length > 0, "Empty category");
        require(!categoryInventory[category].active, "Category exists");
        _addCategory(category, threshold);
    }

    function _addCategory(string memory category, uint256 threshold) internal {
        categories.push(category);
        categoryInventory[category] = CategoryInventory({
            count: 0,
            threshold: threshold,
            active: true,
            createdAt: block.timestamp
        });
        emit CategoryAdded(category, threshold);
    }

    function getAllCategories() external view returns (string[] memory) {
        return categories;
    }

    function getAllCategoriesWithData() external view returns (
        string[] memory names,
        uint256[] memory counts,
        uint256[] memory thresholds,
        bool[] memory activeStatuses
    ) {
        uint256 len = categories.length;
        names = new string[](len);
        counts = new uint256[](len);
        thresholds = new uint256[](len);
        activeStatuses = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            string memory cat = categories[i];
            CategoryInventory storage inv = categoryInventory[cat];
            names[i] = cat;
            counts[i] = inv.count;
            thresholds[i] = inv.threshold;
            activeStatuses[i] = inv.active;
        }
    }

    // ═════════════════════════════════════════════════════════════
    //  CREATE LISTING
    // ═════════════════════════════════════════════════════════════

    /// @notice Create a listing (admin only). Users resell via resellLicense().
    function createListing(
        string calldata productName,
        string calldata category,
        string calldata description,
        string calldata imageUrl,
        uint64 price,
        uint256 expiryDate,
        externalEuint256 encCode,
        externalEuint256 encPin,
        bytes calldata inputProof
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256 id) {
        if (price == 0) revert InvalidPrice();
        if (sellers[msg.sender].banned) revert SellerBanned();
        if (!categoryInventory[category].active) revert InvalidCategory();

        id = nextListingId++;

        // Store encrypted data
        _storeEncrypted(id, encCode, encPin, inputProof, msg.sender);

        // Core
        _cores[id] = ListingCore({
            id: id,
            seller: msg.sender,
            buyer: address(0),
            price: price,
            status: ListingStatus.Active,
            fundsReleased: false
        });

        // Meta
        _metas[id] = ListingMeta({
            productName: productName,
            category: category,
            description: description,
            imageUrl: imageUrl,
            createdAt: block.timestamp,
            soldAt: 0,
            expiryDate: expiryDate
        });

        // Reveal
        _reveals[id] = ListingReveal({ isRevealed: false });

        // Track
        sellerListings[msg.sender].push(id);
        categoryListings[category].push(id);
        categoryInventory[category].count++;

        emit ListingCreated(id, msg.sender, productName, price, category);
        emit InventoryUpdated(category, categoryInventory[category].count);
    }

    /// @notice Admin can create listings on behalf of the platform.
    function adminCreateListing(
        string calldata productName,
        string calldata category,
        string calldata description,
        string calldata imageUrl,
        uint64 price,
        uint256 expiryDate,
        externalEuint256 encCode,
        externalEuint256 encPin,
        bytes calldata inputProof
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256 id) {
        if (price == 0) revert InvalidPrice();
        if (!categoryInventory[category].active) revert InvalidCategory();

        id = nextListingId++;

        _storeEncrypted(id, encCode, encPin, inputProof, address(this));

        _cores[id] = ListingCore({
            id: id,
            seller: address(this),
            buyer: address(0),
            price: price,
            status: ListingStatus.Active,
            fundsReleased: false
        });

        _metas[id] = ListingMeta({
            productName: productName,
            category: category,
            description: description,
            imageUrl: imageUrl,
            createdAt: block.timestamp,
            soldAt: 0,
            expiryDate: expiryDate
        });

        _reveals[id] = ListingReveal({ isRevealed: false });

        sellerListings[address(this)].push(id);
        categoryListings[category].push(id);
        categoryInventory[category].count++;

        emit ListingCreated(id, address(this), productName, price, category);
        emit InventoryUpdated(category, categoryInventory[category].count);
    }

    function _storeEncrypted(
        uint256 id,
        externalEuint256 encCode,
        externalEuint256 encPin,
        bytes calldata proof,
        address initialOwner
    ) internal {
        euint256 code = FHE.fromExternal(encCode, proof);
        euint256 pin  = FHE.fromExternal(encPin, proof);

        FHE.allowThis(code);
        FHE.allowThis(pin);
        FHE.allow(code, initialOwner);
        FHE.allow(pin, initialOwner);

        _encCodes[id] = code;
        _encPins[id]  = pin;
    }

    /// @notice Cancel an unsold listing.
    function cancelListing(uint256 id) external validListing(id) {
        ListingCore storage c = _cores[id];
        if (c.seller != msg.sender) revert NotSeller();
        if (c.status != ListingStatus.Active) revert ListingNotActive();

        c.status = ListingStatus.Cancelled;

        string memory cat = _metas[id].category;
        if (categoryInventory[cat].count > 0) {
            categoryInventory[cat].count--;
            emit InventoryUpdated(cat, categoryInventory[cat].count);
        }

        emit ListingCancelled(id);
    }

    // ═════════════════════════════════════════════════════════════
    //  PURCHASE
    // ═════════════════════════════════════════════════════════════

    /// @notice Buy a listing. cUSDZ payment goes to escrow.
    function buyLicense(
        uint256 id,
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external validListing(id) notExpired(id) nonReentrant whenNotPaused {
        ListingCore storage c = _cores[id];
        if (c.status != ListingStatus.Active) revert ListingNotActive();
        if (c.seller == msg.sender) revert CannotBuyOwnListing();

        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        ebool correctPrice = FHE.eq(amount, FHE.asEuint64(c.price));
        euint64 paymentValue = FHE.select(correctPrice, amount, FHE.asEuint64(0));

        // Escrow
        cUSDZ.transferFrom(msg.sender, address(this), paymentValue);
        _escrow[id] = paymentValue;
        FHE.allowThis(_escrow[id]);

        // Grant buyer FHE access to encrypted code & pin
        FHE.allow(_encCodes[id], msg.sender);
        FHE.allow(_encPins[id], msg.sender);

        // Update state
        c.status = ListingStatus.Sold;
        c.buyer = msg.sender;
        _metas[id].soldAt = block.timestamp;

        buyerOrders[msg.sender].push(id);
        sellers[c.seller].totalSales++;

        // Inventory
        string memory cat = _metas[id].category;
        if (categoryInventory[cat].count > 0) {
            categoryInventory[cat].count--;
            emit InventoryUpdated(cat, categoryInventory[cat].count);
        }

        emit LicensePurchased(id, msg.sender, c.seller, c.price);
        emit RevenueCollected(c.price, uint256(c.price) * platformFeeBps / 10000);
    }

    /// @notice Admin can assign a listing to a user (e.g. after off-chain payment).
    function purchaseOnBehalf(address user, uint256 id)
        external onlyRole(ADMIN_ROLE) validListing(id) notExpired(id) nonReentrant whenNotPaused
    {
        require(user != address(0), "Invalid user");
        ListingCore storage c = _cores[id];
        if (c.status != ListingStatus.Active) revert ListingNotActive();

        FHE.allow(_encCodes[id], user);
        FHE.allow(_encPins[id], user);

        c.status = ListingStatus.Sold;
        c.buyer = user;
        c.fundsReleased = true; // no escrow needed
        _metas[id].soldAt = block.timestamp;

        buyerOrders[user].push(id);
        sellers[c.seller].totalSales++;

        string memory cat = _metas[id].category;
        if (categoryInventory[cat].count > 0) {
            categoryInventory[cat].count--;
            emit InventoryUpdated(cat, categoryInventory[cat].count);
        }

        emit LicensePurchased(id, user, c.seller, c.price);
    }

    // ═════════════════════════════════════════════════════════════
    //  REVEAL (encrypted code + pin)
    // ═════════════════════════════════════════════════════════════

    /// @notice Reveal the license code & pin after purchase.
    function revealLicense(uint256 id)
        external validListing(id) notExpired(id)
        returns (euint256 encryptedCode, euint256 encryptedPin)
    {
        ListingCore storage c = _cores[id];
        if (c.buyer != msg.sender) revert NotBuyer();
        if (!_isPurchased(c)) revert NotPurchased();

        ListingReveal storage r = _reveals[id];
        if (r.isRevealed) revert AlreadyRevealed();

        r.isRevealed = true;

        euint256 code = _encCodes[id];
        euint256 pin  = _encPins[id];
        FHE.allow(code, msg.sender);
        FHE.allow(pin, msg.sender);

        emit LicenseRevealed(id, msg.sender);
        return (code, pin);
    }

    function isRevealed(uint256 id) external view validListing(id) returns (bool) {
        return _reveals[id].isRevealed;
    }

    // ═════════════════════════════════════════════════════════════
    //  ESCROW & DISPUTES
    // ═════════════════════════════════════════════════════════════

    function releaseFunds(uint256 id) external validListing(id) nonReentrant {
        ListingCore storage c = _cores[id];
        if (c.status != ListingStatus.Sold) revert ListingNotSold();
        if (c.fundsReleased) revert AlreadyReleased();
        if (block.timestamp < _metas[id].soldAt + disputeWindow) revert DisputeWindowActive();

        c.fundsReleased = true;
        _payoutSeller(id);
        emit FundsReleased(id, c.seller);
    }

    function openDispute(uint256 id) external validListing(id) {
        ListingCore storage c = _cores[id];
        if (c.buyer != msg.sender) revert NotBuyer();
        if (c.status != ListingStatus.Sold) revert ListingNotSold();
        if (c.fundsReleased) revert AlreadyReleased();
        if (block.timestamp > _metas[id].soldAt + disputeWindow) revert DisputeWindowExpired();

        c.status = ListingStatus.Disputed;
        sellers[c.seller].totalDisputes++;
        emit DisputeOpened(id, msg.sender);
    }

    function resolveDispute(uint256 id, bool buyerWins) external onlyRole(ADMIN_ROLE) validListing(id) nonReentrant {
        ListingCore storage c = _cores[id];
        require(c.status == ListingStatus.Disputed, "Not disputed");
        require(!c.fundsReleased, "Already released");

        c.status = ListingStatus.Resolved;
        c.fundsReleased = true;

        if (buyerWins) {
            euint64 escrowed = _escrow[id];
            FHE.allowThis(escrowed);
            FHE.allow(escrowed, c.buyer);
            cUSDZ.transfer(c.buyer, escrowed);
            sellers[c.seller].disputesLost++;
        } else {
            _payoutSeller(id);
        }

        emit DisputeResolved(id, buyerWins);
    }

    function _payoutSeller(uint256 id) internal {
        euint64 escrowed = _escrow[id];
        ListingCore storage c = _cores[id];

        euint64 fee = FHE.div(FHE.mul(escrowed, FHE.asEuint64(uint64(platformFeeBps))), 10000);
        euint64 payout = FHE.sub(escrowed, fee);

        FHE.allowThis(payout);
        FHE.allow(payout, c.seller);
        cUSDZ.transfer(c.seller, payout);
        FHE.allowThis(fee);
    }

    // ═════════════════════════════════════════════════════════════
    //  RESELL
    // ═════════════════════════════════════════════════════════════

    function resellLicense(uint256 originalId, uint64 newPrice)
        external validListing(originalId) returns (uint256 newId)
    {
        ListingCore storage orig = _cores[originalId];
        if (orig.buyer != msg.sender) revert NotBuyer();
        require(_isPurchased(orig), "Not resellable");
        require(orig.fundsReleased, "Funds not released");
        if (resold[originalId]) revert AlreadyResold();
        if (newPrice == 0) revert InvalidPrice();

        resold[originalId] = true;

        newId = nextListingId++;
        ListingMeta storage om = _metas[originalId];

        _cores[newId] = ListingCore({
            id: newId,
            seller: msg.sender,
            buyer: address(0),
            price: newPrice,
            status: ListingStatus.Active,
            fundsReleased: false
        });

        _metas[newId] = ListingMeta({
            productName: om.productName,
            category: om.category,
            description: string.concat("[Resale] ", om.description),
            imageUrl: om.imageUrl,
            createdAt: block.timestamp,
            soldAt: 0,
            expiryDate: om.expiryDate
        });

        _reveals[newId] = ListingReveal({ isRevealed: false });

        // Reuse encrypted handles
        _encCodes[newId] = _encCodes[originalId];
        _encPins[newId]  = _encPins[originalId];
        FHE.allowThis(_encCodes[newId]);
        FHE.allowThis(_encPins[newId]);
        FHE.allow(_encCodes[newId], msg.sender);
        FHE.allow(_encPins[newId], msg.sender);

        sellerListings[msg.sender].push(newId);
        categoryListings[om.category].push(newId);
        categoryInventory[om.category].count++;

        emit ListingCreated(newId, msg.sender, om.productName, newPrice, om.category);
        emit InventoryUpdated(om.category, categoryInventory[om.category].count);
    }

    // ═════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS (Frontend-compatible)
    // ═════════════════════════════════════════════════════════════

    function getListing(uint256 id) external view validListing(id) returns (ListingPublic memory) {
        return _buildPublic(id);
    }

    function getAvailableListings() external view returns (ListingPublic[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextListingId; i++) {
            if (_cores[i].status == ListingStatus.Active) count++;
        }
        ListingPublic[] memory result = new ListingPublic[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < nextListingId; i++) {
            if (_cores[i].status == ListingStatus.Active) {
                result[idx++] = _buildPublic(i);
            }
        }
        return result;
    }

    function getListingsByCategory(string calldata category) external view returns (ListingPublic[] memory) {
        uint256[] memory ids = categoryListings[category];
        uint256 count = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (_cores[ids[i]].status == ListingStatus.Active) count++;
        }
        ListingPublic[] memory result = new ListingPublic[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (_cores[ids[i]].status == ListingStatus.Active) {
                result[idx++] = _buildPublic(ids[i]);
            }
        }
        return result;
    }

    function getMyListings() external view returns (ListingPublic[] memory) {
        uint256[] memory ids = sellerListings[msg.sender];
        ListingPublic[] memory result = new ListingPublic[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _buildPublic(ids[i]);
        }
        return result;
    }

    function getMyPurchases() external view returns (ListingPublic[] memory) {
        uint256[] memory ids = buyerOrders[msg.sender];
        ListingPublic[] memory result = new ListingPublic[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _buildPublic(ids[i]);
        }
        return result;
    }

    /// @notice Returns purchases with encrypted handles (only for the buyer).
    function getMyPurchasesWithEncryption() external view returns (ListingWithEncryption[] memory) {
        uint256[] memory ids = buyerOrders[msg.sender];
        ListingWithEncryption[] memory result = new ListingWithEncryption[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _buildEncrypted(ids[i]);
        }
        return result;
    }

    /// @notice Get a single revealed listing with encrypted handles.
    function getRevealedListing(uint256 id) external view validListing(id) returns (ListingWithEncryption memory) {
        ListingCore storage c = _cores[id];
        require(c.buyer == msg.sender, "Not buyer");
        require(_reveals[id].isRevealed, "Not revealed");
        return _buildEncrypted(id);
    }

    function getSellerProfile(address seller) external view returns (SellerProfile memory) {
        return sellers[seller];
    }

    function getRevenueStats() external view returns (uint256 revenue, uint256 fees, uint256 total) {
        return (totalRevenue, totalFees, totalRevenue + totalFees);
    }

    function getSellerListingIds(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }

    function getBuyerOrderIds(address buyer) external view returns (uint256[] memory) {
        return buyerOrders[buyer];
    }

    // ═════════════════════════════════════════════════════════════
    //  ADMIN
    // ═════════════════════════════════════════════════════════════

    function updatePlatformFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function updateDisputeWindow(uint256 newWindow) external onlyRole(ADMIN_ROLE) {
        disputeWindow = newWindow;
        emit DisputeWindowUpdated(newWindow);
    }

    function banSeller(address seller, bool banned) external onlyRole(ADMIN_ROLE) {
        sellers[seller].banned = banned;
    }

    function withdrawFees(address to, euint64 amount) external onlyRole(ADMIN_ROLE) {
        require(FHE.isSenderAllowed(amount), "Not allowed");
        cUSDZ.transfer(to, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ═════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═════════════════════════════════════════════════════════════

    function _isPurchased(ListingCore storage c) internal view returns (bool) {
        return c.status == ListingStatus.Sold || c.status == ListingStatus.Resolved;
    }

    function _buildPublic(uint256 id) internal view returns (ListingPublic memory) {
        ListingCore storage c = _cores[id];
        ListingMeta  storage m = _metas[id];
        return ListingPublic({
            id:             c.id,
            price:          c.price,
            seller:         c.seller,
            buyer:          c.buyer,
            productName:    m.productName,
            category:       m.category,
            description:    m.description,
            imageUrl:       m.imageUrl,
            status:         uint8(c.status),
            isRevealed:     _reveals[id].isRevealed,
            fundsReleased:  c.fundsReleased,
            createdAt:      m.createdAt,
            soldAt:         m.soldAt
        });
    }

    function _buildEncrypted(uint256 id) internal view returns (ListingWithEncryption memory) {
        ListingCore    storage c = _cores[id];
        ListingMeta    storage m = _metas[id];
        ListingReveal  storage r = _reveals[id];

        euint256 code = r.isRevealed ? _encCodes[id] : euint256.wrap(0);
        euint256 pin  = r.isRevealed ? _encPins[id]  : euint256.wrap(0);

        return ListingWithEncryption({
            id:             c.id,
            price:          c.price,
            seller:         c.seller,
            buyer:          c.buyer,
            productName:    m.productName,
            category:       m.category,
            description:    m.description,
            imageUrl:       m.imageUrl,
            status:         uint8(c.status),
            isRevealed:     r.isRevealed,
            fundsReleased:  c.fundsReleased,
            encryptedCode:  code,
            encryptedPin:   pin
        });
    }

    /// @dev Override required by AccessControl + ERC165.
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
