// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWorkchainEscrow.sol";

contract WorkchainEscrow is IWorkchainEscrow, ReentrancyGuard, Pausable, Ownable {
    address public override client;
    address public override freelancer;
    address public override factory;
    uint256 public override totalValue;
    bool public override isInitialized;
    bool public override disputeActive;

    ProjectStatus public override status;
    
    Milestone[] public milestones;
    uint256 public override activeMilestoneIndex;

    DisputeData public currentDispute;
    mapping(address => bool) public hasVoted;

    modifier onlyClient() {
        require(msg.sender == client, "Only client can call this");
        _;
    }

    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "Only freelancer can call this");
        _;
    }

    modifier onlyParties() {
        require(msg.sender == client || msg.sender == freelancer, "Only client or freelancer");
        _;
    }

    modifier projectActive() {
        require(status == ProjectStatus.Active, "Project is not active");
        _;
    }

    modifier noActiveDispute() {
        require(!disputeActive, "Dispute is active");
        _;
    }

    modifier validMilestoneIndex(uint256 i) {
        require(i < milestones.length, "Invalid milestone index");
        _;
    }

    constructor() Ownable(msg.sender) {
        factory = msg.sender;
    }

    function initialize(
        address _client,
        address _freelancer,
        string[] memory _titles,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint256[] memory _deadlines
    ) external payable override {
        require(!isInitialized, "Already initialized");
        require(msg.sender == factory, "Only factory can initialize");
        require(_titles.length == _descriptions.length && _titles.length == _amounts.length && _titles.length == _deadlines.length, "Arrays length mismatch");
        require(_titles.length >= 1 && _titles.length <= 10, "Milestones must be between 1 and 10");
        
        uint256 sum = 0;
        for(uint256 i = 0; i < _amounts.length; i++) {
            sum += _amounts[i];
        }
        require(msg.value == sum, "ETH must match sum of amounts");
        
        require(bytes(_titles[0]).length > 0, "Title cannot be empty");

        client = _client;
        freelancer = _freelancer;
        totalValue = sum;

        for(uint256 i = 0; i < _titles.length; i++) {
            require(bytes(_titles[i]).length > 0, "Title cannot be empty");
            Milestone memory newMilestone = Milestone({
                title: _titles[i],
                description: _descriptions[i],
                amount: _amounts[i],
                deadline: _deadlines[i],
                status: MilestoneStatus.Pending,
                ipfsHash: "",
                proofLinks: new string[](0),
                submittedAt: 0,
                approvedAt: 0
            });
            milestones.push(newMilestone);
        }

        milestones[0].status = MilestoneStatus.Active;
        status = ProjectStatus.Active;
        isInitialized = true;

        emit ProjectInitialized(client, freelancer, totalValue, milestones.length);
        emit FundsDeposited(msg.sender, totalValue);
        emit MilestoneActivated(0, milestones[0].amount);
    }

    function submitMilestone(
        uint256 milestoneIndex,
        string memory ipfsHash,
        string[] memory proofLinks
    ) external override onlyFreelancer projectActive noActiveDispute validMilestoneIndex(milestoneIndex) {
        require(milestoneIndex == activeMilestoneIndex, "Not the active milestone");
        require(milestones[milestoneIndex].status == MilestoneStatus.Active, "Milestone not active");

        milestones[milestoneIndex].ipfsHash = ipfsHash;
        milestones[milestoneIndex].proofLinks = proofLinks;
        milestones[milestoneIndex].status = MilestoneStatus.Submitted;
        milestones[milestoneIndex].submittedAt = block.timestamp;

        emit MilestoneSubmitted(milestoneIndex, ipfsHash, freelancer);
    }

    function approveMilestone(uint256 milestoneIndex) external override onlyClient projectActive noActiveDispute nonReentrant validMilestoneIndex(milestoneIndex) {
        require(milestoneIndex == activeMilestoneIndex, "Not the active milestone");
        require(milestones[milestoneIndex].status == MilestoneStatus.Submitted, "Milestone not submitted");

        milestones[milestoneIndex].status = MilestoneStatus.Released;
        milestones[milestoneIndex].approvedAt = block.timestamp;

        uint256 amount = milestones[milestoneIndex].amount;
        (bool success, ) = freelancer.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsReleased(freelancer, amount);
        emit MilestoneApproved(milestoneIndex, amount, freelancer);

        if (milestoneIndex == milestones.length - 1) {
            status = ProjectStatus.Complete;
            emit ProjectCompleted(freelancer, totalValue);
        } else {
            activeMilestoneIndex++;
            milestones[activeMilestoneIndex].status = MilestoneStatus.Active;
            emit MilestoneActivated(activeMilestoneIndex, milestones[activeMilestoneIndex].amount);
        }
    }

    function rejectMilestone(
        uint256 milestoneIndex,
        string memory feedback
    ) external override onlyClient projectActive noActiveDispute validMilestoneIndex(milestoneIndex) {
        require(milestoneIndex == activeMilestoneIndex, "Not the active milestone");
        require(milestones[milestoneIndex].status == MilestoneStatus.Submitted, "Milestone not submitted");

        milestones[milestoneIndex].status = MilestoneStatus.Active;
        milestones[milestoneIndex].ipfsHash = "";
        
        // Optionally clear proofLinks
        delete milestones[milestoneIndex].proofLinks;

        emit MilestoneRejected(milestoneIndex, client, feedback);
    }

    function raiseDispute(
        uint256 milestoneIndex,
        string memory evidenceIpfsHash,
        string memory statement
    ) external override onlyParties projectActive validMilestoneIndex(milestoneIndex) {
        require(!disputeActive, "Dispute already active");
        require(milestones[milestoneIndex].status == MilestoneStatus.Submitted || milestones[milestoneIndex].status == MilestoneStatus.Active, "Invalid milestone status for dispute");
        require(milestoneIndex == activeMilestoneIndex, "Can only dispute active milestone");

        uint256 deadline = block.timestamp + 7 days;
        
        currentDispute = DisputeData({
            milestoneIndex: milestoneIndex,
            raisedBy: msg.sender,
            freelancerEvidence: msg.sender == freelancer ? evidenceIpfsHash : "",
            clientEvidence: msg.sender == client ? evidenceIpfsHash : "",
            votesFreelancer: 0,
            votesClient: 0,
            votingDeadline: deadline,
            resolved: false,
            winner: address(0)
        });

        disputeActive = true;
        milestones[milestoneIndex].status = MilestoneStatus.Disputed;

        emit DisputeRaised(milestoneIndex, msg.sender, deadline);
    }

    function submitEvidence(string memory evidenceIpfsHash) external override onlyParties {
        require(disputeActive, "No active dispute");
        require(!currentDispute.resolved, "Dispute resolved");

        if (msg.sender == freelancer) {
            currentDispute.freelancerEvidence = evidenceIpfsHash;
        } else {
            currentDispute.clientEvidence = evidenceIpfsHash;
        }
    }

    function castVote(bool voteForFreelancer) external override {
        require(disputeActive, "No active dispute");
        require(!currentDispute.resolved, "Dispute resolved");
        require(block.timestamp < currentDispute.votingDeadline, "Voting ended");
        require(msg.sender != client && msg.sender != freelancer, "Parties cannot vote");
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;

        if (voteForFreelancer) {
            currentDispute.votesFreelancer++;
        } else {
            currentDispute.votesClient++;
        }

        emit VoteCast(msg.sender, voteForFreelancer, currentDispute.votesFreelancer, currentDispute.votesClient);
    }

    function resolveDispute() external override nonReentrant {
        require(disputeActive, "No active dispute");
        require(block.timestamp >= currentDispute.votingDeadline, "Voting still active");
        require(!currentDispute.resolved, "Dispute already resolved");

        currentDispute.resolved = true;
        disputeActive = false;

        address winner;
        if (currentDispute.votesFreelancer >= currentDispute.votesClient) {
            winner = freelancer;
        } else {
            winner = client;
        }
        
        currentDispute.winner = winner;
        uint256 milestoneIndex = currentDispute.milestoneIndex;
        uint256 amount = milestones[milestoneIndex].amount;

        milestones[milestoneIndex].status = MilestoneStatus.Released;

        if (winner == freelancer) {
            (bool success, ) = freelancer.call{value: amount}("");
            require(success, "Transfer failed");
            emit FundsReleased(freelancer, amount);
            
            if (milestoneIndex == milestones.length - 1) {
                status = ProjectStatus.Complete;
                emit ProjectCompleted(freelancer, totalValue);
            } else {
                activeMilestoneIndex++;
                milestones[activeMilestoneIndex].status = MilestoneStatus.Active;
                emit MilestoneActivated(activeMilestoneIndex, milestones[activeMilestoneIndex].amount);
                status = ProjectStatus.Active;
            }
        } else {
            (bool success, ) = client.call{value: amount}("");
            require(success, "Transfer failed");
            emit FundsReleased(client, amount);
            
            status = ProjectStatus.Cancelled;
            emit ProjectCancelled(client, amount);
        }

        emit DisputeResolved(winner, amount);
    }

    function cancelProject() external override onlyClient nonReentrant {
        require(status == ProjectStatus.Pending || status == ProjectStatus.Active, "Cannot cancel in current state");
        require(activeMilestoneIndex == 0, "Work has started");
        require(milestones[0].status == MilestoneStatus.Active || milestones[0].status == MilestoneStatus.Pending, "Cannot cancel now");
        
        uint256 balance = address(this).balance;
        
        status = ProjectStatus.Cancelled;
        
        if (balance > 0) {
            (bool success, ) = client.call{value: balance}("");
            require(success, "Transfer failed");
        }
        
        emit ProjectCancelled(client, balance);
    }

    function getProject() external view override returns (
        address _client,
        address _freelancer,
        address _factory,
        uint256 _totalValue,
        bool _isInitialized,
        bool _disputeActive,
        ProjectStatus _status,
        uint256 _activeMilestoneIndex
    ) {
        return (client, freelancer, factory, totalValue, isInitialized, disputeActive, status, activeMilestoneIndex);
    }

    function getMilestone(uint256 index) external view override validMilestoneIndex(index) returns (Milestone memory) {
        return milestones[index];
    }

    function getMilestoneCount() external view override returns (uint256) {
        return milestones.length;
    }

    function getEscrowBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    function getDispute() external view override returns (DisputeData memory) {
        return currentDispute;
    }

    receive() external payable {}
}
