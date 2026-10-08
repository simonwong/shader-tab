// Loads the variant registry (src/effects/variants.ts) through Vite so review
// scripts never keep their own copy of the variant list or storage keys.
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const source = path => fileURLToPath(new URL(`../../src/${path}`, import.meta.url));
const load = async path => (await runnerImport(source(path), { configFile: false, logLevel: 'error' })).module;

/**
 * @returns {Promise<{ variantIds: Record<string, string[]>, shuffleKey: (effect: string) => string }>}
 *   variant ids per effect in registry order, and the storage key of an effect's shuffle bag
 */
export async function loadVariants() {
  const [registry, shuffle] = await Promise.all([load('effects/variants.ts'), load('features/preferences/variant-shuffle.ts')]);
  return { variantIds: registry.variantIdsByEffect(), shuffleKey: shuffle.variantShuffleKey };
}
