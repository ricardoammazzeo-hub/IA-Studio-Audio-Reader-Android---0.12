const fs = require('fs');
let code = fs.readFileSync('src/components/ExportModal.tsx', 'utf8');

const target = code.substring(code.indexOf('<div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10'), code.indexOf('        {/* Feedback messages */}'));

code = code.replace(target, `{/* REMOVED AUDIO EXPORT FEATURE AS BROWSER TTS CANNOT BE EXPORTED TO MP3 */}\n`);
fs.writeFileSync('src/components/ExportModal.tsx', code);
