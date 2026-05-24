// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ArbPolicyManager} from "../src/ArbPolicyManager.sol";

contract DeployArc is Script {
    // Arc Testnet USDC (native currency address)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        ArbPolicyManager manager = new ArbPolicyManager(ARC_USDC, feeRecipient);

        vm.stopBroadcast();

        console.log("CHAIN_ID:", block.chainid);
        console.log("ARC_POLICY_MANAGER:", address(manager));
        console.log("USDC:", ARC_USDC);
        console.log("FEE_RECIPIENT:", feeRecipient);
        console.log("DEPLOYER:", vm.addr(deployerPrivateKey));
    }
}
