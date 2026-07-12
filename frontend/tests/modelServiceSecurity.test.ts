import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPrivateAddress,
  normalizeModelServiceUrl,
  validateModelServiceUrl,
} from '../modelServiceSecurity';

test('normalizes common OpenAI-compatible endpoint suffixes', () => {
  assert.equal(
    normalizeModelServiceUrl('https://example.com/v1/chat/completions/'),
    'https://example.com/v1',
  );
  assert.equal(normalizeModelServiceUrl('https://example.com/v1/models'), 'https://example.com/v1');
});

test('rejects credentials, unsupported schemes and metadata endpoints', () => {
  assert.throws(() => normalizeModelServiceUrl('file:///tmp/model'));
  assert.throws(() => normalizeModelServiceUrl('https://user:pass@example.com/v1'));
  assert.throws(() => normalizeModelServiceUrl('http://169.254.169.254/latest'));
  assert.throws(() => normalizeModelServiceUrl('http://metadata.google.internal/v1'));
});

test('detects private and special-use network addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '::1', 'fd00::1']) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
});

test('private model services require explicit opt-in', async () => {
  await assert.rejects(validateModelServiceUrl('http://127.0.0.1:11434/v1', false));
  await assert.doesNotReject(validateModelServiceUrl('http://127.0.0.1:11434/v1', true));
});
