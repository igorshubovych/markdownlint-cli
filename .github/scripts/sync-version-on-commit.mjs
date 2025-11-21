#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.info('Syncing all version references...');

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.info(`Version from package.json: ${version}`);

// File paths
const markdownlintJsPath = path.join(__dirname, '..', '..', 'markdownlint.js');
const readmePath = path.join(__dirname, '..', '..', 'README.md');
const preCommitHooksPath = path.join(__dirname, '..', '..', '.pre-commit-hooks.yaml');

// Update markdownlint.js
let markdownlintJs = fs.readFileSync(markdownlintJsPath, 'utf8');
markdownlintJs = markdownlintJs.replace(
  /const version = '[^']+';/,
  `const version = '${version}';`
);
fs.writeFileSync(markdownlintJsPath, markdownlintJs);

// Update README.md
let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(
  /rev: v[0-9]+\.[0-9]+\.[0-9]+/,
  `rev: v${version}`
);
fs.writeFileSync(readmePath, readme);

// Update .pre-commit-hooks.yaml
let preCommitHooks = fs.readFileSync(preCommitHooksPath, 'utf8');
preCommitHooks = preCommitHooks.replace(
  /entry: ghcr\.io\/igorshubovych\/markdownlint-cli(?::[^\s]+)?(\s|$)/g,
  `entry: ghcr.io/igorshubovych/markdownlint-cli:v${version}$1`
);
fs.writeFileSync(preCommitHooksPath, preCommitHooks);

console.info('✓ Version sync complete');
