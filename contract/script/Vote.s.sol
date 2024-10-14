pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {Groth16Verifier} from "../src/verifier.sol";
import {Vote, IHasher, IVerifier} from "../src/Vote.sol";

contract VoteScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hasher = 0x5FbDB2315678afecb367f032d93F642f64180aa3;

        vm.startBroadcast(deployerPrivateKey);
        // deploy contract
        Groth16Verifier pv = new Groth16Verifier();
        new Vote(
            IHasher(hasher),
            IVerifier(address(pv)),
            uint32(20)
        );
        vm.stopBroadcast();
    }
}
