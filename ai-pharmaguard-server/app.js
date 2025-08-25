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
const aiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

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
        // 2. Read Scan History from the Blockchain
        // NOTE: Your contract must have a function like `getScanHistory(string memory medicineId)`
        // that returns an array of strings.
        console.log("Fetching scan history from Shardeum...");
        const scanHistory = await pharmaContract.getScanHistory(medicineId);
        console.log("History found:", scanHistory);

        // 3. AI Analysis
        console.log("Sending data to AI for analysis...");
        const prompt = `
            You are a supply chain anomaly detector. Analyze the following scan history for a medicine with ID "${medicineId}".
            A new scan just occurred at location "${location}".
            The previous scans were: [${scanHistory.join(', ')}].
            Based on the sequence of locations and plausible travel times, is the new scan 'PLAUSIBLE' or 'ANOMALOUS'?
            Respond with only one word: PLAUSIBLE or ANOMALOUS.
        `;

        const result = await aiModel.generateContent(prompt);
        const aiResponseText = result.response.text().trim();
        console.log(`AI Verdict: ${aiResponseText}`);

        // 4. Log the New Scan on the Blockchain
        console.log("Logging new scan to the blockchain...");
        const logTx = await pharmaContract.logScan(medicineId, location, userType);
        const receipt = await logTx.wait();
        console.log(`Scan logged. Transaction hash: ${receipt.hash}`);

        // 5. Flag if Anomalous & Prepare Final Response
        let finalStatus, finalMessage;

        if (aiResponseText.includes("ANOMALOUS")) {
            console.log("Anomaly detected! Flagging item as counterfeit...");
            const flagTx = await pharmaContract.flagAsCounterfeit(medicineId);
            await flagTx.wait();
            console.log("Item flagged on-chain.");

            finalStatus = "ANOMALOUS";
            finalMessage = "Warning! This product's scan pattern is impossible. It may be counterfeit.";
        } else {
            finalStatus = "VERIFIED";
            finalMessage = "This medicine's scan history is valid. Verified authentic.";
        }
        
        // 6. Send Response to Frontend
        return res.status(200).json({
            status: finalStatus,
            message: finalMessage,
            transactionHash: receipt.hash
        });

    } catch (error) {
        console.error("!!--- ERROR ---!!");
        console.error(error);
        return res.status(500).json({ error: "An internal server error occurred." });
    }
});


// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`AI PharmaGuard server is running on http://localhost:${PORT}`);
});