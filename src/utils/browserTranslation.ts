/**
 * Browser Automatic Translation Engine for Reading Text
 * Specifically targets document text with progressive sliding-window on-demand translation,
 * memory caching, multi-engine fallback, and section/page isolation to prevent full-document memory bloat.
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japonês (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Coreano (한국어)', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinês Simplificado (简体中文)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinês Tradicional (繁體中文)', flag: '🇹🇼' },
  { code: 'lzh', name: 'Chinês Literário / Clássico (文言文)', flag: '📜' },
];

// In-memory persistent translation cache to avoid re-fetching the same text
const translationCache = new Map<string, string>();

export function getCacheKey(text: string, lang: string): string {
  return `${lang}:::${text.trim()}`;
}

/**
 * Remove items from cache to free up memory (useful for sliding window).
 */
export function clearTranslationCache(keysToKeep: Set<string> | null = null) {
  if (!keysToKeep) {
    translationCache.clear();
  } else {
    for (const key of Array.from(translationCache.keys())) {
      if (!keysToKeep.has(key)) {
        translationCache.delete(key);
      }
    }
  }
}

/**
 * Split very long paragraph into smaller sentence chunks for API URL limits
 */
function splitIntoTranslationChunks(text: string, maxLen = 800): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|\S+/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Engine 1: Google Translate single GTX endpoint
 */
async function fetchGoogleGtx(chunk: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
    targetLang
  )}&dt=t&q=${encodeURIComponent(chunk)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google GTX translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0].map((item: any) => item[0]).join('');
    if (translated) return translated;
  }
  throw new Error('Google GTX returned empty data');
}

/**
 * Engine 2: Google Translate dict-chrome endpoint fallback
 */
async function fetchGoogleChromeEx(chunk: string, targetLang: string): Promise<string> {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(
    targetLang
  )}&q=${encodeURIComponent(chunk)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google ChromeEx translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && typeof data[0] === 'string') {
    return data[0];
  } else if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].join(' ');
  }
  throw new Error('Google ChromeEx returned empty data');
}

/**
 * Engine 3: MyMemory free translation API fallback
 */
async function fetchMyMemory(chunk: string, targetLang: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    chunk
  )}&langpair=autodetect|${encodeURIComponent(targetLang)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data?.responseData?.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('MyMemory returned empty translation');
}

/**
 * High-speed, robust client-side translation with automatic multi-engine fallbacks and caching.
 */
export async function translateTextSnippet(
  text: string,
  targetLang: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length === 0) return text;

  const cacheKey = getCacheKey(trimmed, targetLang);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Normalize language codes for translation API
  let apiLang = targetLang;
  if (targetLang === 'zh') {
    apiLang = 'zh-CN';
  } else if (targetLang === 'lzh' || targetLang === 'zh-classical') {
    apiLang = 'zh-TW';
  }

  const chunks = splitIntoTranslationChunks(trimmed, 800);
  const translatedParts: string[] = [];

  for (const chunk of chunks) {
    const chunkKey = getCacheKey(chunk, targetLang);
    if (translationCache.has(chunkKey)) {
      translatedParts.push(translationCache.get(chunkKey)!);
      continue;
    }

    let translatedChunk = '';

    // Try Engine 1: Google GTX
    try {
      translatedChunk = await fetchGoogleGtx(chunk, apiLang);
    } catch (e1) {
      // Try Engine 2: Google ChromeEx
      try {
        translatedChunk = await fetchGoogleChromeEx(chunk, apiLang);
      } catch (e2) {
        // Try Engine 3: MyMemory
        try {
          translatedChunk = await fetchMyMemory(chunk, apiLang);
        } catch (e3) {
          console.warn('All translation fallbacks exhausted for chunk, retaining original.');
          translatedChunk = chunk;
        }
      }
    }

    if (translatedChunk && translatedChunk !== chunk) {
      translationCache.set(chunkKey, translatedChunk);
    }
    translatedParts.push(translatedChunk || chunk);
  }

  const fullTranslated = translatedParts.join(' ');
  if (fullTranslated) {
    translationCache.set(cacheKey, fullTranslated);
    return fullTranslated;
  }

  return text;
}

/**
 * Translates a single section/page batch of paragraphs
 * Only translates paragraphs that are not yet in cache.
 */
export async function translateSectionBatch(
  paragraphs: { id: string; text: string }[],
  targetLang: string,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};
  let completed = 0;

  // Filter items needing fetch vs cached
  const toFetch: { id: string; text: string }[] = [];
  paragraphs.forEach((p) => {
    const key = getCacheKey(p.text, targetLang);
    if (translationCache.has(key)) {
      translations[p.id] = translationCache.get(key)!;
      completed++;
    } else {
      toFetch.push(p);
    }
  });

  if (onProgress) {
    onProgress(completed, paragraphs.length);
  }

  if (toFetch.length === 0) {
    return translations;
  }

  // Process in concurrent chunks of 3 for optimum throughput and avoiding rate limits
  const chunkSize = 3;
  for (let i = 0; i < toFetch.length; i += chunkSize) {
    const chunk = toFetch.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (p) => {
        try {
          const trans = await translateTextSnippet(p.text, targetLang);
          translations[p.id] = trans;
        } catch (e) {
          translations[p.id] = p.text;
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, paragraphs.length);
          }
        }
      })
    );
  }

  return translations;
}

/**
 * Translates an array of paragraphs (general purpose)
 */
export async function translateParagraphBatch(
  paragraphs: { id: string; text: string }[],
  targetLang: string,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
  return translateSectionBatch(paragraphs, targetLang, onProgress);
}

/**
 * Triggers native Chrome / Edge translation helper
 */
export function triggerBrowserNativeTranslatePrompt() {
  if (typeof window === 'undefined') return;

  const textElement = document.getElementById('audiobook-reader-container');
  if (textElement) {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(textElement);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

