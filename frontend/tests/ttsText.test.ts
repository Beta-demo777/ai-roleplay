import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeTtsText, splitTtsText} from '../src/tts/text';

test('normalizes roleplay text for full and dialogue-only modes', () => {
  const source = '*微微点头* 晚上好。访问 https://example.com `code`';
  assert.equal(normalizeTtsText(source, 'full'), '微微点头 晚上好。访问 链接 code');
  assert.equal(normalizeTtsText(source, 'dialogue-only'), '晚上好。访问 链接 code');
});

test('splits long text into bounded chunks without losing content', () => {
  const text = '第一句话。第二句话很长很长。第三句话！';
  const chunks = splitTtsText(text, 10);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => chunk.length <= 10));
});
