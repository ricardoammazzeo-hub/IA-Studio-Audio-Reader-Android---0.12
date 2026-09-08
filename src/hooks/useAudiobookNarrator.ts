import { useState, useEffect, useRef, useCallback } from 'react';
import { SectionItem, ParagraphItem, PlaybackEngine } from '../types';
import { logger } from '../utils/appLogger';

export interface UseAudiobookNarratorReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraphIndex: number;
  engine: PlaybackEngine;
  setEngine: (engine: PlaybackEngine) => void;
  speed: number;
  setSpeed: (rate: number) => void;
  volume: number;
  setVolume: (vol: number) => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  availableVoices: SpeechSynthesisVoice[];
  readFootnotes: boolean;
  setReadFootnotes: (read: boolean) => void;
  isLoadingAudio: boolean;
  progressPercent: number;
  play: (startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  resetAudioEngine: () => void;
  togglePlay: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  jumpToParagraph: (index: number) => void;
  navigateToParagraph: (index: number, shouldPlay?: boolean) => void;
  downloadCurrentSectionAudio: () => Promise<void>;
  isDownloading: boolean;
  isPocketMode: boolean;
  setPocketMode: (active: boolean) => void;
}

export function useAudiobookNarrator(
  section: SectionItem,
  activeSectionIndex: number = 0,
  onSectionEnd?: () => void
): UseAudiobookNarratorReturn {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);
  const [engine, setEngine] = useState<PlaybackEngine>('browser');
  const [speed, setSpeed] = useState<number>(1.25); // Default audio speed is 1.25
  const [volume, setVolume] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [readFootnotes, setReadFootnotes] = useState<boolean>(false); // default FALSE
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isPocketMode, setIsPocketMode] = useState<boolean>(false);

  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentParagraphIndexRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  const volumeRef = useRef<number>(volume);
  const sectionRef = useRef<SectionItem>(section);
  const activeSectionIndexRef = useRef<number>(activeSectionIndex);
  const onSectionEndRef = useRef<(() => void) | undefined>(onSectionEnd);
  const readFootnotesRef = useRef<boolean>(readFootnotes);
  const wakeLockRef = useRef<any>(null);

  sectionRef.current = section;
  activeSectionIndexRef.current = activeSectionIndex;
  onSectionEndRef.current = onSectionEnd;
  speedRef.current = speed;
  volumeRef.current = volume;
  readFootnotesRef.current = readFootnotes;
  currentParagraphIndexRef.current = currentParagraphIndex;
  isPlayingRef.current = isPlaying;

  // Helper to check if a paragraph should be read aloud
  const shouldReadParagraph = useCallback((p: ParagraphItem | undefined): boolean => {
    if (!p) return false;
    // Explicit non-free flag (e.g. index, references, ignored table of contents)
    if (p.isNonFree) return false;
    // Section-level non-free
    if (sectionRef.current.isNonFree) return false;
    // Explicit override if user sets includeInReading
    if (p.includeInReading === false) return false;
    if (p.includeInReading === true) return true;

    const pType =
      p.type ||
      (p.isHeaderFooter
        ? 'header_footer'
        : p.isPrePostTextual
        ? 'pre_post_textual'
        : p.isHeading
        ? 'heading'
        : p.isFootnote
        ? 'footnote'
        : p.isQuote
        ? 'quote'
        : 'text');

    // Never read header/footer or pre/post-textual elements
    if (pType === 'header_footer' || p.isHeaderFooter) return false;
    if (pType === 'pre_post_textual' || p.isPrePostTextual) return false;

    // Footnotes only read if user enabled it (default is false)
    if (pType === 'footnote' || p.isFootnote) {
      return readFootnotesRef.current;
    }

    return true;
  }, []);

  // Find next readable index starting from a given index
  const findNextReadableIndex = useCallback(
    (startIndex: number, direction: 1 | -1 = 1): number => {
      const paragraphs = sectionRef.current.paragraphs;
      let idx = startIndex;
      while (idx >= 0 && idx < paragraphs.length) {
        if (shouldReadParagraph(paragraphs[idx])) {
          return idx;
        }
        idx += direction;
      }
      return -1;
    },
    [shouldReadParagraph]
  );

  // --- Wake Lock API Implementation ---
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          logger.info('WakeLock', 'Tela mantida ativa com sucesso');
          
          wakeLockRef.current.addEventListener('release', () => {
            logger.info('WakeLock', 'Wake Lock liberado');
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('Wake Lock request failed', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Wake Lock release failed', err);
      }
    }
  }, []);

  // Manage Wake Lock based on playback state or pocket mode
  useEffect(() => {
    if (isPlaying || isPocketMode) {
      requestWakeLock();
    } else {
      const t = setTimeout(() => {
        if (!isPlayingRef.current && !isPocketMode) {
          releaseWakeLock();
        }
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [isPlaying, isPocketMode, requestWakeLock, releaseWakeLock]);

  // Re-request wake lock if visibility changes while playing/pocket mode
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (isPlayingRef.current || isPocketMode)) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPocketMode, requestWakeLock]);

  // --- TTS Engine Wake-up / Primer Hack ---
  // Mobile browsers (especially Edge Android) delay loading cloud voices (like Francisca)
  // until the TTS engine is actually used by a user interaction to save battery/data.
  // We attach a one-time listener to wake the engine up silently on the first tap.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const wakeUpTTS = () => {
      // If voices are already loaded and we have a natural voice, no need to wake up
      const voices = window.speechSynthesis.getVoices();
      const hasNatural = voices.some(v => v.name.includes('Natural') || v.name.includes('Online'));
      
      if (!hasNatural) {
        logger.info('TTS', 'Tentando acordar o motor de voz do Edge...');
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
      
      // Remove listeners after first interaction
      document.removeEventListener('click', wakeUpTTS);
      document.removeEventListener('touchstart', wakeUpTTS);
    };

    document.addEventListener('click', wakeUpTTS, { once: true });
    document.addEventListener('touchstart', wakeUpTTS, { once: true });

    return () => {
      document.removeEventListener('click', wakeUpTTS);
      document.removeEventListener('touchstart', wakeUpTTS);
    };
  }, []);

  // Load browser voices & prioritize Edge Natural Voices & Windows voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        if (voices.length > 0) {
          // 1. Check for Microsoft Edge Natural Portuguese voices (Francisca, Antonio, Thalita, etc.)
          const edgeNaturalPt = voices.find(
            (v) =>
              (v.name.includes('Natural') || v.name.includes('Online')) &&
              (v.lang.startsWith('pt') || v.name.toLowerCase().includes('portuguese') || v.name.toLowerCase().includes('brazil'))
          );

          // 2. Check for standard PT-BR voices
          const ptBrVoice = voices.find((v) => v.lang === 'pt-BR');

          // 3. Check for any PT voice
          const anyPtVoice = voices.find((v) => v.lang.startsWith('pt'));

          // 4. Any Edge natural voice in any language
          const anyEdgeNatural = voices.find((v) => v.name.includes('Natural') || v.name.includes('Online'));

          const preferredVoice = edgeNaturalPt || ptBrVoice || anyPtVoice || anyEdgeNatural || voices[0];
          if (preferredVoice) {
            setSelectedVoice((current) => current || preferredVoice.voiceURI || preferredVoice.name);
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      // Retry in case voices load asynchronously (common in Chromium/Edge)
      const timer = setTimeout(updateVoices, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // When section changes, seamlessly continue playback if active, or reset
  useEffect(() => {
    if (isPlayingRef.current) {
      setCurrentParagraphIndex(0);
      // Small timeout to allow new DOM section nodes to settle
      const t = setTimeout(() => {
        if (isPlayingRef.current) {
          playBrowserParagraph(0);
        }
      }, 60);
      return () => clearTimeout(t);
    } else {
      stop();
      setCurrentParagraphIndex(0);
    }
  }, [section.id]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoadingAudio(false);
  }, []);

  // Forceful Emergency Reset of browser Speech Synthesis engine
  const resetAudioEngine = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
        }
      } catch (err) {
        console.warn('Error resetting audio engine:', err);
      }
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoadingAudio(false);
  }, []);

  // Heartbeat & Zoom / Tab Visibility auto-recovery for browser Speech Synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Auto-unfreeze on window focus, zoom, or visibility change
    const handleReactivation = () => {
      if (document.visibilityState === 'visible') {
        if (isPlayingRef.current && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    };

    window.addEventListener('focus', handleReactivation);
    window.addEventListener('resize', handleReactivation);
    document.addEventListener('visibilitychange', handleReactivation);

    return () => {
      window.removeEventListener('focus', handleReactivation);
      window.removeEventListener('resize', handleReactivation);
      document.removeEventListener('visibilitychange', handleReactivation);
    };
  }, []);

  const playBrowserParagraph = useCallback((index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const paragraphs = sectionRef.current.paragraphs;

    // Find next valid readable index if current is not readable
    const targetIndex = shouldReadParagraph(paragraphs[index])
      ? index
      : findNextReadableIndex(index, 1);

    if (targetIndex !== index && targetIndex !== -1) {
      const skippedCount = targetIndex - index;
      logger.audio('Playback', `Omitindo ${skippedCount} bloco(s) não-legível(is) (Índice original: ${index}, Novo alvo: ${targetIndex})`);
    }

    if (targetIndex === -1 || targetIndex >= paragraphs.length) {
      if (onSectionEndRef.current && isPlayingRef.current) {
        onSectionEndRef.current();
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
      return;
    }

    window.speechSynthesis.cancel();

    // --- LEITURA DO TEXTO TRADUZIDO EM TEMPO REAL DIRETO DA TELA ---
    const domElement =
      document.getElementById(`paragraph-${activeSectionIndexRef.current}-${targetIndex}`) ||
      document.getElementById(`paragraph-${targetIndex}`);
    let textToRead = '';

    if (domElement) {
      // Wait for translation to finish if it's currently in flight
      if (domElement.hasAttribute('data-is-translating')) {
        setTimeout(() => {
          if (isPlayingRef.current) {
            playBrowserParagraph(index);
          }
        }, 200);
        return;
      }

      // 1. Check for designated data-reader-text element (pure book text container)
      const explicitTextEl = domElement.querySelector('[data-reader-text="true"]') as HTMLElement | null;
      if (explicitTextEl && explicitTextEl.innerText && explicitTextEl.innerText.trim().length > 0) {
        textToRead = explicitTextEl.innerText.trim();
      } else {
        // 2. Clone the element and strip all UI elements, badges, action pills, and SVGs
        const clone = domElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-no-speech], [aria-hidden="true"], button, svg, span.uppercase, span[class*="text-[10px]"], span[class*="text-[11px]"]').forEach((el) => el.remove());
        textToRead = clone.innerText?.trim() || '';
      }
    }

    if (!textToRead) {
      textToRead = paragraphs[targetIndex]?.text || '';
    }

    // Limpeza profunda e rigorosa de qualquer resquício de texto de navegação, subtítulos de bloco ou botões
    textToRead = textToRead
      .replace(/\b(título original|texto original|bloco sincronizado)\b/gi, '')
      .replace(/\b(bloco marcado como não-livre|índice \(ignorado na narração\))\b/gi, '')
      .replace(/\b(cabeçalho\/rodapé \(omitido da narração\)|elemento pré\/pós-textual \(omitido da narração\))\b/gi, '')
      .replace(/\b(ouvir esse trecho|ouvir desse trecho|ouvir deste trecho|ouvir citação|ouvir nota|ouvir narração|ouvir daqui|ouvir)\b/gi, '')
      .replace(/\b(narrando citação\.\.\.|narrando nota\.\.\.|narrando\.\.\.|pausado|ativo|read aloud)\b/gi, '')
      .replace(/^nota\b[:\s-]*/gi, '')
      .replace(/^citação\b[:\s-]*/gi, '')
      .trim();

    if (!textToRead) {
      textToRead = paragraphs[targetIndex]?.text || '';
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    speechUtteranceRef.current = utterance;

    utterance.rate = speedRef.current;
    utterance.volume = volumeRef.current;

    let voiceObj: SpeechSynthesisVoice | undefined;
    if (selectedVoice) {
      voiceObj = availableVoices.find(
        (v) => v.voiceURI === selectedVoice || v.name === selectedVoice
      );
      if (voiceObj) {
        utterance.voice = voiceObj;
        utterance.lang = voiceObj.lang;
      }
    }

    if (!utterance.lang) {
      utterance.lang = 'pt-BR';
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentParagraphIndex(targetIndex);
    };

    utterance.onend = () => {
      if (isPlayingRef.current) {
        const nextIndex = findNextReadableIndex(targetIndex + 1, 1);
        if (nextIndex !== -1 && nextIndex < sectionRef.current.paragraphs.length) {
          setCurrentParagraphIndex(nextIndex);
          playBrowserParagraph(nextIndex);
        } else {
          if (onSectionEndRef.current) {
            onSectionEndRef.current();
          } else {
            setIsPlaying(false);
            setIsPaused(false);
          }
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (isPlayingRef.current && e.error !== 'canceled' && e.error !== 'interrupted') {
        const nextIndex = findNextReadableIndex(targetIndex + 1, 1);
        if (nextIndex !== -1 && nextIndex < sectionRef.current.paragraphs.length) {
          playBrowserParagraph(nextIndex);
        } else {
          if (onSectionEndRef.current) {
            onSectionEndRef.current();
          } else {
            setIsPlaying(false);
            setIsPaused(false);
          }
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [availableVoices, selectedVoice, shouldReadParagraph, findNextReadableIndex]);

  const play = useCallback((startIndex?: number) => {
    const rawIdx = startIndex !== undefined ? startIndex : currentParagraphIndexRef.current;
    const targetIdx = shouldReadParagraph(sectionRef.current.paragraphs[rawIdx])
      ? rawIdx
      : findNextReadableIndex(rawIdx, 1);

    if (targetIdx === -1) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    setCurrentParagraphIndex(targetIdx);
    setIsPlaying(true);
    setIsPaused(false);

    playBrowserParagraph(targetIdx);
  }, [playBrowserParagraph, shouldReadParagraph, findNextReadableIndex]);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        setIsPaused(false);
      } else {
        play(currentParagraphIndexRef.current);
      }
    } else {
      play(currentParagraphIndexRef.current);
    }
  }, [play]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      logger.audio('Playback', 'Áudio pausado pelo usuário');
    } else if (isPaused) {
      resume();
      logger.audio('Playback', 'Áudio retomado pelo usuário');
    } else {
      play(currentParagraphIndex);
      logger.audio('Playback', `Iniciando áudio no parágrafo ${currentParagraphIndex + 1}`);
    }
  }, [isPlaying, isPaused, currentParagraphIndex, pause, resume, play]);

  const jumpToParagraph = useCallback((index: number) => {
    stop();
    setCurrentParagraphIndex(index);
    play(index);
    logger.audio('AudioJump', `Saltando e narrando a partir do parágrafo ${index + 1}`);
  }, [stop, play]);

  // Navigate to a paragraph without automatically blasting audio unless requested or already playing
  const navigateToParagraph = useCallback((index: number, shouldPlay: boolean = false) => {
    setCurrentParagraphIndex(index);
    if (shouldPlay || isPlayingRef.current) {
      stop();
      play(index);
      logger.audio('Navigation', `Navegando para o parágrafo ${index + 1} com narração ativa`);
    } else {
      logger.action('Navigation', `Posicionando visualmente no parágrafo ${index + 1}`);
    }
  }, [stop, play]);

  const skipForward = useCallback(() => {
    const next = findNextReadableIndex(currentParagraphIndex + 1, 1);
    if (next !== -1) {
      jumpToParagraph(next);
    }
  }, [currentParagraphIndex, findNextReadableIndex, jumpToParagraph]);

  const skipBackward = useCallback(() => {
    const prev = findNextReadableIndex(currentParagraphIndex - 1, -1);
    if (prev !== -1) {
      jumpToParagraph(prev);
    }
  }, [currentParagraphIndex, findNextReadableIndex, jumpToParagraph]);

  // Adjust speed on the fly
  const handleSetSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    logger.audio('AudioSpeed', `Velocidade alterada para ${newSpeed}x`);
    if (isPlaying) {
      playBrowserParagraph(currentParagraphIndexRef.current);
    }
  }, [isPlaying, playBrowserParagraph]);

  // Adjust volume on the fly
  const handleSetVolume = useCallback((newVol: number) => {
    setVolume(newVol);
    volumeRef.current = newVol;
    logger.audio('AudioVolume', `Volume ajustado para ${Math.round(newVol * 100)}%`);
  }, []);

  // Download section as audio or text track
  const downloadCurrentSectionAudio = useCallback(async () => {
    setIsDownloading(true);
    try {
      const readableParagraphs = section.paragraphs.filter((p) => shouldReadParagraph(p));
      const fullText = readableParagraphs.map((p) => p.text).join('\n\n');

      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${section.chapterTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${section.partTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      logger.action('Export', `Texto da seção exportado como TXT (${readableParagraphs.length} parágrafos)`);
    } catch (e) {
      console.error('Download error:', e);
      logger.error('Export', 'Falha ao baixar texto da seção', { error: String(e) });
    } finally {
      setIsDownloading(false);
    }
  }, [section, shouldReadParagraph]);

  const progressPercent = section.paragraphs.length > 0
    ? ((currentParagraphIndex + (isPlaying ? 0.5 : 0)) / section.paragraphs.length) * 100
    : 0;

  return {
    isPlaying,
    isPaused,
    currentParagraphIndex,
    engine,
    setEngine,
    speed,
    setSpeed: handleSetSpeed,
    volume,
    setVolume: handleSetVolume,
    selectedVoice,
    setSelectedVoice,
    availableVoices,
    readFootnotes,
    setReadFootnotes,
    isLoadingAudio,
    progressPercent,
    play,
    pause,
    resume,
    stop,
    resetAudioEngine,
    togglePlay,
    skipForward,
    skipBackward,
    jumpToParagraph,
    navigateToParagraph,
    downloadCurrentSectionAudio,
    isDownloading,
    isPocketMode,
    setPocketMode: setIsPocketMode,
  };
}
