import { execSync } from 'child_process';
import fs from 'fs';
import glob from 'glob';
import { rimrafSync } from 'rimraf';
import path from 'path';

try {
  // 1️⃣ Build Python wheel
  console.log('🔹 Building wheel...');
  rimrafSync(path.join('dist'));
  execSync('python -m build --no-isolation -w', { stdio: 'inherit' });

  // 2️⃣ Rename wheel
  console.log('🔹 Renaming wheel...');
  const files = glob.sync('dist/jupyterpack-*.whl');
  if (files.length === 0) throw new Error('No wheel file found in dist/');
  if (files.length > 1)
    throw new Error('Multiple wheel files found: ' + files.join(', '));

  const srcWheel = files[0];
  const destWheel = path.join('dist', 'jupyterpack-0.0.0-py3-none-any.whl');
  fs.renameSync(srcWheel, destWheel);
  console.log(`✅ Renamed ${srcWheel} → ${destWheel}`);

  // 3️⃣ Clean demo folder
  console.log('🔹 Cleaning demo folder...');
  const demoDir = 'demo';
  rimrafSync(path.join(demoDir, '.jupyterlite.doit.db'));
  rimrafSync(path.join(demoDir, '_output'));
  console.log('✅ Cleaned demo folder');

  // 4️⃣ Build Jupyter Lite in demo
  console.log('🔹 Building Jupyter Lite...');
  execSync('jupyter lite build .', { cwd: demoDir, stdio: 'inherit' });
  console.log('✅ Demo build complete');
} catch (err) {
  console.error('❌ Build failed:', err);
  process.exit(1);
}
