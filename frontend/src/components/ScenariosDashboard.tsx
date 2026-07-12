import React, {useEffect, useMemo, useState} from 'react';
import {BookOpenText, Plus, Save, Search, Target, Trash2} from 'lucide-react';
import {Character} from '../types';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';

const SCENARIOS_STORAGE_KEY = 'aura_training_scenarios_v1';

interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  characterId: string;
  userRole: string;
  aiRole: string;
  objectives: string;
  openingContext: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completionCriteria: string;
}

interface ScenariosDashboardProps {
  characters: Character[];
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const emptyScenario = (characters: Character[]): TrainingScenario => ({
  id: '',
  name: '',
  description: '',
  characterId: characters[0]?.id || '',
  userRole: '',
  aiRole: characters[0]?.name || '',
  objectives: '',
  openingContext: '',
  difficulty: 'beginner',
  completionCriteria: '',
});

function loadScenarios(): TrainingScenario[] {
  try {
    const value = JSON.parse(localStorage.getItem(SCENARIOS_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function ScenariosDashboard({
  characters,
  middlePanelWidth,
  onMiddlePanelResizeStart,
}: ScenariosDashboardProps) {
  const [scenarios, setScenarios] = useState<TrainingScenario[]>(loadScenarios);
  const [selectedId, setSelectedId] = useState(() => loadScenarios()[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<TrainingScenario>(() => emptyScenario(characters));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const selected = scenarios.find(item => item.id === selectedId);
    setDraft(selected ? {...selected} : emptyScenario(characters));
  }, [selectedId, scenarios, characters]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scenarios;
    return scenarios.filter(item => `${item.name} ${item.description} ${item.objectives}`.toLowerCase().includes(query));
  }, [scenarios, searchQuery]);

  const updateDraft = <K extends keyof TrainingScenario>(key: K, value: TrainingScenario[K]) => {
    setDraft(current => ({...current, [key]: value}));
  };

  const saveScenario = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const next = {
      ...draft,
      id: draft.id || `scenario-${Date.now()}`,
      name: draft.name.trim(),
    };
    const updated = scenarios.some(item => item.id === next.id)
      ? scenarios.map(item => item.id === next.id ? next : item)
      : [next, ...scenarios];
    setScenarios(updated);
    setSelectedId(next.id);
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(updated));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const createScenario = () => {
    setSelectedId('');
    setDraft(emptyScenario(characters));
  };

  const deleteScenario = () => {
    if (!draft.id || !window.confirm(`确定删除场景「${draft.name}」吗？`)) return;
    const updated = scenarios.filter(item => item.id !== draft.id);
    setScenarios(updated);
    setSelectedId(updated[0]?.id || '');
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#1e1e1e] text-zinc-100" id="scenarios-dashboard-root">
      <aside className="flex h-full flex-shrink-0 select-none flex-col overflow-hidden border-r border-[#303030] bg-[#171717]" style={{width: middlePanelWidth}}>
        <div className="border-b border-[#303030]/40 p-4">
          <button onClick={createScenario} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/10">
            <Plus size={14} />
            <span>创建训练场景</span>
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={13} />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="搜索场景..." className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs outline-none focus:border-cyan-500/40" />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedId === item.id ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-transparent hover:bg-zinc-900'}`}>
              <div className="flex items-center gap-2">
                <BookOpenText size={14} className={selectedId === item.id ? 'text-cyan-400' : 'text-zinc-600'} />
                <span className="truncate text-xs font-semibold">{item.name}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-zinc-500">{item.description || '尚未填写场景说明'}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-12 text-center text-xs leading-5 text-zinc-600">暂无训练场景<br />点击上方按钮开始创建</p>}
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      <main className="flex h-full min-w-0 flex-1 flex-col bg-[#1f1f1f]">
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#303030] px-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Target size={15} className="text-cyan-400" />场景管理</div>
          {saved && <span className="text-xs text-emerald-400">已保存</span>}
        </header>
        <form onSubmit={saveScenario} className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="场景名称"><input required value={draft.name} onChange={event => updateDraft('name', event.target.value)} placeholder="例如：技术面试模拟" className="field-input" /></Field>
            <Field label="难度等级"><select value={draft.difficulty} onChange={event => updateDraft('difficulty', event.target.value as TrainingScenario['difficulty'])} className="field-input"><option value="beginner">初级</option><option value="intermediate">中级</option><option value="advanced">高级</option></select></Field>
          </div>
          <Field label="场景说明"><textarea value={draft.description} onChange={event => updateDraft('description', event.target.value)} rows={3} placeholder="说明训练用途、背景和适用对象" className="field-input resize-none" /></Field>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="关联角色"><select value={draft.characterId} onChange={event => { const id = event.target.value; updateDraft('characterId', id); updateDraft('aiRole', characters.find(item => item.id === id)?.name || draft.aiRole); }} className="field-input"><option value="">不指定角色</option>{characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></Field>
            <Field label="用户扮演身份"><input value={draft.userRole} onChange={event => updateDraft('userRole', event.target.value)} placeholder="例如：应聘后端开发岗位的候选人" className="field-input" /></Field>
          </div>
          <Field label="AI 扮演身份"><input value={draft.aiRole} onChange={event => updateDraft('aiRole', event.target.value)} placeholder="例如：资深技术面试官" className="field-input" /></Field>
          <Field label="训练目标"><textarea value={draft.objectives} onChange={event => updateDraft('objectives', event.target.value)} rows={4} placeholder="每行填写一个目标，例如：清晰介绍项目经历" className="field-input resize-none" /></Field>
          <Field label="开场条件"><textarea value={draft.openingContext} onChange={event => updateDraft('openingContext', event.target.value)} rows={3} placeholder="描述对话开始时双方已知的信息和环境" className="field-input resize-none" /></Field>
          <Field label="结束条件"><textarea value={draft.completionCriteria} onChange={event => updateDraft('completionCriteria', event.target.value)} rows={3} placeholder="例如：完成三轮核心问题并给出总结" className="field-input resize-none" /></Field>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-5">
            <div>{draft.id && <button type="button" onClick={deleteScenario} className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10"><Trash2 size={13} />删除场景</button>}</div>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"><Save size={13} />保存场景</button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className="block space-y-2"><span className="text-xs font-semibold text-zinc-300">{label}</span>{children}</label>;
}
