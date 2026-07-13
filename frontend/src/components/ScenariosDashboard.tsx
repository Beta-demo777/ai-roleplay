import React, {useEffect, useMemo, useState} from 'react';
import {BookOpenText, MapPinned, Plus, Save, Search, Trash2} from 'lucide-react';
import {Character} from '../types';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';

const SCENARIOS_STORAGE_KEY = 'aura_dialogue_scenarios_v2';
const LEGACY_SCENARIOS_STORAGE_KEY = 'aura_training_scenarios_v1';

interface DialogueScenario {
  id: string;
  name: string;
  description: string;
  characterId: string;
  location: string;
  timePeriod: string;
  atmosphere: string;
  worldBackground: string;
  relationship: string;
  openingContext: string;
  plotHooks: string;
  sceneRules: string;
  prompt: string;
}

interface LegacyTrainingScenario {
  id?: string;
  name?: string;
  description?: string;
  characterId?: string;
  userRole?: string;
  aiRole?: string;
  objectives?: string;
  openingContext?: string;
  completionCriteria?: string;
}

interface ScenariosDashboardProps {
  characters: Character[];
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const emptyScenario = (characters: Character[]): DialogueScenario => ({
  id: '',
  name: '',
  description: '',
  characterId: characters[0]?.id || '',
  location: '',
  timePeriod: '',
  atmosphere: '',
  worldBackground: '',
  relationship: '',
  openingContext: '',
  plotHooks: '',
  sceneRules: '',
  prompt: '',
});

function migrateLegacyScenario(item: LegacyTrainingScenario): DialogueScenario {
  const relationship = [
    item.userRole ? `用户身份：${item.userRole}` : '',
    item.aiRole ? `角色身份：${item.aiRole}` : '',
  ].filter(Boolean).join('\n');
  return {
    id: item.id || `scenario-${Date.now()}`,
    name: item.name || '未命名场景',
    description: item.description || '',
    characterId: item.characterId || '',
    location: '',
    timePeriod: '',
    atmosphere: '',
    worldBackground: '',
    relationship,
    openingContext: item.openingContext || '',
    plotHooks: item.objectives || '',
    sceneRules: item.completionCriteria || '',
    prompt: '',
  };
}

function loadScenarios(): DialogueScenario[] {
  try {
    const current = JSON.parse(localStorage.getItem(SCENARIOS_STORAGE_KEY) || '[]');
    if (Array.isArray(current) && current.length > 0) return current;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SCENARIOS_STORAGE_KEY) || '[]');
    if (!Array.isArray(legacy) || legacy.length === 0) return [];
    const migrated = legacy.map(migrateLegacyScenario);
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_SCENARIOS_STORAGE_KEY);
    return migrated;
  } catch {
    return [];
  }
}

export default function ScenariosDashboard({characters, middlePanelWidth, onMiddlePanelResizeStart}: ScenariosDashboardProps) {
  const [scenarios, setScenarios] = useState<DialogueScenario[]>(loadScenarios);
  const [selectedId, setSelectedId] = useState(() => loadScenarios()[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<DialogueScenario>(() => emptyScenario(characters));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const selected = scenarios.find(item => item.id === selectedId);
    setDraft(selected ? {...selected} : emptyScenario(characters));
  }, [selectedId, scenarios, characters]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scenarios;
    return scenarios.filter(item => `${item.name} ${item.description} ${item.location} ${item.worldBackground} ${item.plotHooks}`.toLowerCase().includes(query));
  }, [scenarios, searchQuery]);

  const updateDraft = <K extends keyof DialogueScenario>(key: K, value: DialogueScenario[K]) => {
    setDraft(current => ({...current, [key]: value}));
  };

  const saveScenario = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const next = {...draft, id: draft.id || `scenario-${Date.now()}`, name: draft.name.trim()};
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
            <Plus size={14} /><span>创建对话场景</span>
          </button>
        </div>
        <div className="p-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={13} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="搜索场景、地点或背景..." className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs outline-none focus:border-cyan-500/40" /></div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedId === item.id ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-transparent hover:bg-zinc-900'}`}>
              <div className="flex items-center gap-2"><BookOpenText size={14} className={selectedId === item.id ? 'text-cyan-400' : 'text-zinc-600'} /><span className="truncate text-xs font-semibold">{item.name}</span></div>
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-zinc-500">{item.location || item.description || '尚未填写场景设定'}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-12 text-center text-xs leading-5 text-zinc-600">暂无对话场景<br />点击上方按钮开始创建</p>}
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      <main className="flex h-full min-w-0 flex-1 flex-col bg-[#1f1f1f]">
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#303030] px-5">
          <div><div className="flex items-center gap-2 text-sm font-semibold"><MapPinned size={15} className="text-cyan-400" />对话场景设定</div><p className="mt-0.5 text-[9px] text-zinc-600">定义故事发生的地点、氛围与世界规则</p></div>
          {saved && <span className="text-xs text-emerald-400">已保存</span>}
        </header>
        <form onSubmit={saveScenario} className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="场景名称"><input required value={draft.name} onChange={event => updateDraft('name', event.target.value)} placeholder="例如：雨夜的旧城区酒馆" className="field-input" /></Field>
            <Field label="关联角色"><select value={draft.characterId} onChange={event => updateDraft('characterId', event.target.value)} className="field-input"><option value="">适用于所有角色</option>{characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></Field>
          </div>
          <Field label="场景简介"><textarea value={draft.description} onChange={event => updateDraft('description', event.target.value)} rows={2} placeholder="用一句话概括这个对话场景" className="field-input resize-none" /></Field>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="地点"><input value={draft.location} onChange={event => updateDraft('location', event.target.value)} placeholder="例如：旧城区地下酒馆二层包厢" className="field-input" /></Field>
            <Field label="时间"><input value={draft.timePeriod} onChange={event => updateDraft('timePeriod', event.target.value)} placeholder="例如：雨季深夜，凌晨一点" className="field-input" /></Field>
          </div>
          <Field label="环境与氛围"><textarea value={draft.atmosphere} onChange={event => updateDraft('atmosphere', event.target.value)} rows={3} placeholder="光线、天气、声音、气味，以及整体情绪氛围" className="field-input resize-none" /></Field>
          <Field label="世界背景"><textarea value={draft.worldBackground} onChange={event => updateDraft('worldBackground', event.target.value)} rows={4} placeholder="描述当前世界、时代、社会环境和与对话有关的背景信息" className="field-input resize-none" /></Field>
          <Field label="角色关系"><textarea value={draft.relationship} onChange={event => updateDraft('relationship', event.target.value)} rows={3} placeholder="描述用户与 AI 角色的身份、关系和彼此已知的信息" className="field-input resize-none" /></Field>
          <Field label="开场状态"><textarea value={draft.openingContext} onChange={event => updateDraft('openingContext', event.target.value)} rows={3} placeholder="对话开始时正在发生什么，双方为何在这里相遇" className="field-input resize-none" /></Field>
          <Field label="剧情引子"><textarea value={draft.plotHooks} onChange={event => updateDraft('plotHooks', event.target.value)} rows={3} placeholder="可供角色主动提及的事件、秘密、冲突或话题线索" className="field-input resize-none" /></Field>
          <Field label="场景规则与边界"><textarea value={draft.sceneRules} onChange={event => updateDraft('sceneRules', event.target.value)} rows={3} placeholder="角色在此场景中应遵守的世界规则、行为限制和内容边界" className="field-input resize-none" /></Field>
          <Field label="场景补充提示词"><textarea value={draft.prompt} onChange={event => updateDraft('prompt', event.target.value)} rows={5} placeholder="注入对话 Prompt 的补充指令，例如叙事风格、信息披露节奏和场景演绎要求" className="field-input resize-none font-mono" /></Field>
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
