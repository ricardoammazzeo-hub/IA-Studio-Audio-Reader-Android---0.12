const fs = require('fs');
let content = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

const target = `      // Apply learned rules
      if (data.globalRules && Array.isArray(data.globalRules)) {
        for (const rule of data.globalRules) {
          if (!globalRules.some(r => r.term === rule.term && r.action === rule.action)) {
            onAddGlobalRule({
              term: rule.term,
              action: rule.action,
              description: rule.description || 'Regra aprendida das suas edições.',
              isActive: true,
            });
          }
        }
      }`;

const replacement = `      // Apply learned rules
      if (data.globalRules && Array.isArray(data.globalRules)) {
        for (const rule of data.globalRules) {
          if (rule.term && rule.action) {
            applyGlobalRuleLocally(rule.term, rule.action);
          }
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', content);
