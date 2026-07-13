import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import LucideIcon from './LucideIcon';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';
import SearchInput from './SearchInput';

interface AssistantsDashboardProps {
  characters: Character[];
  onSelectCharacter: (id: string) => void;
  activeCharacterId: string;
  onSaveCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  categories: { id: string; label: string; icon: string }[];
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const CATEGORIES_LIST = [
  { id: 'fantasy', label: '奇幻魔幻' },
  { id: 'cyberpunk', label: '赛博科幻' },
  { id: 'mystery', label: '悬疑推理解密' },
  { id: 'sliceoflife', label: '都市日常日常' }
];

export default function AssistantsDashboard({
  characters,
  onSelectCharacter,
  activeCharacterId,
  onSaveCharacter,
  onDeleteCharacter,
  categories,
  middlePanelWidth,
  onMiddlePanelResizeStart,
}: AssistantsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<string>(activeCharacterId || (characters[0]?.id || ''));

  // Form states for the settings panel (right column)
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'fantasy' | 'cyberpunk' | 'mystery' | 'sliceoflife' | 'custom'>('custom');
  const [avatar, setAvatar] = useState('Bot');
  const [personality, setPersonality] = useState('');
  const [scenario, setScenario] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Find the currently selected character from list
  const currentSelectedCharacter = characters.find(c => c.id === selectedId) || characters[0];

  // Sync form states with the selected character
  useEffect(() => {
    if (isCreatingNew) {
      setName('');
      setTagline('');
      setCategory('custom');
      setAvatar('Bot');
      setPersonality('');
      setScenario('');
      setFirstMessage('');
      setSystemInstruction('');
    } else if (currentSelectedCharacter) {
      setName(currentSelectedCharacter.name);
      setTagline(currentSelectedCharacter.tagline);
      setCategory(currentSelectedCharacter.category);
      setAvatar(currentSelectedCharacter.avatar);
      setPersonality(currentSelectedCharacter.personality);
      setScenario(currentSelectedCharacter.scenario);
      setFirstMessage(currentSelectedCharacter.firstMessage);
      setSystemInstruction(currentSelectedCharacter.systemInstruction);
    }
  }, [currentSelectedCharacter, isCreatingNew, selectedId]);

  // Filter characters for middle list
  const filtered = characters.filter((char) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' && char.isCustom);

    const matchesSearch =
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.personality.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Auto-generate system prompt based on inputs
  const handleAutoGeneratePrompt = () => {
    if (!name.trim()) return;

    const generatedPrompt = `你现在需要完全扮演角色【${name.trim()}】。
这是一个沉浸式角色扮演会话。请遵守以下铁律：
1. 【第一人称扮演】：始终以${name.trim()}的视角和语调进行对话，绝对不要脱离角色，不要以AI身份说话。
2. 【动作描述与独白】：使用星号 * * 包裹你的动作、神态、心理描写或场景变化，生动表现文字画卷。例如：*微微侧过头看向你，眼中闪过一抹微光*。
3. 【对话输出风格】：标准对话不要加星号，普通交谈即可，让文字富有小说般的质感。
4. 【人设配合】：${personality.trim() || '你有着独特的个性和背景，请忠实于你的人物设定进行互动。'}
5. 【默认登场环境】：${scenario.trim() || '未指定；优先遵循对话线程绑定的场景设定。'}`;

    setSystemInstruction(generatedPrompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !personality.trim() || !firstMessage.trim()) return;

    let finalInstruction = systemInstruction;
    if (!finalInstruction.trim()) {
      finalInstruction = `你现在需要完全扮演角色【${name.trim()}】。
始终使用第一人称叙述，使用星号 * * 描述肢体语言和心理活动。默认登场环境是：${scenario.trim() || '未指定，遵循本次对话场景'}。
性格设定是：${personality.trim()}`;
    }

    const savedCharacter: Character = {
      id: isCreatingNew ? `char-${Date.now()}` : (currentSelectedCharacter?.id || `char-${Date.now()}`),
      name: name.trim(),
      tagline: tagline.trim(),
      avatar,
      category,
      personality: personality.trim(),
      scenario: scenario.trim(),
      firstMessage: firstMessage.trim(),
      systemInstruction: finalInstruction.trim(),
      isCustom: true,
      starters: currentSelectedCharacter?.starters || [],
    };

    onSaveCharacter(savedCharacter);

    if (isCreatingNew) {
      setSelectedId(savedCharacter.id);
      setIsCreatingNew(false);
    }
  };

  return (
    <div className="management-root relative w-full" id="assistants-dashboard-root">

      {/* COLUMN 2: MIDDLE COLUMN (Assistants List Sidebar) */}
      <aside
        className="management-sidebar select-none"
        style={{ width: middlePanelWidth }}
        id="assistants-middle-sidebar"
      >
        {/* Create Button */}
        <div className="p-4 border-b border-[#303030]/40">
          <button
            onClick={() => setIsCreatingNew(true)}
            className="management-create-button group"
            id="sidebar-create-new-char-btn"
          >
            <LucideIcon name="Plus" size={13} className="group-hover:scale-110 transition-transform" />
            <span>创建全新角色</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="搜索角色名字或设定..." id="sidebar-assistants-search" />
        </div>

        {/* Category Pills inside Middle Sidebar */}
        <div className="px-3 pb-2 border-b border-[#303030]/10 flex flex-wrap gap-1">
          {categories.filter(cat => cat.id === 'all' || cat.id === 'custom').map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setIsCreatingNew(false);
              }}
              className={`flex items-center space-x-0.5 px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
              id={`dash-sidebar-cat-${cat.id}`}
            >
              <LucideIcon name={cat.id === 'custom' ? 'Bot' : 'Compass'} size={9} className={selectedCategory === cat.id ? 'text-cyan-400' : 'text-zinc-500'} />
              <span>{cat.id === 'custom' ? '自设角色' : '全部角色'}</span>
            </button>
          ))}
        </div>

        {/* Assistants Vertical List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1" id="dash-assistants-list-scroller">
          {filtered.length === 0 ? (
            <div className="text-center py-6 px-4">
              <span className="text-[11px] text-zinc-600">无匹配角色，换个词搜索吧。</span>
            </div>
          ) : (
            filtered.map((char) => {
              const isSelected = !isCreatingNew && selectedId === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => {
                    setSelectedId(char.id);
                    setIsCreatingNew(false);
                  }}
                  className={`management-list-item group flex items-center justify-between text-xs cursor-pointer relative ${
                    isSelected
                      ? 'management-list-item--active font-medium'
                      : ''
                  }`}
                  id={`dash-list-item-${char.id}`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border text-[10px] ${
                      isSelected
                        ? 'bg-zinc-800 border-cyan-500/30 text-cyan-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}>
                      <LucideIcon name={char.avatar} size={12} />
                    </div>
                    <div className="truncate flex-1">
                      <span className="block truncate font-semibold text-zinc-200">{char.name}</span>
                      <span className="text-[9px] text-zinc-500 truncate block mt-0.5">{char.tagline}</span>
                    </div>
                  </div>

                  <span className={`text-[8px] px-1 py-0.5 rounded border font-mono uppercase tracking-wide flex-shrink-0 ${
                    char.isCustom
                      ? 'bg-cyan-500/5 text-cyan-400/80 border-cyan-500/15'
                      : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                  }`}>
                    {char.isCustom ? '自设' : '官方'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      {/* COLUMN 3: RIGHT COLUMN (Assistant Settings Panel) */}
      <main className="management-workspace" id="assistants-right-workspace">

        {/* Workspace Card Header */}
        <div className="management-header z-10">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <LucideIcon name={isCreatingNew ? 'PlusCircle' : 'Settings'} size={15} />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center space-x-2">
                <span>{isCreatingNew ? '定制全新的 AI 扮演角色' : `修改 AI 角色「${name}」设定`}</span>
                {!isCreatingNew && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                    currentSelectedCharacter?.isCustom
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                  }`}>
                    {currentSelectedCharacter?.isCustom ? '自设专属角色' : '系统官方预设'}
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {isCreatingNew ? '在此自定义配置您的专属角色设想，创造独立交互灵体' : '精细微调此角色的性格、环境开场白、以及扮演系统提示词'}
              </p>
            </div>
          </div>

          {/* Quick dialogue trigger */}
          {!isCreatingNew && currentSelectedCharacter && (
            <button
              onClick={() => onSelectCharacter(currentSelectedCharacter.id)}
              className="ui-button-primary flex-shrink-0"
              id="dash-quick-dialog-btn"
            >
              <LucideIcon name="MessageSquare" size={12} className="text-zinc-950 font-bold" />
              <span>进入对话</span>
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="management-content space-y-6 relative" id="assistant-form-scroll-container">
          {/* Subtle decoration elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

          <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 relative z-10">
            {/* Top segment: Name and tagline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center space-x-1">
                  <span>角色大名</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：赛博刺客 · 零"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input"
                  id="dash-char-name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center space-x-1">
                  <span>一句话专属签名/台词</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：我的刀，可比你的话快得多。"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="field-input"
                  id="dash-char-tagline"
                />
              </div>
            </div>

            {/* Personality Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 flex items-center space-x-1">
                  <span>核心性格与身世设定 (Personality)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-zinc-500">性格特征、背景故事、说话口头禅等</span>
              </div>
              <textarea
                required
                rows={3}
                placeholder="例如：冷酷孤傲的机械忍者。在霓虹不夜城长大。平时说话简洁高冷，常说“多说无益”。由于义体化严重，行动悄无声息。内心对真相充满渴望。"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="field-input resize-none font-sans"
                id="dash-char-personality"
              />
            </div>

            {/* Scenario Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">默认登场环境</label>
                <span className="text-[10px] text-zinc-500">仅在对话未选择独立场景时使用</span>
              </div>
              <textarea
                rows={2}
                placeholder="例如：通常在旧城区酒馆吧台后工作；具体环境优先使用场景管理中的设定。"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="field-input resize-none font-sans"
                id="dash-char-scenario"
              />
            </div>

            {/* First Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 flex items-center space-x-1">
                  <span>第一句开场白 (First Message)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-zinc-500">奠定会话的第一语气，使用 *描述动作*</span>
              </div>
              <textarea
                required
                rows={3}
                placeholder="例如：*在落满雨滴的卡座里，零正在细细擦拭他发光的等离子刀。微弱的霓虹灯映照出他半边由合金构成的冷漠脸庞。他并未看你，只是一声冷哼，刀锋收入刀鞘，发出悦耳的声音。* &#10;&#10;“又是来打听芯片下落的？在不夜城，知道太多可不是什么好事，朋友。”"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                className="field-input resize-none font-sans"
                id="dash-char-firstmessage"
              />
            </div>

            {/* Advanced System prompt Instructions */}
            <div className="space-y-2 border-t border-zinc-800/40 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold text-zinc-400">AI 角色专用高级扮演提示词 (System Instructions)</label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePrompt}
                    disabled={!name.trim()}
                    className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 text-[9px] font-bold rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    id="dash-auto-generate-prompt"
                  >
                    🔮 智能一键生成模板
                  </button>
                </div>
                <span className="text-[9px] text-zinc-500">掌控大模型角色语调、扮演规则</span>
              </div>
              <textarea
                rows={5}
                placeholder="点击上方‘智能一键生成模板’，或者自主修改：&#10;你现在要完全扮演【零】。这是一个文字角色扮演会话，请用星号*包裹动作描述..."
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="field-input resize-none font-mono text-xs leading-relaxed"
                id="dash-char-instruction"
              />
            </div>

            {/* Save notice for Official Characters */}
            {!isCreatingNew && !currentSelectedCharacter?.isCustom && (
              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-start space-x-2">
                <LucideIcon name="Info" size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  <strong className="text-amber-400 font-semibold">提示：</strong>此为系统内置的官方预设角色。编辑后点击保存，我们将自动克隆该人设，并保存为您的专属 <strong className="text-cyan-400">自设角色</strong> 放入列表。
                </p>
              </div>
            )}

            {/* Footer Form buttons */}
            <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-between">
              <div>
                {!isCreatingNew && currentSelectedCharacter?.isCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确定要彻底删除 AI 角色「${name}」吗？`)) {
                        onDeleteCharacter(currentSelectedCharacter.id);
                        // Pick next
                        const remaining = characters.filter(c => c.id !== currentSelectedCharacter.id);
                        if (remaining.length > 0) {
                          setSelectedId(remaining[0].id);
                        }
                      }
                    }}
                    className="ui-button-danger"
                    id="dash-char-delete-btn"
                  >
                    <LucideIcon name="Trash" size={12} />
                    <span>删除此角色</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isCreatingNew && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="ui-button-secondary border-transparent bg-transparent"
                  >
                    取消
                  </button>
                )}
                <button
                  type="submit"
                  className="ui-button-primary px-5"
                  id="dash-char-save-btn"
                >
                  {isCreatingNew ? '保存并放入大厅' : '确认更新人设设定'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
