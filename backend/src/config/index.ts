import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  ibm: {
    watsonxApiKey: process.env.IBM_WATSONX_API_KEY || '',
    watsonxProjectId: process.env.IBM_WATSONX_PROJECT_ID || '',
    watsonxUrl: process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
    graniteModel: process.env.IBM_GRANITE_MODEL || 'ibm/granite-13b-chat-v2',
    isConfigured(): boolean {
      return !!(this.watsonxApiKey && this.watsonxProjectId);
    },
  },

  database: {
    url: process.env.DATABASE_URL || '',
    isConfigured(): boolean {
      return !!this.url;
    },
  },

  weather: {
    apiKey: process.env.WEATHER_API_KEY || '',
    isConfigured(): boolean {
      return !!this.apiKey;
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  },
} as const;

export default config;
