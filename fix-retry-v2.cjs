const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldCall = `    const response = await ai.models.generateContent({
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
                  description: { type: "STRING", description: "Why this rule is suggested" }
                },
                required: ["term", "action", "description"]
              }
            }
          },
          required: ["calibrationOptions", "globalRules"]
        }
      },
    });`;

const newCall = `    let response;
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
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
                      description: { type: "STRING", description: "Why this rule is suggested" }
                    },
                    required: ["term", "action", "description"]
                  }
                }
              },
              required: ["calibrationOptions", "globalRules"]
            }
          },
        });
        break; // Success
      } catch (err: any) {
        if (err?.status === 503 || err?.status === 429 || (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('429')))) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw err;
        }
      }
    }`;

// Wait, catch (err: any) is valid TS but we're doing a string replace. server.ts is compiled by esbuild.
content = content.replace(oldCall, newCall);

fs.writeFileSync('server.ts', content);
