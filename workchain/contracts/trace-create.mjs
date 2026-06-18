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
    
    console.log("Tracing call...");
    try {
        const result = await provider.send("debug_traceCall", [{
            to: FACTORY,
            from: CLIENT,
            data: data,
            value: "0x2C68AF0BB140000", // 0.2 ETH
            gas: "0x2DC6C0" // 3,000,000
        }, "latest"]);
        
        console.log("Trace:", JSON.stringify(result, null, 2).slice(0, 500) + "...");
    } catch(e) {
        console.error("Trace failed:", e.message);
    }
}
main();
