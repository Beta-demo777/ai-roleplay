export interface Character {
  id: string;
  name: string;
  tagline: string;
  avatar: string; // Icon or avatar URL/designator
  category: 'fantasy' | 'cyberpunk' | 'mystery' | 'sliceoflife' | 'custom';
  personality: string; // Core character background, traits, speech habits
  scenario: string; // The current environment or circumstance (e.g. "We meet in a rainy cafe")
  firstMessage: string; // The introductory dialogue & narrative
  systemInstruction: string; // Custom instructions injected to model (Tavern style prompt)
  isCustom?: boolean;
  starters?: string[];
}

export interface UserProfile {
  name: string;
  avatar: string; // Icon name e.g. 'User', 'Bot', 'Cpu', 'Crown'
  description: string; // User background for roleplay
  gender?: string; // 性别/尊称
  personality?: string; // 个性特质
  appearance?: string; // 容貌外表
}

export interface DialogueScenario {
  id: string;
  name: string;
  description: string;
  characterId?: string;
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

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  characterId: string;
  scenarioId?: string;
  title: string;
  messages: Message[];
  timestamp: number;
}
