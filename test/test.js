'use strict';

import test from 'ava';
import execa from 'execa';

test('--version option', async t => {
  const result = await execa('../markdownlint.js', ['--version']);
  t.true(result.stdout.length > 0);
});

test('--help option', async t => {
  const result = await execa('../markdownlint.js', ['--help']);
  t.true(result.stdout.indexOf('markdownlint') >= 0);
  t.true(result.stdout.indexOf('--version') >= 0);
  t.true(result.stdout.indexOf('--help') >= 0);
});

test('linting of correct Markdown file returns no error', async t => {
  try {
    const result = await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'correct.md']);
    t.true(result.stderr.length === 0);
  } catch (err) {
    console.log(err);
  }
});

test('linting of correct Markdown file yields no output', async t => {
  try {
    const result = await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'correct.md']);
    t.true(result.stdout.length === 0);
  } catch (err) {
    console.log(err);
  }
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md']);
  } catch (err) {
    t.true(err.stderr.length > 0);
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
  t.true(result.stdout.length === 0);
});

test('glob linting works with failing files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/.md']);
  } catch (err) {
    t.true(err.stderr.length > 0);
  }
});

test('dir linting works with passing .markdown files', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'subdir-correct']);
  t.true(result.stdout.length === 0);
});

test('dir linting works with failing .markdown files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect']);
  } catch (err) {
    t.true(err.stderr.length > 0);
  }
});
