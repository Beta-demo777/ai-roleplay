export const FEATURE_SETTINGS_STORAGE_KEY = 'aura_feature_settings_v1';
export const DEFAULT_TTS_VOICE = 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)';

export interface CharacterVoiceSettings {
  useCustom: boolean;
  autoPlayAssistantReplies: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voiceURI: string;
}

export interface FeatureSettings {
  ttsDefaultsVersion: number;
  voicePlaybackEnabled: boolean;
  autoPlayAssistantReplies: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voiceURI: string;
  ttsTextMode: 'full' | 'dialogue-only';
  characterVoices: Record<string, CharacterVoiceSettings>;
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  ttsDefaultsVersion: 2,
  voicePlaybackEnabled: false,
  autoPlayAssistantReplies: false,
  speechRate: 1,
  speechPitch: 1,
  speechVolume: 1,
  voiceURI: DEFAULT_TTS_VOICE,
  ttsTextMode: 'dialogue-only',
  characterVoices: {},
};

export function resolveCharacterVoiceSettings(settings: FeatureSettings, characterId?: string): FeatureSettings {
  if (!characterId) return settings;
  const custom = settings.characterVoices[characterId];
  if (!custom?.useCustom) return settings;
  return {
    ...settings,
    autoPlayAssistantReplies: custom.autoPlayAssistantReplies,
    speechRate: custom.speechRate,
    speechPitch: custom.speechPitch,
    speechVolume: custom.speechVolume,
    voiceURI: custom.voiceURI,
  };
}

export function loadFeatureSettings(): FeatureSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(FEATURE_SETTINGS_STORAGE_KEY) || '{}');
    const merged = {...DEFAULT_FEATURE_SETTINGS, ...saved};
    if ((saved.ttsDefaultsVersion || 0) < 2) {
      merged.ttsDefaultsVersion = 2;
      merged.ttsTextMode = 'dialogue-only';
      merged.voiceURI = DEFAULT_TTS_VOICE;
    }
    return merged;
  } catch {
    return DEFAULT_FEATURE_SETTINGS;
  }
}

export function saveFeatureSettings(settings: FeatureSettings): void {
  localStorage.setItem(FEATURE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
