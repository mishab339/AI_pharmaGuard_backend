# AI_pharmaGuard_backend
AI PharmaGuard: A decentralized platform using AI and Shardeum to detect counterfeit medicines in real-time. 🛡️💊⛓️ #Hackathon

## Setup

1. Create a `.env` file with the following (optional for local run):

```
PORT=8080
RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

- If `RPC_URL`/`CONTRACT_ADDRESS` are not set (or ABI is empty), the backend will use an in-memory event store so you can test without blockchain.
- If `OPENAI_API_KEY` is not set, the LLM anomaly check will be skipped.

2. Install and run:

```
npm install
npm run dev
```

## API

- `GET /health` → `{ ok: true }`

- `POST /scan`
  - Body:
  ```json
  {
    "medicineId": "ABC123",
    "location": "Delhi",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "userType": 1
  }
  ```
  - Response includes `ruleAnomaly`, `llmAnomaly`, `isCounterfeit`, and transaction hashes.

- `GET /scan/:medicineId`
  - Returns history from chain or in-memory store.

## Anomaly Detection

- Rule-based detection flags scans >300km apart within 1 hour as suspicious.
- Optional LLM judge converts history into a Yes/No decision using a strict prompt.

## Notes

- The contract ABI in `src/services/blockchain.js` is a placeholder; provide your ABI and event names to enable on-chain logging.
