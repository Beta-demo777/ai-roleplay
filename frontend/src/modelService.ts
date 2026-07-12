export const MODEL_PROVIDERS_STORAGE_KEY = 'aura_model_providers';
export const ACTIVE_MODEL_PROVIDER_STORAGE_KEY = 'aura_active_model_provider_id';
export const MODEL_SERVICE_CHANGE_EVENT = 'aura-model-service-change';

export interface ModelServiceModel {
  name: string;
  isEnabled: boolean;
  isFavorite?: boolean;
}

export interface ModelServiceProvider {
  id: string;
  name: string;
  tagline: string;
  isCustom?: boolean;
  isOn?: boolean;
  defaultUrl: string;
  urlPlaceholder: string;
  keyUrl: string;
  modelsCount: number;
  selectedModel?: string;
  modelGroups: {
    groupName: string;
    isOpen: boolean;
    models: ModelServiceModel[];
  }[];
}

export interface ActiveModelServiceConfig {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function normalizeModelServiceBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|models)$/i, '');
}

export function loadModelProviders(): ModelServiceProvider[] {
  try {
    const saved = localStorage.getItem(MODEL_PROVIDERS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ModelServiceProvider[];
    return Array.isArray(parsed)
      ? parsed.filter(provider => provider?.id)
      : [];
  } catch {
    return [];
  }
}

export function notifyModelServiceChanged(): void {
  window.dispatchEvent(new Event(MODEL_SERVICE_CHANGE_EVENT));
}

export function setActiveModelProvider(providerId: string): void {
  if (providerId) {
    localStorage.setItem(ACTIVE_MODEL_PROVIDER_STORAGE_KEY, providerId);
  } else {
    localStorage.removeItem(ACTIVE_MODEL_PROVIDER_STORAGE_KEY);
  }
  notifyModelServiceChanged();
}

export function getActiveModelServiceConfig(): ActiveModelServiceConfig | null {
  const providers = loadModelProviders();
  const preferredId = localStorage.getItem(ACTIVE_MODEL_PROVIDER_STORAGE_KEY);
  const provider = providers.find(item => item.id === preferredId && item.isOn !== false)
    || providers.find(item => item.isOn !== false);

  if (!provider) return null;

  const enabledModels = provider.modelGroups
    .flatMap(group => group.models || [])
    .filter(model => model.isEnabled !== false);
  const selectedModel = enabledModels.find(model => model.name === provider.selectedModel)
    || enabledModels.find(model => model.isFavorite)
    || enabledModels[0];
  const baseUrl = normalizeModelServiceBaseUrl(provider.defaultUrl);

  if (!baseUrl || !selectedModel?.name) return null;

  return {
    providerId: provider.id,
    providerName: provider.name,
    baseUrl,
    apiKey: localStorage.getItem(`aura_api_key_${provider.id}`) || '',
    model: selectedModel.name,
  };
}
