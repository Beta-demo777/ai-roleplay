import React, { useState, useEffect, useRef } from 'react';
import { Character, Message, UserProfile, ChatThread } from './types';
import LucideIcon from './components/LucideIcon';
import ChatWorkspace from './components/ChatWorkspace';
import CharacterModal from './components/CharacterModal';
import UserProfileModal from './components/UserProfileModal';
import AssistantsDashboard from './components/AssistantsDashboard';
import ModelsDashboard from './components/ModelsDashboard';
import ScenariosDashboard from './components/ScenariosDashboard';
import ExtensionsDashboard from './components/ExtensionsDashboard';
import MiddlePanelResizeHandle from './components/MiddlePanelResizeHandle';
import { getActiveModelServiceConfig } from './modelService';
import { loadRemoteAppState, PersistedAppState, saveRemoteAppState } from './stateApi';
import {FeatureSettings, loadFeatureSettings, saveFeatureSettings} from './featureSettings';

const THREADS_LOCAL_STORAGE_KEY = 'aura_tavern_threads_v2';
const SESSIONS_LOCAL_STORAGE_KEY = 'aura_tavern_sessions_v1';
const CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY = 'aura_tavern_custom_characters_v1';
const USER_PROFILE_LOCAL_STORAGE_KEY = 'aura_tavern_user_profile_v1';
const MIDDLE_PANEL_WIDTH_LOCAL_STORAGE_KEY = 'aura_middle_panel_width_v1';
const DEFAULT_MIDDLE_PANEL_WIDTH = 280;
const MIN_MIDDLE_PANEL_WIDTH = 220;
const MAX_MIDDLE_PANEL_WIDTH = 480;

const clampMiddlePanelWidth = (width: number) => (
  Math.min(MAX_MIDDLE_PANEL_WIDTH, Math.max(MIN_MIDDLE_PANEL_WIDTH, width))
);

export default function App() {
  // Characters state (preset + custom)
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [selectedCharacterIdState, setSelectedCharacterIdState] = useState<string>('');

  // User custom profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '旅人',
    avatar: 'Crown',
    description: '一个行经此处的冒险者，性格沉稳，对世界的古老秘密与奇妙见闻充满好奇。'
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'chat' | 'assistants' | 'scenarios' | 'models' | 'extensions'>('chat');
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(loadFeatureSettings);

  const handleFeatureSettingsChange = (settings: FeatureSettings) => {
    setFeatureSettings(settings);
    saveFeatureSettings(settings);
  };

  // Chats memory sessions & Threads
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const backendStateReadyRef = useRef(false);
  const stateSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedStateRef = useRef<PersistedAppState>({
    profile: userProfile,
    characters: [],
    threads: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  // Model hyperparameters with local storage fallbacks
  const [temperature, setTemperature] = useState<number>(() => {
    const saved = localStorage.getItem('aura_temperature');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [topP, setTopP] = useState<number>(() => {
    const saved = localStorage.getItem('aura_top_p');
    return saved ? parseFloat(saved) : 0.95;
  });
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(() => {
    const saved = localStorage.getItem('aura_max_tokens');
    return saved ? parseInt(saved, 10) : 2048;
  });

  const handleSaveTemperature = (val: number) => {
    setTemperature(val);
    localStorage.setItem('aura_temperature', val.toString());
  };
  const handleSaveTopP = (val: number) => {
    setTopP(val);
    localStorage.setItem('aura_top_p', val.toString());
  };
  const handleSaveMaxOutputTokens = (val: number) => {
    setMaxOutputTokens(val);
    localStorage.setItem('aura_max_tokens', val.toString());
  };

  // ChatGPT-style Sidebar toggler (true = open, false = closed)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [middlePanelWidth, setMiddlePanelWidth] = useState(() => {
    const saved = Number(localStorage.getItem(MIDDLE_PANEL_WIDTH_LOCAL_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0
      ? clampMiddlePanelWidth(saved)
      : DEFAULT_MIDDLE_PANEL_WIDTH;
  });

  const handleMiddlePanelResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = middlePanelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampMiddlePanelWidth(startWidth + moveEvent.clientX - startX);
      setMiddlePanelWidth(nextWidth);
      localStorage.setItem(MIDDLE_PANEL_WIDTH_LOCAL_STORAGE_KEY, String(nextWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Dropdowns & Popovers
  const [newChatDropdownOpen, setNewChatDropdownOpen] = useState(false);

  // Modals
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const queueRemoteStateSync = () => {
    if (!backendStateReadyRef.current) return;
    if (stateSyncTimerRef.current) clearTimeout(stateSyncTimerRef.current);
    stateSyncTimerRef.current = setTimeout(() => {
      saveRemoteAppState(persistedStateRef.current).catch(error => {
        console.error('Failed to persist application state:', error);
      });
    }, 300);
  };

  // Responsive sidebar behavior: close on narrow screen upon load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize(); // Call initially
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Initial Load of Saved Data
  useEffect(() => {
    // Load custom characters
    let loadedCharacters: Character[] = [];
    const savedCustom = localStorage.getItem(CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY);
    if (savedCustom) {
      try {
        const parsedCharacters = JSON.parse(savedCustom) as Character[];
        loadedCharacters = Array.isArray(parsedCharacters)
          ? parsedCharacters.filter(character => character.id !== 'char-mona')
          : [];
        setCustomCharacters(loadedCharacters);
        localStorage.setItem(CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY, JSON.stringify(loadedCharacters));
      } catch (e) {
        console.error('Error parsing custom characters:', e);
      }
    } else {
      // Create polished default presets
      const defaultPresets: Character[] = [
        {
          id: 'char-cyber-bartender',
          name: 'K-09',
          tagline: '霓虹深处的仿生人调酒师',
          avatar: 'Cpu',
          category: 'cyberpunk',
          personality: '冷静、寡言，带有微弱的人类幽默感，时常擦拭着手里的酒杯。',
          scenario: '在繁华而冰冷的赛博都市一角，一家名为“2077”的无名酒吧里。低沉的合成器音乐流淌，霓虹灯光透过玻璃。',
          firstMessage: '*用洁白的纤维布缓缓擦拭着手中的老式平底杯，机械义眼的蓝色光圈微微收缩* 晚上好，客官。在这座连雨水都带着重金属味的城市里，能找到我这间地下酒吧的人不多。想喝点什么？合成威士忌，还是能让你暂时忘记芯片报错的“梦境”？',
          systemInstruction: `你现在需要完全扮演角色【K-09】。
这是一个沉浸式角色扮演会话。请遵守以下铁律：
1. 【第一人称扮演】：始终以K-09的视角和语调进行对话，绝对不要脱离角色，不要以AI身份说话。
2. 【动作描述与独白】：使用星号 * * 包裹你的动作、神态、心理描写或场景变化，生动表现文字画卷。`,
          isCustom: true
        }
      ];
      loadedCharacters = defaultPresets;
      setCustomCharacters(defaultPresets);
      localStorage.setItem(CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY, JSON.stringify(defaultPresets));
    }

    // Load user custom profile
    let loadedProfile = userProfile;
    const savedProfile = localStorage.getItem(USER_PROFILE_LOCAL_STORAGE_KEY);
    if (savedProfile) {
      try {
        loadedProfile = JSON.parse(savedProfile);
        setUserProfile(loadedProfile);
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Load Threads & Sessions fallback
    const savedThreads = localStorage.getItem(THREADS_LOCAL_STORAGE_KEY);
    let loadedThreads: ChatThread[] = [];
    if (savedThreads) {
      try {
        const parsedThreads = JSON.parse(savedThreads) as ChatThread[];
        loadedThreads = Array.isArray(parsedThreads)
          ? parsedThreads.filter(thread => thread.characterId !== 'char-mona')
          : [];
        localStorage.setItem(THREADS_LOCAL_STORAGE_KEY, JSON.stringify(loadedThreads));
      } catch (e) {
        console.error('Error parsing threads:', e);
      }
    } else {
      // Try to migrate from old session structure
      const savedSessions = localStorage.getItem(SESSIONS_LOCAL_STORAGE_KEY);
      if (savedSessions) {
        try {
          const oldSessions = JSON.parse(savedSessions);
          Object.entries(oldSessions).forEach(([charId, messages]) => {
            if (charId === 'char-mona') return;
            const char = loadedCharacters.find(c => c.id === charId);
            if (messages && Array.isArray(messages) && messages.length > 0) {
              loadedThreads.push({
                id: `thread-${charId}-${Date.now()}`,
                characterId: charId,
                title: char ? `与 ${char.name} 的对话` : `与 角色 的对话`,
                messages: messages,
                timestamp: messages[messages.length - 1]?.timestamp || Date.now()
              });
            }
          });
        } catch (e) {
          console.error('Error migrating sessions to threads:', e);
        }
      }
    }

    // Fallback: If still no threads, create a default thread for the first available character
    if (loadedThreads.length === 0 && loadedCharacters.length > 0) {
      const defaultChar = loadedCharacters[0];
      loadedThreads.push({
        id: `thread-default-${Date.now()}`,
        characterId: defaultChar.id,
        title: `与 ${defaultChar.name} 的对话`,
        messages: [],
        timestamp: Date.now()
      });
    }

    setThreads(loadedThreads);
    if (loadedThreads.length > 0) {
      setSelectedThreadId(loadedThreads[0].id);
    }

    const localState: PersistedAppState = {
      initialized: true,
      profile: loadedProfile,
      characters: loadedCharacters,
      threads: loadedThreads,
    };
    persistedStateRef.current = localState;

    const hydrateFromBackend = async () => {
      try {
        const remoteState = await loadRemoteAppState();
        if (remoteState.initialized) {
          persistedStateRef.current = remoteState;
          setUserProfile(remoteState.profile);
          setCustomCharacters(remoteState.characters);
          setThreads(remoteState.threads);
          setSelectedThreadId(remoteState.threads[0]?.id || '');
          localStorage.setItem(USER_PROFILE_LOCAL_STORAGE_KEY, JSON.stringify(remoteState.profile));
          localStorage.setItem(CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY, JSON.stringify(remoteState.characters));
          localStorage.setItem(THREADS_LOCAL_STORAGE_KEY, JSON.stringify(remoteState.threads));
        } else {
          const importedState = await saveRemoteAppState(localState);
          persistedStateRef.current = importedState;
        }
        backendStateReadyRef.current = true;
      } catch (error) {
        console.warn('Backend state is unavailable; continuing with local cache.', error);
      }
    };
    hydrateFromBackend();

    return () => {
      if (stateSyncTimerRef.current) clearTimeout(stateSyncTimerRef.current);
    };
  }, []);

  // 2. Helper State savers
  const saveCustomCharacters = (updated: Character[]) => {
    setCustomCharacters(updated);
    localStorage.setItem(CUSTOM_CHARACTERS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    persistedStateRef.current = { ...persistedStateRef.current, characters: updated };
    queueRemoteStateSync();
  };

  const saveThreads = (updated: ChatThread[]) => {
    setThreads(updated);
    localStorage.setItem(THREADS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    persistedStateRef.current = { ...persistedStateRef.current, threads: updated };
    queueRemoteStateSync();
  };

  const saveUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem(USER_PROFILE_LOCAL_STORAGE_KEY, JSON.stringify(profile));
    persistedStateRef.current = { ...persistedStateRef.current, profile };
    queueRemoteStateSync();
  };

  // 3. Collect active characters list & Active references
  const allCharacters = customCharacters;
  const activeThread = threads.find(t => t.id === selectedThreadId) || threads[0];
  const activeCharacter = activeThread
    ? (allCharacters.find(c => c.id === activeThread.characterId) || allCharacters[0])
    : allCharacters[0];

  const selectedCharacterId = activeThread ? activeThread.characterId : (allCharacters[0]?.id || '');

  const getActiveMessages = (thread: ChatThread | null) => {
    return thread?.messages || [];
  };

  const activeMessages = activeThread ? (activeThread.messages || []) : [];

  const formatSessionTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const setSelectedCharacterId = (charId: string) => {
    const existingThread = threads.find(t => t.characterId === charId);
    if (existingThread) {
      setSelectedThreadId(existingThread.id);
    } else {
      const char = allCharacters.find(c => c.id === charId);
      const newThread: ChatThread = {
        id: `thread-${charId}-${Date.now()}`,
        characterId: charId,
        title: char ? `与 ${char.name} 的对话` : `与 角色 的对话`,
        messages: [],
        timestamp: Date.now()
      };
      const updatedThreads = [newThread, ...threads];
      saveThreads(updatedThreads);
      setSelectedThreadId(newThread.id);
    }
  };

  // Helper to retrieve the text content of the last message in a session (stripping action descriptors for a clean preview)
  const getSessionLastMessage = (thread: ChatThread, tagline: string) => {
    const history = thread.messages;
    if (history && history.length > 0) {
      const lastMsg = history[history.length - 1];
      const cleanContent = lastMsg.content.replace(/\*.*?\*/g, '').replace(/\s+/g, ' ').trim();
      return cleanContent || lastMsg.content;
    }
    return tagline; // Fallback to tagline if no conversation has started yet
  };

  // Sort threads: most recently updated threads at the top
  const sortedThreads = [...threads].sort((a, b) => b.timestamp - a.timestamp);

  // Filter threads based on search query (searching thread title, character name, tagline, or history content)
  const filteredThreads = sortedThreads.filter((thread) => {
    const char = allCharacters.find(c => c.id === thread.characterId);
    const charName = char ? char.name : '';
    const charTagline = char ? char.tagline : '';

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const titleMatch = thread.title.toLowerCase().includes(query);
    const nameMatch = charName.toLowerCase().includes(query);
    const taglineMatch = charTagline.toLowerCase().includes(query);

    const history = thread.messages || [];
    const historyMatch = history.some(m => m.content.toLowerCase().includes(query));

    return titleMatch || nameMatch || taglineMatch || historyMatch;
  });

  // 5. Filter characters based on categories and query search
  const filteredCharacters = allCharacters.filter((char) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' && char.isCustom) ||
      char.category === selectedCategory;

    const matchesSearch =
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.personality.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // 6. Send user prompt message
  const handleSendMessage = async (text: string) => {
    if (!activeThread) return;
    const currentHistory = getActiveMessages(activeThread);

    // Create new user block
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const updatedHistory = [...currentHistory, userMessage];

    // Auto-rename thread title if it was the default and has only a greeting
    let newTitle = activeThread.title;
    if (currentHistory.length <= 1) {
      newTitle = text.length > 15 ? text.substring(0, 15) + '...' : text;
    }

    // Update optimistic state
    const updatedThreads = threads.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          title: newTitle,
          messages: updatedHistory,
          timestamp: Date.now()
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
    setIsLoading(true);

    try {
      const modelService = getActiveModelServiceConfig();
      if (!modelService) {
        throw new Error('请先在“模型服务”中添加服务、获取模型列表并选择当前模型。');
      }

      // Craft specialized user persona context injection
      const userRoleplayContext = `
【当前和你对话的用户身份设定】：
姓名：${userProfile.name}
${userProfile.gender ? `性别/称谓：${userProfile.gender}` : ''}
${userProfile.personality ? `性格特质：${userProfile.personality}` : ''}
${userProfile.appearance ? `外貌外表：${userProfile.appearance}` : ''}
人设背景：${userProfile.description || '一位在酒馆落脚歇息的旅人'}

请始终根据上述设定，在故事行文中以该身份称呼、指引并对待【用户】。`;

      const finalSystemInstruction = `${activeCharacter.systemInstruction}\n\n${userRoleplayContext}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          systemInstruction: finalSystemInstruction,
          temperature,
          topP,
          maxOutputTokens,
          modelService,
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '与对方沟通失败。');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

      const finalThreads = threads.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: [...updatedHistory, assistantMessage],
            timestamp: Date.now()
          };
        }
        return t;
      });
      saveThreads(finalThreads);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ *对话发生了些许波折，对方似乎沉默了。错误信息: ${err.message || '连接超时'}*`,
        timestamp: Date.now()
      };
      const finalThreads = threads.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: [...updatedHistory, errorMessage],
            timestamp: Date.now()
          };
        }
        return t;
      });
      saveThreads(finalThreads);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Update turn text content in-line
  const handleUpdateMessage = (id: string, newContent: string) => {
    if (!activeThread) return;
    const currentHistory = getActiveMessages(activeThread);
    const updatedHistory = currentHistory.map(m => {
      if (m.id === id) {
        return { ...m, content: newContent };
      }
      return m;
    });

    const updatedThreads = threads.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          messages: updatedHistory,
          timestamp: Date.now()
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
  };

  // 8. Delete message turn
  const handleDeleteMessage = (id: string) => {
    if (!activeThread) return;
    const currentHistory = getActiveMessages(activeThread);
    const updatedHistory = currentHistory.filter(m => m.id !== id);

    const updatedThreads = threads.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          messages: updatedHistory,
          timestamp: Date.now()
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
  };

  // 9. Swipe / Reroll last assistant message
  const handleReroll = async () => {
    if (!activeThread) return;
    const currentHistory = getActiveMessages(activeThread);
    if (currentHistory.length < 2) return; // Need at least one user reply

    // Find the index of the last user message in the thread
    let lastUserIdx = -1;
    for (let i = currentHistory.length - 1; i >= 0; i--) {
      if (currentHistory[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    const historicalPromptList = currentHistory.slice(0, lastUserIdx + 1);

    const updatedThreads = threads.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          messages: historicalPromptList,
          timestamp: Date.now()
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
    setIsLoading(true);

    try {
      const modelService = getActiveModelServiceConfig();
      if (!modelService) {
        throw new Error('请先在“模型服务”中添加服务、获取模型列表并选择当前模型。');
      }

      const userRoleplayContext = `
【当前和你对话的用户身份设定】：
姓名：${userProfile.name}
${userProfile.gender ? `性别/称谓：${userProfile.gender}` : ''}
${userProfile.personality ? `性格特质：${userProfile.personality}` : ''}
${userProfile.appearance ? `外貌外表：${userProfile.appearance}` : ''}
人设背景：${userProfile.description || '一位在酒馆落脚歇息的旅人'}

请始终根据上述设定，在故事行文中以该身份称呼、指引并对待【用户】。`;

      const finalSystemInstruction = `${activeCharacter.systemInstruction}\n\n${userRoleplayContext}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historicalPromptList.map(m => ({ role: m.role, content: m.content })),
          systemInstruction: finalSystemInstruction,
          temperature,
          topP,
          maxOutputTokens,
          modelService,
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '重刷故事线失败。');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

      const finalThreads = threads.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: [...historicalPromptList, assistantMessage],
            timestamp: Date.now()
          };
        }
        return t;
      });
      saveThreads(finalThreads);
    } catch (err: any) {
      console.error('Reroll error:', err);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ *重刷故事线时发生异常: ${err.message || '网络连接超时'}*`,
        timestamp: Date.now()
      };
      const finalThreads = threads.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: [...historicalPromptList, errorMessage],
            timestamp: Date.now()
          };
        }
        return t;
      });
      saveThreads(finalThreads);
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Reset/Clear history of current thread
  const handleClearHistory = () => {
    if (!activeThread) return;
    const updatedThreads = threads.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          messages: [],
          timestamp: Date.now()
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
  };

  // 11. Delete custom character and all associated threads
  const handleDeleteCharacter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid selecting the deleted item
    const updated = customCharacters.filter(c => c.id !== id);
    saveCustomCharacters(updated);

    // Delete associated threads
    const updatedThreads = threads.filter(t => t.characterId !== id);
    saveThreads(updatedThreads);

    // Reset default select if needed
    if (activeThread && activeThread.characterId === id) {
      if (updatedThreads.length > 0) {
        setSelectedThreadId(updatedThreads[0].id);
      } else if (updated.length > 0) {
        const newThread: ChatThread = {
          id: `thread-${Date.now()}`,
          characterId: updated[0].id,
          title: `与 ${updated[0].name} 的对话`,
          messages: [],
          timestamp: Date.now()
        };
        saveThreads([newThread]);
        setSelectedThreadId(newThread.id);
      } else {
        setSelectedThreadId('');
      }
    }
  };

  // 11b. Delete specific thread
  const handleDeleteThread = (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedThreads = threads.filter(t => t.id !== threadId);
    saveThreads(updatedThreads);

    if (selectedThreadId === threadId) {
      if (updatedThreads.length > 0) {
        setSelectedThreadId(updatedThreads[0].id);
      } else if (allCharacters.length > 0) {
        const newThread: ChatThread = {
          id: `thread-${Date.now()}`,
          characterId: allCharacters[0].id,
          title: `与 ${allCharacters[0].name} 的对话`,
          messages: [],
          timestamp: Date.now()
        };
        saveThreads([newThread]);
        setSelectedThreadId(newThread.id);
      } else {
        setSelectedThreadId('');
      }
    }
  };

  // 11c. Rename specific thread
  const handleRenameThread = (threadId: string, newTitle: string) => {
    const updatedThreads = threads.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          title: newTitle
        };
      }
      return t;
    });
    saveThreads(updatedThreads);
  };

  // 12. Edit custom character triggers
  const handleEditCharacterInit = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation(); // Avoid selection
    setEditingCharacter(char);
    setIsCharacterModalOpen(true);
  };

  // 13. Save Character (Supports both create and edit)
  const handleSaveCharacter = (char: Character) => {
    const exists = customCharacters.some(c => c.id === char.id);
    let updated: Character[];
    if (exists) {
      updated = customCharacters.map(c => c.id === char.id ? char : c);
    } else {
      updated = [char, ...customCharacters];
    }
    saveCustomCharacters(updated);

    // If new, let's also auto-create a thread for them!
    if (!exists) {
      const newThread: ChatThread = {
        id: `thread-${char.id}-${Date.now()}`,
        characterId: char.id,
        title: `与 ${char.name} 的对话`,
        messages: [],
        timestamp: Date.now()
      };
      const updatedThreads = [newThread, ...threads];
      saveThreads(updatedThreads);
      setSelectedThreadId(newThread.id);
    }

    if (window.innerWidth < 768) {
      setSidebarOpen(false); // Auto-close on mobile to show the chat
    }
  };

  const handleOpenNewCharacterModal = () => {
    setEditingCharacter(null);
    setIsCharacterModalOpen(true);
  };

  // Categories helper list inside the sidebar
  const categories = [
    { id: 'all', label: '全部', icon: 'Compass' },
    { id: 'custom', label: '自设', icon: 'Bot' }
  ];

  return (
    <div
      className="h-screen bg-[#212121] flex text-zinc-100 font-sans relative overflow-hidden"
      id="app-root-container"
    >
      {/* 1. EXTREME LEFT VERTICAL NAVIGATION BAR */}
      <nav
        className="w-14 md:w-16 bg-[#0a0a0a] border-r border-[#303030]/80 flex flex-col items-center py-5 space-y-6 flex-shrink-0 z-40 h-full select-none"
        id="main-app-nav-sidebar"
      >
        {/* Brand logo mini-bubble */}
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2 flex-shrink-0">
          <LucideIcon name="Bot" size={15} />
        </div>

        {/* Navigation items */}
        <div className="flex-1 flex flex-col items-center space-y-4 w-full">
          {([
            { id: 'chat', label: '对话', icon: 'MessageSquare' },
            { id: 'assistants', label: '角色管理', icon: 'Bot' },
            { id: 'scenarios', label: '场景管理', icon: 'BookOpen' },
            { id: 'models', label: '模型服务', icon: 'Cpu' },
            { id: 'extensions', label: '功能拓展', icon: 'Settings' },
          ] as const).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
                title={item.label}
                id={`nav-item-${item.id}`}
              >
                <LucideIcon name={item.icon} size={14} className={isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                <span className="text-[9px] mt-1 font-medium transform scale-90 md:scale-100 font-sans tracking-wide leading-none">{item.label}</span>

                {/* Discord-style left indicator pill */}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile quick trigger at bottom */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all cursor-pointer flex-shrink-0"
          title="配置人设角色"
          id="nav-profile-trigger-btn"
        >
          <LucideIcon name="User" size={15} />
        </button>
      </nav>

      {/* 2. CHAT TAB SIDEBARS & WORKSPACE */}
      {activeTab === 'chat' && (
        <>
          {/* Mobile Sidebar backdrop/overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
              id="sidebar-mobile-overlay"
            />
          )}

          {/* LEFT SIDEBAR (Styled exactly like ChatGPT's sidebar) */}
          <aside
            className={`fixed md:static inset-y-0 left-14 md:left-0 z-30 bg-[#171717] flex-shrink-0 flex flex-col h-full border-r border-[#303030] transition-transform duration-300 transform overflow-hidden ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0'
            }`}
            style={sidebarOpen ? { width: middlePanelWidth, maxWidth: 'calc(100vw - 3.5rem)' } : undefined}
            id="chatgpt-left-sidebar"
          >
            <div className="flex flex-col h-full flex-shrink-0 select-none" style={{ width: middlePanelWidth, maxWidth: 'calc(100vw - 3.5rem)' }}>
              {/* New Chat button with Assistant selector dropdown */}
              <div className="p-3 relative">
                <button
                  onClick={() => setNewChatDropdownOpen(!newChatDropdownOpen)}
                  className="w-full flex items-center justify-between border border-cyan-500/25 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-850 transition-all cursor-pointer shadow-sm group"
                  id="sidebar-new-chat-btn"
                >
                  <div className="flex items-center space-x-2">
                    <LucideIcon name="Plus" size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>开启新对话</span>
                  </div>
                  <LucideIcon
                    name="ChevronDown"
                    size={12}
                    className={`text-zinc-500 transition-transform duration-200 ${newChatDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Assistant Selector Dropdown */}
                {newChatDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setNewChatDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-3 right-3 mt-1.5 bg-[#1d1d1d] border border-zinc-800 rounded-lg shadow-2xl z-50 flex flex-col max-h-[280px] overflow-hidden font-sans">
                      <div className="p-2 border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block px-1">选择 AI 角色发起对话</span>
                      </div>
                      <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
                        {allCharacters.length === 0 ? (
                          <div className="text-center py-4 px-2 text-[10px] text-zinc-500">
                            暂无角色，请前往「角色管理」页面创建。
                          </div>
                        ) : (
                          allCharacters.map((char) => (
                            <button
                              key={char.id}
                              onClick={() => {
                                const newThread: ChatThread = {
                                  id: `thread-${char.id}-${Date.now()}`,
                                  characterId: char.id,
                                  title: `与 ${char.name} 的新对话`,
                                  messages: [],
                                  timestamp: Date.now()
                                };
                                const updatedThreads = [newThread, ...threads];
                                saveThreads(updatedThreads);
                                setSelectedThreadId(newThread.id);
                                setNewChatDropdownOpen(false);
                                if (window.innerWidth < 768) {
                                  setSidebarOpen(false);
                                }
                              }}
                              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs text-left text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded-full bg-zinc-850 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-[9px] text-zinc-400">
                                <LucideIcon name={char.avatar} size={10} />
                              </div>
                              <div className="truncate flex-1">
                                <span className="block font-medium text-zinc-200 text-xs truncate leading-none">{char.name}</span>
                                <span className="text-[9px] text-zinc-500 truncate block mt-0.5">{char.tagline}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Search bar inside sidebar */}
              <div className="px-3 pb-2 border-b border-[#303030]/20">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-zinc-500">
                    <LucideIcon name="Search" size={11} />
                  </div>
                  <input
                    type="text"
                    placeholder="搜索对话、姓名或消息内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#111] border border-zinc-800/80 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-200 transition-all placeholder-zinc-600"
                    id="sidebar-search-input"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-2.5 flex items-center text-zinc-500 hover:text-zinc-300"
                    >
                      <LucideIcon name="X" size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation list scrollable panel */}
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1" id="sidebar-scroller">
                {filteredThreads.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <span className="text-[11px] text-zinc-600">无匹配的对话消息记录。</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredThreads.map((thread) => {
                      const char = allCharacters.find(c => c.id === thread.characterId) || allCharacters[0];
                      if (!char) return null;
                      const isSelected = selectedThreadId === thread.id;
                      const hasActiveChat = thread.messages && thread.messages.length > 0;
                      const lastMsg = hasActiveChat ? thread.messages[thread.messages.length - 1] : null;
                      const lastMsgText = getSessionLastMessage(thread, char.tagline);
                      const timeStr = formatSessionTime(lastMsg ? lastMsg.timestamp : thread.timestamp);
                      const isRenaming = renamingThreadId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            if (!isRenaming) {
                              setSelectedThreadId(thread.id);
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false); // Close mobile sidebar upon select
                              }
                            }
                          }}
                          className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-all duration-150 relative ${
                            isSelected
                              ? 'bg-[#2f2f2f] text-zinc-100 font-medium border-l-2 border-cyan-500/80 pl-2.5'
                              : 'text-zinc-400 hover:bg-[#212121]/60 hover:text-zinc-200'
                          }`}
                          id={`sidebar-thread-${thread.id}`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-1">
                            {/* Round mini-avatar background */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border text-[10px] ${
                              isSelected
                                ? 'bg-zinc-800 border-cyan-500/30 text-cyan-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                            }`}>
                              <LucideIcon name={char.avatar} size={11} />
                            </div>

                            <div className="truncate flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                {isRenaming ? (
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => {
                                      if (renameValue.trim()) {
                                        handleRenameThread(thread.id, renameValue.trim());
                                      }
                                      setRenamingThreadId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (renameValue.trim()) {
                                          handleRenameThread(thread.id, renameValue.trim());
                                        }
                                        setRenamingThreadId(null);
                                      } else if (e.key === 'Escape') {
                                        setRenamingThreadId(null);
                                      }
                                    }}
                                    autoFocus
                                    className="bg-zinc-800 border border-cyan-500/50 text-zinc-100 text-[11px] px-1 py-0.5 rounded focus:outline-none w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="block truncate font-medium text-zinc-200 flex-1">{thread.title}</span>
                                )}
                                {!isRenaming && timeStr && (
                                  <span className="text-[9px] text-zinc-500 font-mono flex-shrink-0 pl-1">{timeStr}</span>
                                )}
                              </div>
                              {!isRenaming && (
                                <span className="text-[9px] text-zinc-500 truncate block mt-0.5">
                                  {lastMsgText}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hover action buttons */}
                          {!isRenaming && (
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingThreadId(thread.id);
                                  setRenameValue(thread.title);
                                }}
                                className="text-zinc-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
                                title="重命名"
                              >
                                <LucideIcon name="Edit3" size={10} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`确定删除对话「${thread.title}」吗？`)) {
                                    handleDeleteThread(thread.id);
                                  }
                                }}
                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                                title="删除"
                              >
                                <LucideIcon name="Trash2" size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>


              <div className="p-3 border-t border-[#303030]/40 bg-[#141414] mt-auto">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/40 transition-all cursor-pointer group text-left"
                  title="配置你的扮演人设"
                  id="sidebar-user-identity-profile-btn"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <LucideIcon name={userProfile.avatar} size={13} />
                    </div>
                    <div className="overflow-hidden">
                      <span className="block text-xs font-semibold text-zinc-200 group-hover:text-zinc-100 truncate">
                        我是「{userProfile.name}」
                      </span>
                      <span className="block text-[9px] text-zinc-500 truncate mt-0.5">
                        查看/编辑我的扮演设定
                      </span>
                    </div>
                  </div>
                  <LucideIcon name="Settings" size={11} className="text-zinc-500 group-hover:text-zinc-300" />
                </button>
              </div>
            </div>
          </aside>
          {sidebarOpen && (
            <MiddlePanelResizeHandle onPointerDown={handleMiddlePanelResizeStart} />
          )}

          {/* MAIN CHAT WORKSPACE SECTION */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#212121]">
            {/* If sidebar is fully collapsed, show a subtle floating hamburger button on the far left of the viewport */}
            {!sidebarOpen && (
              <div className="absolute top-2.5 left-4 z-20 md:block hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-[#212121] border border-[#303030] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="展开侧边栏"
                  id="sidebar-toggle-btn-floating"
                >
                  <LucideIcon name="PanelLeftOpen" size={17} />
                </button>
              </div>
            )}

            {/* Chat area wrapper */}
            <div className="flex-1 h-full min-h-0 w-full">
              <ChatWorkspace
                character={activeCharacter}
                messages={activeMessages}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                onUpdateMessage={handleUpdateMessage}
                onDeleteMessage={handleDeleteMessage}
                onReroll={handleReroll}
                isLoading={isLoading}
                userProfile={userProfile}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onOpenCharacterModal={handleOpenNewCharacterModal}
                featureSettings={featureSettings}
              />
            </div>
          </main>
        </>
      )}

      {/* 3. ASSISTANTS MANAGEMENT WORKSPACE */}
      {activeTab === 'assistants' && (
        <AssistantsDashboard
          characters={allCharacters}
          onSelectCharacter={(id) => {
            setSelectedCharacterId(id);
            setActiveTab('chat');
          }}
          activeCharacterId={selectedCharacterId}
          onSaveCharacter={handleSaveCharacter}
          onDeleteCharacter={(id) => {
            const fakeEvent = { stopPropagation: () => {} } as any;
            handleDeleteCharacter(fakeEvent, id);
          }}
          categories={categories}
          middlePanelWidth={middlePanelWidth}
          onMiddlePanelResizeStart={handleMiddlePanelResizeStart}
        />
      )}

      {/* 4. SCENARIOS MANAGEMENT WORKSPACE */}
      {activeTab === 'scenarios' && (
        <ScenariosDashboard
          characters={allCharacters}
          middlePanelWidth={middlePanelWidth}
          onMiddlePanelResizeStart={handleMiddlePanelResizeStart}
        />
      )}

      {/* 5. MODELS CONFIGURATION WORKSPACE */}
      {activeTab === 'models' && (
        <ModelsDashboard
          userProfile={userProfile}
          onSaveUserProfile={saveUserProfile}
          temperature={temperature}
          onSaveTemperature={handleSaveTemperature}
          topP={topP}
          onSaveTopP={handleSaveTopP}
          maxOutputTokens={maxOutputTokens}
          onSaveMaxOutputTokens={handleSaveMaxOutputTokens}
          middlePanelWidth={middlePanelWidth}
          onMiddlePanelResizeStart={handleMiddlePanelResizeStart}
        />
      )}

      {/* 6. OPTIONAL FEATURE SETTINGS */}
      {activeTab === 'extensions' && (
        <ExtensionsDashboard
          settings={featureSettings}
          onChange={handleFeatureSettingsChange}
          middlePanelWidth={middlePanelWidth}
          onMiddlePanelResizeStart={handleMiddlePanelResizeStart}
        />
      )}

      {/* User profile setting modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onSave={saveUserProfile}
      />

      {/* Character designer modal (Supports both edit and create) */}
      <CharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => {
          setIsCharacterModalOpen(false);
          setEditingCharacter(null);
        }}
        editingCharacter={editingCharacter}
        onSave={handleSaveCharacter}
      />
    </div>
  );
}
