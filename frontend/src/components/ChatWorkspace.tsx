import React, { useState, useRef, useEffect } from 'react';
import { Character, DialogueScenario, Message, UserProfile } from '../types';
import LucideIcon from './LucideIcon';
import { getActiveModelServiceConfig } from '../modelService';
import {FeatureSettings, resolveCharacterVoiceSettings} from '../featureSettings';
import {useTtsPlayer} from '../tts/useTtsPlayer';

interface ChatWorkspaceProps {
  character?: Character;
  scenario?: DialogueScenario;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onUpdateMessage: (id: string, newContent: string) => void;
  onDeleteMessage: (id: string) => void;
  onReroll: () => void;
  isLoading: boolean;
  userProfile: UserProfile;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCharacterModal?: () => void;
  featureSettings: FeatureSettings;
}

// Custom Roleplay Format Parser
// Parses *actions/narrations* wrapped in single asterisks into a distinctive italic style.
function RoleplayFormatter({ content, alignment = 'left' }: { content: string; alignment?: 'left' | 'right' }) {
  if (!content) return null;

  // Split by asterisks, keeping track of inside/outside
  const segments = content.split(/(\*[^*]+\*)/g);

  return (
    <div className={`w-full space-y-1.5 leading-relaxed text-[14px] text-zinc-100 ${
      alignment === 'right' ? 'text-right' : 'text-left'
    }`}>
      {segments.map((seg, idx) => {
        if (seg.startsWith('*') && seg.endsWith('*')) {
          const actionText = seg.slice(1, -1);
          return (
            <span
              key={idx}
              className={`italic text-amber-500/80 font-sans leading-relaxed block my-1 bg-amber-500/5 px-2.5 py-1 rounded-md ${
                alignment === 'right'
                  ? 'border-r-2 border-amber-500/40'
                  : 'border-l-2 border-amber-500/40'
              }`}
            >
              {actionText}
            </span>
          );
        } else {
          return (
            <span key={idx} className="font-sans">
              {seg}
            </span>
          );
        }
      })}
    </div>
  );
}

export default function ChatWorkspace({
  character,
  scenario,
  messages,
  onSendMessage,
  onClearHistory,
  onUpdateMessage,
  onDeleteMessage,
  onReroll,
  isLoading,
  userProfile,
  sidebarOpen,
  onToggleSidebar,
  onOpenCharacterModal,
  featureSettings,
}: ChatWorkspaceProps) {
  const [inputText, setInputText] = useState('');
  const sceneSummary = scenario
    ? [scenario.location, scenario.timePeriod, scenario.atmosphere, scenario.openingContext].filter(Boolean).join(' · ')
    : character?.scenario || '';
  const [showInspector, setShowInspector] = useState(false);

  // Interactive roleplay helpers states
  const [isPolishing, setIsPolishing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef<any>(null);
  const effectiveVoiceSettings = resolveCharacterVoiceSettings(featureSettings, character?.id);
  const tts = useTtsPlayer(effectiveVoiceSettings);
  const wasLoadingRef = useRef(isLoading);
  const assistantBeforeGenerationRef = useRef<string>('');

  const speakMessage = (message: Message) => {
    if (tts.currentId === message.id) tts.stop();
    else tts.play(message.id, message.content);
  };

  useEffect(() => {
    const latest = [...messages].reverse().find(message => message.role === 'assistant' && !message.id.endsWith('-greeting'));
    if (!wasLoadingRef.current && isLoading) {
      assistantBeforeGenerationRef.current = latest?.id || '';
    }
    const generationCompleted = wasLoadingRef.current && !isLoading;
    wasLoadingRef.current = isLoading;
    if (!generationCompleted) return;
    if (!latest || latest.id === assistantBeforeGenerationRef.current) return;
    if (effectiveVoiceSettings.voicePlaybackEnabled && effectiveVoiceSettings.autoPlayAssistantReplies) speakMessage(latest);
  }, [messages, isLoading]);

  useEffect(() => {
    if (!featureSettings.voicePlaybackEnabled) tts.stop();
  }, [featureSettings.voicePlaybackEnabled]);

  // Message being edited
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice dictation using browser Web Speech API
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的浏览器不支持原生的语音听写功能。请使用 Chrome 或 Edge 浏览器体验！');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(prev => prev ? prev + transcript : transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error('Failed to initialize speech recognition:', e);
        setIsRecording(false);
      }
    }
  };

  // AI-assisted roleplay tone polishing
  const handlePolishTone = async () => {
    if (!inputText.trim() || isPolishing) return;
    setIsPolishing(true);
    try {
      const modelService = getActiveModelServiceConfig();
      if (!modelService) {
        throw new Error('请先在“模型服务”中配置并选择一个模型。');
      }
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          userProfileName: userProfile.name,
          characterName: character?.name || '',
          modelService,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to polish text');
      }

      const data = await response.json();
      setInputText(data.polished);
    } catch (err: any) {
      console.error('Polish tone error:', err);
      alert(`戏腔润色失败：${err.message || '请检查模型服务配置。'}`);
    } finally {
      setIsPolishing(false);
    }
  };

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;
    onSendMessage(textToSend.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const saveEditedMessage = (id: string) => {
    if (!editingContent.trim()) return;
    onUpdateMessage(id, editingContent.trim());
    setEditingMessageId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Compute relationship bond level
  const chatRounds = Math.floor(messages.filter(m => !m.id.endsWith('-greeting')).length / 2);
  let bondLevel = 1;
  let bondName = '萍水相逢';
  if (chatRounds >= 15) { bondLevel = 5; bondName = '生死之交'; }
  else if (chatRounds >= 10) { bondLevel = 4; bondName = '志同道合'; }
  else if (chatRounds >= 6) { bondLevel = 3; bondName = '把酒言欢'; }
  else if (chatRounds >= 3) { bondLevel = 2; bondName = '一回生二回熟'; }

  // Check if we only have the default greeting (empty history)
  const isConversationEmpty = messages.length <= 1 && messages[0]?.id.endsWith('-greeting');

  if (!character) {
    return (
      <div
        className="workspace-surface flex flex-col h-full text-zinc-200 overflow-hidden relative w-full items-center justify-center p-6 text-center"
        id="chat-workspace-empty"
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <header className="management-header absolute top-0 left-0 right-0 z-20 backdrop-blur-sm">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer mr-3"
            title={sidebarOpen ? "隐藏侧边栏" : "展开侧边栏"}
            id="sidebar-toggle-btn-header-empty"
          >
            <LucideIcon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={17} />
          </button>
          <span className="font-semibold text-sm text-zinc-300 font-display">Aura 角色扮演</span>
        </header>

        <div className="max-w-md space-y-6 relative z-10 pt-10">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 mx-auto shadow-xl">
            <LucideIcon name="Bot" size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-100 font-display">欢迎来到 Aura 角色大厅</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              这里目前空空如也。点击下方按钮定制一个属于你的 AI 角色，或者点击左上角展开侧边栏开始创作吧！
            </p>
          </div>
          <button
            onClick={onOpenCharacterModal}
            className="px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
            id="create-first-char-btn"
          >
            定制我的第一个 AI 角色
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="workspace-surface flex flex-col h-full text-zinc-200 overflow-hidden relative w-full"
      id="chat-workspace-chatgpt"
    >
      {/* Immersive scene ambient glow backlight */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-[130px] pointer-events-none z-0 opacity-85 transition-all duration-1000" />

      {/* Top sticky bar */}
      <header className="management-header relative z-20 backdrop-blur-sm">
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Sidebar collapse/open button (Like ChatGPT's left sidebar trigger) */}
          <button
            onClick={onToggleSidebar}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer mr-1"
            title={sidebarOpen ? "隐藏侧边栏" : "展开侧边栏"}
            id="sidebar-toggle-btn-header"
          >
            <LucideIcon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={17} />
          </button>

          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-850 border border-zinc-800 flex items-center justify-center text-amber-500">
            <LucideIcon name={character.avatar} size={15} />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-zinc-100 truncate">{character.name}</span>
              {bondLevel > 1 && (
                <div className="flex items-center space-x-0.5 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full text-[9px] text-rose-400 font-bold shadow-xs flex-shrink-0 animate-pulse">
                  <LucideIcon name="Heart" size={8} className="text-rose-500 fill-rose-500" />
                  <span>羁绊 Lv.{bondLevel} · {bondName}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {character.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings Inspector Trigger */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center space-x-1 ${
              showInspector
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="查看人设细节设定"
            id="inspect-chatgpt-btn"
          >
            <LucideIcon name="BookOpen" size={13} />
            <span className="hidden sm:inline text-[11px] font-semibold">{showInspector ? '收起设定' : '角色设定'}</span>
          </button>

          {/* Reset chat button */}
          {!isConversationEmpty && (
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/40 transition-all cursor-pointer flex items-center space-x-1"
              title="重新开始对话"
              id="clear-chatgpt-btn"
            >
              <LucideIcon name="RotateCcw" size={13} />
              <span className="hidden sm:inline text-[11px] font-semibold">重置对话</span>
            </button>
          )}
        </div>
      </header>

      {/* Expandable Inspector Overlay */}
      {showInspector && (
        <div className="workspace-header-offset absolute left-0 right-0 max-h-[60%] border-b border-[#303030] bg-[#171717] z-30 overflow-y-auto p-4 md:p-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <LucideIcon name="Bot" size={12} />
                <span>AI 角色设定 (Aura Role Settings)</span>
              </h4>
              <button
                onClick={() => setShowInspector(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <LucideIcon name="X" size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                <span className="font-bold text-zinc-300 block mb-1">【性格外貌 Trait & Personality】</span>
                <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{character.personality}</p>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                <span className="font-bold text-zinc-300 block mb-1">【演绎场景 Context Scenario】</span>
                <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{scenario ? `${scenario.name}\n${sceneSummary}\n${scenario.worldBackground}` : character.scenario}</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] font-mono">
              <span className="font-bold text-zinc-300 block mb-1">【系统指示系统 Prompt】</span>
              <pre className="text-zinc-500 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {character.systemInstruction}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Message & Welcome view */}
      <div className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        {isConversationEmpty ? (
          /* High fidelity ChatGPT-style Empty Welcome Page */
          <div className="flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full px-4 pt-10 pb-6">
            {/* Top/Mid Brand layout */}
            <div className="my-auto flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-full bg-zinc-850 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/5">
                <LucideIcon name={character.avatar} size={28} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg md:text-xl font-bold text-zinc-100 font-display">
                  已成功载入角色设定：{character.name}
                </h2>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  “{character.tagline}”{scenario && <span className="ml-2 text-cyan-500">· {scenario.name}</span>}
                </p>
              </div>

              {/* Character scenario detail bubble */}
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 max-w-lg leading-relaxed text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <span className="font-semibold text-cyan-400 block mb-1">📍 正在发生的故事位面场景：</span>
                {sceneSummary || '尚未设置当前对话场景。'}
              </div>
            </div>

            {/* Bottom 2x2 Dialogue starters cards */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center space-x-2 text-[11px] text-zinc-500 font-semibold px-1">
                <LucideIcon name="Compass" size={11} />
                <span>选择或点击一个预设开场动作开启对话：</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {character.starters && character.starters.map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(starter)}
                    className="group p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-850 hover:border-zinc-700 text-left text-xs text-zinc-300 transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                  >
                    <span className="line-clamp-2 leading-relaxed">{starter}</span>
                    <span className="text-[10px] text-zinc-500 group-hover:text-cyan-400 mt-2 flex items-center self-end space-x-0.5">
                      <span>开启对话</span>
                      <LucideIcon name="ArrowUpRight" size={10} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Message stream */
          <div className="py-4 space-y-0 w-full flex-1">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              const isLastMessage = index === messages.length - 1;
              const isGreeting = msg.id.endsWith('-greeting');
              const speakerName = isAssistant ? character.name : userProfile.name;
              const speakerAvatar = isAssistant ? character.avatar : userProfile.avatar;

              return (
                <div
                  key={msg.id}
                  className={`border-b border-zinc-800/40 w-full py-6 px-4 md:px-6 transition-colors duration-200 group relative ${
                    isAssistant ? 'bg-transparent' : 'bg-zinc-850/10'
                  }`}
                  id={`chat-msg-row-${msg.id}`}
                >
                  <div className={`max-w-2xl mx-auto w-full flex items-start gap-4 ${
                    isAssistant ? 'flex-row justify-start' : 'flex-row-reverse justify-start'
                  }`}>
                    {/* ChatGPT Left side: Round clean profile icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs shadow-md ${
                        isAssistant
                          ? 'bg-zinc-800 text-amber-500 border-zinc-700'
                          : 'bg-zinc-800 text-purple-400 border-zinc-700'
                      }`}>
                        <LucideIcon name={speakerAvatar} size={13} />
                      </div>
                    </div>

                    {/* ChatGPT Right side: Message and Actions */}
                    <div className={`flex-1 min-w-0 space-y-1 ${isAssistant ? 'text-left' : 'text-right'}`}>
                      {/* Speaker title and Time */}
                      <div className={`flex items-center justify-between ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
                        <span className="text-xs font-bold text-zinc-100 font-display">
                          {speakerName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Editing state or text display */}
                      <div className="pt-1.5">
                        {editingMessageId === msg.id ? (
                          <div className="space-y-2 mt-1">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={4}
                              className="w-full p-3 text-xs bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl focus:outline-none focus:border-amber-500 font-sans resize-none"
                              id={`edit-chatgpt-textarea-${msg.id}`}
                            />
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => saveEditedMessage(msg.id)}
                                className="px-3 py-1 bg-amber-500 text-zinc-950 text-[11px] font-bold rounded-lg hover:bg-amber-400 transition-colors"
                              >
                                确定
                              </button>
                            </div>
                          </div>
                        ) : (
                          <RoleplayFormatter content={msg.content} alignment={isAssistant ? 'left' : 'right'} />
                        )}
                      </div>

                      {/* Actions underneath (Minimalist copy/edit/delete triggers like ChatGPT) */}
                      {editingMessageId !== msg.id && (
                        <div className={`flex items-center space-x-3.5 pt-2 text-zinc-500 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 ${
                          isAssistant ? 'justify-start' : 'justify-end'
                        }`}>
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="hover:text-zinc-300 transition-colors"
                            title="复制消息内容"
                            id={`copy-btn-${msg.id}`}
                          >
                            <LucideIcon name="Copy" size={11} />
                          </button>

                          {isAssistant && featureSettings.voicePlaybackEnabled && (
                            <button
                              onClick={() => speakMessage(msg)}
                              className={tts.currentId === msg.id ? 'text-cyan-400' : 'hover:text-cyan-400 transition-colors'}
                              title={tts.currentId === msg.id ? '停止播放' : '播放 AI 回复'}
                              aria-label={tts.currentId === msg.id ? '停止播放' : '播放 AI 回复'}
                              id={`speak-btn-${msg.id}`}
                            >
                              <LucideIcon name={tts.currentId === msg.id ? 'VolumeX' : 'Volume2'} size={12} />
                            </button>
                          )}

                          {isAssistant && tts.currentId === msg.id && (
                            <button onClick={tts.togglePause} className="text-cyan-400 hover:text-cyan-300" title={tts.paused ? '继续播放' : '暂停播放'} aria-label={tts.paused ? '继续播放' : '暂停播放'}>
                              <LucideIcon name={tts.paused ? 'Play' : 'Pause'} size={12} />
                            </button>
                          )}

                          <button
                            onClick={() => startEditing(msg)}
                            className="hover:text-zinc-300 transition-colors"
                            title="编辑此条消息"
                            id={`edit-btn-${msg.id}`}
                          >
                            <LucideIcon name="Edit3" size={11} />
                          </button>

                          {/* Swipe/Reroll button only for assistant's last message */}
                          {isAssistant && isLastMessage && !isGreeting && (
                            <button
                              onClick={onReroll}
                              disabled={isLoading}
                              className="hover:text-amber-500 transition-colors disabled:opacity-30"
                              title="重刷对方上一句回答"
                              id={`reroll-btn-${msg.id}`}
                            >
                              <LucideIcon name="RefreshCw" size={11} />
                            </button>
                          )}

                          {!isGreeting && (
                            <button
                              onClick={() => onDeleteMessage(msg.id)}
                              className="hover:text-rose-400 transition-colors"
                              title="删除此轮故事"
                              id={`delete-btn-${msg.id}`}
                            >
                              <LucideIcon name="Trash2" size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Model Thinking dots */}
            {isLoading && (
              <div className="py-6 px-4 md:px-6 bg-transparent w-full">
                <div className="max-w-2xl mx-auto w-full flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-500 animate-pulse">
                      <LucideIcon name={character.avatar} size={13} />
                    </div>
                  </div>
                  <div className="flex-1 pt-1.5 space-y-1">
                    <span className="text-xs font-bold text-zinc-300 block">{character.name}</span>
                    <div className="text-zinc-500 text-xs italic flex items-center space-x-1.5">
                      <span className="flex space-x-1 py-1">
                        <span className="h-1.5 w-1.5 bg-amber-500/80 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 bg-amber-500/80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 bg-amber-500/80 rounded-full animate-bounce"></span>
                      </span>
                      <span>*正在字斟句酌地叙写下一步走向...*</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Input panel bar */}
      <footer className="workspace-surface relative px-4 pb-6 pt-2 flex-shrink-0 border-t border-[#303030]/20 z-20">
        <div className="max-w-2xl mx-auto w-full relative">

          {/* Main rounded container like ChatGPT's input bar */}
          <div className="bg-[#2f2f2f] rounded-2xl border border-transparent focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-650 transition-all shadow-lg flex flex-col">

            {/* Input box */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`给 ${character.name} 发送信息，描述动作如 *递上一杯温热红茶*...`}
              className="w-full py-3.5 px-4 text-sm bg-transparent outline-none resize-none text-zinc-100 placeholder-zinc-500 max-h-40 min-h-[48px] font-sans leading-relaxed"
              disabled={isLoading}
              id="chatgpt-input-textarea"
            />

            {/* Bottom Actions Row inside the input bar */}
            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-zinc-800/40 bg-zinc-900/10 rounded-b-2xl">

              {/* Aesthetic helper tools on the left */}
              <div className="flex items-center space-x-2 text-zinc-400">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isRecording
                      ? 'text-red-500 bg-red-500/10 animate-pulse border border-red-500/25 shadow-xs'
                      : 'hover:text-purple-400 hover:bg-zinc-800 text-zinc-400'
                  }`}
                  title={isRecording ? "正在听写...再次点击停止" : "开启麦克风语音听写"}
                  id="chat-voice-btn"
                >
                  <LucideIcon name="Mic" size={14} />
                </button>
              </div>

              {/* Send Button and Polish Trigger on the right */}
              <div className="flex items-center space-x-2">
                {inputText.trim() && (
                  <button
                    type="button"
                    onClick={handlePolishTone}
                    disabled={isPolishing || isLoading}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/20 disabled:opacity-50 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    title="点击将普通简短台词，AI一键智能润色，使人物动作与语气更显生动优雅"
                    id="chat-polish-btn"
                  >
                    {isPolishing ? (
                      <>
                        <span className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span>正在雕琢词句...</span>
                      </>
                    ) : (
                      <>
                        <LucideIcon name="Edit3" size={10} className="text-cyan-400" />
                        <span>一键智能润色</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSend(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    inputText.trim() && !isLoading
                      ? 'bg-zinc-100 text-[#212121] hover:bg-zinc-200 active:scale-95 shadow'
                      : 'bg-[#212121] text-zinc-600 cursor-not-allowed border border-zinc-800'
                  }`}
                  id="submit-chatgpt-btn"
                >
                  <LucideIcon name="ArrowUp" size={14} className="stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Mini-subtext disclaimer */}
          <div className="text-[10px] text-zinc-500 text-center pt-2 select-none">
            💡 动作与肢体可以用星号包裹（例如：*微笑着挥手*），丰富对话角色扮演氛围
          </div>
        </div>
      </footer>
    </div>
  );
}
