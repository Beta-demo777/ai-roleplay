import React, {useEffect, useMemo, useState} from 'react';
import {BookOpenText, MapPinned, MessageSquare, Plus, Save, Trash2} from 'lucide-react';
import {Character, DialogueScenario} from '../types';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';
import SearchInput from './SearchInput';

interface ScenariosDashboardProps {
  characters: Character[];
  scenarios: DialogueScenario[];
  onSaveScenario: (scenario: DialogueScenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onStartConversation: (scenario: DialogueScenario) => void;
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

export default function ScenariosDashboard({characters, scenarios, onSaveScenario, onDeleteScenario, onStartConversation, middlePanelWidth, onMiddlePanelResizeStart}: ScenariosDashboardProps) {
  const [selectedId, setSelectedId] = useState(() => scenarios[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<DialogueScenario>(() => emptyScenario(characters));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const selected = scenarios.find(item => item.id === selectedId);
    setDraft(selected ? {...selected} : emptyScenario(characters));
  }, [selectedId, scenarios, characters]);

  useEffect(() => {
    if (selectedId && !scenarios.some(item => item.id === selectedId)) setSelectedId(scenarios[0]?.id || '');
  }, [scenarios, selectedId]);

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
    onSaveScenario(next);
    setSelectedId(next.id);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const createScenario = () => {
    setSelectedId('');
    setDraft(emptyScenario(characters));
  };

  const deleteScenario = () => {
    if (!draft.id || !window.confirm(`确定删除场景「${draft.name}」吗？`)) return;
    onDeleteScenario(draft.id);
  };

  return (
    <div className="management-root" id="scenarios-dashboard-root">
      <aside className="management-sidebar select-none" style={{width: middlePanelWidth}}>
        <div className="border-b border-[#303030]/40 p-4">
          <button onClick={createScenario} className="management-create-button">
            <Plus size={14} /><span>创建对话场景</span>
          </button>
        </div>
        <div className="p-3"><SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="搜索场景、地点或背景..." /></div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`management-list-item ${selectedId === item.id ? 'management-list-item--active' : ''}`}>
              <div className="flex items-center gap-2"><BookOpenText size={14} className={selectedId === item.id ? 'text-cyan-400' : 'text-zinc-600'} /><span className="truncate text-xs font-semibold">{item.name}</span></div>
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-zinc-500">{item.location || item.description || '尚未填写场景设定'}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-12 text-center text-xs leading-5 text-zinc-600">{searchQuery ? '没有匹配的对话场景' : '暂无对话场景'}<br />{searchQuery ? '请尝试其他关键词' : '点击上方按钮开始创建'}</p>}
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      <main className="management-workspace">
        <header className="management-header">
          <div><div className="flex items-center gap-2 text-sm font-semibold"><MapPinned size={15} className="text-cyan-400" />对话场景设定</div><p className="mt-0.5 text-[9px] text-zinc-600">定义故事发生的地点、氛围与世界规则</p></div>
          {saved && <span className="text-xs text-emerald-400">已保存</span>}
        </header>
        <form onSubmit={saveScenario} className="management-content space-y-5">
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
            <div>{draft.id && <button type="button" onClick={deleteScenario} className="ui-button-danger"><Trash2 size={13} />删除场景</button>}</div>
            <div className="flex items-center gap-2">
              {draft.id && <button type="button" onClick={() => onStartConversation(draft)} className="ui-button-secondary border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/10"><MessageSquare size={13} />使用此场景对话</button>}
              <button type="submit" className="ui-button-primary px-5"><Save size={13} />保存场景</button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className="block space-y-2"><span className="text-xs font-semibold text-zinc-300">{label}</span>{children}</label>;
}
