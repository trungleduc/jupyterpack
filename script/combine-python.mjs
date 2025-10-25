// generatePythonTs.mjs
import fs from 'fs';
import path from 'path';

/**
 * Read all Python files in a directory and generate a TS file
 * where each Python file becomes a string variable.
 * @param {string} pythonDir - Path to directory containing Python files
 */
export function generatePythonTs(pythonDir, outDir) {
  const absDir = path.resolve(pythonDir);
  if (!outDir) {
    outDir = path.resolve(absDir, '..');
  }
  const absOutDir = path.resolve(outDir);
  const outputTsFile = path.join(absOutDir, 'generatedPythonFiles.ts');

  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory does not exist: ${absDir}`);
  }

  if (fs.existsSync(outputTsFile)) {
    fs.unlinkSync(outputTsFile);
    console.log(`Deleted existing file: ${outputTsFile}`);
  }

  const files = fs.readdirSync(absDir).filter(f => f.endsWith('.py'));

  let tsContent = '// Auto-generated TypeScript file from Python files\n\n';

  for (const file of files) {
    // make a safe TS variable name
    const varName = path.basename(file, '.py').replace(/[^a-zA-Z0-9_]/g, '_');

    const filePath = path.join(absDir, file);
    const content = fs.readFileSync(filePath, 'utf-8').replace(/`/g, '\\`');

    tsContent += `export const ${varName} = \`\n${content}\`;\n`;
  }

  fs.writeFileSync(outputTsFile, tsContent, 'utf-8');
  console.log(`Generated ${outputTsFile} with ${files.length} Python files.`);
}

const COMMON_PYTHON_DIR = 'src/pythonServer/common/python';
generatePythonTs(COMMON_PYTHON_DIR);

const STREAMLIT_PYTHON_DIR = 'src/pythonServer/streamlit/python';
generatePythonTs(STREAMLIT_PYTHON_DIR);

const TORNADO_PYTHON_DIR = 'src/pythonServer/tornado/python';
generatePythonTs(TORNADO_PYTHON_DIR);
