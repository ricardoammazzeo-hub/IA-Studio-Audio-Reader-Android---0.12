const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const helper = `
async function generateContentWithRetry(ai, options, retries = 5, delay = 2000) {
  while (retries > 0) {
    try {
      return await ai.models.generateContent(options);
    } catch (err) {
      const isRetryable = 
        err?.status === 503 || err?.status === 429 || err?.status === 500 ||
        (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('429') || err.message.includes('500') || err.message.includes('overloaded'))) ||
        (err?.error?.code === 503 || err?.error?.code === 429 || err?.error?.status === 'UNAVAILABLE');
      if (isRetryable) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}
`;

content = content.replace('function getGenAI(): GoogleGenAI {', helper + '\nfunction getGenAI(): GoogleGenAI {');

// Replace in calibrate
content = content.replace(`    let response;
    let retries = 5;
    let delay = 2000;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({`, `    const response = await generateContentWithRetry(ai, {`);
content = content.replace(/          \}\);\n        break; \/\/ Success\n      \} catch \(err: any\) \{[\s\S]*?\}\n    \}/, '    });');

// Replace in tts
content = content.replace(/    const response = await ai\.models\.generateContent\(\{/g, '    const response = await generateContentWithRetry(ai, {');

fs.writeFileSync('server.ts', content);
