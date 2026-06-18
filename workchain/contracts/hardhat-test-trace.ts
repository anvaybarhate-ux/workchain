import hre from "hardhat";
const { ethers } = hre;

async function main() {
    await hre.network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                jsonRpcUrl: "https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h",
            }
        }]
    });

    const FACTORY = "0x07638Ee20891e79Ea1C2c7EB3c034e55AC2e6E3C";
    const CLIENT = "0x53a3ed1d3512a40350d446c7b625B634014f6FC0";
    const FREELANCER = "0x29722FBD0AF423FE9D368B2EAB4FDF134B8C40D7";

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [CLIENT],
    });
    await hre.network.provider.send("hardhat_setBalance", [CLIENT, "0x1000000000000000000"]);

    const factory = await ethers.getContractAt("WorkchainFactory", FACTORY);
    const signer = await ethers.getSigner(CLIENT);
    const factoryWithSigner = factory.connect(signer);

    console.log("Calling createProject...");
    try {
        const tx = await factoryWithSigner.createProject(
            FREELANCER,
            ["M1", "M2"],
            ["Desc1", "Desc2"],
            [ethers.parseEther("0.1"), ethers.parseEther("0.1")],
            [Math.floor(Date.now()/1000) + 10000, Math.floor(Date.now()/1000) + 20000],
            { value: ethers.parseEther("0.2") }
        );
        const rx = await tx.wait();
        console.log("Success! Gas used:", rx.gasUsed.toString());
    } catch(e) {
        console.error("Reverted!");
        console.error(e.message);
        if (e.data) console.error("Error data:", e.data);
    }
}

main();
