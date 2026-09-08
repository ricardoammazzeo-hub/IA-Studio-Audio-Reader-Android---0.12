const fs = require('fs');
let content = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

const duplicateLine = "  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);\n  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);";
if (content.includes(duplicateLine)) {
  content = content.replace(duplicateLine, "  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);");
}

const lines = content.split('\n');
if (lines[lines.length - 1] === '' && lines[lines.length - 2] === '};' && lines[lines.length - 3] === '    );') {
  lines.splice(lines.length - 2, 1);
  content = lines.join('\n');
}

fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', content);
