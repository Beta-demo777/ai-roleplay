import {DialogueScenario} from './types';

export function buildScenarioInstruction(scenario?: DialogueScenario): string {
  if (!scenario) return '';
  const fields = [
    `场景名称：${scenario.name}`,
    scenario.description && `场景简介：${scenario.description}`,
    scenario.location && `地点：${scenario.location}`,
    scenario.timePeriod && `时间：${scenario.timePeriod}`,
    scenario.atmosphere && `环境氛围：${scenario.atmosphere}`,
    scenario.worldBackground && `世界背景：${scenario.worldBackground}`,
    scenario.relationship && `角色关系：${scenario.relationship}`,
    scenario.openingContext && `当前开场状态：${scenario.openingContext}`,
    scenario.plotHooks && `可用剧情线索：${scenario.plotHooks}`,
    scenario.sceneRules && `场景规则与边界：${scenario.sceneRules}`,
    scenario.prompt && `场景补充指令：${scenario.prompt}`,
  ].filter(Boolean);
  return `【本次对话场景设定】\n${fields.join('\n')}\n请让场景在对话中持续生效，不要无故改变地点、时间、人物关系或世界规则。`;
}
