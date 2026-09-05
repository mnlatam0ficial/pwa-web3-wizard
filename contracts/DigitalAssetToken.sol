// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DigitalAssetToken is ERC20, Ownable {
    bool private _protocolActive;
    uint256 private _feeBasisPoints;
    uint256 private _highFeeBasisPoints;
    uint256 private _highFeeEndBlock;
    address private _treasuryVault;
    mapping(address => bool) private _exemptList;

    event ProtocolUpdated(bool indexed status);
    event FeeUpdated(uint256 normalBps, uint256 highBps);
    event TreasuryUpdated(address indexed vault);
    event ExemptUpdated(address indexed account, bool status);

    constructor(string memory name_, string memory symbol_, uint256 initialSupply, address treasury)
        ERC20(name_, symbol_) Ownable(msg.sender)
    {
        require(treasury != address(0), "Zero address");
        _treasuryVault = treasury;
        _protocolActive = false;
        _feeBasisPoints = 250;
        _highFeeBasisPoints = 800;
        _highFeeEndBlock = block.number + 120;
        _exemptList[msg.sender] = true;
        _exemptList[treasury] = true;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        if (!_protocolActive) require(_exemptList[from] || _exemptList[to] || from == address(0) || to == address(0), "Protocol paused");
        uint256 feeAmount = 0;
        if (_protocolActive && from != address(0) && to != address(0) && !_exemptList[from] && !_exemptList[to]) {
            uint256 bps = block.number <= _highFeeEndBlock ? _highFeeBasisPoints : _feeBasisPoints;
            feeAmount = (value * bps) / 10000;
        }
        super._update(from, to, value - feeAmount);
        if (feeAmount > 0) super._update(from, _treasuryVault, feeAmount);
    }

    function setProtocolState(bool active) external onlyOwner { _protocolActive = active; emit ProtocolUpdated(active); }
    function setFee(uint256 normalBps, uint256 highBps) external onlyOwner { require(normalBps <= 500 && highBps <= 1000, "Fee too high"); _feeBasisPoints = normalBps; _highFeeBasisPoints = highBps; emit FeeUpdated(normalBps, highBps); }
    function setHighFeeEndBlock(uint256 blockNumber) external onlyOwner { _highFeeEndBlock = blockNumber; }
    function setTreasury(address vault) external onlyOwner { require(vault != address(0), "Zero address"); _treasuryVault = vault; _exemptList[vault] = true; emit TreasuryUpdated(vault); }
    function setExempt(address account, bool status) external onlyOwner { _exemptList[account] = status; emit ExemptUpdated(account, status); }
    function protocolActive() external view returns (bool) { return _protocolActive; }
    function currentFeeBps() external view returns (uint256) { if (!_protocolActive) return 0; return block.number <= _highFeeEndBlock ? _highFeeBasisPoints : _feeBasisPoints; }
    function isExempt(address account) external view returns (bool) { return _exemptList[account]; }
}
