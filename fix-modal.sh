#!/bin/bash

cat << 'INNER_EOF' > /tmp/modal.patch
--- src/components/DetectionCalibratorModal.tsx
+++ src/components/DetectionCalibratorModal.tsx
@@ -140,6 +140,55 @@
     if (msg) showToast(msg);
   };
 
+  const applyGlobalRuleLocally = (
+    cleanTerm: string,
+    action: 'remove_term' | 'split_term' | 'mark_pretextual' | 'mark_footnote' | 'mark_quote' | 'mark_heading' | 'omit_block'
+  ) => {
+    let currentSections = [...localSections];
+    currentSections = currentSections.map((sec) => {
+      const newParas: ParagraphItem[] = [];
+      for (const p of sec.paragraphs) {
+        const text = p.text;
+        if (!text.toLowerCase().includes(cleanTerm.toLowerCase())) {
+          newParas.push(p);
+          continue;
+        }
+        if (action === 'remove_term') {
+          const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
+          const regex = new RegExp(escaped, 'gi');
+          const newText = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
+          if (newText.length > 0) newParas.push({ ...p, text: newText });
+        } else if (action === 'split_term') {
+          const lowerText = text.toLowerCase();
+          const lowerTerm = cleanTerm.toLowerCase();
+          const idx = lowerText.indexOf(lowerTerm);
+          if (idx !== -1) {
+            const before = text.substring(0, idx).trim();
+            const matched = text.substring(idx, idx + cleanTerm.length).trim();
+            const after = text.substring(idx + cleanTerm.length).trim();
+            if (before) newParas.push({ id: \`p-pre-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: before, page: p.page, type: p.type });
+            newParas.push({ id: \`p-term-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: matched, page: p.page, type: 'header_footer', isHeaderFooter: true, isNonFree: true });
+            if (after) newParas.push({ id: \`p-post-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: after, page: p.page, type: p.type });
+          } else {
+            newParas.push(p);
+          }
+        } else if (action === 'mark_pretextual') {
+          newParas.push({ ...p, type: 'pre_post_textual', isPrePostTextual: true, isNonFree: true });
+        } else if (action === 'omit_block') {
+          newParas.push({ ...p, isNonFree: true });
+        } else if (action === 'mark_footnote') {
+          newParas.push({ ...p, type: 'footnote', isFootnote: true });
+        } else if (action === 'mark_quote') {
+          newParas.push({ ...p, type: 'quote', isQuote: true });
+        } else if (action === 'mark_heading') {
+          newParas.push({ ...p, type: 'heading', isHeading: true });
+        } else {
+          newParas.push(p);
+        }
+      }
+      return { ...sec, paragraphs: newParas };
+    });
+    commitSections(currentSections);
+  };
+
   const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);
 
   const handleAutoCalibrateWithAI = async () => {
INNER_EOF

# Apply the patch using node script since patch isn't available
cat << 'NODE_EOF' > /tmp/apply.js
const fs = require('fs');
const content = fs.readFileSync('src/components/DetectionCalibratorModal.tsx', 'utf8');
const patch = fs.readFileSync('/tmp/modal.patch', 'utf8');
// simplistic patch application: find the lines around 140
const parts = content.split('  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);');
const injection = fs.readFileSync('/tmp/modal.patch', 'utf8').split('@@')[2].split('\n').slice(1, -3).map(l => l.substring(1)).join('\n');
fs.writeFileSync('src/components/DetectionCalibratorModal.tsx', parts[0] + injection + '\n  const [isCalibratingWithAI, setIsCalibratingWithAI] = useState(false);' + parts[1]);
NODE_EOF

node /tmp/apply.js
