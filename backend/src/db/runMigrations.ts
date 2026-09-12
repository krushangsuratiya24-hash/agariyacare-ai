/**
 * Run all incremental migrations on startup.
 * Called from src/index.ts before the server starts accepting requests.
 */

import migrate007 from './migrations/007_marketplace';
import migrate008 from './migrations/008_phase3_offers_transactions';

export async function runAllMigrations(): Promise<void> {
  console.log('🔄 Running incremental migrations...');
  await migrate007();
  await migrate008();
  console.log('✅ All incremental migrations complete.');
}
