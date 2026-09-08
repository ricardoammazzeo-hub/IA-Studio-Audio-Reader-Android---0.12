#!/bin/bash
cat << 'INNER_EOF' > /tmp/retry.patch
--- server.ts
+++ server.ts
@@ -83,44 +83,57 @@
 Sample Text:
 \${sampleText.slice(0, 25000)} // Allow a larger sample
 \`;
 
-    const response = await ai.models.generateContent({
-      model: 'gemini-3.6-flash',
-      contents: [{ role: 'user', parts: [{ text: prompt }] }],
-      config: {
-        responseMimeType: 'application/json',
-        responseSchema: {
-          type: "OBJECT",
-          properties: {
-            calibrationOptions: {
-              type: "OBJECT",
-              properties: {
-                stripRunningHeaders: { type: "BOOLEAN", description: "Whether to aggressively strip top/bottom running headers" },
-                splitFusedPageNumbers: { type: "BOOLEAN", description: "Whether to split page numbers fused to text" },
-                classifyFootnotes: { type: "BOOLEAN", description: "Whether to look for footnotes" },
-                stripTopLines: { type: "BOOLEAN", description: "Whether to strip repetitive top lines" }
-              },
-              required: ["stripRunningHeaders", "splitFusedPageNumbers", "classifyFootnotes", "stripTopLines"]
-            },
-            globalRules: {
-              type: "ARRAY",
-              items: {
-                type: "OBJECT",
-                properties: {
-                  term: { type: "STRING", description: "The exact recurring text to target (e.g. 'Copyright', 'Vol.', 'Capítulo')" },
-                  action: { type: "STRING", enum: ["remove_term", "split_term", "mark_pretextual", "mark_footnote", "mark_quote", "mark_heading", "omit_block"] },
-                  description: { type: "STRING", description: "Why this rule is suggested" }
-                },
-                required: ["term", "action", "description"]
-              }
-            }
-          },
-          required: ["calibrationOptions", "globalRules"]
-        }
-      },
-    });
+    let response;
+    let retries = 3;
+    let delay = 1000;
+    while (retries > 0) {
+      try {
+        response = await ai.models.generateContent({
+          model: 'gemini-3.6-flash',
+          contents: [{ role: 'user', parts: [{ text: prompt }] }],
+          config: {
+            responseMimeType: 'application/json',
+            responseSchema: {
+              type: "OBJECT",
+              properties: {
+                calibrationOptions: {
+                  type: "OBJECT",
+                  properties: {
+                    stripRunningHeaders: { type: "BOOLEAN", description: "Whether to aggressively strip top/bottom running headers" },
+                    splitFusedPageNumbers: { type: "BOOLEAN", description: "Whether to split page numbers fused to text" },
+                    classifyFootnotes: { type: "BOOLEAN", description: "Whether to look for footnotes" },
+                    stripTopLines: { type: "BOOLEAN", description: "Whether to strip repetitive top lines" }
+                  },
+                  required: ["stripRunningHeaders", "splitFusedPageNumbers", "classifyFootnotes", "stripTopLines"]
+                },
+                globalRules: {
+                  type: "ARRAY",
+                  items: {
+                    type: "OBJECT",
+                    properties: {
+                      term: { type: "STRING", description: "The exact recurring text to target (e.g. 'Copyright', 'Vol.', 'Capítulo')" },
+                      action: { type: "STRING", enum: ["remove_term", "split_term", "mark_pretextual", "mark_footnote", "mark_quote", "mark_heading", "omit_block"] },
+                      description: { type: "STRING", description: "Why this rule is suggested" }
+                    },
+                    required: ["term", "action", "description"]
+                  }
+                }
+              },
+              required: ["calibrationOptions", "globalRules"]
+            }
+          },
+        });
+        break; // Success, exit loop
+      } catch (err: any) {
+        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE')) {
+          retries--;
+          if (retries === 0) throw err;
+          await new Promise(res => setTimeout(res, delay));
+          delay *= 2; // Exponential backoff
+        } else {
+          throw err;
+        }
+      }
+    }
 
     const jsonText = response?.text() || '{}';
INNER_EOF
patch -p0 < /tmp/retry.patch
