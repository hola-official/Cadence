// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ArbPolicyManager} from "../src/ArbPolicyManager.sol";

contract DeployFuji is Script {
    // Avalanche Fuji USDC (Circle official)
    address constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        ArbPolicyManager manager = new ArbPolicyManager(FUJI_USDC, feeRecipient);

        vm.stopBroadcast();

        console.log("CHAIN_ID:", block.chainid);
        console.log("FUJI_POLICY_MANAGER:", address(manager));
        console.log("USDC:", FUJI_USDC);
        console.log("FEE_RECIPIENT:", feeRecipient);
        console.log("DEPLOYER:", vm.addr(deployerPrivateKey));
    }
}
