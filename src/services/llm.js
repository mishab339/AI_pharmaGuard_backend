const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client = null;
if (OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: OPENAI_API_KEY });
}

async function maybeJudgeWithLLM(prompt) {
  if (!client) return null;
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a precise classification assistant. Answer with only Yes or No.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
  });
  const text = completion.choices?.[0]?.message?.content?.trim() || '';
  if (/^yes$/i.test(text)) return true;
  if (/^no$/i.test(text)) return false;
  return null;
}

module.exports = { maybeJudgeWithLLM };


