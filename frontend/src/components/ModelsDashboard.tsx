import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';
import SearchInput from './SearchInput';
import {
  getActiveModelProviderId,
  ModelServiceProvider,
  loadModelProviders,
  normalizeModelServiceBaseUrl,
  saveModelProviders,
  setActiveModelProvider,
} from '../modelService';
import {
  Sliders,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2,
  HelpCircle,
  ExternalLink,
  Settings,
  Database,
  Plug,
  Brain,
  Server,
  Radio,
  Clock,
  FileText,
  Keyboard,
  MousePointer,
  Info,
  Compass,
  SlidersHorizontal,
  CloudLightning,
  Filter,
  Wrench,
  Minus,
  CheckCircle2,
  Box,
  User,
  Activity,
  Code
} from 'lucide-react';

interface ModelsDashboardProps {
  userProfile: UserProfile;
  onSaveUserProfile: (profile: UserProfile) => void;
  temperature: number;
  onSaveTemperature: (val: number) => void;
  topP: number;
  onSaveTopP: (val: number) => void;
  maxOutputTokens: number;
  onSaveMaxOutputTokens: (val: number) => void;
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const AVAILABLE_USER_AVATARS = [
  'User', 'Code', 'Cpu', 'Bot', 'Compass', 'Crown', 'Lightbulb',
  'Award', 'Flame', 'Ghost', 'Smile', 'Shield', 'Glasses'
];

export default function ModelsDashboard({
  userProfile,
  onSaveUserProfile,
  temperature,
  onSaveTemperature,
  topP,
  onSaveTopP,
  maxOutputTokens,
  onSaveMaxOutputTokens,
  middlePanelWidth,
  onMiddlePanelResizeStart,
}: ModelsDashboardProps) {
  // Middle Column States (Providers)
  const [providers, setProviders] = useState<ModelServiceProvider[]>(loadModelProviders);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => {
    return getActiveModelProviderId()
      || loadModelProviders()[0]?.id
      || '';
  });
  const [searchProviderQuery, setSearchProviderQuery] = useState('');
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderUrl, setNewProviderUrl] = useState('');
  const [newProviderModel, setNewProviderModel] = useState('');

  // Right Column Config States
  const selectedProvider = providers.find(p => p.id === selectedProviderId) || providers[0];
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState(selectedProvider ? selectedProvider.defaultUrl : '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [searchModelQuery, setSearchModelQuery] = useState('');

  // Sync API Key & Url when active provider changes
  useEffect(() => {
    if (selectedProvider) {
      setApiKey('');
      setApiUrl(selectedProvider.defaultUrl);
      setTestResult(null);
      setFetchSuccess(false);
    }
  }, [selectedProviderId]);

  // Profile Form States (Housed under 常规设置)
  const [profileName, setProfileName] = useState(userProfile.name);
  const [profileAvatar, setProfileAvatar] = useState(userProfile.avatar || 'User');
  const [profileDesc, setProfileDesc] = useState(userProfile.description);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    setProfileName(userProfile.name);
    setProfileAvatar(userProfile.avatar || 'User');
    setProfileDesc(userProfile.description);
  }, [userProfile]);

  // Save Providers Helper
  const saveProviders = (updated: ModelServiceProvider[], apiKeys: Record<string, string> = {}) => {
    setProviders(updated);
    void saveModelProviders(updated, selectedProviderId, apiKeys);
  };

  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id);
    setActiveModelProvider(id);
  };

  const handleToggleProvider = (id: string) => {
    const updated = providers.map(p => p.id === id ? { ...p, isOn: !p.isOn } : p);
    saveProviders(updated);
    const updatedProvider = updated.find(provider => provider.id === id);
    if (updatedProvider?.isOn) setActiveModelProvider(id);
  };

  const saveConnectionSettings = async () => {
    if (!selectedProvider) return providers;
    const normalizedUrl = normalizeModelServiceBaseUrl(apiUrl);
    if (!normalizedUrl) return providers;
    const updated = providers.map(provider => provider.id === selectedProvider.id
      ? { ...provider, defaultUrl: normalizedUrl, hasApiKey: apiKey.trim() ? true : provider.hasApiKey }
      : provider);
    await saveModelProviders(
      updated,
      selectedProvider.id,
      apiKey.trim() ? {[selectedProvider.id]: apiKey.trim()} : {},
    );
    setProviders(updated);
    setApiKey('');
    setActiveModelProvider(selectedProvider.id);
    return updated;
  };

  const requestAvailableModels = async (): Promise<string[]> => {
    if (!apiUrl.trim()) throw new Error('请先填写 API Base URL。');
    await saveConnectionSettings();
    const response = await fetch('/api/model-services/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: selectedProvider?.id,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '无法获取模型列表。');
    return Array.isArray(data.models) ? data.models : [];
  };

  const applyFetchedModels = (modelNames: string[]) => {
    if (!selectedProvider) return;
    const existingModels = selectedProvider.modelGroups.flatMap(group => group.models);
    const existingByName = new Map(existingModels.map(model => [model.name, model]));
    const selectedModel = modelNames.includes(selectedProvider.selectedModel || '')
      ? selectedProvider.selectedModel
      : modelNames[0];
    const normalizedUrl = normalizeModelServiceBaseUrl(apiUrl);
    const updated = providers.map(provider => provider.id === selectedProvider.id
      ? {
          ...provider,
          defaultUrl: normalizedUrl,
          modelsCount: modelNames.length,
          selectedModel,
          modelGroups: [{
            groupName: 'API 模型',
            isOpen: true,
            models: modelNames.map(name => ({
              name,
              isEnabled: existingByName.get(name)?.isEnabled ?? true,
              isFavorite: existingByName.get(name)?.isFavorite,
            })),
          }],
        }
      : provider);
    saveProviders(updated);
    setActiveModelProvider(selectedProvider.id);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setConnectionError('');
    try {
      const models = await requestAvailableModels();
      if (models.length === 0) throw new Error('连接成功，但服务没有返回可用模型。');
      applyFetchedModels(models);
      setTestResult('success');
    } catch (error: any) {
      setTestResult('error');
      setConnectionError(error.message || '连接模型服务失败。');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setFetchSuccess(false);
    setConnectionError('');
    try {
      const models = await requestAvailableModels();
      if (models.length === 0) throw new Error('服务没有返回可用模型。');
      applyFetchedModels(models);
      setFetchSuccess(true);
      setTestResult('success');
    } catch (error: any) {
      setTestResult('error');
      setConnectionError(error.message || '获取模型列表失败。');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleResetUrl = () => {
    if (selectedProvider) {
      const resetUrl = selectedProvider.urlPlaceholder || 'https://api.openai.com/v1';
      setApiUrl(resetUrl);
      const updated = providers.map(provider => provider.id === selectedProvider.id
        ? { ...provider, defaultUrl: resetUrl }
        : provider);
      saveProviders(updated);
    }
  };

  const handleSelectModel = (modelName: string) => {
    if (!selectedProvider) return;
    const updated = providers.map(provider => provider.id === selectedProvider.id
      ? { ...provider, selectedModel: modelName, isOn: true }
      : provider);
    saveProviders(updated);
    setActiveModelProvider(selectedProvider.id);
  };

  const handleAddModel = () => {
    if (!selectedProvider) return;
    const modelName = window.prompt('请输入模型 ID，例如：gpt-4o-mini');
    if (!modelName?.trim()) return;
    const normalizedName = modelName.trim();
    const allModels = selectedProvider.modelGroups.flatMap(group => group.models);
    if (allModels.some(model => model.name === normalizedName)) {
      handleSelectModel(normalizedName);
      return;
    }
    const updated = providers.map(provider => provider.id === selectedProvider.id
      ? {
          ...provider,
          modelsCount: allModels.length + 1,
          selectedModel: normalizedName,
          modelGroups: [{
            groupName: '手动添加',
            isOpen: true,
            models: [...allModels, { name: normalizedName, isEnabled: true }],
          }],
        }
      : provider);
    saveProviders(updated);
    setActiveModelProvider(selectedProvider.id);
  };

  const handleToggleModelGroup = (groupName: string) => {
    const updated = providers.map(p => {
      if (p.id === selectedProviderId) {
        return {
          ...p,
          modelGroups: p.modelGroups.map(g => g.groupName === groupName ? { ...g, isOpen: !g.isOpen } : g)
        };
      }
      return p;
    });
    saveProviders(updated);
  };

  const handleToggleModelEnabled = (groupName: string, modelName: string) => {
    const updated = providers.map(p => {
      if (p.id === selectedProviderId) {
        return {
          ...p,
          modelGroups: p.modelGroups.map(g => {
            if (g.groupName === groupName) {
              return {
                ...g,
                models: g.models.map(m => m.name === modelName ? { ...m, isEnabled: !m.isEnabled } : m)
              };
            }
            return g;
          })
        };
      }
      return p;
    });
    saveProviders(updated);
  };

  const handleToggleModelFavorite = (groupName: string, modelName: string) => {
    const updated = providers.map(p => {
      if (p.id === selectedProviderId) {
        return {
          ...p,
          modelGroups: p.modelGroups.map(g => {
            if (g.groupName === groupName) {
              return {
                ...g,
                models: g.models.map(m => m.name === modelName ? { ...m, isFavorite: !m.isFavorite } : m)
              };
            }
            return g;
          })
        };
      }
      return p;
    });
    saveProviders(updated);
  };

  const handleAddCustomProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderName.trim()) return;

    const newId = `custom-${Date.now()}`;
    const initialModel = newProviderModel.trim();
    const newProv: ModelServiceProvider = {
      id: newId,
      name: newProviderName.trim(),
      tagline: '自定义端点',
      isCustom: true,
      isOn: true,
      defaultUrl: normalizeModelServiceBaseUrl(newProviderUrl),
      urlPlaceholder: 'https://api.openai.com/v1',
      keyUrl: '',
      modelsCount: initialModel ? 1 : 0,
      selectedModel: initialModel || undefined,
      modelGroups: initialModel ? [{
          groupName: '默认分组',
          isOpen: true,
          models: [{ name: initialModel, isEnabled: true }],
        }] : [],
    };

    saveProviders([...providers, newProv]);
    handleSelectProvider(newId);
    setNewProviderName('');
    setNewProviderUrl('');
    setNewProviderModel('');
    setShowAddProviderModal(false);
  };

  const handleDeleteProvider = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除该模型平台吗？')) return;
    const updated = providers.filter(p => p.id !== id);
    saveProviders(updated);
    if (selectedProviderId === id) {
      if (updated.length > 0) {
        handleSelectProvider(updated[0].id);
      } else {
        handleSelectProvider('');
      }
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    onSaveUserProfile({
      name: profileName.trim(),
      avatar: profileAvatar,
      description: profileDesc.trim()
    });

    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2000);
  };

  // Filter Providers
  const filteredProviders = providers.filter(p => {
    if (!searchProviderQuery.trim()) return true;
    return p.name.toLowerCase().includes(searchProviderQuery.toLowerCase()) ||
           p.tagline.toLowerCase().includes(searchProviderQuery.toLowerCase());
  });

  return (
    <div className="management-root relative w-full" id="models-dashboard-main">

      {/* COLUMN 2: MIDDLE COLUMN (Search & 18+ Platforms List) */}
      <aside
        className="management-sidebar select-none"
        style={{ width: middlePanelWidth }}
        id="models-middle-sidebar"
      >
        {/* Search Platform */}
        <div className="p-3 border-b border-[#303030]/20 flex items-center space-x-2">
          <SearchInput className="flex-1" value={searchProviderQuery} onChange={setSearchProviderQuery} placeholder="搜索模型平台..." />
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/80 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200">
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Platform List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
          {filteredProviders.length > 0 ? (
            filteredProviders.map((prov) => {
              const isSelected = prov.id === selectedProviderId;
              return (
                <div
                  key={prov.id}
                  className={`management-list-item flex items-center justify-between group ${
                    isSelected
                      ? 'management-list-item--active'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => handleSelectProvider(prov.id)}
                    className="flex-1 flex items-center space-x-2.5 min-w-0 text-left focus:outline-none cursor-pointer"
                  >
                    {/* Placeholder circle icon mimicking the screenshot logo colors */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                      prov.isOn ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {prov.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-medium truncate">{prov.name}</span>
                  </button>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {prov.isOn && (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-mono tracking-wider scale-90">
                        ON
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteProvider(prov.id, e)}
                      className="p-1 hover:bg-rose-500/20 text-zinc-600 hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="删除模型平台"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-zinc-600 text-xs px-4">
              暂无自定义模型，请点击下方「添加」按钮。
            </div>
          )}
        </div>

        {/* Add Platform Button */}
        <div className="border-t border-[#303030]/40 p-4">
          <button
            onClick={() => setShowAddProviderModal(true)}
            className="management-create-button"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500" />
            <span>添加模型平台</span>
          </button>
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      {/* COLUMN 3: RIGHT PANEL (Full config panel mimicking screenshot) */}
      {selectedProvider ? (
        <main className="management-workspace" id="models-right-workspace">
          {/* Header: Selected Provider title, switch toggle */}
          <div className="management-header">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-bold text-zinc-200 text-sm tracking-tight truncate">{selectedProvider.name}</span>
              {selectedProvider.keyUrl && (
                <a href={selectedProvider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-cyan-400 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Toggle Enable Switch */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleProvider(selectedProvider.id)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative ${
                  selectedProvider.isOn ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-3.5 h-3.5 bg-zinc-950 rounded-full shadow-md transform duration-200 ${
                  selectedProvider.isOn ? 'translate-x-3.5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Settings Area */}
          <div className="management-content space-y-4 scrollbar-thin">
            {/* 1. API 密钥 Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center space-x-1.5">
                  <span>API 密钥</span>
                </span>
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={selectedProvider.hasApiKey ? '密钥已加密保存；留空表示不修改' : 'API Key（本地免鉴权服务可留空）'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onBlur={saveConnectionSettings}
                    className="field-input pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="ui-button-secondary flex-shrink-0 text-[11px]"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                      <span>检测中</span>
                    </>
                  ) : testResult === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">检测成功</span>
                    </>
                  ) : testResult === 'error' ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span className="text-rose-400">检测失败</span>
                    </>
                  ) : (
                    <span>检测</span>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-500">
                {selectedProvider.keyUrl ? (
                  <a href={selectedProvider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
                    点击这里获取密钥
                  </a>
                ) : (
                  <span>自定义模型密钥</span>
                )}
                <span>多个密钥使用逗号分隔</span>
              </div>
              {connectionError && (
                <p className="text-[10px] text-rose-400 break-all">{connectionError}</p>
              )}
            </div>

            {/* 2. API 地址 Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-bold text-zinc-300">API 地址</span>
                  <HelpCircle className="w-3 h-3 text-zinc-500" />
                </div>
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  onBlur={saveConnectionSettings}
                  className="field-input min-w-0 flex-1 font-mono text-xs"
                />
                <button
                  onClick={handleResetUrl}
                  className="ui-button-danger flex-shrink-0 text-[11px]"
                >
                  重置
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 truncate">
                预览：<span className="font-mono">{apiUrl}/chat/completions</span>
              </div>
            </div>

            {/* 2.5. 模型核心参数 Section */}
            <div className="space-y-3 pt-2 pb-3 border-b border-zinc-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300">模型核心参数 (Hyperparameters)</span>
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Temperature */}
                <div className="space-y-1.5 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">温度 (Temperature)</span>
                    <span className="text-cyan-400 font-mono font-bold">{temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => onSaveTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                    <span>0.0 (严谨)</span>
                    <span>2.0 (创造)</span>
                  </div>
                </div>

                {/* Top P */}
                <div className="space-y-1.5 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">核采样 (Top P)</span>
                    <span className="text-cyan-400 font-mono font-bold">{topP.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => onSaveTopP(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                    <span>0.0</span>
                    <span>1.0</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div className="space-y-1.5 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">单次最大Token</span>
                    <span className="text-cyan-400 font-mono font-bold">{maxOutputTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="128"
                    value={maxOutputTokens}
                    onChange={(e) => onSaveMaxOutputTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                    <span>256</span>
                    <span>8192</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 模型 Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-zinc-300">模型</span>
                  <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                    {selectedProvider.modelsCount}
                  </span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
                  <Search className="w-3.5 h-3.5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="px-3 py-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-850 text-[10px] font-semibold text-zinc-300 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {fetchingModels ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                        <span>获取中</span>
                      </>
                    ) : fetchSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">已刷新</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 text-zinc-400" />
                        <span>获取模型列表</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAddModel}
                    className="p-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-850 rounded-md text-zinc-400 hover:text-zinc-200"
                    title="手动添加模型 ID"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Model Groups list exactly mimicking the screenshot style */}
              <div className="space-y-1.5">
                {selectedProvider.modelGroups && selectedProvider.modelGroups.length > 0 ? (
                  selectedProvider.modelGroups.map((group) => (
                    <div key={group.groupName} className="border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-900/20">
                      {/* Group Header */}
                      <button
                        onClick={() => handleToggleModelGroup(group.groupName)}
                        className="w-full flex items-center space-x-2 px-3 py-2 bg-zinc-950/40 hover:bg-zinc-950/60 text-left transition-colors"
                      >
                        {group.isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                        <span className="text-[11px] font-bold text-zinc-300">{group.groupName}</span>
                      </button>

                      {/* Models List in Group */}
                      {group.isOpen && (
                        <div className="border-t border-[#262626] divide-y divide-[#262626]">
                          {group.models.map((model) => (
                            <div
                              key={model.name}
                              className={`flex items-center justify-between px-3.5 py-2 hover:bg-zinc-950/30 transition-colors ${
                                !model.isEnabled ? 'opacity-40' : ''
                              } ${
                                selectedProvider.selectedModel === model.name ? 'bg-cyan-500/5' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {/* Small blue hexagon/cross icon mimicking the screenshot logo */}
                                <div className="w-3.5 h-3.5 rounded bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 text-[8px] flex-shrink-0">
                                  ❖
                                </div>
                                <button
                                  onClick={() => handleSelectModel(model.name)}
                                  className="text-[11px] font-medium text-zinc-300 truncate font-mono hover:text-cyan-300"
                                  title="设为当前对话模型"
                                >
                                  {model.name}
                                </button>
                                {selectedProvider.selectedModel === model.name && (
                                  <span className="text-[9px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">当前</span>
                                )}
                              </div>

                              {/* Right Actions exactly mimicking colors in the screenshot */}
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                {/* Eye (Enable) */}
                                <button
                                  onClick={() => handleToggleModelEnabled(group.groupName, model.name)}
                                  className={`p-1.5 rounded transition-all scale-90 ${
                                    model.isEnabled
                                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title={model.isEnabled ? "点击禁用模型" : "点击启用模型"}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>

                                {/* Edit (Wrench/Pencil) */}
                                <button
                                  onClick={() => handleToggleModelFavorite(group.groupName, model.name)}
                                  className={`p-1.5 rounded transition-all scale-90 ${
                                    model.isFavorite
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title="微调及偏好设定"
                                >
                                  <Wrench className="w-3 h-3" />
                                </button>

                                {/* Select active model */}
                                <button
                                  onClick={() => handleSelectModel(model.name)}
                                  className={`p-1.5 rounded scale-90 ${
                                    selectedProvider.selectedModel === model.name
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                  }`}
                                  title="设为当前对话模型"
                                >
                                  <Radio className="w-3 h-3" />
                                </button>

                                {/* Delete (Minus) */}
                                <button className="p-1.5 rounded bg-zinc-800 text-zinc-500 hover:text-rose-400 scale-90">
                                  <Minus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-zinc-600 text-[11px]">
                    暂无模型，点击「获取模型列表」或右上角「+」手动添加。
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="management-workspace" id="models-right-workspace-empty">
          <div className="management-header">
            <span className="text-sm font-semibold text-zinc-300">模型服务</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-zinc-500">
            <CloudLightning className="mb-3 h-12 w-12 animate-pulse text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">暂无选中的模型平台</p>
            <p className="mt-1 max-w-xs text-xs text-zinc-600">请点击左侧列表的「添加模型平台」按钮创建您的自定义模型服务端点。</p>
          </div>
        </main>
      )}

      {/* Add Platform Dialog */}
      {showAddProviderModal && (
        <div className="responsive-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowAddProviderModal(false)} />
          <div className="responsive-modal-card bg-[#1b1b1b] border border-zinc-800 rounded-xl max-w-md w-full p-5 relative z-10 overflow-y-auto shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>添加自定义模型平台</span>
            </h3>

            <form onSubmit={handleAddCustomProvider} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 block">平台名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如：MyCustomAPI"
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  className="field-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 block">API Base URL（可选，可稍后配置）</label>
                <input
                  type="url"
                  placeholder="例如：https://api.openai.com/v1"
                  value={newProviderUrl}
                  onChange={(e) => setNewProviderUrl(e.target.value)}
                  className="field-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 block">默认模型 ID（可选）</label>
                <input
                  type="text"
                  placeholder="例如：gpt-4o-mini；也可添加后自动获取"
                  value={newProviderModel}
                  onChange={(e) => setNewProviderModel(e.target.value)}
                  className="field-input text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProviderModal(false)}
                  className="ui-button-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="ui-button-primary"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
