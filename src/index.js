require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Routes
const scanRouter = require('./routes/scan');
app.use('/scan', scanRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`AI PharmaGuard backend listening on port ${port}`);
});


