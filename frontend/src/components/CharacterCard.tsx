import { Character } from '../types';
import LucideIcon from './LucideIcon';

interface CharacterCardProps {
  key?: string | number;
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: (character: Character) => void;
  onDelete?: (id: string) => void;
}

export default function CharacterCard({ character, isSelected, onSelect, onEdit, onDelete }: CharacterCardProps) {
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'fantasy':
        return {
          border: 'border-emerald-500/10 hover:border-emerald-500/40',
          glow: 'group-hover:bg-emerald-500/5',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          label: '🧙‍♂️ 奇幻魔法'
        };
      case 'cyberpunk':
        return {
          border: 'border-cyan-500/10 hover:border-cyan-500/40',
          glow: 'group-hover:bg-cyan-500/5',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
          label: '🌆 赛博朋克'
        };
      case 'mystery':
        return {
          border: 'border-rose-500/10 hover:border-rose-500/40',
          glow: 'group-hover:bg-rose-500/5',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          label: '🕵️‍♂️ 悬疑推理'
        };
      case 'sliceoflife':
        return {
          border: 'border-amber-500/10 hover:border-amber-500/40',
          glow: 'group-hover:bg-amber-500/5',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          label: '☕ 都市日常'
        };
      case 'custom':
      default:
        return {
          border: 'border-purple-500/10 hover:border-purple-500/40',
          glow: 'group-hover:bg-purple-500/5',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
          label: '✨ 自定义'
        };
    }
  };

  const style = getCategoryStyles(character.category);

  return (
    <div
      className={`group relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300 bg-zinc-900 ${
        isSelected
          ? 'border-cyan-500/60 bg-zinc-800/80 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/30'
          : `border-zinc-800 hover:bg-zinc-850/60 ${style.border} hover:shadow-md`
      }`}
      onClick={onSelect}
      id={`character-card-${character.id}`}
    >
      {/* Glow Effect Backlight */}
      <div className={`absolute inset-0 rounded-2xl opacity-50 transition-colors duration-300 pointer-events-none ${style.glow}`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl border ${style.bg} transition-all duration-300 group-hover:scale-105`}>
            <LucideIcon name={character.avatar} size={18} />
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Custom Edit and Delete controls */}
            {character.isCustom && (
              <div className="flex items-center space-x-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(character);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-400 p-1 rounded-md hover:bg-zinc-800 transition-all cursor-pointer"
                    title="修改设定"
                    id={`edit-char-btn-${character.id}`}
                  >
                    <LucideIcon name="Settings" size={11} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(character.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-400 p-1 rounded-md hover:bg-zinc-800 transition-all cursor-pointer"
                    title="删除角色"
                    id={`delete-char-btn-${character.id}`}
                  >
                    <LucideIcon name="Trash2" size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name and Tagline */}
        <h4 className="font-semibold text-zinc-100 mt-3 font-display tracking-wide text-sm flex items-center justify-between">
          <span>{character.name}</span>
          {isSelected && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 pulse-ring-element" />
          )}
        </h4>

        <p className="text-xs text-zinc-400 mt-1.5 font-sans leading-relaxed line-clamp-2">
          {character.tagline}
        </p>
      </div>

      {/* Suggested prompts footer hint */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="truncate italic max-w-[85%]">
          "{character.firstMessage.split('\n').filter(Boolean)[1] || character.firstMessage.split('\n')[0] || character.firstMessage}"
        </span>
        <LucideIcon name="ArrowRight" size={10} className="text-zinc-600 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
      </div>
    </div>
  );
}
