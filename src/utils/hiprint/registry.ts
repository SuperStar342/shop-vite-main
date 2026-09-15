import { COMMON_MODULE, createCommonProvider } from './providers/common'
import {
  INSTRUCTION_MODULE,
  createInstructionSheetProvider,
} from './providers/instructionSheet'
import { buildInstructionSheetDefaultTemplate } from './templates/instructionSheet'

export async function getHiprintBundle(docTypeCode: string) {
  const { hiprint } = await import('vue-plugin-hiprint')

  if (docTypeCode === 'instruction') {
    return {
      title: '生产指令单',
      providers: [createCommonProvider(hiprint), createInstructionSheetProvider(hiprint)],
      providerModules: [COMMON_MODULE, INSTRUCTION_MODULE],
      defaultTemplate: await buildInstructionSheetDefaultTemplate(),
    }
  }

  return {
    title: docTypeCode,
    providers: [createCommonProvider(hiprint)],
    providerModules: [COMMON_MODULE],
    defaultTemplate: null as unknown,
  }
}
