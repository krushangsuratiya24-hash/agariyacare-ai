// IBM Granite / watsonx AI Provider
// Production implementation — requires IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID

import { AIProvider, AIMessage } from './interface';
import config from '../../config';

export class GraniteAIProvider implements AIProvider {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  isAvailable(): boolean {
    return config.ibm.isConfigured();
  }

  providerName(): string {
    return `IBM Granite (${config.ibm.graniteModel})`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${config.ibm.watsonxApiKey}`,
    });

    if (!response.ok) {
      throw new Error(`IBM IAM token error: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async chat(messages: AIMessage[], systemPrompt?: string): Promise<string> {
    const token = await this.getAccessToken();

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (systemPrompt) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(
      `${config.ibm.watsonxUrl}/ml/v1/text/chat?version=2024-05-01`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: config.ibm.graniteModel,
          project_id: config.ibm.watsonxProjectId,
          messages: formattedMessages,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Granite API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? '';
  }
}
