const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudiobookNarrator.ts', 'utf8');

const target = `    // Find next valid readable index if current is not readable
    const targetIndex = shouldReadParagraph(paragraphs[index])
      ? index
      : findNextReadableIndex(index, 1);`;

const replacement = `    // Find next valid readable index if current is not readable
    const targetIndex = shouldReadParagraph(paragraphs[index])
      ? index
      : findNextReadableIndex(index, 1);

    if (targetIndex !== index && targetIndex !== -1) {
      const skippedCount = targetIndex - index;
      logger.audio('Playback', \`Omitindo \${skippedCount} bloco(s) não-legível(is) (Índice original: \${index}, Novo alvo: \${targetIndex})\`);
    }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/hooks/useAudiobookNarrator.ts', code);
