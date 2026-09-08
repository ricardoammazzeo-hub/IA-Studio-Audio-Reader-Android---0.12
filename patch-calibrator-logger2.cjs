const fs = require('fs');
let code = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

if (!code.includes("import { logger } from '../utils/appLogger';")) {
  code = code.replace(
    "import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions } from '../types';",
    "import { BookItem, SectionItem, ParagraphItem, ParagraphType, CalibrationOptions } from '../types';\nimport { logger } from '../utils/appLogger';"
  );
}

// Ensure we only replace once for applyGlobalRuleLocally
if (!code.includes("logger.edit('Calibration', `Aplicando regra global:")) {
  code = code.replace(
    "const applyGlobalRuleLocally = (\n    cleanTerm: string,\n    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'\n  ) => {",
    "const applyGlobalRuleLocally = (\n    cleanTerm: string,\n    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'\n  ) => {\n    logger.edit('Calibration', `Aplicando regra global: \"${cleanTerm}\" -> ${action}`);"
  );
}

if (!code.includes("logger.edit('Calibration', `Alternou a omissão")) {
  code = code.replace(
    "const handleToggleOmit = (targetSecIdx: number, paragraphId: string) => {\n    let currentSections = [...localSections];",
    "const handleToggleOmit = (targetSecIdx: number, paragraphId: string) => {\n    logger.edit('Calibration', `Alternou a omissão do bloco ${paragraphId} na seção ${targetSecIdx + 1}`);\n    let currentSections = [...localSections];"
  );
}

if (!code.includes("logger.edit('Calibration', `Alterou o tipo")) {
  code = code.replace(
    "const handleChangeParagraphType = (\n    targetSecIdx: number,\n    paragraphId: string,\n    newType: PaintTool\n  ) => {\n    let currentSections = [...localSections];",
    "const handleChangeParagraphType = (\n    targetSecIdx: number,\n    paragraphId: string,\n    newType: PaintTool\n  ) => {\n    logger.edit('Calibration', `Alterou o tipo do bloco ${paragraphId} na seção ${targetSecIdx + 1} para ${newType}`);\n    let currentSections = [...localSections];"
  );
}

if (!code.includes("logger.action('Calibration', `Iniciando auto-calibração AI`)")) {
  code = code.replace(
    "const handleAutoCalibrateWithAI = async () => {\n    setIsCalibratingWithAI(true);\n    try {",
    "const handleAutoCalibrateWithAI = async () => {\n    logger.action('Calibration', `Iniciando auto-calibração AI (amostrando páginas)`);\n    setIsCalibratingWithAI(true);\n    try {"
  );
}

fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', code);
