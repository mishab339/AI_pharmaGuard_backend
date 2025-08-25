const express = require('express');
const router = express.Router();

const { logScanOnChain, fetchScanHistory, flagCounterfeitOnChain } = require('../services/blockchain');
const { isAnomalous } = require('../services/anomaly');
const { maybeJudgeWithLLM } = require('../services/llm');
const { buildAnomalyDetectionPrompt } = require('../../prompts/anomalyDetection');

// POST /scan
// Body: { medicineId, location, timestamp, userType }
router.post('/', async (req, res) => {
  try {
    const { medicineId, location, timestamp, userType } = req.body || {};
    if (typeof medicineId !== 'string' || medicineId.trim().length === 0) {
      return res.status(400).json({ error: 'medicineId must be a non-empty string' });
    }
    if (typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({ error: 'location must be a non-empty string (city name)' });
    }
    if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))) {
      return res.status(400).json({ error: 'timestamp must be an ISO string' });
    }
    if (userType !== 1 && userType !== 2 && userType !== '1' && userType !== '2') {
      return res.status(400).json({ error: 'userType must be 1 (Pharmacist) or 2 (Consumer)' });
    }

    // 1) Log scan on-chain
    const txHash = await logScanOnChain({ medicineId, location, userType, timestamp });

    // 2) Fetch history
    const history = await fetchScanHistory({ medicineId });

    // 3) Rule-based anomaly detection
    const ruleAnomaly = isAnomalous(history, { medicineId, location, timestamp, userType });

    // 4) Optional LLM check
    let llmAnomaly = null;
    try {
      const historyText = JSON.stringify(history, null, 2);
      const newScanText = JSON.stringify({ medicineId, location, timestamp, userType }, null, 2);
      const prompt = buildAnomalyDetectionPrompt(historyText, newScanText);
      llmAnomaly = await maybeJudgeWithLLM(prompt);
    } catch (e) {
      // If LLM not configured, ignore
      llmAnomaly = null;
    }

    const isCounterfeit = ruleAnomaly || llmAnomaly === true;

    // 5) Flag on-chain if counterfeit
    let flagTxHash = null;
    if (isCounterfeit) {
      flagTxHash = await flagCounterfeitOnChain({ medicineId });
    }

    return res.json({
      ok: true,
      txHash,
      historyCount: history.length,
      ruleAnomaly,
      llmAnomaly,
      isCounterfeit,
      flagTxHash,
    });
  } catch (err) {
    console.error('Error in /scan:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /scan/:medicineId - returns scan history
router.get('/:medicineId', async (req, res) => {
  try {
    const { medicineId } = req.params || {};
    if (typeof medicineId !== 'string' || medicineId.trim().length === 0) {
      return res.status(400).json({ error: 'medicineId must be a non-empty string' });
    }
    const history = await fetchScanHistory({ medicineId });
    return res.json({ ok: true, medicineId, history, count: history.length });
  } catch (err) {
    console.error('Error in GET /scan/:medicineId:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


