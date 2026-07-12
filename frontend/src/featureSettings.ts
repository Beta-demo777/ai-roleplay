export const FEATURE_SETTINGS_STORAGE_KEY = 'aura_feature_settings_v1';

export interface FeatureSettings {
  voicePlaybackEnabled: boolean;
  autoPlayAssistantReplies: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voiceURI: string;
  ttsTextMode: 'full' | 'dialogue-only';
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  voicePlaybackEnabled: false,
  autoPlayAssistantReplies: false,
  speechRate: 1,
  speechPitch: 1,
  speechVolume: 1,
  voiceURI: '',
  ttsTextMode: 'full',
};

export function loadFeatureSettings(): FeatureSettings {
  try {
    return {...DEFAULT_FEATURE_SETTINGS, ...JSON.parse(localStorage.getItem(FEATURE_SETTINGS_STORAGE_KEY) || '{}')};
  } catch {
    return DEFAULT_FEATURE_SETTINGS;
  }
}

export function saveFeatureSettings(settings: FeatureSettings): void {
  localStorage.setItem(FEATURE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
