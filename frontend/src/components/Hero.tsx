import LucideIcon from './LucideIcon';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenCharacterModal: () => void;
  onOpenProfileModal: () => void;
  isModelServiceConfigured: boolean;
  userProfileName: string;
}

export default function Hero({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onOpenCharacterModal,
  onOpenProfileModal,
  isModelServiceConfigured,
  userProfileName
}: HeroProps) {
  const categories = [
    { id: 'all', label: '全部角色', icon: 'Compass' },
    { id: 'fantasy', label: '奇幻魔幻', icon: 'Crown' },
    { id: 'cyberpunk', label: '赛博科幻', icon: 'Cpu' },
    { id: 'mystery', label: '悬疑智慧', icon: 'Code' },
    { id: 'sliceoflife', label: '生活日常', icon: 'Languages' },
    { id: 'custom', label: '自创角色', icon: 'Bot' }
  ];

  return (
    <div className="space-y-5 bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-2xl relative overflow-hidden" id="tavern-hero-container">
      {/* Visual background atmospheric lights */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400 font-mono">
              AURA AI · 智能角色大厅
            </span>
          </div>

          {/* API Connection Indicator */}
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-full">
            <div className={`h-1.5 w-1.5 rounded-full ${isModelServiceConfigured ? 'bg-emerald-500' : 'bg-amber-500'} pulse-ring-element`} />
            <span className="text-[9px] font-mono font-semibold text-zinc-400">
              模型服务：{isModelServiceConfigured ? '已配置' : '未配置'}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-zinc-100 font-display">
            沉浸式 AI 角色扮演与对话大厅
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1">
            欢迎使用 Aura AI 智能角色平台。在这里，你可以同来自不同专业、背景和维面的 AI 角色展开深度的对话，或者通过 *动作肢体语言描写* 体验最极致的沉浸式小说级角色扮演。
          </p>
        </div>

        {/* Buttons: Custom Character & User Profile settings */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* User profile configure */}
          <button
            onClick={onOpenProfileModal}
            className="flex items-center space-x-1 px-3.5 py-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/25 rounded-xl transition-all cursor-pointer"
            id="open-profile-btn"
            title="定制你的角色扮演设定"
          >
            <LucideIcon name="User" size={13} />
            <span>我是「{userProfileName}」</span>
          </button>

          {/* Create custom character card */}
          <button
            onClick={onOpenCharacterModal}
            className="flex items-center space-x-1 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all shadow-md shadow-cyan-500/10 active:scale-95 cursor-pointer"
            id="create-custom-character-btn"
          >
            <LucideIcon name="Plus" size={13} />
            <span>自创全新 AI 角色</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="relative z-10 space-y-3 pt-4 border-t border-zinc-800/60" id="tavern-toolbar">
        {/* Search Input */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
            <LucideIcon name="Search" size={12} />
          </div>
          <input
            type="text"
            placeholder="搜寻你专属的 AI 角色设定（名称或特征）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 text-zinc-100 transition-all placeholder-zinc-600"
            id="tavern-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300"
              id="clear-tavern-search"
            >
              <LucideIcon name="X" size={11} />
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 border-cyan-500 text-zinc-950 font-bold'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              id={`category-pill-${cat.id}`}
            >
              <LucideIcon name={cat.icon} size={11} className={selectedCategory === cat.id ? 'text-zinc-950' : 'text-zinc-500'} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
