import {useEffect, useRef, useState} from 'react';
import {FeatureSettings} from '../featureSettings';
import {normalizeTtsText, splitTtsText} from './text';

export function useTtsPlayer(settings: FeatureSettings) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const generationRef = useRef(0);

  const stop = () => {
    generationRef.current += 1;
    window.speechSynthesis?.cancel();
    setCurrentId(null);
    setPaused(false);
  };

  const play = (id: string, content: string) => {
    if (!settings.voicePlaybackEnabled || !('speechSynthesis' in window)) return;
    stop();
    const chunks = splitTtsText(normalizeTtsText(content, settings.ttsTextMode));
    if (chunks.length === 0) return;
    const generation = generationRef.current;
    const voice = window.speechSynthesis.getVoices().find(item => item.voiceURI === settings.voiceURI);
    setCurrentId(id);

    const speakChunk = (index: number) => {
      if (generation !== generationRef.current || index >= chunks.length) {
        if (generation === generationRef.current) setCurrentId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice?.lang || 'zh-CN';
      if (voice) utterance.voice = voice;
      utterance.rate = settings.speechRate;
      utterance.pitch = settings.speechPitch;
      utterance.volume = settings.speechVolume;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => {
        if (generation === generationRef.current) setCurrentId(null);
      };
      window.speechSynthesis.speak(utterance);
    };
    speakChunk(0);
  };

  const togglePause = () => {
    if (!currentId) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  useEffect(() => stop, []);
  useEffect(() => {
    if (!settings.voicePlaybackEnabled) stop();
  }, [settings.voicePlaybackEnabled]);

  return {currentId, paused, play, stop, togglePause};
}
