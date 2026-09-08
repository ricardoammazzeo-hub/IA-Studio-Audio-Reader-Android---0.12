const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `        if (err?.status === 503 || err?.status === 429 || (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('429')))) {`;
const replacement = `        const isRetryable = 
          err?.status === 503 || err?.status === 429 || err?.status === 500 ||
          (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('429') || err.message.includes('500') || err.message.includes('overloaded'))) ||
          (err?.error?.code === 503 || err?.error?.code === 429 || err?.error?.status === 'UNAVAILABLE');
        if (isRetryable) {`;

content = content.replace(target, replacement);

fs.writeFileSync('server.ts', content);
