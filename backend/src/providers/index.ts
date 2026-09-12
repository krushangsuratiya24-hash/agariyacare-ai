// AI Provider factory — selects GraniteAIProvider when configured, else DevelopmentAIProvider

import { AIProvider } from './ai/interface';
import { GraniteAIProvider } from './ai/granite.provider';
import { DevelopmentAIProvider } from './ai/development.provider';
import config from '../config';

let _aiProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_aiProvider) {
    const granite = new GraniteAIProvider();
    if (config.ibm.isConfigured()) {
      console.log('[AI] Using IBM Granite provider');
      _aiProvider = granite;
    } else {
      console.log('[AI] IBM credentials not configured — using Development AI provider');
      _aiProvider = new DevelopmentAIProvider();
    }
  }
  return _aiProvider;
}
