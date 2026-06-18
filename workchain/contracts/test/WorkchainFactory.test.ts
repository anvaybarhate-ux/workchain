import "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("WorkchainFactory", function () {
  async function deployFixture() {
    const [owner, client, freelancer] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("WorkchainReputation");
    const reputation = await Reputation.deploy();

    const Factory = await ethers.getContractFactory("WorkchainFactory");
    const factory = await Factory.deploy(await reputation.getAddress());

    await reputation.setFactory(await factory.getAddress());

    return { factory, reputation, owner, client, freelancer };
  }

  it("deploys escrow per createProject call", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await expect(factory.connect(client).createProject(
      freelancer.address,
      ["M1"],
      ["Desc"],
      [ethers.parseEther("1")],
      [1000],
      { value: ethers.parseEther("1") }
    )).to.emit(factory, "ProjectCreated");
  });

  it("tracks clientProjects correctly", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await factory.connect(client).createProject(
      freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
      { value: ethers.parseEther("1") }
    );

    const clientProjects = await factory.getClientProjects(client.address);
    expect(clientProjects.length).to.equal(1);
  });

  it("tracks freelancerProjects correctly", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await factory.connect(client).createProject(
      freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
      { value: ethers.parseEther("1") }
    );

    const fProjects = await factory.getFreelancerProjects(freelancer.address);
    expect(fProjects.length).to.equal(1);
  });

  it("increments totalProjectsDeployed", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await factory.connect(client).createProject(
      freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
      { value: ethers.parseEther("1") }
    );
    expect(await factory.getTotalProjects()).to.equal(1);
  });

  it("reverts if freelancer == client", async function () {
    const { factory, client } = await loadFixture(deployFixture);
    
    await expect(factory.connect(client).createProject(
      client.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
      { value: ethers.parseEther("1") }
    )).to.be.revertedWith("Client cannot be freelancer");
  });

  it("reverts if ETH doesnt match amounts", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await expect(factory.connect(client).createProject(
      freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("2")], [1000],
      { value: ethers.parseEther("1") }
    )).to.be.revertedWith("ETH deposit must match milestone sum");
  });

  it("isWorkchainProject returns true", async function () {
    const { factory, client, freelancer } = await loadFixture(deployFixture);
    
    await factory.connect(client).createProject(
      freelancer.address, ["M1"], ["Desc"], [ethers.parseEther("1")], [1000],
      { value: ethers.parseEther("1") }
    );

    const clientProjects = await factory.getClientProjects(client.address);
    expect(await factory.isValidProject(clientProjects[0])).to.be.true;
  });
});
