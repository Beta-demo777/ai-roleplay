import React, {useEffect, useState} from 'react';
import {Gauge, Play, Puzzle, Square, Volume2} from 'lucide-react';
import {FeatureSettings} from '../featureSettings';
import MiddlePanelResizeHandle from './MiddlePanelResizeHandle';
import {useTtsPlayer} from '../tts/useTtsPlayer';

interface ExtensionsDashboardProps {
  settings: FeatureSettings;
  onChange: (settings: FeatureSettings) => void;
  middlePanelWidth: number;
  onMiddlePanelResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export default function ExtensionsDashboard({settings, onChange, middlePanelWidth, onMiddlePanelResizeStart}: ExtensionsDashboardProps) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const update = <K extends keyof FeatureSettings>(key: K, value: FeatureSettings[K]) => onChange({...settings, [key]: value});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const preview = useTtsPlayer(settings);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [supported]);

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#1e1e1e] text-zinc-100" id="extensions-dashboard-root">
      <aside className="flex h-full flex-shrink-0 flex-col border-r border-[#303030] bg-[#171717]" style={{width: middlePanelWidth}}>
        <div className="border-b border-[#303030] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Puzzle size={15} className="text-cyan-400" />功能拓展</div>
          <p className="mt-1.5 text-[10px] leading-4 text-zinc-500">管理可选的浏览器增强能力</p>
        </div>
        <div className="p-2">
          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-3">
            <Volume2 size={15} className="text-cyan-400" />
            <div><p className="text-xs font-semibold">回复语音播放</p><p className="mt-0.5 text-[10px] text-zinc-500">浏览器原生语音合成</p></div>
          </div>
        </div>
      </aside>
      <MiddlePanelResizeHandle onPointerDown={onMiddlePanelResizeStart} />

      <main className="flex min-w-0 flex-1 flex-col bg-[#1f1f1f]">
        <header className="flex h-12 items-center border-b border-[#303030] px-6 text-sm font-semibold">回复语音播放</header>
        <div className="max-w-3xl space-y-5 overflow-y-auto p-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5">
            <SettingRow title="启用语音播放" description="为每条 AI 回复显示播放按钮，并允许浏览器朗读回复内容。">
              <Toggle checked={settings.voicePlaybackEnabled} disabled={!supported} onChange={value => update('voicePlaybackEnabled', value)} />
            </SettingRow>
            <div className="my-5 border-t border-zinc-800" />
            <SettingRow title="自动播放新回复" description="AI 完成一条新回复后自动开始朗读。">
              <Toggle checked={settings.autoPlayAssistantReplies} disabled={!supported || !settings.voicePlaybackEnabled} onChange={value => update('autoPlayAssistantReplies', value)} />
            </SettingRow>
          </section>

          <section className={`space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 ${!settings.voicePlaybackEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Gauge size={14} className="text-cyan-400" />朗读参数</div>
            <Slider label="语速" value={settings.speechRate} min={0.6} max={1.6} step={0.1} disabled={!settings.voicePlaybackEnabled} onChange={value => update('speechRate', value)} />
            <Slider label="音调" value={settings.speechPitch} min={0.5} max={1.5} step={0.1} disabled={!settings.voicePlaybackEnabled} onChange={value => update('speechPitch', value)} />
            <Slider label="音量" value={settings.speechVolume} min={0} max={1} step={0.1} disabled={!settings.voicePlaybackEnabled} onChange={value => update('speechVolume', value)} />
            <label className="block space-y-2 text-xs text-zinc-400">
              <span>朗读内容</span>
              <select value={settings.ttsTextMode} disabled={!settings.voicePlaybackEnabled} onChange={event => update('ttsTextMode', event.target.value as FeatureSettings['ttsTextMode'])} className="field-input disabled:cursor-not-allowed">
                <option value="full">动作与台词完整朗读</option>
                <option value="dialogue-only">仅朗读台词</option>
              </select>
            </label>
            <label className="block space-y-2 text-xs text-zinc-400">
              <span>声音</span>
              <select value={settings.voiceURI} disabled={!settings.voicePlaybackEnabled} onChange={event => update('voiceURI', event.target.value)} className="field-input disabled:cursor-not-allowed">
                <option value="">系统默认声音</option>
                {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
              </select>
            </label>
            <button type="button" disabled={!settings.voicePlaybackEnabled} onClick={() => preview.currentId ? preview.stop() : preview.play('preview', '欢迎来到 Aura，这是当前语音效果的试听内容。')} className="flex items-center gap-2 rounded-lg border border-cyan-500/20 px-4 py-2 text-xs text-cyan-400 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40">
              {preview.currentId ? <Square size={12} /> : <Play size={12} />}{preview.currentId ? '停止试听' : '试听当前声音'}
            </button>
          </section>

          <div className={`rounded-xl border px-4 py-3 text-xs ${supported ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-400' : 'border-amber-500/15 bg-amber-500/5 text-amber-400'}`}>
            {supported ? '当前浏览器支持语音合成。声音类型由操作系统和浏览器提供。' : '当前浏览器不支持语音合成，相关设置已禁用。'}
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingRow({title, description, children}: {title: string; description: string; children: React.ReactNode}) {
  return <div className="flex items-center justify-between gap-6"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p></div>{children}</div>;
}

function Toggle({checked, disabled, onChange}: {checked: boolean; disabled?: boolean; onChange: (value: boolean) => void}) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition ${checked ? 'bg-cyan-500' : 'bg-zinc-700'} disabled:cursor-not-allowed disabled:opacity-40`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} /></button>;
}

function Slider({label, value, min, max, step, disabled, onChange}: {label: string; value: number; min: number; max: number; step: number; disabled: boolean; onChange: (value: number) => void}) {
  return <label className="block"><div className="mb-2 flex justify-between text-xs text-zinc-400"><span>{label}</span><span className="font-mono text-cyan-400">{value.toFixed(1)}</span></div><input type="range" value={value} min={min} max={max} step={step} disabled={disabled} onChange={event => onChange(Number(event.target.value))} className="h-1 w-full cursor-pointer accent-cyan-500 disabled:cursor-not-allowed" /></label>;
}
