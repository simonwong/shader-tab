import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

const fallbacks: Record<string, string> = {
  '@react-three/fiber': 'public/licenses/react-three-fiber.txt',
  '@shadergradient/react': 'public/licenses/shader-gradient.txt',
};
interface PackageInfo { name: string; version: string; license?: string }
async function owner(file: string): Promise<{ directory: string; info: PackageInfo }> {
  let directory = dirname(file);
  while (directory !== dirname(directory)) {
    try {
      const info = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as PackageInfo;
      if (info.name && info.version) return { directory, info };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    directory = dirname(directory);
  }
  throw new Error(`Cannot identify bundled dependency: ${file}`);
}
export function bundledLicenses(): Plugin {
  return {
    name: 'shader-tab-bundled-licenses',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const modules = new Set(Object.values(bundle).flatMap(chunk => chunk.type === 'chunk'
        ? Object.entries(chunk.modules).filter(([, value]) => value.renderedLength > 0).map(([id]) => id) : []));
      const packages = new Map<string, { directory: string; info: PackageInfo }>();
      for (const id of modules) {
        if (!id.includes('/node_modules/') || id.startsWith('\0')) continue;
        const dependency = await owner(id.split('?')[0]!);
        packages.set(`${dependency.info.name}@${dependency.info.version}`, dependency);
      }
      if (![...packages.values()].some(value => value.info.name === 'react')) throw new Error('Bundled dependency inventory is incomplete: React missing');
      for (const [name, version] of Object.entries({ '@shadergradient/react': '2.4.20', '@react-three/fiber': '9.7.0' })) {
        const dependency = [...packages.values()].find(value => value.info.name === name);
        if (dependency && dependency.info.version !== version) throw new Error(`Review embedded dependency notices before upgrading ${name}`);
      }
      const missing = [];
      const inventory = [];
      const sections = [];
      for (const [key, { directory, info }] of [...packages].toSorted(([a], [b]) => a.localeCompare(b))) {
        const files = (await readdir(directory)).filter(file => /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(file)).toSorted();
        const texts = await Promise.all(files.map(async file => `${file}\n${await readFile(join(directory, file), 'utf8')}`));
        if (!texts.length && fallbacks[info.name]) texts.push(await readFile(resolve(fallbacks[info.name]!), 'utf8'));
        if (!texts.length) { missing.push(key); continue; }
        const text = texts.join('\n\n').trimEnd() + '\n';
        inventory.push({ name: info.name, version: info.version, license: info.license ?? 'See license text', sha256: createHash('sha256').update(text).digest('hex') });
        sections.push(`${key}\nLicense: ${info.license ?? 'See license text'}\n\n${text}`);
      }
      if (missing.length) throw new Error(`No license text for bundled dependencies: ${missing.join(', ')}`);
      this.emitFile({ type: 'asset', fileName: 'licenses/dependencies.txt', source: `Shader Tab — bundled third-party dependencies\n\n${sections.join('\n\n' + '='.repeat(72) + '\n\n')}\n` });
      this.emitFile({ type: 'asset', fileName: 'licenses/dependencies.json', source: JSON.stringify(inventory, null, 2) + '\n' });
    },
  };
}
