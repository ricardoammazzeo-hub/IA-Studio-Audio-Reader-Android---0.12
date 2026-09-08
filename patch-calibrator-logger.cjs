const fs = require('fs');
let code = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

if (!code.includes("import { logger } from '../utils/appLogger';")) {
  code = code.replace(
    "import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions } from '../types';",
    "import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions } from '../types';\nimport { logger } from '../utils/appLogger';"
  );
}

// 1. applyGlobalRuleLocally
code = code.replace(
  `  const applyGlobalRuleLocally = (`,
  `  const applyGlobalRuleLocally = (
    cleanTerm: string,
    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'
  ) => {
    logger.edit('Calibration', \`Aplicando regra global: "\${cleanTerm}" -> \${action}\`);`
);
// Fix syntax if we double applied, let's use standard replacement
