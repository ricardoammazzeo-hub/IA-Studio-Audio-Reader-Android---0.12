const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
// API endpoint for AI Learning from Manual Edits
app.post('/api/learn-from-edits', async (req, res) => {
  try {
    const { editedSample } = req.body;
    if (!editedSample || typeof editedSample !== 'string') {
      return res.status(400).json({ error: 'editedSample is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured.' });
    }
    const ai = getGenAI();

    const prompt = \`You are an expert typography and document layout analyst.
The following text is a sample from a book that has been MANUALLY EDITED and CLASSIFIED by the user.
The user has assigned tags like [NORMAL], [OMITIDO], [RODAPÉ], [CABEÇALHO] to paragraphs, and possibly edited the text directly to fix joining issues or remove recurring publisher artifacts.

Your goal is to reverse-engineer the user's intent:
1. Notice what kind of text is tagged as [OMITIDO] or [RODAPÉ].
2. Identify any repetitive strings (headers, page numbers, disclaimers) that the user might be trying to get rid of.
3. Suggest "globalRules" that, when applied to the raw document, would automatically achieve these same results.

The engine supports the following Global Rules (actions):
- "remove_term": completely deletes the exact term. Useful for recurring page numbers, headers, "Scanned by", etc.
- "mark_pretextual": marks a term/paragraph as pre/post-textual (e.g., copyright blocks, CIP data, library info, summary lists).
- "omit_block": completely ignores the entire block containing this term. Very useful for repetitive publisher disclaimers, table of contents dots (e.g. "......"), or index lines.

Analyze the user's manual classifications and suggest:
1. "calibrationOptions": boolean toggles for the probabilistic engine.
2. "globalRules": specific recurring exact text patterns to apply global actions to. Keep terms exact and short (e.g., "Editora XPTO", "Todos os direitos reservados", "Sumário", "Prefácio"). You can suggest up to 10 highly confident rules.

Edited Sample:
\${editedSample.slice(0, 25000)}
\`;

    const response = await generateContentWithRetry(ai, {
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: "OBJECT",
              properties: {
                calibrationOptions: {
                  type: "OBJECT",
                  properties: {
                    stripRunningHeaders: { type: "BOOLEAN", description: "Whether to aggressively strip top/bottom running headers" },
                    splitFusedPageNumbers: { type: "BOOLEAN", description: "Whether to split page numbers fused to text" },
                    classifyFootnotes: { type: "BOOLEAN", description: "Whether to look for footnotes" },
                    stripTopLines: { type: "BOOLEAN", description: "Whether to strip repetitive top lines" }
                  },
                  required: ["stripRunningHeaders", "splitFusedPageNumbers", "classifyFootnotes", "stripTopLines"]
                },
                globalRules: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      term: { type: "STRING", description: "The exact recurring text to target (e.g. 'Copyright', 'Vol.', 'Capítulo')" },
                      action: { type: "STRING", enum: ["remove_term", "split_term", "mark_pretextual", "mark_footnote", "mark_quote", "mark_heading", "omit_block"] },
                      description: { type: "STRING", description: "Why this rule is suggested based on user edits" }
                    },
                    required: ["term", "action", "description"]
                  }
                }
              },
              required: ["calibrationOptions", "globalRules"]
            }
          }
        });

    const candidate = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error("No response from AI");
    return res.json(JSON.parse(candidate));
  } catch (err: any) {
    console.error('Error generating AI learning:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Failed to learn from edits' });
  }
});
`;

content = content.replace('// API endpoint for Gemini Text-To-Speech', newEndpoint + '\n// API endpoint for Gemini Text-To-Speech');

fs.writeFileSync('server.ts', content);
