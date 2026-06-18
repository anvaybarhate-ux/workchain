import "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("WorkchainReputation", function () {
  async function deployFixture() {
    const [owner, factoryMock, freelancer, stranger] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("WorkchainReputation");
    const reputation = await Reputation.deploy();

    await reputation.setFactory(factoryMock.address);

    return { reputation, owner, factoryMock, freelancer, stranger };
  }

  it("mints NFT with score 50 bronze tier", async function () {
    const { reputation, factoryMock, freelancer } = await loadFixture(deployFixture);
    
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    
    const rep = await reputation.getReputation(freelancer.address);
    expect(rep.score).to.equal(50);
    expect(rep.tier).to.equal("bronze");
  });

  it("only factory or owner can mint", async function () {
    const { reputation, stranger, freelancer } = await loadFixture(deployFixture);
    
    await expect(reputation.connect(stranger).mintReputation(freelancer.address))
      .to.be.revertedWith("Not authorized");
  });

  it("prevents double minting", async function () {
    const { reputation, factoryMock, freelancer } = await loadFixture(deployFixture);
    
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await expect(reputation.connect(factoryMock).mintReputation(freelancer.address))
      .to.be.revertedWith("Already minted");
  });

  it("updates score and tier correctly", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.setAuthorizedUpdater(owner.address);

    await reputation.connect(owner).updateReputation(freelancer.address, 70, 5, 0, 0);
    const rep = await reputation.getReputation(freelancer.address);
    expect(rep.score).to.equal(70);
    expect(rep.tier).to.equal("gold");
  });

  it("score 0-40 = bronze", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.connect(owner).updateReputation(freelancer.address, 30, 5, 0, 0);
    expect(await reputation.getTier(freelancer.address)).to.equal("bronze");
  });

  it("score 41-65 = silver", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.connect(owner).updateReputation(freelancer.address, 50, 5, 0, 0);
    expect(await reputation.getTier(freelancer.address)).to.equal("silver");
  });

  it("score 66-88 = gold", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.connect(owner).updateReputation(freelancer.address, 75, 5, 0, 0);
    expect(await reputation.getTier(freelancer.address)).to.equal("gold");
  });

  it("score 89-100 = platinum", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.connect(owner).updateReputation(freelancer.address, 95, 5, 0, 0);
    expect(await reputation.getTier(freelancer.address)).to.equal("platinum");
  });

  it("clamps score between 0 and 100", async function () {
    const { reputation, owner, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    await reputation.connect(owner).updateReputation(freelancer.address, 150, 5, 0, 0);
    expect(await reputation.getScore(freelancer.address)).to.equal(100);
  });

  it("REVERTS on transfer (soulbound)", async function () {
    const { reputation, factoryMock, freelancer, stranger } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    
    await expect(reputation.connect(freelancer).transferFrom(freelancer.address, stranger.address, 1))
      .to.be.revertedWith("WorkchainReputation: Soulbound token - transfers disabled");
  });

  it("REVERTS on transferFrom (soulbound)", async function () {
    const { reputation, factoryMock, freelancer, stranger } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    
    // approve first
    await reputation.connect(freelancer).approve(stranger.address, 1);
    await expect(reputation.connect(stranger).transferFrom(freelancer.address, stranger.address, 1))
      .to.be.revertedWith("WorkchainReputation: Soulbound token - transfers disabled");
  });

  it("returns correct tokenURI metadata", async function () {
    const { reputation, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    
    const uri = await reputation.tokenURI(1);
    expect(uri).to.include("data:application/json;base64,");
  });

  it("base64 encoded JSON is valid", async function () {
    const { reputation, factoryMock, freelancer } = await loadFixture(deployFixture);
    await reputation.connect(factoryMock).mintReputation(freelancer.address);
    
    const uri = await reputation.tokenURI(1);
    const b64 = uri.split(",")[1];
    const jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
    const jsonObj = JSON.parse(jsonStr);
    
    expect(jsonObj.name).to.equal("Workchain Reputation #1");
    expect(jsonObj.attributes[0].value).to.equal(50);
  });
});
