'use strict';

import test from 'ava';
import execa from 'execa';

const errorPattern = /\.(md|markdown): \d+: MD\d{3}/gm;

test('--version option', async t => {
  const result = await execa('../markdownlint.js', ['--version']);
  t.true(/^\d+\.\d+\.\d+$/.test(result.stdout));
  t.true(result.stderr === '');
});

test('--help option', async t => {
  const result = await execa('../markdownlint.js', ['--help']);
  t.true(result.stdout.indexOf('markdownlint') >= 0);
  t.true(result.stdout.indexOf('--version') >= 0);
  t.true(result.stdout.indexOf('--help') >= 0);
  t.true(result.stderr === '');
});

test('linting of correct Markdown file yields no output', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'correct.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md']);
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('linting of incorrect Markdown via npm run file fails with eol', async t => {
  try {
    await execa('npm', ['run', 'invalid']);
  } catch (err) {
    t.true(/\nnpm ERR! code ELIFECYCLE/.test(err.stderr));
  }
});

test('glob linting works with passing files', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/correct.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('glob linting works with failing files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md']);
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 16);
  }
});

test('dir linting works with passing .markdown files', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'subdir-correct']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('dir linting works with failing .markdown files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect']);
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 10);
  }
});

test('glob linting with failing files passes when failures ignored by glob', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/*.md', '--ignore', '**/incorrect.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('glob linting with failing files passes when everything ignored by glob', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/*.md', '--ignore', '**/*']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('glob linting with failing files has fewer errors when ignored by dir', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md', '--ignore', 'subdir-incorrect']);
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('dir linting with failing files has fewer errors when ignored by file', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', 'subdir-incorrect/incorrect.md']);
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 2);
  }
});

test('glob linting with failing files passes when ignored by multiple globs', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', '**/*.md', '--ignore', '**/*.markdown']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});
