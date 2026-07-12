import { Character, ChatThread, UserProfile } from './types';

export interface PersistedAppState {
  initialized?: boolean;
  profile: UserProfile;
  characters: Character[];
  threads: ChatThread[];
}

const STATE_API_URL = '/backend/api/v1/state';

async function parseResponse(response: Response): Promise<PersistedAppState> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || '应用数据同步失败。');
  }
  return data as PersistedAppState;
}

export async function loadRemoteAppState(): Promise<PersistedAppState> {
  return parseResponse(await fetch(STATE_API_URL));
}

export async function saveRemoteAppState(state: PersistedAppState): Promise<PersistedAppState> {
  return parseResponse(await fetch(STATE_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }));
}
