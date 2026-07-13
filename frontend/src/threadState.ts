import {ChatThread} from './types';

export function mergeChatThreads(localThreads: ChatThread[], remoteThreads: ChatThread[]): ChatThread[] {
  const merged = new Map(remoteThreads.map(thread => [thread.id, thread]));
  for (const local of localThreads) {
    const remote = merged.get(local.id);
    const localIsNewer = !remote
      || local.timestamp > remote.timestamp
      || (local.timestamp === remote.timestamp && local.messages.length > remote.messages.length);
    if (localIsNewer) merged.set(local.id, local);
  }
  return [...merged.values()].sort((left, right) => right.timestamp - left.timestamp);
}
