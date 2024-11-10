import * as snarkjs from "snarkjs";
import { utils } from "ffjavascript";
import { buildBabyjub, buildPedersenHash } from "circomlibjs";
import merkleTree from "fixed-merkle-tree";

// import buffer_ from 'buffer/';  // error
// const Buffer = buffer_.Buffer;

// import Buffer from 'buffer';

// import { Buffer } from 'buffer';
// // @ts-ignore
// window.Buffer = Buffer;





// bytes 0x010f20(input as string "0x010f20") => Uint8Array(3) [ 1, 15, 32 ]
function byteStrToUint8Array(str){
  str = str.replaceAll("0x", "");
  let length = str.length;
  if(length % 2 == 1) throw Error("Invalid string input1");
  /*
  0:48
  9:57

  A:65
  F:70

  a:97
  f:102

  */
  for(let i=0; i<length; i++){
    let num = str[i].charCodeAt();
    if(num < 48 || num >57&&num<65 || num>70&&num<97 || num > 102) throw Error("Invalid string input2");
  }

  let uint8Array = new Uint8Array(length / 2);

  let j=0;
  for(let i=0; i<length; i=i+2){
    let subStr = str.slice(i, i+2);
    uint8Array[j++] = parseInt(subStr, 16);
  }
  return uint8Array;
}


// Uint8Array([ 1, 15, 32 ]) => bytes 0x010f20(output as string "0x010f20")
var uint8ArrayToByteStr = function(uint8Array){
  let str ="";
  for(let i=0; i<uint8Array.length; i++){
    let _hex;
    if(uint8Array[i] <= 15){
      _hex = "0" + uint8Array[i].toString(16);
    }else{
      _hex = uint8Array[i].toString(16);
    }
    str = str + _hex;
    
  }
  return "0x" + str;
}







const MERKLE_TREE_HEIGHT = 20;

const wasmFile = "./circuits/build/vote_js/vote.wasm";
const zkeyFile = "./circuits/build/vote.zkey";


function generateRandomHexBytes(length = 32) {
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  return randomBytes;
}

const rbigint = (nbytes) => utils.leBuff2int(generateRandomHexBytes(nbytes));

const perdersenHash = async (data) => {
  const babyJup = await buildBabyjub();
  const perdersen = await buildPedersenHash();
  return babyJup.F.toObject(babyJup.unpackPoint(perdersen.hash(data))[0]);
};

const toHex = (number, length = 32) =>
  "0x" + BigInt(number).toString(16).padStart(length * 2, "0");
  // "0x" +
  // (number instanceof Buffer
  //   ? number.toString("hex")
  //   : BigInt(number).toString(16)
  // ).padStart(length * 2, "0");

// Register

async function createRegister(nullifier, secret) {
  // geneate commitment and nullifierhash
  let register = { nullifier, secret };


  // register.preimage = Buffer.concat([
  //   utils.leInt2Buff(register.nullifier, 31),
  //   utils.leInt2Buff(register.secret, 31),
  // ]);


  let preimage = toHex(BigInt(uint8ArrayToByteStr(utils.leInt2Buff(register.nullifier, 31))), 31) 
          + toHex(BigInt(uint8ArrayToByteStr(utils.leInt2Buff(register.secret, 31))), 31).replaceAll("0x", "");
  let uint8Array = byteStrToUint8Array(preimage);
  register.preimage = toHex(nullifier, 31) + toHex(secret, 31).replaceAll("0x", "");

  // console.log("register.preimage", register.preimage);
  register.commitment = await perdersenHash(uint8Array);
  register.nullifierHash = await perdersenHash(
    utils.leInt2Buff(register.nullifier, 31)
  );
  return register;
}




async function createNullifierHashWithSn(nullifierHash, ticketNum) {
  // geneate commitment and nullifierhash
  
  let ticketNumInt = BigInt(ticketNum);
  
  let register = { nullifierHash, ticketNumInt};

  // register.preimage = Buffer.concat([
  //   utils.leInt2Buff(register.nullifierHash, 32),  // nullifierHash: bytes32
  //   utils.leInt2Buff(register.ticketNumInt, 30),  // 
  // ]);

  let preimage = toHex(BigInt(uint8ArrayToByteStr(utils.leInt2Buff(register.nullifierHash, 32))), 32) 
          + toHex(BigInt(uint8ArrayToByteStr(utils.leInt2Buff(register.ticketNumInt, 30))), 30).replaceAll("0x", "");
  let uint8Array = byteStrToUint8Array(preimage);
  register.preimage = toHex(nullifierHash, 32) + toHex(ticketNumInt, 30).replaceAll("0x", "");
  

  register.commitment = await perdersenHash(uint8Array);

  return register;
}





export async function register() {
  let register = await createRegister(rbigint(31), rbigint(31));
  const note = `vote-1-${toHex(register.preimage, 62)}`;
  return { note, commitment: toHex(register.commitment) };
}

// Vote 

async function parseNote(noteString) {
  const noteRegex =
    /vote-(?<chainId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
  const match = noteRegex.exec(noteString);

  // const buf = Buffer.from(match.groups.note, "hex");
  // const nullifier = utils.leBuff2int(buf.slice(0, 31));
  // const secret = utils.leBuff2int(buf.slice(31, 62));

  const nullifier = BigInt("0x" + match.groups.note.slice(0,62));  
  const secret = BigInt("0x" + match.groups.note.slice(62,124));   

  return await createRegister(nullifier, secret);
}

async function generateMerkleProof(contract, register) {
  // get constract state
  const eventFilter = contract.filters.Register();
  let events = await contract.queryFilter(eventFilter, -100, "latest");
  // console.log("events", events);
  // console.log("events[0]", events[0]);
  // create merkle tree
  const leaves = events
    .sort((a, b) => a.args.leafIndex - b.args.leafIndex)
    .map((e) => e.args.commitment);
  const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves);
  // generate path
  let registerEvent = events.find(
    (e) => e.args.commitment === toHex(register.commitment)
  );
  let leafIndex = registerEvent ? registerEvent.args.leafIndex : -1;

  if (leafIndex == -1) {
    alert("The register is not found in the tree");
  }

  const { pathElements, pathIndices } = tree.path(leafIndex);
  return { pathElements, pathIndices, root: tree.root() };
}

function toSolidityProof(proof) {
  const flatProof = utils.unstringifyBigInts([
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1],
  ]);
  const result = {
    proof: "0x" + flatProof.map((x) => toHex(x, 32).slice(2, 66)).join(""),
  };
  return result;
}


async function generateSnarkProof(contract, register, ticketNum, ifAgreed) {
  // geneate merkle proof
  const { pathElements, pathIndices, root } = await generateMerkleProof(
    contract,
    register
  );

  // createNullifierHashWithSn
  const nullifierHashWithSn = await createNullifierHashWithSn(register.nullifierHash, ticketNum);
  
  // groth16
  const inputs = {
    // public signals
    root: root,
    nullifierHashWithSn: nullifierHashWithSn.commitment,
    ticketNum: BigInt(ticketNum),
    ifAgreed: BigInt(ifAgreed),
    // private signals
    nullifier: register.nullifier,
    secret: register.secret,
    pathElements: pathElements,
    pathIndices: pathIndices,
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    wasmFile,
    zkeyFile
  );
  //   console.log(proof);
  const proofData = toSolidityProof(proof);
  const args = [
    toHex(inputs.root),
    toHex(inputs.nullifierHashWithSn),
    toHex(inputs.ticketNum),
    toHex(inputs.ifAgreed)
  ];

  return { proof: proofData.proof, args };
}

export async function vote(contract, note, ticketNum, ifAgreed) {
  // parse note
  let register = await parseNote(note);
  // console.log(toHex(register.commitment));
  // generate proof
  const { proof, args } = await generateSnarkProof(
    contract,
    register,
    ticketNum,
    ifAgreed
  );
  
  return { proof, args };
}
