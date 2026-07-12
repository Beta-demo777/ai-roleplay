export type TtsTextMode = 'full' | 'dialogue-only';

export function normalizeTtsText(content: string, mode: TtsTextMode): string {
  let text = content;
  if (mode === 'dialogue-only') text = text.replace(/\*[^*]*\*/g, ' ');
  else text = text.replace(/\*([^*]*)\*/g, '$1');
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/https?:\/\/\S+/g, '链接')
    .replace(/[#>_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitTtsText(text: string, maxLength = 160): string[] {
  if (!text) return [];
  const sentences = text.match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences.map(item => item.trim()).filter(Boolean)) {
    if ((current + sentence).length <= maxLength) {
      current += sentence;
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence;
      continue;
    }
    for (let index = 0; index < sentence.length; index += maxLength) {
      const part = sentence.slice(index, index + maxLength);
      if (part.length === maxLength) chunks.push(part);
      else current = part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
