import fs from 'fs';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import * as tar from 'tar';

function updateFederatedExtension(inputDir, jsonFilePath) {
  // 1. Find the remoteEntry.<hash>.js file
  const files = fs.readdirSync(inputDir);
  const remoteEntryFile = files.find(file =>
    /^remoteEntry\.[a-f0-9]+\.js$/.test(file)
  );

  if (!remoteEntryFile) {
    console.error('No matching remoteEntry.<hash>.js file found.');
    process.exit(1);
  }

  // 2. Load and parse the JSON file
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const json = JSON.parse(jsonContent);

  const extensions = json['jupyter-config-data'].federated_extensions;
  if (!Array.isArray(extensions)) {
    console.error(
      'Invalid JSON structure: missing "federated_extensions" array.'
    );
    process.exit(1);
  }

  // 3. Find the target extension dict and update it
  const target = extensions.find(ext => ext.name === 'jupyterpack');

  if (!target) {
    console.error('Extension with name "jupyterpack" not found.');
    process.exit(1);
  }

  target.load = `static/${remoteEntryFile}`;

  // 4. Save the updated JSON back
  fs.writeFileSync(jsonFilePath, JSON.stringify(json, null, 2));
  console.log(`Updated "load" value to: static/${remoteEntryFile}`);
}

async function cleanAndCopy(sourceDir, targetDir) {
  try {
    if (fs.existsSync(targetDir)) {
      const entries = fs.readdirSync(targetDir);
      for (const entry of entries) {
        const fullPath = path.join(targetDir, entry);
        await fse.remove(fullPath);
      }
    } else {
      await fse.mkdirp(targetDir);
    }

    await fse.copy(sourceDir, targetDir, { overwrite: true });

    console.log(`✅ Copied from ${sourceDir} to ${targetDir}`);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

function listAllFiles(dir, baseDir = dir) {
  const entries = [];
  for (const entry of fse.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      entries.push(...listAllFiles(fullPath, baseDir));
    } else {
      entries.push(relativePath);
    }
  }
  return entries;
}

async function buildJupyterpackArchive() {
  const sourceDir = 'jupyterpack';
  const destDir = 'demo/_output/xeus/xeus-kernels/kernel_packages';
  const prefix = 'lib/python3.13/site-packages/jupyterpack/';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jupyterpack-'));

  const existing = fs
    .readdirSync(destDir)
    .find(f => f.startsWith('jupyterpack'));
  if (!existing) {
    throw new Error('Please run build:demo first');
  }

  const archivePath = path.join(destDir, existing);
  // const test_archivePath = path.join(destDir, 'test_' + existing);

  /* -------------------------------------------------- */
  /* 1. Extract existing archive EXCEPT lib/**          */
  /* -------------------------------------------------- */
  await tar.x({
    file: archivePath,
    cwd: tempDir,
    filter: p => !p.startsWith('lib/')
  });

  /* -------------------------------------------------- */
  /* 2. Copy new jupyterpack into lib/...                */
  /* -------------------------------------------------- */

  const targetPackDir = path.join(tempDir, prefix);
  fse.ensureDirSync(targetPackDir);
  // Copy everything except labextension
  for (const entry of fse.readdirSync(sourceDir)) {
    if (entry === 'labextension') continue;
    fse.copySync(path.join(sourceDir, entry), path.join(targetPackDir, entry), {
      overwrite: true
    });
  }

  /* -------------------------------------------------- */
  /* 3. Re-pack archive                                 */
  /* -------------------------------------------------- */
  fs.unlinkSync(archivePath);
  await tar.c(
    {
      gzip: true,
      file: archivePath,
      cwd: tempDir,
      portable: true
    },
    listAllFiles(tempDir)
  );

  console.log(`✅ Archive updated in place: ${archivePath}`);
}

const inputPath = 'jupyterpack/labextension';
const outputPath = 'demo/_output/extensions/jupyterpack';
const jsonPath = 'demo/_output/jupyter-lite.json';

(async () => {
  updateFederatedExtension(`${inputPath}/static`, jsonPath);
  await cleanAndCopy(inputPath, outputPath);
  await cleanAndCopy('demo/files', 'demo/_output/files');
  await buildJupyterpackArchive();
})();
