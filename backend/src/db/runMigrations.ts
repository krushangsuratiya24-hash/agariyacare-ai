/**
 * Run all incremental migrations on startup.
 * Called from src/index.ts before the server starts accepting requests.
 */

import migrate007 from './migrations/007_marketplace';
import migrate008 from './migrations/008_phase3_offers_transactions';
import migrate009 from './migrations/009_phase4_ai_conversations';

export async function runAllMigrations(): Promise<void> {
  console.log('🔄 Running incremental migrations...');
  await migrate007();
  await migrate008();
  await migrate009();
  console.log('✅ All incremental migrations complete.');
}
