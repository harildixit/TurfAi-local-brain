import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { geminiProxy } from './server/geminiProxy';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    for (const [key, value] of Object.entries(env)) {
      if (!value) continue;
      if (
        key === 'GEMINI_API_KEY' ||
        key.startsWith('VITE_FIREBASE_') ||
        key.startsWith('FIRESTORE_') ||
        key.startsWith('FIREBASE_') ||
        key.startsWith('GOOGLE_') ||
        key.startsWith('GCLOUD_') ||
        key.startsWith('RACING_API_') ||
        key.startsWith('SKYBET_') ||
        key === 'ENABLE_SKYBET_ODDS' ||
        key === 'ENABLE_SKYBET_LOCAL_ODDS' ||
        key === 'USE_LOCAL_GEMINI_HYBRID' ||
        key === 'PREDICTION_GEMINI_MODEL' ||
        key === 'PREDICTION_GEMINI_FALLBACK_MODEL'
      ) {
        process.env[key] ||= value;
      }
    }
    return {
      server: {
        port: 3030,
        host: '127.0.0.1',
        strictPort: true,
      },
      preview: { host: '127.0.0.1', port: 3030, strictPort: true },
      plugins: [react(), geminiProxy()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
