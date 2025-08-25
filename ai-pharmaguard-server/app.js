// index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from "module";

// --- IMPORTANT: You need your contract's ABI ---
// After you compile your smart contract in the 'contracts' directory,
// it will generate a JSON file. Copy the "abi" array from that file here.
// For now, I'm using a simplified placeholder ABI.
const require = createRequire(import.meta.url);
const PharmaRegistryABI = require("./PharmaRegistryABI.json");


// --- CONFIGURATION ---
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SHARDEUM_RPC_URL = process.env.SHARDEUM_RPC_URL;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// --- INITIALIZE SERVICES ---

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Initialize Ethers Provider and Signer for Shardeum
const provider = new ethers.JsonRpcProvider(SHARDEUM_RPC_URL);
const oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
const pharmaContract = new ethers.Contract(CONTRACT_ADDRESS, PharmaRegistryABI, oracleWallet);

console.log(`Oracle wallet address: ${oracleWallet.address}`);
console.log(`Connected to contract at: ${CONTRACT_ADDRESS}`);


// --- THE CORE API ENDPOINT ---

app.post('/api/v1/verifyScan', async (req, res) => {
    const { medicineId, location, userType } = req.body;

    // 1. Input Validation
    if (!medicineId || !location || !userType) {
        return res.status(400).json({ error: "Missing required fields: medicineId, location, userType" });
    }

    console.log(`\nReceived scan for ${medicineId} at ${location}`);

try {
    console.log("Fetching scan history from Shardeum...");
    const scanHistory = await pharmaContract.getScanHistory(medicineId);
    console.log("History found:", scanHistory);

    // AI analysis
    const prompt = `
        You are a supply chain anomaly detector. Analyze the following scan history for a medicine with ID "${medicineId}".
        A new scan just occurred at location "${location}".
        The previous scans were: [${scanHistory.join(', ')}].
        Based on the sequence of locations and plausible travel times, is the new scan 'PLAUSIBLE' or 'ANOMALOUS'?
        Respond with only one word: PLAUSIBLE or ANOMALOUS.
    `;

    const result = await aiModel.generateContent(prompt);
    const aiResponseText = result.response.text().trim().toUpperCase();
    const verdict = aiResponseText.includes("ANOMALOUS") ? "ANOMALOUS" : "PLAUSIBLE";

    console.log(`AI Verdict: ${verdict}`);

    // Log scan on-chain
    const logTx = await pharmaContract.logScan(medicineId, location, userType);
    const receipt = await logTx.wait();
    console.log(`Scan logged. Tx hash: ${receipt.hash}`);

    let finalStatus, finalMessage;

    if (verdict === "ANOMALOUS") {
        try {
            const flagTx = await pharmaContract.flagAsCounterfeit(medicineId);
            await flagTx.wait();
            console.log("Item flagged on-chain.");
        } catch (flagErr) {
            console.warn("Item may already be flagged:", flagErr.message);
        }

        finalStatus = "ANOMALOUS";
        finalMessage = "⚠️ Warning! This product's scan pattern is impossible. It may be counterfeit.";
    } else {
        finalStatus = "VERIFIED";
        finalMessage = "✅ This medicine's scan history is valid. Verified authentic.";
    }

    return res.status(200).json({
        status: finalStatus,
        message: finalMessage,
        transactionHash: receipt.hash
    });

} catch (error) {
    console.error("!!--- ERROR ---!!", error);
    return res.status(500).json({ error: "An internal server error occurred." });
}

});


// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`AI PharmaGuard server is running on http://localhost:${PORT}`);
});