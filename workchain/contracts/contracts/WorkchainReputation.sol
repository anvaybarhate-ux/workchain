// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IWorkchainReputation.sol";

contract WorkchainReputation is IWorkchainReputation, ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    address public factory;
    address public authorizedUpdater;

    mapping(address => uint256) public walletToTokenId;
    mapping(uint256 => ReputationData) public tokenData;
    mapping(address => bool) public hasMinted;

    constructor() ERC721("Workchain Reputation", "WCREP") Ownable(msg.sender) {}

    function mintReputation(address freelancer) external override {
        require(msg.sender == factory || msg.sender == owner(), "Not authorized");
        require(!hasMinted[freelancer], "Already minted");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(freelancer, newTokenId);
        
        tokenData[newTokenId] = ReputationData({
            tokenId: newTokenId,
            score: 50,
            tier: "bronze",
            totalJobs: 0,
            disputeRate: 0,
            totalValueWei: 0,
            lastUpdated: block.timestamp
        });

        walletToTokenId[freelancer] = newTokenId;
        hasMinted[freelancer] = true;

        emit ReputationMinted(freelancer, newTokenId);
    }

    function updateReputation(
        address freelancer,
        uint256 newScore,
        uint256 totalJobs,
        uint256 disputeRate,
        uint256 totalValueWei
    ) external override {
        require(msg.sender == authorizedUpdater || msg.sender == owner() || msg.sender == factory, "Not authorized");
        require(hasMinted[freelancer], "Not minted");

        uint256 clampedScore = newScore;
        if (clampedScore > 100) {
            clampedScore = 100;
        }
        
        string memory newTier;
        if (clampedScore <= 40) {
            newTier = "bronze";
        } else if (clampedScore <= 65) {
            newTier = "silver";
        } else if (clampedScore <= 88) {
            newTier = "gold";
        } else {
            newTier = "platinum";
        }

        uint256 tokenId = walletToTokenId[freelancer];
        uint256 oldScore = tokenData[tokenId].score;

        tokenData[tokenId].score = clampedScore;
        tokenData[tokenId].tier = newTier;
        tokenData[tokenId].totalJobs = totalJobs;
        tokenData[tokenId].disputeRate = disputeRate;
        tokenData[tokenId].totalValueWei = totalValueWei;
        tokenData[tokenId].lastUpdated = block.timestamp;

        emit ScoreChanged(freelancer, oldScore, clampedScore);
        emit ReputationUpdated(freelancer, clampedScore, newTier, totalJobs);
    }

    function getReputation(address freelancer) external view override returns (ReputationData memory) {
        return tokenData[walletToTokenId[freelancer]];
    }

    function getScore(address freelancer) external view override returns (uint256) {
        return tokenData[walletToTokenId[freelancer]].score;
    }

    function getTier(address freelancer) external view override returns (string memory) {
        return tokenData[walletToTokenId[freelancer]].tier;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        ReputationData memory data = tokenData[tokenId];

        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name": "Workchain Reputation #', tokenId.toString(), '",',
                '"description": "On-chain professional identity asset - Workchain Protocol",',
                '"attributes": [',
                    '{"trait_type":"Score","value":', data.score.toString(), '},',
                    '{"trait_type":"Tier","value":"', data.tier, '"},',
                    '{"trait_type":"Total Jobs","value":', data.totalJobs.toString(), '},',
                    '{"trait_type":"Dispute Rate","value":', data.disputeRate.toString(), '}',
                ']',
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    // SOULBOUND LOGIC
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "WorkchainReputation: Soulbound token - transfers disabled");
        return super._update(to, tokenId, auth);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    function setAuthorizedUpdater(address _updater) external onlyOwner {
        authorizedUpdater = _updater;
    }
}
