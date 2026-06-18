import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("Forking Sepolia to trace...");
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

    // Impersonate client
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [CLIENT],
    });
    // Fund client
    await hre.network.provider.send("hardhat_setBalance", [
        CLIENT,
        "0x1000000000000000000",
    ]);

    const signer = await ethers.getSigner(CLIENT);
    const iface = new ethers.Interface([
        "function createProject(address,string[],string[],uint256[],uint256[])"
    ]);

    const data = iface.encodeFunctionData("createProject", [
        FREELANCER,
        ["M1", "M2"],
        ["Desc1", "Desc2"],
        [ethers.parseEther("0.1"), ethers.parseEther("0.1")],
        [Math.floor(Date.now()/1000) + 10000, Math.floor(Date.now()/1000) + 20000]
    ]);

    console.log("Sending tx...");
    try {
        const tx = await signer.sendTransaction({
            to: FACTORY,
            data: data,
            value: ethers.parseEther("0.2"),
            gasLimit: 3000000
        });
        const rx = await tx.wait();
        console.log("Success! Gas used:", rx?.gasUsed.toString());
    } catch(e) {
        console.error("Reverted!");
        console.error(e);
    }
}

main();
