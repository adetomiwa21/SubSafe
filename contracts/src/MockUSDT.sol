// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only 6-decimal USDT clone with an open faucet. Used in tests and local demos.
contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD (Mock)", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
