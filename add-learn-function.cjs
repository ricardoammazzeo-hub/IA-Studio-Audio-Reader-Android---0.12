const fs = require('fs');
let content = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');

const target = `  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);`;
const replacement = `  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);
  const [isLearningFromEdits, setIsLearningFromEdits] = useState(false);

  const handleLearnFromEdits = async () => {
    setIsLearningFromEdits(true);
    try {
      if (!localSections || localSections.length === 0) return;

      const allPages = Array.from(new Set(localSections.flatMap((s) => s.paragraphs.map((p) => p.page || 1)))).sort((a: any, b: any) => a - b);
      // Pega as primeiras 15 páginas onde o usuário possivelmente fez edições
      const samplePages = allPages.slice(0, 15);

      let editedSample = '';
      samplePages.forEach((pageNum) => {
        editedSample += \`\\n\\n--- PAGE \${pageNum} ---\\n\\n\`;
        localSections.forEach((sec) => {
          sec.paragraphs.filter(p => p.page === pageNum).forEach((p) => {
             const tags = [];
             if (p.isNonFree) tags.push('OMITIDO');
             if (p.isFootnote) tags.push('RODAPÉ');
             if (p.isHeading) tags.push('TÍTULO');
             if (p.isPrePostTextual) tags.push('PRÉ-TEXTUAL');
             
             const tagStr = tags.length > 0 ? \`[\${tags.join(', ')}]\` : \`[NORMAL]\`;
             editedSample += \`\${tagStr} \${p.text}\\n\`;
          });
        });
      });

      const response = await fetch('/api/learn-from-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedSample }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Apply learned rules
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
      }

      showToast('✨ Aprendizado concluído! Regras baseadas nas suas edições foram aplicadas.');
      onRecalibrate({
        stripRunningHeaders: data.calibrationOptions?.stripRunningHeaders ?? stripRunningHeaders,
        splitFusedPageNumbers: data.calibrationOptions?.splitFusedPageNumbers ?? splitFusedPageNumbers,
        classifyFootnotes: data.calibrationOptions?.classifyFootnotes ?? classifyFootnotes,
        stripTopLines: data.calibrationOptions?.stripTopLines ?? stripTopLines,
        usePdfBookmarks,
      });
    } catch (err: any) {
      showToast('❌ Erro no Aprendizado de IA: ' + err.message);
    } finally {
      setIsLearningFromEdits(false);
    }
  };
`;

content = content.replace(target, replacement);

const buttonTarget = `            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Calibração Inteligente com Gemini IA</span>
                </h3>
                <button
                  onClick={handleAutoCalibrateWithAI}
                  disabled={isCalibratingWithAI}
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCalibratingWithAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isCalibratingWithAI ? 'Analisando...' : 'Auto-Calibrar agora'}
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Envia uma amostra (meio do livro) para a Inteligência Artificial, que analisa os padrões da editora e gera regras de formatação ideais instantaneamente.
              </p>
            </div>`;

const buttonReplacement = `            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 space-y-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Calibração Inteligente com Gemini IA</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  A Inteligência Artificial pode analisar a estrutura bruta do documento, ou <strong>aprender com as edições manuais</strong> que você fez na aba "Pente Fino".
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAutoCalibrateWithAI}
                    disabled={isCalibratingWithAI || isLearningFromEdits}
                    className="bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 border border-slate-700"
                  >
                    {isCalibratingWithAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isCalibratingWithAI ? 'Analisando...' : 'Auto-Calibrar Documento'}
                  </button>
                  <button
                    onClick={handleLearnFromEdits}
                    disabled={isCalibratingWithAI || isLearningFromEdits}
                    className="bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 shadow-md shadow-amber-900/20"
                  >
                    {isLearningFromEdits ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MousePointer className="w-3.5 h-3.5" />}
                    {isLearningFromEdits ? 'Aprendendo...' : 'Aprender das Minhas Edições'}
                  </button>
                </div>
              </div>
            </div>`;

content = content.replace(buttonTarget, buttonReplacement);

fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', content);
