import { ethers } from 'ethers';
const RPC = "https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h";
const FACTORY = "0x07638Ee20891e79Ea1C2c7EB3c034e55AC2e6E3C";
const CLIENT = "0x53a3ed1d3512a40350d446c7b625B634014f6FC0";
const FREELANCER = "0x29722FBD0AF423FE9D368B2EAB4FDF134B8C40D7";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC);
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
    console.log("Simulating call...");
    try {
        const res = await provider.call({
            to: FACTORY,
            from: CLIENT,
            data: data,
            value: ethers.parseEther("0.2")
        });
        console.log("Success:", res);
    } catch(e) {
        console.error("Revert:", e.message);
        if (e.data) console.error("Revert data:", e.data);
    }
}
main();
