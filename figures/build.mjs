// 教学插图构建器：把 figures/<name>.preview.ts 打成单文件并用 node 运行，产出 figures/out/<name>.html
// 用法：node figures/build.mjs breadboard-led [--light]
// 说明：几何体写在 src/features/figures/<name>/geometry.ts（纯 TS，浏览器与 Node 共用同一份实现），
//       preview.ts 只负责拼 HTML。这样「模型/几何只有一份」，站点里的 React 组件与离线预览不会漂移。
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const entries = process.argv.slice(2).filter(a => !a.startsWith('--'));
const names = entries.length ? entries : readdirSync(HERE).filter(f => f.endsWith('.preview.ts')).map(f => f.replace('.preview.ts', ''));
const outDir = join(HERE, 'out');
mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const name of names) {
  const entry = join(HERE, `${name}.preview.ts`);
  const bundle = join(ROOT, '.tmp-build', `fig-${name}.mjs`);
  mkdirSync(dirname(bundle), { recursive: true });
  try {
    await build({
      entryPoints: [entry],
      outfile: bundle,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      logLevel: 'warning',
      banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
    });
  } catch {
    failed++;
    continue;
  }
  const res = spawnSync(process.execPath, [bundle, ...process.argv.slice(2).filter(a => a.startsWith('--'))], {
    stdio: 'inherit',
    env: { ...process.env, FIG_OUT: outDir, FIG_ROOT: ROOT },
  });
  if (res.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
