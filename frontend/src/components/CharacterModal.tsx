import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import LucideIcon from './LucideIcon';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  editingCharacter?: Character | null;
}

const CATEGORIES = [
  { id: 'fantasy', label: '奇幻魔幻' },
  { id: 'cyberpunk', label: '赛博科幻' },
  { id: 'mystery', label: '悬疑推理解密' },
  { id: 'sliceoflife', label: '都市日常羁绊' }
];

const AVAILABLE_ICONS = ['Bot', 'Code', 'Languages', 'Lightbulb', 'BarChart3', 'Cpu', 'Compass', 'Crown', 'User'];

export default function CharacterModal({ isOpen, onClose, onSave, editingCharacter }: CharacterModalProps) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'fantasy' | 'cyberpunk' | 'mystery' | 'sliceoflife' | 'custom'>('custom');
  const [avatar, setAvatar] = useState('Bot');
  const [personality, setPersonality] = useState('');
  const [scenario, setScenario] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');

  // Update states if we are editing an existing character
  useEffect(() => {
    if (editingCharacter) {
      setName(editingCharacter.name);
      setTagline(editingCharacter.tagline);
      setCategory(editingCharacter.category);
      setAvatar(editingCharacter.avatar);
      setPersonality(editingCharacter.personality);
      setScenario(editingCharacter.scenario);
      setFirstMessage(editingCharacter.firstMessage);
      setSystemInstruction(editingCharacter.systemInstruction);
    } else {
      setName('');
      setTagline('');
      setCategory('custom');
      setAvatar('Bot');
      setPersonality('');
      setScenario('');
      setFirstMessage('');
      setSystemInstruction('');
    }
  }, [editingCharacter, isOpen]);

  if (!isOpen) return null;

  // Auto-generate system prompt based on inputs
  const handleAutoGeneratePrompt = () => {
    if (!name.trim()) return;

    const generatedPrompt = `你现在需要完全扮演角色【${name.trim()}】。
这是一个沉浸式角色扮演会话。请遵守以下铁律：
1. 【第一人称扮演】：始终以${name.trim()}的视角和语调进行对话，绝对不要脱离角色，不要以AI身份说话。
2. 【动作描述与独白】：使用星号 * * 包裹你的动作、神态、心理描写或场景变化，生动表现文字画卷。例如：*微微侧过头看向你，眼中闪过一抹微光*。
3. 【对话输出风格】：标准对话不要加星号，普通交谈即可，让文字富有小说般的质感。
4. 【人设配合】：${personality.trim() || '你有着独特的个性和背景，请忠实于你的人物设定进行互动。'}
5. 【当前场景】：${scenario.trim() || '在专属场景里与对方相遇，正在展开一次富有深度的精彩对谈。'}`;

    setSystemInstruction(generatedPrompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !personality.trim() || !firstMessage.trim()) return;

    // Build instruction if empty
    let finalInstruction = systemInstruction;
    if (!finalInstruction.trim()) {
      finalInstruction = `你现在需要完全扮演角色【${name.trim()}】。
始终使用第一人称叙述，使用星号 * * 描述肢体语言和心理活动。当前场景设定是：${scenario.trim() || '专属对话环境'}。
性格设定是：${personality.trim()}`;
    }

    const savedCharacter: Character = {
      id: editingCharacter ? editingCharacter.id : `char-${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim(),
      avatar: 'Bot',
      category,
      personality: personality.trim(),
      scenario: scenario.trim(),
      firstMessage: firstMessage.trim(),
      systemInstruction: finalInstruction.trim(),
      isCustom: true
    };

    onSave(savedCharacter);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs"
      id="character-modal-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        id="character-modal-backdrop"
      />

      {/* Modal Card */}
      <div
        className="relative bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300"
        id="character-modal-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-500 border border-cyan-500/20">
              <LucideIcon name={editingCharacter ? 'Settings' : 'PlusCircle'} size={18} />
            </div>
            <h3 className="text-base font-semibold font-display text-zinc-100 tracking-wide">
              {editingCharacter ? `修改 AI 角色「${editingCharacter.name}」设定` : '定制全新 AI 角色设定'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            id="close-character-modal-btn"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Top segment: Name and tagline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">角色大名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="例如：赛博刺客 · 零"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600"
                id="char-name-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">一句话台词/签名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="例如：我的刀，可比你的话快得多。"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600"
                id="char-tagline-input"
              />
            </div>
          </div>

          {/* Personality Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400">核心人格与身世设定 (Personality) <span className="text-red-500">*</span></label>
              <span className="text-[10px] text-zinc-500">性格特征、背景故事、说话口头禅等</span>
            </div>
            <textarea
              required
              rows={3}
              placeholder="例如：冷酷孤傲的机械忍者。在霓虹不夜城长大。平时说话简洁高冷，常说“多说无益”。由于义体化严重，行动悄无声息。内心对真相充满渴望。"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all font-sans resize-none placeholder-zinc-600"
              id="char-personality-textarea"
            />
          </div>

          {/* Scenario Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400">当前对话环境/场景 (Scenario)</label>
              <span className="text-[10px] text-zinc-500">交代当前在哪、在做什么</span>
            </div>
            <textarea
              rows={2}
              placeholder="例如：深夜，在不夜城潮湿的小巷酒吧里，他擦拭着纳米太刀。外面正下着酸雨，你主动坐到了他旁边询问情报。"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all font-sans resize-none placeholder-zinc-600"
              id="char-scenario-textarea"
            />
          </div>

          {/* First Message (The Greeting!) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400">第一句开场白 (First Message) <span className="text-red-500">*</span></label>
              <span className="text-[10px] text-zinc-500">非常关键！奠定对话气氛，使用 *描述动作*</span>
            </div>
            <textarea
              required
              rows={3}
              placeholder="例如：*在落满雨滴的卡座里，零正在细细擦拭他发光的等离子刀。微弱的霓虹灯映照出他半边由合金构成的冷漠脸庞。他并未看你，只是一声冷哼，刀锋收入刀鞘，发出悦耳的声音。* &#10;&#10;“又是来打听芯片下落的？在不夜城，知道太多可不是什么好事，朋友。”"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all font-sans resize-none placeholder-zinc-600"
              id="char-first-message-textarea"
            />
          </div>

          {/* Advanced prompt instruction builder */}
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <label className="text-xs font-semibold text-zinc-400">AI 角色专用高级扮演提示词 (System Instructions)</label>
                <button
                  type="button"
                  onClick={handleAutoGeneratePrompt}
                  disabled={!name.trim()}
                  className="px-2 py-0.5 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/20 text-[9px] font-bold rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  id="auto-generate-prompt-btn"
                >
                  🔮 智能一键生成模板
                </button>
              </div>
              <span className="text-[9px] text-zinc-500">控制AI角色的语气规则、对话格式</span>
            </div>
            <textarea
              rows={4}
              placeholder="点击上方‘智能一键生成模板’，或者自己编写：&#10;你现在要完全扮演【零】。这是一个文字角色扮演游戏，请用星号*包裹动作描述，使用简练冷漠的语气..."
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all font-mono resize-none placeholder-zinc-600"
              id="char-system-instruction-textarea"
            />
          </div>

          {/* Footer controls */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
              id="char-modal-cancel-btn"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
              id="char-modal-submit-btn"
            >
              {editingCharacter ? '保存修改' : '保存并放入大厅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
