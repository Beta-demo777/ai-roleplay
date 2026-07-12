import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_FEATURE_SETTINGS, resolveCharacterVoiceSettings} from '../src/featureSettings';

test('character voice settings inherit global defaults until enabled', () => {
  const inherited = resolveCharacterVoiceSettings({...DEFAULT_FEATURE_SETTINGS, speechRate: 1.2}, 'char-1');
  assert.equal(inherited.speechRate, 1.2);
});

test('enabled character voice settings override playback parameters', () => {
  const settings = {
    ...DEFAULT_FEATURE_SETTINGS,
    speechRate: 1,
    characterVoices: {
      'char-1': {
        useCustom: true,
        autoPlayAssistantReplies: true,
        speechRate: 0.8,
        speechPitch: 0.9,
        speechVolume: 0.7,
        voiceURI: 'voice-one',
      },
    },
  };
  const resolved = resolveCharacterVoiceSettings(settings, 'char-1');
  assert.equal(resolved.speechRate, 0.8);
  assert.equal(resolved.voiceURI, 'voice-one');
  assert.equal(resolved.autoPlayAssistantReplies, true);
});
