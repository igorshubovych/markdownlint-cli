'use strict';

import fs from 'fs';
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
      'incorrect.md: 1: MD002/first-heading-h1/first-header-h1 First heading should be a top level heading [Expected: h1; Actual: h2]',
      'incorrect.md: 1: MD022/blanks-around-headings/blanks-around-headers Headings should be surrounded by blank lines [Context: "## header 2"]',
      'incorrect.md: 1: MD041/first-line-h1 First line in file should be a top level heading [Context: "## header 2"]',
      'incorrect.md: 2: MD022/blanks-around-headings/blanks-around-headers Headings should be surrounded by blank lines [Context: "# header"]',
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

test('stdin support does not interfere with file linting', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'md043-config.json', 'md043-config.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('--output with empty input has empty output', async t => {
  var input = '';
  var output = '../outputA.txt';
  const result = await execa('../markdownlint.js',
    ['--stdin', '--output', output], {input: input});
  t.true(result.stdout === '');
  t.true(result.stderr === '');
  t.true(fs.readFileSync(output, 'utf8') === '');
  fs.unlinkSync(output);
});

test('--output with valid input has empty output', async t => {
  var input = [
    '# Heading',
    '',
    'Text'
  ].join('\n');
  var output = '../outputB.txt';
  const result = await execa('../markdownlint.js',
    ['--stdin', '--output', output], {input: input});
  t.true(result.stdout === '');
  t.true(result.stderr === '');
  t.true(fs.readFileSync(output, 'utf8') === '');
  fs.unlinkSync(output);
});

test('--output with invalid input outputs violations', async t => {
  var input = [
    'Heading',
    '',
    'Text '
  ].join('\n');
  var output = '../outputC.txt';
  try {
    await execa('../markdownlint.js', ['--stdin', '--output', output], {input: input});
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr === '');
    t.true(fs.readFileSync(output, 'utf8').match(errorPattern).length === 2);
    fs.unlinkSync(output);
  }
});

test('--output with invalid path fails', async t => {
  var input = '';
  var output = 'invalid/outputD.txt';
  try {
    await execa('../markdownlint.js',
      ['--stdin', '--output', output], {input: input});
    t.fail();
  } catch (err) {
    t.true(err.stdout === '');
    t.true(err.stderr.replace(/: ENOENT[^]*$/, '') === 'Cannot write to output file ' + output);
    t.throws(() => fs.accessSync(output, 'utf8'), Error);
  }
});

test('configuration file can be YAML', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'md043-config.yaml', 'md043-config.md']);
  t.true(result.stdout === '');
  t.true(result.stderr === '');
});

test('Custom rule from single file loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files/test-rule-1.js', '--stdin'], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-1 Test rule broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('Custom rules from directory loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files', '--stdin'], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-1 Test rule broken',
      'stdin: 1: test-rule-2 Test rule 2 broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('Custom rules from glob loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files/**/*.js', '--stdin'], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-1 Test rule broken',
      'stdin: 1: test-rule-2 Test rule 2 broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('Custom rule from node_modules package loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js',
      ['--rules', 'test-rule-package', '--stdin'], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-package Test rule package broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('Custom rule from package loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js',
      ['--rules', './custom-rules/test-rule-package', '--stdin'], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-package Test rule package broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});

test('Custom rule from several packages loaded', async t => {
  try {
    var input = '# Input';
    await execa('../markdownlint.js', [
      '--rules', './custom-rules/test-rule-package',
      '--rules', './custom-rules/test-rule-package-other',
      '--stdin'
    ], {input});
    t.fail();
  } catch (err) {
    const expected = [
      'stdin: 1: test-rule-package Test rule package broken',
      'stdin: 1: test-rule-package-other Test rule package other broken',
      ''
    ].join('\n');
    t.true(err.stdout === '');
    t.true(err.stderr === expected);
  }
});
