// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWorkchainEscrow {
    enum ProjectStatus { Pending, Active, Complete, Disputed, Cancelled }
    enum MilestoneStatus { Pending, Active, Submitted, Approved, Disputed, Released }

    struct Milestone {
        string title;
        string description;
        uint256 amount;
        uint256 deadline;
        MilestoneStatus status;
        string ipfsHash;
        string[] proofLinks;
        uint256 submittedAt;
        uint256 approvedAt;
    }

    struct DisputeData {
        uint256 milestoneIndex;
        address raisedBy;
        string freelancerEvidence;
        string clientEvidence;
        uint256 votesFreelancer;
        uint256 votesClient;
        uint256 votingDeadline;
        bool resolved;
        address winner;
    }

    event ProjectInitialized(address client, address freelancer, uint256 totalValue, uint256 milestoneCount);
    event FundsDeposited(address from, uint256 amount);
    event MilestoneActivated(uint256 index, uint256 amount);
    event MilestoneSubmitted(uint256 index, string ipfsHash, address freelancer);
    event MilestoneApproved(uint256 index, uint256 amountReleased, address freelancer);
    event MilestoneRejected(uint256 index, address client, string feedback);
    event DisputeRaised(uint256 milestoneIndex, address raisedBy, uint256 votingDeadline);
    event VoteCast(address voter, bool votedForFreelancer, uint256 votesFreelancer, uint256 votesClient);
    event DisputeResolved(address winner, uint256 amountReleased);
    event FundsReleased(address to, uint256 amount);
    event ProjectCompleted(address freelancer, uint256 totalPaid);
    event ProjectCancelled(address cancelledBy, uint256 refunded);

    function initialize(
        address _client,
        address _freelancer,
        string[] memory _titles,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint256[] memory _deadlines
    ) external payable;

    function submitMilestone(uint256 milestoneIndex, string memory ipfsHash, string[] memory proofLinks) external;
    function approveMilestone(uint256 milestoneIndex) external;
    function rejectMilestone(uint256 milestoneIndex, string memory feedback) external;
    function raiseDispute(uint256 milestoneIndex, string memory evidenceIpfsHash, string memory statement) external;
    function submitEvidence(string memory evidenceIpfsHash) external;
    function castVote(bool voteForFreelancer) external;
    function resolveDispute() external;
    function cancelProject() external;

    function client() external view returns (address);
    function freelancer() external view returns (address);
    function factory() external view returns (address);
    function totalValue() external view returns (uint256);
    function isInitialized() external view returns (bool);
    function disputeActive() external view returns (bool);
    function status() external view returns (ProjectStatus);
    function activeMilestoneIndex() external view returns (uint256);

    function getProject() external view returns (
        address _client,
        address _freelancer,
        address _factory,
        uint256 _totalValue,
        bool _isInitialized,
        bool _disputeActive,
        ProjectStatus _status,
        uint256 _activeMilestoneIndex
    );
    function getMilestone(uint256 index) external view returns (Milestone memory);
    function getMilestoneCount() external view returns (uint256);
    function getEscrowBalance() external view returns (uint256);
    function getDispute() external view returns (DisputeData memory);
}
