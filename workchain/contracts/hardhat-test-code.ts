import hre from "hardhat";
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
    const code = await hre.ethers.provider.getCode(FACTORY);
    console.log("Code in fork:", code.length);
}
main();
