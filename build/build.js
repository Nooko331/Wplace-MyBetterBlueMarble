/** Builds the userscript using esbuild.
 * This will:
 * 1. Update the package version across the entire project
 * 2. Bundle the JS files into one file (esbuild)
 * 3. Bundle the CSS files into one file (esbuild)
 * 4. Compress & obfuscate the bundled JS file (terner)
 * 5. Runs the CSS selector mangler (cssMandler.js)
 * @since 0.0.6
*/

// ES Module imports
import esbuild from 'esbuild';
import fs from 'fs';
import { execSync } from 'child_process';
import { consoleStyle } from './utils.js';
import mangleSelectors from './cssMangler.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// CommonJS imports (require)
const terser = require('terser');

const isGitHub = !!process.env?.GITHUB_ACTIONS; // Is this running in a GitHub Action Workflow?'

console.log(`${consoleStyle.BLUE}Starting build...${consoleStyle.RESET}`);

// Tries to build the wiki if build.js is run in a GitHub Workflow
// if (isGitHub) {
//   try {
//     console.log(`Generating JSDoc...`);
//     execSync(`npx jsdoc src/ -r -d docs -t node_modules/minami`, { stdio: "inherit" });
//     console.log(`JSDoc built ${consoleStyle.GREEN}successfully${consoleStyle.RESET}`);
//   } catch (error) {
//     console.error(`${consoleStyle.RED + consoleStyle.BOLD}Failed to generate JSDoc${consoleStyle.RESET}:`, error);
//     process.exit(1);
//   }
// }

// Tries to bump the version
try {
  const update = execSync('node build/update-version.js', { stdio: 'inherit' });
  console.log(`Version updated in meta file ${consoleStyle.GREEN}successfully${consoleStyle.RESET}`);
} catch (error) {
  console.error(`${consoleStyle.RED + consoleStyle.BOLD}Failed to update version number${consoleStyle.RESET}:`, error);
  process.exit(1);
}

// Fetches the userscript metadata banner
const metaContent = fs.readFileSync('src/BlueMarble.meta.js', 'utf8');

// Compiles a string array of all CSS files
const cssFiles = fs.readdirSync('src/')
  .filter(file => file.endsWith('.css'))
  .map(file => `src/${file}`);

const builds = [
  { 
    name: 'Default', 
    pattern: 'cross', 
    outDir: 'dist',
    jsName: 'BlueMarble.user.js',
    cssName: 'BlueMarble.user.css'
  },
  { 
    name: 'Checkerboard', 
    pattern: 'checkerboard', 
    outDir: 'dist-checkerboard',
    jsName: 'BlueMarble-Checkerboard.user.js',
    cssName: 'BlueMarble-Checkerboard.user.css'
  }
];

for (const build of builds) {
  console.log(`${consoleStyle.BLUE}Building ${build.name} version...${consoleStyle.RESET}`);

  // Ensure output directory exists
  if (!fs.existsSync(build.outDir)) {
    fs.mkdirSync(build.outDir, { recursive: true });
  }

  // Compiles the CSS files
  await esbuild.build({
    entryPoints: cssFiles,
    bundle: true,
    outfile: `${build.outDir}/${build.cssName}`,
    minify: true
  });

  // Compiles the JS files
  const resultEsbuild = await esbuild.build({
    entryPoints: ['src/main.js'], // "Infect" the files from this point (it spreads from this "patient 0")
    bundle: true, // Should the code be bundled?
    outfile: `${build.outDir}/${build.jsName}`, // The file the bundled code is exported to
    format: 'iife', // What format the bundler bundles the code into
    target: 'es2020', // What is the minimum version/year that should be supported? When omited, it attempts to support backwards compatability with legacy browsers
    platform: 'browser', // The platform the bundled code will be operating on
    legalComments: 'inline', // What level of legal comments are preserved? (Hard: none, Soft: inline)
    minify: false, // Should the code be minified?
    write: false, // Should we write the outfile to the disk?
    define: { 'RENDER_PATTERN': `"${build.pattern}"` }
  }).catch(() => process.exit(1));

  // Retrieves the JS file
  const resultEsbuildJS = resultEsbuild.outputFiles.find(file => file.path.endsWith('.js'));

  // Obfuscates the JS file
  let resultTerser = await terser.minify(resultEsbuildJS.text, {
    mangle: {
      //toplevel: true, // Obfuscate top-level class/function names
      keep_classnames: false, // Should class names be preserved?
      keep_fnames: false, // Should function names be preserved?
      reserved: [], // List of keywords to preserve
      properties: {
        // regex: /.*/, // Yes, I am aware I should be using a RegEx. Yes, like you, I am also suprised the userscript still functions
        keep_quoted: true, // Should names in quotes be preserved?
        reserved: [] // What properties should be preserved?
      },
    },
    format: {
      comments: 'some' // Save legal comments
    },
    compress: {
      dead_code: isGitHub, // Should unreachable code be removed?
      drop_console: isGitHub, // Should console code be removed?
      drop_debugger: isGitHub, // SHould debugger code be removed?
      passes: 2 // How many times terser will compress the code
    }
  });

  // Writes the obfuscated/mangled JS code to a file
  fs.writeFileSync(`${build.outDir}/${build.jsName}`, resultTerser.code, 'utf8');

  let importedMapCSS = {}; // The imported CSS map

  // Only import a CSS map if we are NOT in production (GitHub Workflow)
  // Theoretically, if the previous map is always imported, the names would not scramble. However, the names would never decrease in number...
  if (!isGitHub) {
    try {
      importedMapCSS = JSON.parse(fs.readFileSync(`${build.outDir}/${build.cssName}.map.json`, 'utf8'));
    } catch {
      console.log(`${consoleStyle.YELLOW}Warning! Could not find a CSS map to import for ${build.name}. A 100% new CSS map will be generated...${consoleStyle.RESET}`);
    }
  }

  // Mangles the CSS selectors
  // If we are in production (GitHub Workflow), then generate the CSS mapping
  const mapCSS = mangleSelectors({
    inputPrefix: 'bm-',
    outputPrefix: 'bm-',
    pathJS: `${build.outDir}/${build.jsName}`,
    pathCSS: `${build.outDir}/${build.cssName}`,
    importMap: importedMapCSS,
    returnMap: isGitHub
  });

  // If a map was returned, write it to the file
  if (mapCSS) {
    fs.writeFileSync(`${build.outDir}/${build.cssName}.map.json`, JSON.stringify(mapCSS, null, 2));
  }

  // --- EMBED CSS INTO JS ---
  // Read the final mangled CSS
  const cssContent = fs.readFileSync(`${build.outDir}/${build.cssName}`, 'utf8');
  
  // Read the obfuscated JS
  let jsContent = fs.readFileSync(`${build.outDir}/${build.jsName}`, 'utf8');

  // Replace GM_getResourceText("CSS-BM-File") with the actual CSS string
  // We use JSON.stringify to safely quote and escape the CSS string
  jsContent = jsContent.replace(/GM_getResourceText\s*\(\s*["']CSS-BM-File["']\s*\)/g, JSON.stringify(cssContent));
  
  fs.writeFileSync(`${build.outDir}/${build.jsName}`, jsContent, 'utf8');

  // Prepare metadata
  let currentMeta = metaContent;
  
  // Remove @resource CSS-BM-File since we embedded it
  currentMeta = currentMeta.replace(/^\/\/\s*@resource\s+CSS-BM-File\s+.*(\r\n|\n|\r)/gm, '');

  if (build.name !== 'Default') {
    // Modify name
    currentMeta = currentMeta.replace('// @name         Blue Marble', `// @name         Blue Marble (${build.name})`);
    
    // Modify URLs to point to the correct files
    // Replacing dist/BlueMarble.user.js with dist-checkerboard/BlueMarble-Checkerboard.user.js (etc)
    const newJsPath = `${build.outDir}/${build.jsName}`;
    const newCssPath = `${build.outDir}/${build.cssName}`;
    
    currentMeta = currentMeta.replace(/dist\/BlueMarble\.user\.js/g, newJsPath);
    currentMeta = currentMeta.replace(/dist\/BlueMarble\.user\.css/g, newCssPath);
  }

  // Adds the banner
  fs.writeFileSync(
    `${build.outDir}/${build.jsName}`, 
    currentMeta + fs.readFileSync(`${build.outDir}/${build.jsName}`, 'utf8'), 
    'utf8'
  );
}

console.log(`${consoleStyle.GREEN + consoleStyle.BOLD + consoleStyle.UNDERLINE}Building complete!${consoleStyle.RESET}`);
