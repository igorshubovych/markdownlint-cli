'use strict';

import path from 'path';
import test from 'ava';
import execa from 'execa';

const errorPattern = /(\.md|\.markdown|stdin): \d+: MD\d{3}/gm;

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

test('no files shows help', async t => {
  const result = await execa('../markdownlint.js', []);
  t.true(result.stdout.indexOf('--help') >= 0);
  t.true(result.stderr === '');
});

test('files and --stdin shows help', async t => {
  const result = await execa('../markdownlint.js', ['--stdin', 'correct.md']);
  t.true(result.stdout.indexOf('--help') >= 0);
  t.true(result.stderr === '');
});

test('linting of correct Markdown file yields no output', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'correct.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('linting of correct Markdown file yields no output with absolute path', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', path.resolve('test-config.json'), 'correct.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md']);
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('linting of incorrect Markdown file fails with absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('incorrect.md')]);
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('linting of incorrect Markdown via npm run file fails with eol', async t => {
  try {
    await execa('npm', ['run', 'invalid']);
    t.fail();
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
    t.fail();
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
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 10);
  }
});

test('dir linting works with failing .markdown files and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('subdir-incorrect')]);
    t.fail();
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
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('glob linting with failing files has fewer errors when ignored by dir and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md', '--ignore', path.resolve('subdir-incorrect')]);
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 8);
  }
});

test('dir linting with failing files has fewer errors when ignored by file', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', 'subdir-incorrect/incorrect.md']);
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 2);
  }
});

test('dir linting with failing files has fewer errors when ignored by file and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('subdir-incorrect'), '--ignore', 'subdir-incorrect/incorrect.md']);
    t.fail();
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

test('linting results are sorted by file/line/names/description', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md']);
    t.fail();
  } catch (err) {
    const expected = [
      'incorrect.md: 1: MD002/first-header-h1 First header should be a top level header [Expected: h1; Actual: h2]',
      'incorrect.md: 1: MD022/blanks-around-headers Headers should be surrounded by blank lines [Context: "## header 2"]',
      'incorrect.md: 1: MD041/first-line-h1 First line in file should be a top level header [Context: "## header 2"]',
      'incorrect.md: 2: MD022/blanks-around-headers Headers should be surrounded by blank lines [Context: "# header"]',
      'incorrect.md: 4: MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md: 10: MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md: 16: MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md: 23: MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('glob linting does not try to lint directories as files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*']);
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length > 0);
  }
});

test('--stdin with empty input has no output', async t => {
  var input = '';
  const result = await execa('../markdownlint.js', ['--stdin'], {input: input});
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('--stdin with valid input has no output', async t => {
  var input = [
    '# Heading',
    '',
    'Text'
  ].join('\n');
  const result = await execa('../markdownlint.js', ['--stdin'], {input: input});
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('--stdin with invalid input reports violations', async t => {
  var input = [
    'Heading',
    '',
    'Text '
  ].join('\n');
  try {
    await execa('../markdownlint.js', ['--stdin'], {input: input});
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.match(errorPattern).length === 2);
  }
});
