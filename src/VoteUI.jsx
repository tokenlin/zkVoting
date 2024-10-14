import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { register, vote } from "./Vote";
import data from "./lib/abi/Vote.json";
import { useEthersSigner } from "./ethers";
import BeatLoader from "react-spinners/BeatLoader";
import "./VoteUI.css";

// const AMOUNT = "1";
// const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";  // for local test net
const CONTRACT_ADDRESS = "0x36b26aFa62213e98d38a896c2D2bfD2Fd1c8b60c";  // for sepolia


const VoteUI = () => {
  const [voteNote, setVoteNote] = useState("");
  const [ticketNum, setTicketNum] = useState("");
  const [ifAgreed, setIfAgreed] = useState("");


  const [registerHash, setRegisterHash] = useState("");
  const [voteHash, setVotehash] = useState("");

  const [dloading, setDLoading] = useState(false);
  const [wloading, setWLoading] = useState(false);
  const signer = useEthersSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, data.abi, signer);

  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();

  // useEffect(() => {
  //   setRecipientAddress(address);
  // }, [isConnected]);

  return (
    <div className="vote-ui">
      <h1 className="title">zkVoting UI</h1>

      {!isConnected ? (
        <div className="card">
          <ConnectKitButton theme="midnight" />
        </div>
      ) : (
        <div className="card">
          <p>Connected as: {address}</p>
          <button className="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}

      {isConnected && (
        <>
          <div className="card">
            {/* <h2 className="section-title">Register {AMOUNT} ETH</h2> */}
            <button
              className="button"
              onClick={async () => {
                setDLoading(true);
                const { note, commitment } = await register();
                setVoteNote(note);
                const tx = await contract.register(commitment);
                setRegisterHash(tx.hash);
                await tx.wait();
                setDLoading(false);
              }}
            >
              {dloading ? <BeatLoader size={10} color={"#fff"} /> : "Register"}
            </button>
          </div>

          <div className="card">
            <h2 className="section-title">Vote</h2>
            <input
              type="text"
              className="input"
              placeholder="Enter secret note"
              value={voteNote}
              onChange={(e) => setVoteNote(e.target.value)}
            />

            <input
              type="text"
              className="input"
              placeholder="Enter vote sn"
              value={ticketNum}
              onChange={(e) => setTicketNum(e.target.value)}
            />

            <input
              type="text"
              className="input"
              placeholder="Enter if agreed: 0 for disagreed, 1 for agreed"
              value={ifAgreed}
              onChange={(e) => setIfAgreed(e.target.value)}
            />

            <button
              className="button"
              onClick={async () => {
                setWLoading(true);
                const { proof, args } = await vote(
                  contract,
                  voteNote,
                  ticketNum,
                  ifAgreed
                );
             
                const tx = await contract.vote(proof, ...args);
                setVotehash(tx.hash);
                await tx.wait();
                setWLoading(false);
              }}
            >
              {wloading ? <BeatLoader size={10} color={"#fff"} /> : "Vote"}
            </button>
          </div>
          <div>
            <div className="status">
              {registerHash && <div>Register Hash: {registerHash}</div>}
            </div>
            <div className="status">
              {voteHash && <div>Vote Hash: {voteHash}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoteUI;
