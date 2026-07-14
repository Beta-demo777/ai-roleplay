import React, {useEffect, useState} from 'react';
import {CheckCircle2, Plus, Save, Trash2, UserRound} from 'lucide-react';
import {UserProfile} from '../types';
import LucideIcon from './LucideIcon';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';
import SearchInput from './SearchInput';

const AVATARS = ['User', 'Code', 'Cpu', 'Bot', 'Compass', 'Crown', 'Lightbulb'];

interface PersonasDashboardProps {
  personas: UserProfile[];
  activePersonaId: string;
  onSave: (persona: UserProfile, makeActive: boolean) => void;
  onDelete: (personaId: string) => void;
  onSetActive: (personaId: string) => void;
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const emptyPersona = (): UserProfile => ({id: '', name: '', avatar: 'User', description: '', gender: '', personality: '', appearance: ''});

export default function PersonasDashboard({personas, activePersonaId, onSave, onDelete, onSetActive, middlePanelWidth, onMiddlePanelResizeStart}: PersonasDashboardProps) {
  const [selectedId, setSelectedId] = useState(activePersonaId || personas[0]?.id || '');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<UserProfile>(emptyPersona);
  const [isNew, setIsNew] = useState(false);
  const selected = personas.find(item => item.id === selectedId);

  useEffect(() => {
    if (isNew) return;
    const next = personas.find(item => item.id === selectedId) || personas[0];
    if (next) {
      setSelectedId(next.id || '');
      setDraft({...next});
    }
  }, [personas, selectedId, isNew]);

  const filtered = personas.filter(item => `${item.name} ${item.description} ${item.personality || ''}`.toLowerCase().includes(search.toLowerCase()));
  const update = (key: keyof UserProfile, value: string) => setDraft(current => ({...current, [key]: value}));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const persona = {...draft, id: draft.id || `persona-${Date.now()}`, name: draft.name.trim()};
    onSave(persona, isNew);
    setSelectedId(persona.id || '');
    setIsNew(false);
  };

  return <div className="management-root">
    <aside className="management-sidebar" style={{width: middlePanelWidth}}>
      <div className="border-b border-[#303030]/40 p-4"><button onClick={() => {setIsNew(true); setSelectedId(''); setDraft(emptyPersona());}} className="management-create-button"><Plus size={14} />创建新的人设</button></div>
      <div className="p-3"><SearchInput value={search} onChange={setSearch} placeholder="搜索人设..." /></div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">{filtered.map(persona => <button key={persona.id} onClick={() => {setSelectedId(persona.id || ''); setIsNew(false);}} className={`management-list-item flex items-center gap-2.5 ${!isNew && selectedId === persona.id ? 'management-list-item--active' : ''}`}><div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"><LucideIcon name={persona.avatar} size={12} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{persona.name}</p><p className="mt-0.5 truncate text-[9px] text-zinc-500">{persona.description || '尚未填写背景'}</p></div>{persona.id === activePersonaId && <CheckCircle2 size={13} className="text-emerald-400" />}</button>)}{filtered.length === 0 && <p className="px-4 py-12 text-center text-xs leading-5 text-zinc-600">{search ? '没有匹配的人设' : '暂无人设'}<br />{search ? '请尝试其他关键词' : '点击上方按钮开始创建'}</p>}</div>
    </aside>
    <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />
    <main className="management-workspace">
      <header className="management-header"><div className="flex min-w-0 items-center gap-2 text-sm font-semibold"><UserRound size={15} className="flex-shrink-0 text-cyan-400" /><span className="truncate">{isNew ? '创建我的人设' : `编辑人设 · ${draft.name}`}</span></div>{selected?.id === activePersonaId && <span className="header-status-badge flex-shrink-0 text-[10px] text-emerald-400">当前默认人设</span>}</header>
      <form onSubmit={submit} className="management-content max-w-3xl space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field label="人设名称"><input required value={draft.name} onChange={event => update('name', event.target.value)} placeholder="例如：冰霜骑士" className="field-input" /></Field><Field label="性别 / 称谓"><input value={draft.gender || ''} onChange={event => update('gender', event.target.value)} placeholder="例如：青年骑士" className="field-input" /></Field></div>
        <Field label="头像"><div className="flex flex-wrap gap-2">{AVATARS.map(icon => <button key={icon} type="button" onClick={() => update('avatar', icon)} className={`flex h-9 w-9 items-center justify-center rounded-lg border ${draft.avatar === icon ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-800 bg-zinc-950 text-zinc-500'}`}><LucideIcon name={icon} size={14} /></button>)}</div></Field>
        <Field label="个性特质"><input value={draft.personality || ''} onChange={event => update('personality', event.target.value)} placeholder="例如：外冷内热、谨慎、重视承诺" className="field-input" /></Field>
        <Field label="外貌与穿着"><textarea value={draft.appearance || ''} onChange={event => update('appearance', event.target.value)} rows={3} placeholder="描述外貌、服装和随身物品" className="field-input resize-none" /></Field>
        <Field label="背景经历、目标与立场"><textarea value={draft.description} onChange={event => update('description', event.target.value)} rows={6} placeholder="描述来历、经历、当前目标，以及希望角色如何认识你" className="field-input resize-none" /></Field>
        <div className="management-actions border-t border-zinc-800 pt-5"><div>{!isNew && selected && personas.length > 1 && <button type="button" onClick={() => selected.id && window.confirm(`确定删除人设「${selected.name}」吗？相关对话将改用当前人设。`) && onDelete(selected.id)} className="ui-button-danger"><Trash2 size={13} />删除人设</button>}</div><div className="management-actions-group">{!isNew && selected && selected.id !== activePersonaId && <button type="button" onClick={() => selected.id && onSetActive(selected.id)} className="ui-button-secondary border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">设为当前人设</button>}<button type="submit" className="ui-button-primary px-5"><Save size={13} />保存人设</button></div></div>
      </form>
    </main>
  </div>;
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className="block space-y-2"><span className="text-xs font-semibold text-zinc-300">{label}</span>{children}</label>;
}
