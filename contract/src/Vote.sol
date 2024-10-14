// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {MerkleTree, IHasher} from "./MerkleTree.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external returns (bool);
}

contract Vote is MerkleTree, ReentrancyGuard {
    IVerifier public immutable verifier;
    // uint256 public denomination;
    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullilfierHashesWithSn;

    event Register(bytes32 commitment, uint32 leafIndex);
    // event Withdraw(address _recipient, bytes32 _nullilfierHash);


    struct Infos{
        string info;
        uint256 agreedNum;
        uint256 disagreedNum;
    }

    mapping(uint256 => Infos) public infos;

    uint256 public sn;

    constructor(
        IHasher _hasher,
        IVerifier _verifier,
        // uint256 _denomination,
        uint32 _merkleTreeHeight
    ) MerkleTree(_merkleTreeHeight, _hasher) {
        verifier = _verifier;
        // denomination = _denomination;
        infos[1] = Infos("message 01", 0, 0);
        infos[2] = Infos("message 02", 0, 0);
        infos[3] = Infos("message 03", 0, 0);
        infos[4] = Infos("message 04", 0, 0);
        infos[5] = Infos("message 05", 0, 0);
        sn = 5;
    }

    function register(bytes32 commitment) external nonReentrant {
        require(!commitments[commitment], "The commitment has been added");
        // require(msg.value == denomination, "Error denomination");

        uint32 leafIndex = insert(commitment); // 2^20
        commitments[commitment] = true;
        emit Register(commitment, leafIndex);
    }

    function vote(
        bytes calldata _proof,
        bytes32 _root,
        bytes32 _nullilfierHashWithSn,
        uint256 _ticketNum,
        uint256 _ifAgreed
        // address _recipient
    ) external nonReentrant {
        require(
            !nullilfierHashesWithSn[_nullilfierHashWithSn],
            "The note has already been spent"
        );
        // check root exists in merkle tree
        require(isKnownRoot(_root), "Root not exists");
        uint256[8] memory p = abi.decode(_proof, (uint256[8]));

        require(
            verifier.verifyProof(
                [p[0], p[1]],
                [[p[2], p[3]], [p[4], p[5]]],
                [p[6], p[7]],
                [uint256(_root), uint256(_nullilfierHashWithSn), _ticketNum, _ifAgreed]
            ),
            "Invalid vote proof"
        );

        nullilfierHashesWithSn[_nullilfierHashWithSn] = true;

        // vote
        require(_ifAgreed == 0 || _ifAgreed == 1, "Invalid vote");
        if(_ifAgreed == 1){
            infos[_ticketNum].agreedNum += 1;
        }
        if(_ifAgreed == 0){
            infos[_ticketNum].disagreedNum += 1;
        }
    }
}
