import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeChatThreads} from '../src/threadState';

const thread = (timestamp: number, messages: number) => ({
  id: 'thread-1',
  characterId: 'char-1',
  title: '对话',
  timestamp,
  messages: Array.from({length: messages}, (_, index) => ({
    id: `message-${index}`,
    role: index % 2 ? 'assistant' as const : 'user' as const,
    content: `消息 ${index}`,
    timestamp: timestamp + index,
  })),
});

test('keeps newer local messages when a refresh beats the debounced backend save', () => {
  const merged = mergeChatThreads([thread(200, 2)], [thread(100, 0)]);
  assert.equal(merged[0].messages.length, 2);
  assert.equal(merged[0].timestamp, 200);
});

test('keeps a newer remote reset instead of restoring stale local messages', () => {
  const merged = mergeChatThreads([thread(100, 2)], [thread(200, 0)]);
  assert.equal(merged[0].messages.length, 0);
  assert.equal(merged[0].timestamp, 200);
});
