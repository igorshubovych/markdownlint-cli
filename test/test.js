'use strict';

import test from 'ava';
import execa from 'execa';

test('--version option', async t => {
  const result = execa.sync('../markdownlint.js', ['--version']);
  t.true(result.stdout.length > 0);
});

test('--help option', async t => {
  const result = execa.sync('../markdownlint.js', ['--help']);
  t.true(result.stdout.indexOf('markdownlint') >= 0);
  t.true(result.stdout.indexOf('--version') >= 0);
  t.true(result.stdout.indexOf('--help') >= 0);
});

test('linting of correct Markdown file returns no error', async t => {
  try {
    const result = execa.sync('../markdownlint.js',
      ['--config', 'test-config.json', 'correct.md']);
    t.true(result.stderr.length === 0);
  } catch (err) {
    console.log(err);
  }
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    const result = execa.sync('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md']);
    t.true(result.stderr.length > 0);
  } catch (err) {
    console.log(err);
  }
});
