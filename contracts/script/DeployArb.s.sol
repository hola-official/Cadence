// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ArbPolicyManager} from "../src/ArbPolicyManager.sol";

contract DeployArb is Script {
    // Arb testnet usdc
    address constant Arb_USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        ArbPolicyManager manager = new ArbPolicyManager(Arb_USDC, feeRecipient);

        vm.stopBroadcast();

        // output for parsing
        console.log("CHAIN_ID:", block.chainid);
        console.log("Arb_POLICY_MANAGER:", address(manager));
        console.log("USDC:", Arb_USDC);
        console.log("FEE_RECIPIENT:", feeRecipient);
        console.log("DEPLOYER:", vm.addr(deployerPrivateKey));
    }
}
