const Web3 = require('web3');

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Replace with your contract ABI
const CONTRACT_ABI = [];

if (!RPC_URL) {
  console.warn('RPC_URL not set. Blockchain features will be disabled.');
}

let web3 = null;
let account = null;
let contract = null;

// In-memory fallback store when no blockchain contract is configured
// Structure: { [medicineId]: Array<{ medicineId, location, userType, timestamp, txHash }> }
const inMemoryEvents = Object.create(null);

if (RPC_URL) {
  web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
  if (PRIVATE_KEY) {
    account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  }
  if (CONTRACT_ADDRESS && CONTRACT_ABI && CONTRACT_ABI.length > 0) {
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  }
}

async function logScanOnChain({ medicineId, location, userType, timestamp }) {
  if (!contract) {
    // Fallback: store event in memory
    const tsIso = timestamp || new Date().toISOString();
    const txHash = `mem_${medicineId}_${Date.now()}`;
    if (!inMemoryEvents[medicineId]) inMemoryEvents[medicineId] = [];
    inMemoryEvents[medicineId].push({
      medicineId,
      location,
      userType: Number(userType),
      timestamp: tsIso,
      txHash,
    });
    return txHash;
  }
  const from = account ? account.address : undefined;
  const tx = contract.methods.logScan(medicineId, location, userType);
  const gas = await tx.estimateGas({ from });
  const receipt = await tx.send({ from, gas });
  return receipt?.transactionHash || null;
}

async function fetchScanHistory({ medicineId }) {
  if (!contract) {
    return Array.isArray(inMemoryEvents[medicineId]) ? [...inMemoryEvents[medicineId]] : [];
  }
  // Example using past events; adjust event and indexing based on your contract
  const events = await contract.getPastEvents('ScanLogged', {
    filter: { medicineId },
    fromBlock: 0,
    toBlock: 'latest',
  });
  return events.map((e) => ({
    medicineId: e.returnValues.medicineId,
    location: e.returnValues.location,
    userType: Number(e.returnValues.userType),
    timestamp: new Date(Number(e.returnValues.timestamp) * 1000).toISOString(),
    txHash: e.transactionHash,
  }));
}

async function flagCounterfeitOnChain({ medicineId }) {
  if (!contract) {
    // Fallback: append a synthetic flag event (optional)
    const txHash = `mem_flag_${medicineId}_${Date.now()}`;
    if (!inMemoryEvents[medicineId]) inMemoryEvents[medicineId] = [];
    inMemoryEvents[medicineId].push({
      medicineId,
      location: 'N/A',
      userType: -1,
      timestamp: new Date().toISOString(),
      txHash,
      flagged: true,
    });
    return txHash;
  }
  const from = account ? account.address : undefined;
  const tx = contract.methods.flagCounterfeit(medicineId);
  const gas = await tx.estimateGas({ from });
  const receipt = await tx.send({ from, gas });
  return receipt?.transactionHash || null;
}

module.exports = {
  logScanOnChain,
  fetchScanHistory,
  flagCounterfeitOnChain,
};


