#!/bin/bash
cat << 'INNER_EOF' > /tmp/modal2.patch
--- src/components/DetectionCalibratorModal.tsx
+++ src/components/DetectionCalibratorModal.tsx
@@ -218,63 +218,12 @@
       }
 
       if (data.globalRules && Array.isArray(data.globalRules)) {
-        let currentSections = [...localSections];
-        let hasChanges = false;
-
         for (const rule of data.globalRules) {
           if (rule.term && rule.action) {
-            const cleanTerm = rule.term.trim();
-            if (!cleanTerm) continue;
-
-            hasChanges = true;
-            // Also notify the parent app so the rule is applied to the global book
             applyGlobalRuleLocally(rule.term, rule.action);
-
-            // Apply directly to the modal's working memory so the user sees it immediately
-            currentSections = currentSections.map((sec) => {
-              const newParas: ParagraphItem[] = [];
-              for (const p of sec.paragraphs) {
-                const text = p.text;
-                if (!text.toLowerCase().includes(cleanTerm.toLowerCase())) {
-                  newParas.push(p);
-                  continue;
-                }
-                
-                if (rule.action === 'remove_term') {
-                  const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
-                  const regex = new RegExp(escaped, 'gi');
-                  const newText = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
-                  if (newText.length > 0) newParas.push({ ...p, text: newText });
-                } else if (rule.action === 'split_term') {
-                  const lowerText = text.toLowerCase();
-                  const lowerTerm = cleanTerm.toLowerCase();
-                  const idx = lowerText.indexOf(lowerTerm);
-                  if (idx !== -1) {
-                    const before = text.substring(0, idx).trim();
-                    const matched = text.substring(idx, idx + cleanTerm.length).trim();
-                    const after = text.substring(idx + cleanTerm.length).trim();
-                    if (before) newParas.push({ id: \`p-pre-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: before, page: p.page, type: p.type });
-                    newParas.push({ id: \`p-term-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: matched, page: p.page, type: 'header_footer', isHeaderFooter: true, isNonFree: true });
-                    if (after) newParas.push({ id: \`p-post-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, text: after, page: p.page, type: p.type });
-                  } else {
-                    newParas.push(p);
-                  }
-                } else if (rule.action === 'mark_pretextual') {
-                  newParas.push({ ...p, type: 'pre_post_textual', isPrePostTextual: true, isNonFree: true });
-                } else if (rule.action === 'omit_block') {
-                  newParas.push({ ...p, isNonFree: true });
-                } else if (rule.action === 'mark_footnote') {
-                  newParas.push({ ...p, type: 'footnote', isFootnote: true });
-                } else if (rule.action === 'mark_quote') {
-                  newParas.push({ ...p, type: 'quote', isQuote: true });
-                } else if (rule.action === 'mark_heading') {
-                  newParas.push({ ...p, type: 'heading', isHeading: true });
-                } else {
-                  newParas.push(p);
-                }
-              }
-              return { ...sec, paragraphs: newParas };
-            });
           }
         }
-        
-        if (hasChanges) {
-          commitSections(currentSections);
-        }
       }
 
       showToast('✨ Calibração Inteligente concluída! Parâmetros e regras aplicadas.');
INNER_EOF
patch -p0 < /tmp/modal2.patch || echo "Patch failed"
