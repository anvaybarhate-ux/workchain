import "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("WorkchainEscrow", function () {
  async function deployFixture() {
    const [client, freelancer, arbiter, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("WorkchainFactory");
    const factory = await Factory.deploy(ethers.ZeroAddress); // pass zero address for mock reputation
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();

    const titles = ["Design", "Development", "Testing"];
    const descriptions = ["Desc 1", "Desc 2", "Desc 3"];
    const amounts = [
      ethers.parseEther("0.5"),
      ethers.parseEther("0.3"),
      ethers.parseEther("0.2"),
    ];
    const deadlines = [1000, 2000, 3000];

    const tx = await factory.connect(client).createProject(
      freelancer.address, titles, descriptions, amounts, deadlines,
      { value: ethers.parseEther("1.0") }
    );

    const receipt = await tx.wait();
    
    // Find the ProjectCreated event to get escrow address
    let escrowAddress = "";
    for (const log of receipt!.logs) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed?.name === "ProjectCreated") {
          escrowAddress = parsed.args.escrowContract;
          break;
        }
      } catch (e) {}
    }

    const escrow = await ethers.getContractAt("WorkchainEscrow", escrowAddress);

    return { factory, escrow, client, freelancer, arbiter, stranger };
  }

  describe("Initialization", function () {
    it("sets correct client address", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      expect(await escrow.client()).to.equal(client.address);
    });

    it("sets correct freelancer address", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      expect(await escrow.freelancer()).to.equal(freelancer.address);
    });

    it("locks correct ETH amount", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(ethers.parseEther("1.0"));
    });

    it("creates correct milestone count", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await escrow.getMilestoneCount()).to.equal(3);
    });

    it("sets first milestone as Active", async function () {
      const { escrow } = await loadFixture(deployFixture);
      const m = await escrow.getMilestone(0);
      expect(m.status).to.equal(1); // 1 = Active
    });

    it("reverts if ETH doesnt match amounts", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      await expect(factory.connect(client).createProject(
        freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("0.5")], [1000],
        { value: ethers.parseEther("1.0") }
      )).to.be.revertedWith("ETH deposit must match milestone sum");
    });

    it("reverts if called twice", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await expect(escrow.initialize(
        client.address, freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000]
      )).to.be.revertedWith("Already initialized");
    });
  });

  describe("Milestone Submission", function () {
    it("freelancer can submit with IPFS hash", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await expect(escrow.connect(freelancer).submitMilestone(0, "QmHash", []))
        .to.emit(escrow, "MilestoneSubmitted");
    });

    it("reverts if non-freelancer submits", async function () {
      const { escrow, stranger } = await loadFixture(deployFixture);
      await expect(escrow.connect(stranger).submitMilestone(0, "QmHash", []))
        .to.be.revertedWith("Only freelancer can call this");
    });

    it("reverts if wrong milestone index", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await expect(escrow.connect(freelancer).submitMilestone(1, "QmHash", []))
        .to.be.revertedWith("Not the active milestone");
    });

    it("reverts if milestone not Active", async function () {
      const { escrow, freelancer, client } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      await expect(escrow.connect(freelancer).submitMilestone(0, "QmHash2", []))
        .to.be.revertedWith("Milestone not active");
    });

    it("stores IPFS hash correctly", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      const m = await escrow.getMilestone(0);
      expect(m.ipfsHash).to.equal("QmHash");
    });

    it("stores proof links correctly", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", ["link1"]);
      // getting struct might not return string array in old ethers but works in v6
      const m = await escrow.getMilestone(0);
      expect(m.proofLinks[0]).to.equal("link1");
    });

    it("sets submittedAt timestamp", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      const m = await escrow.getMilestone(0);
      expect(m.submittedAt).to.be.gt(0);
    });
  });

  describe("Milestone Approval", function () {
    it("client can approve submitted milestone", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      await expect(escrow.connect(client).approveMilestone(0))
        .to.emit(escrow, "MilestoneApproved");
    });

    it("releases correct ETH to freelancer", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      await expect(escrow.connect(client).approveMilestone(0))
        .to.changeEtherBalance(freelancer, ethers.parseEther("0.5"));
    });

    it("activates next milestone after approval", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "QmHash", []);
      await escrow.connect(client).approveMilestone(0);
      expect(await escrow.activeMilestoneIndex()).to.equal(1);
    });

    it("marks project complete on last approval", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await escrow.connect(client).approveMilestone(0);
      await escrow.connect(freelancer).submitMilestone(1, "Qm", []);
      await escrow.connect(client).approveMilestone(1);
      await escrow.connect(freelancer).submitMilestone(2, "Qm", []);
      await expect(escrow.connect(client).approveMilestone(2))
        .to.emit(escrow, "ProjectCompleted");
      
      const p = await escrow.getProject();
      expect(p._status).to.equal(2); // 2 = Complete
    });

    it("reverts if non-client approves", async function () {
      const { escrow, stranger, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await expect(escrow.connect(stranger).approveMilestone(0))
        .to.be.revertedWith("Only client can call this");
    });

    it("reverts if milestone not submitted", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await expect(escrow.connect(client).approveMilestone(0))
        .to.be.revertedWith("Milestone not submitted");
    });
  });

  describe("Milestone Rejection", function () {
    it("client can reject submitted milestone", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await expect(escrow.connect(client).rejectMilestone(0, "Bad code"))
        .to.emit(escrow, "MilestoneRejected");
    });

    it("resets milestone to Active state", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await escrow.connect(client).rejectMilestone(0, "Bad code");
      const m = await escrow.getMilestone(0);
      expect(m.status).to.equal(1); // 1 = Active
    });

    it("clears IPFS hash on rejection", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await escrow.connect(client).rejectMilestone(0, "Bad code");
      const m = await escrow.getMilestone(0);
      expect(m.ipfsHash).to.equal("");
    });

    it("freelancer can resubmit after rejection", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await escrow.connect(client).rejectMilestone(0, "Bad");
      await expect(escrow.connect(freelancer).submitMilestone(0, "Qm2", []))
        .to.emit(escrow, "MilestoneSubmitted");
    });
  });

  describe("Dispute Flow", function () {
    it("client can raise dispute", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await expect(escrow.connect(client).raiseDispute(0, "clientQm", "Late"))
        .to.emit(escrow, "DisputeRaised");
    });

    it("freelancer can raise dispute", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await expect(escrow.connect(freelancer).raiseDispute(0, "freelancerQm", "Client not responding"))
        .to.emit(escrow, "DisputeRaised");
    });

    it("sets 7 day voting deadline", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      const d = await escrow.getDispute();
      const currentBlock = await ethers.provider.getBlock("latest");
      expect(d.votingDeadline).to.equal(currentBlock!.timestamp + 7 * 24 * 60 * 60);
    });

    it("prevents new submissions during dispute", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await expect(escrow.connect(freelancer).submitMilestone(0, "Qm2", []))
        .to.be.revertedWith("Dispute is active");
    });

    it("third party can cast vote", async function () {
      const { escrow, stranger, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await expect(escrow.connect(stranger).castVote(true))
        .to.emit(escrow, "VoteCast");
    });

    it("prevents party from voting own dispute", async function () {
      const { escrow, freelancer, client } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await expect(escrow.connect(freelancer).castVote(true))
        .to.be.revertedWith("Parties cannot vote");
      await expect(escrow.connect(client).castVote(false))
        .to.be.revertedWith("Parties cannot vote");
    });

    it("prevents double voting", async function () {
      const { escrow, freelancer, stranger } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await escrow.connect(stranger).castVote(true);
      await expect(escrow.connect(stranger).castVote(true))
        .to.be.revertedWith("Already voted");
    });

    it("resolves after deadline", async function () {
      const { escrow, freelancer, stranger } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await escrow.connect(stranger).castVote(true);
      
      // increase time by 8 days
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(escrow.resolveDispute())
        .to.emit(escrow, "DisputeResolved");
    });

    it("releases funds to winning side", async function () {
      const { escrow, freelancer, stranger } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      await escrow.connect(stranger).castVote(true); // Vote for freelancer
      
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(escrow.resolveDispute())
        .to.changeEtherBalance(freelancer, ethers.parseEther("0.5"));
    });

    it("reverts resolve before deadline", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0, "Qm", "Stmt");
      
      await expect(escrow.resolveDispute())
        .to.be.revertedWith("Voting still active");
    });
  });

  describe("Access Control", function () {
    it("stranger cannot submit milestone", async function () {
      const { escrow, stranger } = await loadFixture(deployFixture);
      await expect(escrow.connect(stranger).submitMilestone(0, "Qm", []))
        .to.be.revertedWith("Only freelancer can call this");
    });

    it("stranger cannot approve milestone", async function () {
      const { escrow, stranger, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).submitMilestone(0, "Qm", []);
      await expect(escrow.connect(stranger).approveMilestone(0))
        .to.be.revertedWith("Only client can call this");
    });

    it("stranger cannot cancel project", async function () {
      const { escrow, stranger } = await loadFixture(deployFixture);
      await expect(escrow.connect(stranger).cancelProject())
        .to.be.revertedWith("Only client can call this");
    });

    it("only client can cancel before work", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await expect(escrow.connect(client).cancelProject())
        .to.emit(escrow, "ProjectCancelled");
    });
  });

  describe("Edge Cases", function () {
    it("handles single milestone project", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      await expect(factory.connect(client).createProject(
        freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
        { value: ethers.parseEther("1.0") }
      )).to.emit(factory, "ProjectCreated");
    });

    it("handles max 10 milestone project", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      const titles = new Array(10).fill("M");
      const desc = new Array(10).fill("D");
      const amt = new Array(10).fill(ethers.parseEther("0.1"));
      const dead = new Array(10).fill(1000);
      await expect(factory.connect(client).createProject(
        freelancer.address, titles, desc, amt, dead,
        { value: ethers.parseEther("1.0") }
      )).to.emit(factory, "ProjectCreated");
    });

    it("reverts on 11 milestones", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      const titles = new Array(11).fill("M");
      const desc = new Array(11).fill("D");
      const amt = new Array(11).fill(ethers.parseEther("0.1"));
      const dead = new Array(11).fill(1000);
      // Wait, 11 * 0.1 = 1.1 ETH
      await expect(factory.connect(client).createProject(
        freelancer.address, titles, desc, amt, dead,
        { value: ethers.parseEther("1.1") }
      )).to.be.revertedWith("Milestones must be between 1 and 10");
    });

    it("reverts on 0 milestones", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      await expect(factory.connect(client).createProject(
        freelancer.address, [], [], [], [],
        { value: ethers.parseEther("1.0") }
      )).to.be.revertedWith("ETH deposit must match milestone sum");
    });

    it("reverts on empty title", async function () {
      const { factory, client, freelancer } = await loadFixture(deployFixture);
      await expect(factory.connect(client).createProject(
        freelancer.address, [""], ["D"], [ethers.parseEther("1.0")], [1000],
        { value: ethers.parseEther("1.0") }
      )).to.be.revertedWith("Title cannot be empty");
    });
  });
});
