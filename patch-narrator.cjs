const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudiobookNarrator.ts', 'utf8');

const target = `    if (domElement) {
      // 1. Check for designated data-reader-text element (pure book text container)`;

const replacement = `    if (domElement) {
      // Wait for translation to finish if it's currently in flight
      if (domElement.hasAttribute('data-is-translating')) {
        setTimeout(() => {
          if (isPlayingRef.current) {
            playBrowserParagraph(index);
          }
        }, 200);
        return;
      }

      // 1. Check for designated data-reader-text element (pure book text container)`;

code = code.replace(target, replacement);
fs.writeFileSync('src/hooks/useAudiobookNarrator.ts', code);
