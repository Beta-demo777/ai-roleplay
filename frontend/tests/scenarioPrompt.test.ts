import assert from 'node:assert/strict';
import test from 'node:test';
import {buildScenarioInstruction} from '../src/scenarioPrompt';

test('builds a complete dialogue scenario instruction', () => {
  const result = buildScenarioInstruction({
    id: 'scene-1',
    name: '雨夜酒馆',
    description: '一次秘密会面',
    location: '旧城区酒馆',
    timePeriod: '午夜',
    atmosphere: '昏暗安静',
    worldBackground: '城市由企业控制',
    relationship: '双方第一次见面',
    openingContext: '角色正在擦拭酒杯',
    plotHooks: '失踪的芯片',
    sceneRules: '不能离开酒馆',
    prompt: '缓慢披露秘密',
  });
  assert.match(result, /本次对话场景设定/);
  assert.match(result, /地点：旧城区酒馆/);
  assert.match(result, /角色关系：双方第一次见面/);
  assert.match(result, /场景补充指令：缓慢披露秘密/);
});

test('returns no instruction when a thread has no scenario', () => {
  assert.equal(buildScenarioInstruction(), '');
});
