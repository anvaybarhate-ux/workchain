// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./WorkchainEscrow.sol";

contract WorkchainFactory is Ownable {
    address public reputationContract;
    address[] public allProjects;
    
    mapping(address => address[]) public clientProjects;
    mapping(address => address[]) public freelancerProjects;
    mapping(address => bool) public isWorkchainProject;
    
    uint256 public totalProjectsDeployed;

    event ProjectCreated(
        address indexed escrowContract,
        address indexed client,
        address indexed freelancer,
        uint256 totalValue,
        uint256 milestoneCount,
        uint256 timestamp
    );

    constructor(address _reputationContract) Ownable(msg.sender) {
        reputationContract = _reputationContract;
    }

    function createProject(
        address freelancer,
        string[] memory titles,
        string[] memory descriptions,
        uint256[] memory amounts,
        uint256[] memory deadlines
    ) external payable returns (address) {
        require(msg.value > 0, "Must deposit ETH");
        
        uint256 totalAmount = 0;
        for(uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value == totalAmount, "ETH deposit must match milestone sum");
        require(freelancer != address(0), "Invalid freelancer address");
        require(freelancer != msg.sender, "Client cannot be freelancer");

        WorkchainEscrow escrow = new WorkchainEscrow();
        
        escrow.initialize{value: msg.value}(
            msg.sender,
            freelancer,
            titles,
            descriptions,
            amounts,
            deadlines
        );

        address escrowAddress = address(escrow);
        
        allProjects.push(escrowAddress);
        clientProjects[msg.sender].push(escrowAddress);
        freelancerProjects[freelancer].push(escrowAddress);
        isWorkchainProject[escrowAddress] = true;
        
        totalProjectsDeployed++;

        emit ProjectCreated(
            escrowAddress,
            msg.sender,
            freelancer,
            msg.value,
            titles.length,
            block.timestamp
        );

        return escrowAddress;
    }

    function getClientProjects(address client) external view returns (address[] memory) {
        return clientProjects[client];
    }

    function getFreelancerProjects(address freelancer) external view returns (address[] memory) {
        return freelancerProjects[freelancer];
    }

    function getAllProjects() external view returns (address[] memory) {
        return allProjects;
    }

    function getTotalProjects() external view returns (uint256) {
        return totalProjectsDeployed;
    }

    function setReputationContract(address _rep) external onlyOwner {
        reputationContract = _rep;
    }

    function isValidProject(address project) external view returns (bool) {
        return isWorkchainProject[project];
    }
}
