// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SubSafe — recurring USDT subscriptions on BOTChain
/// @notice Merchants publish plans, subscribers approve USDT once, and anyone
///         (merchant, keeper bot, or the subscriber) can trigger a charge when
///         a period is due. The price is locked at subscribe time, so a merchant
///         can never charge an existing subscriber more than they agreed to.
contract SubSafe is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Plan {
        address merchant;
        uint96 price; // in token units (USDT = 6 decimals)
        uint32 period; // seconds between charges
        bool active;
        uint64 subscriberCount;
        string name;
        string metadata; // free-form: description / image URL / JSON
    }

    enum Status {
        None,
        Active,
        PastDue,
        Cancelled
    }

    struct Subscription {
        address subscriber;
        uint64 planId;
        uint96 price; // locked at subscribe time
        uint32 period; // locked at subscribe time
        uint64 paidUntil; // access valid until this timestamp
        uint64 startedAt;
        uint32 chargeCount;
        Status status;
    }

    IERC20 public immutable token;

    uint16 public constant MAX_FEE_BPS = 500; // 5% hard cap
    uint32 public constant MIN_PERIOD = 60; // 1 minute (lets demos show real auto-charges)

    uint16 public feeBps;
    address public treasury;

    Plan[] internal _plans;
    Subscription[] internal _subs;

    mapping(address => uint256[]) internal _subsByUser;
    mapping(address => uint256[]) internal _plansByMerchant;
    mapping(uint256 => uint256[]) internal _subsByPlan;
    /// @dev subscriber => planId => subId + 1 (0 means none)
    mapping(address => mapping(uint256 => uint256)) internal _activeSubOf;

    event PlanCreated(uint256 indexed planId, address indexed merchant, string name, uint256 price, uint32 period);
    event PlanUpdated(uint256 indexed planId, bool active, string metadata);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint256 price);
    event Charged(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint256 amount, uint256 fee, uint64 paidUntil);
    event ChargeFailed(uint256 indexed subId, address indexed subscriber, string reason);
    event Cancelled(uint256 indexed subId, address indexed by);
    event FeeUpdated(uint16 feeBps, address treasury);

    error InvalidPlan();
    error PlanInactive();
    error AlreadySubscribed();
    error NotSubscriber();
    error NotDue();
    error NotChargeable();
    error BadParams();

    constructor(IERC20 _token, address _treasury, uint16 _feeBps) Ownable(msg.sender) {
        if (address(_token) == address(0) || _treasury == address(0) || _feeBps > MAX_FEE_BPS) revert BadParams();
        token = _token;
        treasury = _treasury;
        feeBps = _feeBps;
    }

    // ───────────────────────── Merchants ─────────────────────────

    function createPlan(string calldata name, string calldata metadata, uint96 price, uint32 period)
        external
        returns (uint256 planId)
    {
        if (price == 0 || period < MIN_PERIOD || bytes(name).length == 0) revert BadParams();
        planId = _plans.length;
        _plans.push(Plan(msg.sender, price, period, true, 0, name, metadata));
        _plansByMerchant[msg.sender].push(planId);
        emit PlanCreated(planId, msg.sender, name, price, period);
    }

    /// @notice Merchants can pause a plan (no new subscribers) or edit metadata.
    ///         Price and period are immutable so existing subscribers stay safe.
    function updatePlan(uint256 planId, bool active, string calldata metadata) external {
        Plan storage p = _plan(planId);
        if (p.merchant != msg.sender) revert InvalidPlan();
        p.active = active;
        p.metadata = metadata;
        emit PlanUpdated(planId, active, metadata);
    }

    // ───────────────────────── Subscribers ─────────────────────────

    /// @notice Subscribe and pay the first period immediately.
    ///         Caller must have approved at least `price` USDT (approve more to enable auto-renew).
    function subscribe(uint256 planId) external nonReentrant returns (uint256 subId) {
        Plan storage p = _plan(planId);
        if (!p.active) revert PlanInactive();

        uint256 existing = _activeSubOf[msg.sender][planId];
        if (existing != 0) {
            Status s = _subs[existing - 1].status;
            if (s == Status.Active || s == Status.PastDue) revert AlreadySubscribed();
        }

        subId = _subs.length;
        _subs.push(
            Subscription({
                subscriber: msg.sender,
                planId: uint64(planId),
                price: p.price,
                period: p.period,
                paidUntil: uint64(block.timestamp),
                startedAt: uint64(block.timestamp),
                chargeCount: 0,
                status: Status.Active
            })
        );
        _subsByUser[msg.sender].push(subId);
        _subsByPlan[planId].push(subId);
        _activeSubOf[msg.sender][planId] = subId + 1;
        p.subscriberCount++;

        emit Subscribed(subId, planId, msg.sender, p.price);
        _pull(subId, _subs[subId], p.merchant); // reverts if first payment fails
    }

    /// @notice Cancel anytime. Access continues until `paidUntil`; no further charges.
    function cancel(uint256 subId) external {
        Subscription storage s = _sub(subId);
        Plan storage p = _plans[s.planId];
        if (msg.sender != s.subscriber && msg.sender != p.merchant) revert NotSubscriber();
        if (s.status == Status.Cancelled || s.status == Status.None) revert NotChargeable();
        s.status = Status.Cancelled;
        if (p.subscriberCount > 0) p.subscriberCount--;
        emit Cancelled(subId, msg.sender);
    }

    // ───────────────────────── Charging ─────────────────────────

    /// @notice Charge one due subscription. Reverts if not due or the transfer fails.
    ///         The subscriber can call this to manually renew a PastDue subscription.
    function charge(uint256 subId) external nonReentrant {
        Subscription storage s = _sub(subId);
        if (s.status != Status.Active && s.status != Status.PastDue) revert NotChargeable();
        if (block.timestamp < s.paidUntil) revert NotDue();
        _pull(subId, s, _plans[s.planId].merchant);
    }

    /// @notice Keeper-friendly batch charge. Never reverts on individual failures:
    ///         subscriptions that can't pay are flagged PastDue and skipped.
    /// @return charged number of successful charges
    function chargeMany(uint256[] calldata subIds) external nonReentrant returns (uint256 charged) {
        for (uint256 i; i < subIds.length; ++i) {
            uint256 id = subIds[i];
            if (id >= _subs.length) continue;
            Subscription storage s = _subs[id];
            if (s.status != Status.Active && s.status != Status.PastDue) continue;
            if (block.timestamp < s.paidUntil) continue;

            string memory reason = _payBlocker(s);
            if (bytes(reason).length != 0) {
                if (s.status != Status.PastDue) s.status = Status.PastDue;
                emit ChargeFailed(id, s.subscriber, reason);
                continue;
            }
            _pull(id, s, _plans[s.planId].merchant);
            charged++;
        }
    }

    /// @dev Empty string means the subscriber can pay this period.
    function _payBlocker(Subscription storage s) internal view returns (string memory) {
        if (token.balanceOf(s.subscriber) < s.price) return "insufficient balance";
        if (token.allowance(s.subscriber, address(this)) < s.price) return "insufficient allowance";
        return "";
    }

    function _pull(uint256 subId, Subscription storage s, address merchant) internal {
        uint256 amount = s.price;
        uint256 fee = (amount * feeBps) / 10_000;

        // If a subscriber lapsed, restart the period from now instead of back-charging missed months.
        uint64 base = s.paidUntil > block.timestamp ? s.paidUntil : uint64(block.timestamp);
        s.paidUntil = base + s.period;
        s.chargeCount++;
        s.status = Status.Active;

        token.safeTransferFrom(s.subscriber, merchant, amount - fee);
        if (fee != 0) token.safeTransferFrom(s.subscriber, treasury, fee);

        emit Charged(subId, s.planId, s.subscriber, amount, fee, s.paidUntil);
    }

    // ───────────────────────── Admin ─────────────────────────

    function setFee(uint16 _feeBps, address _treasury) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS || _treasury == address(0)) revert BadParams();
        feeBps = _feeBps;
        treasury = _treasury;
        emit FeeUpdated(_feeBps, _treasury);
    }

    // ───────────────────────── Views ─────────────────────────

    /// @notice Merchants call this to gate content: does `user` currently have access to `planId`?
    function hasAccess(address user, uint256 planId) external view returns (bool) {
        uint256 idx = _activeSubOf[user][planId];
        if (idx == 0) return false;
        return _subs[idx - 1].paidUntil > block.timestamp;
    }

    function isDue(uint256 subId) public view returns (bool) {
        if (subId >= _subs.length) return false;
        Subscription storage s = _subs[subId];
        return (s.status == Status.Active || s.status == Status.PastDue) && block.timestamp >= s.paidUntil;
    }

    /// @notice Returns all currently due subscription ids for a plan (for keepers / merchant dashboards).
    function dueSubsOfPlan(uint256 planId) external view returns (uint256[] memory out) {
        uint256[] storage ids = _subsByPlan[planId];
        uint256 n;
        out = new uint256[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            if (isDue(ids[i])) out[n++] = ids[i];
        }
        assembly {
            mstore(out, n)
        }
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return _plan(planId);
    }

    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return _sub(subId);
    }

    function planCount() external view returns (uint256) {
        return _plans.length;
    }

    function subscriptionCount() external view returns (uint256) {
        return _subs.length;
    }

    function subsOf(address user) external view returns (uint256[] memory) {
        return _subsByUser[user];
    }

    function plansOf(address merchant) external view returns (uint256[] memory) {
        return _plansByMerchant[merchant];
    }

    function subsOfPlan(uint256 planId) external view returns (uint256[] memory) {
        return _subsByPlan[planId];
    }

    function _plan(uint256 planId) internal view returns (Plan storage) {
        if (planId >= _plans.length) revert InvalidPlan();
        return _plans[planId];
    }

    function _sub(uint256 subId) internal view returns (Subscription storage) {
        if (subId >= _subs.length) revert NotSubscriber();
        return _subs[subId];
    }
}
