// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWorkchainReputation {
    struct ReputationData {
        uint256 tokenId;
        uint256 score;
        string tier;
        uint256 totalJobs;
        uint256 disputeRate;
        uint256 totalValueWei;
        uint256 lastUpdated;
    }

    event ReputationMinted(address freelancer, uint256 tokenId);
    event ReputationUpdated(address freelancer, uint256 newScore, string newTier, uint256 totalJobs);
    event ScoreChanged(address freelancer, uint256 oldScore, uint256 newScore);

    function mintReputation(address freelancer) external;
    function updateReputation(
        address freelancer,
        uint256 newScore,
        uint256 totalJobs,
        uint256 disputeRate,
        uint256 totalValueWei
    ) external;

    function getReputation(address freelancer) external view returns (ReputationData memory);
    function getScore(address freelancer) external view returns (uint256);
    function getTier(address freelancer) external view returns (string memory);
}
