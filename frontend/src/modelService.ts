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
  hasApiKey?: boolean;
  modelGroups: {
    groupName: string;
    isOpen: boolean;
    models: ModelServiceModel[];
  }[];
}

export interface ActiveModelServiceConfig {
  providerId: string;
  providerName: string;
  model: string;
}

let cachedProviders: ModelServiceProvider[] = [];
let cachedActiveProviderId = '';

export function normalizeModelServiceBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/(chat\/completions|models)$/i, '');
}

function readLegacyProviders(): ModelServiceProvider[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MODEL_PROVIDERS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(provider => provider?.id) : [];
  } catch {
    return [];
  }
}

function clearLegacyModelStorage(): void {
  const keys = Array.from({length: localStorage.length}, (_, index) => localStorage.key(index));
  keys.forEach(key => {
    if (key?.startsWith('aura_api_key_')) localStorage.removeItem(key);
  });
  localStorage.removeItem(MODEL_PROVIDERS_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_MODEL_PROVIDER_STORAGE_KEY);
}

async function requestModelServices(
  providers: ModelServiceProvider[],
  activeProviderId: string,
  apiKeys: Record<string, string> = {},
): Promise<void> {
  const response = await fetch('/backend/api/v1/model-services', {
    method: 'PUT',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({providers, activeProviderId: activeProviderId || null, apiKeys}),
  });
  if (!response.ok) throw new Error('模型平台配置保存失败');
  const data = await response.json();
  cachedProviders = data.providers || [];
  cachedActiveProviderId = data.activeProviderId || '';
  notifyModelServiceChanged();
}

export async function bootstrapModelServices(): Promise<void> {
  const response = await fetch('/backend/api/v1/model-services', {credentials: 'include'});
  if (!response.ok) throw new Error('模型平台配置加载失败');
  const data = await response.json();
  cachedProviders = data.providers || [];
  cachedActiveProviderId = data.activeProviderId || '';

  const legacyProviders = readLegacyProviders();
  if (cachedProviders.length === 0 && legacyProviders.length > 0) {
    const legacyActive = localStorage.getItem(ACTIVE_MODEL_PROVIDER_STORAGE_KEY) || legacyProviders[0]?.id || '';
    const apiKeys = Object.fromEntries(
      legacyProviders.map(provider => [provider.id, localStorage.getItem(`aura_api_key_${provider.id}`) || '']),
    );
    await requestModelServices(legacyProviders, legacyActive, apiKeys);
  }
  clearLegacyModelStorage();
}

export function loadModelProviders(): ModelServiceProvider[] {
  return cachedProviders;
}

export function getActiveModelProviderId(): string {
  return cachedActiveProviderId;
}

export function notifyModelServiceChanged(): void {
  window.dispatchEvent(new Event(MODEL_SERVICE_CHANGE_EVENT));
}

export function saveModelProviders(
  providers: ModelServiceProvider[],
  activeProviderId = cachedActiveProviderId,
  apiKeys: Record<string, string> = {},
): Promise<void> {
  cachedProviders = providers;
  cachedActiveProviderId = activeProviderId;
  notifyModelServiceChanged();
  return requestModelServices(providers, activeProviderId, apiKeys);
}

export function setActiveModelProvider(providerId: string): void {
  cachedActiveProviderId = providerId;
  void requestModelServices(cachedProviders, providerId);
}

export function getActiveModelServiceConfig(): ActiveModelServiceConfig | null {
  const provider = cachedProviders.find(item => item.id === cachedActiveProviderId && item.isOn !== false)
    || cachedProviders.find(item => item.isOn !== false);
  if (!provider) return null;
  const enabledModels = provider.modelGroups.flatMap(group => group.models || []).filter(model => model.isEnabled !== false);
  const selectedModel = enabledModels.find(model => model.name === provider.selectedModel)
    || enabledModels.find(model => model.isFavorite) || enabledModels[0];
  if (!provider.defaultUrl || !selectedModel?.name) return null;
  return {providerId: provider.id, providerName: provider.name, model: selectedModel.name};
}
