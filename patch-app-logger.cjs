const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("logger.action('Settings', `Modo Foco")) {
  code = code.replace(
    "const toggleFocusMode = () => {",
    "const toggleFocusMode = () => {\n    logger.action('Settings', `Modo Foco ${!isFocusMode ? 'Ativado' : 'Desativado'}`);"
  );
}

fs.writeFileSync('src/App.tsx', code);
