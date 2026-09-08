const fs = require('fs');
let content = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

const startStr = "if (data.globalRules && Array.isArray(data.globalRules)) {";
const endStr = "showToast('✨ Calibração Inteligente concluída! Parâmetros e regras aplicadas.');";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `      if (data.globalRules && Array.isArray(data.globalRules)) {
        for (const rule of data.globalRules) {
          if (rule.term && rule.action) {
            applyGlobalRuleLocally(rule.term, rule.action);
          }
        }
      }

      `;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', content);
  console.log("Replaced!");
} else {
  console.log("Not found");
}
