const fs = require('fs');
let code = fs.readFileSync('src/components/ReaderView.tsx', 'utf8');

if (!code.includes('// Clear translation cache when bookId changes')) {
  code = code.replace(
    '  const [editingText, setEditingText] = useState<string>(\'\');',
    '  const [editingText, setEditingText] = useState<string>(\'\');\n\n  // Clear translation cache when bookId changes\n  useEffect(() => {\n    setTranslatedMap({});\n    translatedSectionsRef.current.clear();\n    inFlightTranslationRef.current.clear();\n    setTranslatingSectionIndices([]);\n    setIsTranslating(false);\n  }, [bookId]);'
  );
}

// Add data-is-translating to all paragraph divs
code = code.replace(/id={`paragraph-\${secIndex}-\${pIndex}`}/g, 'id={`paragraph-${secIndex}-${pIndex}`}\n                            data-is-translating={translatingSectionIndices.includes(secIndex) ? "true" : undefined}');

fs.writeFileSync('src/components/ReaderView.tsx', code);
