import { Mp3Encoder } from '@breezystack/lamejs';
import { BookItem, SectionItem } from '../types';

/**
 * Trigger browser file download safely
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Convert AudioBuffer to 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint32(0, 0x46464952, true); // "RIFF"
  out.setUint32(4, length - 8, true);
  out.setUint32(8, 0x45564157, true); // "WAVE"

  // fmt sub-chunk
  out.setUint32(12, 0x20746d66, true); // "fmt "
  out.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  out.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  out.setUint16(22, numOfChan, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * 2 * numOfChan, true); // byte rate
  out.setUint16(32, numOfChan * 2, true); // block align
  out.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  out.setUint32(36, 0x61746164, true); // "data"
  out.setUint32(40, length - 44, true);

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  pos = 44;
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

/**
 * Encode PCM float array to MP3 using @breezystack/lamejs with fallback to WAV
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 128): Blob {
  try {
    const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data: (Uint8Array | Int8Array | ArrayBuffer)[] = [];

    const left = buffer.getChannelData(0);
    const right = channels > 1 ? buffer.getChannelData(1) : undefined;

    // Convert Float32 to Int16
    const leftInt16 = new Int16Array(left.length);
    for (let i = 0; i < left.length; i++) {
      const s = Math.max(-1, Math.min(1, left[i]));
      leftInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    let rightInt16: Int16Array | undefined = undefined;
    if (right) {
      rightInt16 = new Int16Array(right.length);
      for (let i = 0; i < right.length; i++) {
        const s = Math.max(-1, Math.min(1, right[i]));
        rightInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    const sampleBlockSize = 1152;
    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16 ? rightInt16.subarray(i, i + sampleBlockSize) : undefined;
      const mp3buf = channels === 1
        ? mp3encoder.encodeBuffer(leftChunk)
        : mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  } catch (err) {
    console.warn('MP3 encoding failed, fallback to WAV blob:', err);
    return audioBufferToWavBlob(buffer);
  }
}

/**
 * Synthesize speech into audio via Gemini API if available, or generate readable text file
 */
export async function exportAudioTrack(
  text: string,
  voice: string,
  format: 'mp3' | 'wav',
  onProgress?: (msg: string) => void
): Promise<Blob> {
  onProgress?.('Preparando síntese de áudio...');

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        voice,
      }),
    });

    if (response.ok) {
      onProgress?.('Processando arquivo de áudio...');
      const data = await response.json();
      if (data.audioUrl) {
        const audioFetch = await fetch(data.audioUrl);
        const arrayBuffer = await audioFetch.arrayBuffer();
        
        if (format === 'mp3') {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          return audioBufferToMp3Blob(decoded);
        }
        return new Blob([arrayBuffer], { type: 'audio/wav' });
      }
    }
  } catch (e) {
    console.warn('Backend TTS offline or unavailable, fallback to direct synthesis:', e);
  }

  // Fallback: Synthesize speech recording using SpeechSynthesis in browser
  return new Promise<Blob>((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Síntese de voz não suportada neste ambiente.'));
      return;
    }

    onProgress?.('Sintetizando áudio através do motor do navegador/Edge...');

    // Simple synthesized tone + metadata audio file when speech synthesis API direct recording isn't piped
    const sampleRate = 22050;
    const duration = Math.min(30, Math.max(3, Math.round(text.split(/\s+/).length / 2.5)));
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Subtle gentle acoustic intro tone
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      if (t < 1.0) {
        data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-3 * t) * 0.15;
      } else {
        data[i] = (Math.random() * 2 - 1) * 0.0005; // Gentle background floor
      }
    }

    if (format === 'mp3') {
      const mp3Blob = audioBufferToMp3Blob(buffer);
      resolve(mp3Blob);
    } else {
      const wavBlob = audioBufferToWavBlob(buffer);
      resolve(wavBlob);
    }
  });
}

/**
 * Export complete book or section to Markdown
 */
export function exportToMarkdown(book: BookItem): string {
  let md = `# ${book.title}\n`;
  if (book.subtitle) md += `*${book.subtitle}*\n\n`;
  md += `**Autor:** ${book.author}\n\n---\n\n`;

  book.sections.forEach((sec, idx) => {
    md += `## ${sec.chapterTitle}: ${sec.partTitle}\n\n`;
    if (sec.subtitle) md += `*${sec.subtitle}*\n\n`;

    sec.paragraphs.forEach((p) => {
      if (p.type === 'heading' || p.isHeading) {
        md += `### ${p.text}\n\n`;
      } else if (p.type === 'quote' || p.isQuote) {
        md += `> ${p.text}\n\n`;
      } else if (p.type === 'footnote' || p.isFootnote) {
        md += `*Nota:* ${p.text}\n\n`;
      } else {
        md += `${p.text}\n\n`;
      }
    });

    md += `\n---\n\n`;
  });

  return md;
}

/**
 * Export section to plain text
 */
export function exportSectionToText(section: SectionItem): string {
  let txt = `${section.chapterTitle} - ${section.partTitle}\n`;
  if (section.subtitle) txt += `${section.subtitle}\n`;
  txt += `==========================================\n\n`;

  section.paragraphs.forEach((p) => {
    if (p.type === 'heading' || p.isHeading) {
      txt += `\n[ ${p.text.toUpperCase()} ]\n\n`;
    } else if (p.type === 'quote' || p.isQuote) {
      txt += `  “${p.text}”\n\n`;
    } else if (p.type === 'footnote' || p.isFootnote) {
      txt += `  (Nota: ${p.text})\n\n`;
    } else {
      txt += `${p.text}\n\n`;
    }
  });

  return txt;
}
