import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import LucideIcon from './LucideIcon';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const USER_AVATARS = ['User', 'Code', 'Cpu', 'Bot', 'Compass', 'Crown', 'Lightbulb'];

export default function UserProfileModal({ isOpen, onClose, profile, onSave }: UserProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar || 'User');
  const [description, setDescription] = useState(profile.description);
  const [gender, setGender] = useState(profile.gender || '');
  const [personality, setPersonality] = useState(profile.personality || '');
  const [appearance, setAppearance] = useState(profile.appearance || '');

  // Synchronize state when the modal opens or the profile updates
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setAvatar(profile.avatar || 'User');
      setDescription(profile.description);
      setGender(profile.gender || '');
      setPersonality(profile.personality || '');
      setAppearance(profile.appearance || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      avatar: avatar,
      description: description.trim(),
      gender: gender.trim(),
      personality: personality.trim(),
      appearance: appearance.trim(),
    });
    onClose();
  };

  return (
    <div
      className="responsive-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs"
      id="user-profile-modal-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity"
        onClick={onClose}
        id="profile-modal-backdrop"
      />

      {/* Modal Card */}
      <div
        className="responsive-modal-card relative bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300"
        id="profile-modal-card"
      >
        <div className="responsive-modal-header flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="responsive-modal-header-title flex items-center space-x-2">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-500 border border-cyan-500/20">
              <LucideIcon name="Settings" size={18} />
            </div>
            <h3 className="text-base font-semibold font-display tracking-wide">配置我的角色人设</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            id="close-profile-modal-btn"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="responsive-modal-body p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Two column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Basic Bio Identifiers */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-cyan-400 block border-b border-zinc-800 pb-1.5 uppercase tracking-wider">
                👤 基本身份标识
              </span>

              {/* Persona Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">我的扮演大名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例如：旅人 / 冰霜骑士 / 拓荒学者"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600 font-sans"
                  id="user-profile-name-input"
                />
              </div>

              {/* Persona Gender/Honorific */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">我的性别 / 称谓</label>
                <input
                  type="text"
                  placeholder="例如：青年、少女、老学者、骑士大人"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600 font-sans"
                  id="user-profile-gender-input"
                />
              </div>

              {/* Persona Personality */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">我的个性特质</label>
                <input
                  type="text"
                  placeholder="例如：外冷内热、沉默寡言、举止优雅"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600 font-sans"
                  id="user-profile-personality-input"
                />
              </div>

              {/* Persona Appearance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">我的容貌外貌 / 穿着</label>
                <input
                  type="text"
                  placeholder="例如：一袭黑色风衣，佩戴奇特机械手环"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all placeholder-zinc-600 font-sans"
                  id="user-profile-appearance-input"
                />
              </div>
            </div>

            {/* Right Column: Narrative Profile */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-cyan-400 block border-b border-zinc-800 pb-1.5 uppercase tracking-wider">
                📖 背景设定与形象
              </span>

              {/* Persona Background Description */}
              <div className="space-y-1.5">
                <div className="field-heading flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-400">我的背景经历设定 (Bio)</label>
                  <span className="text-[9px] text-zinc-500">来历、目的或立场</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="例如：一个在冰霜大陆游历的年轻骑士，内心坚定，正在寻找失落的古代秘境。在寻找情报的途中偶然来到了这家神秘的小酒馆..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-hidden focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-zinc-100 transition-all font-sans resize-none placeholder-zinc-600 min-h-[96px]"
                  id="user-profile-desc-textarea"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="responsive-modal-actions pt-4 border-t border-zinc-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
              id="cancel-profile-btn"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
              id="submit-profile-btn"
            >
              应用我的设定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
