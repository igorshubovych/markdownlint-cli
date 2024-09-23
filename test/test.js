'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const process = require('node:process');
const test = require('ava');

const spawn = async (script, arguments_, options) => {
  const {default: spawn} = await import('nano-spawn');
  return spawn('node', [script, ...arguments_], options).then(subprocess => ({
    ...subprocess,
    exitCode: 0
  }));
};

const errorPattern = /(\.md|\.markdown|\.mdf|stdin):\d+(:\d+)? MD\d{3}/gm;

process.chdir('./test');

test('--version option', async t => {
  const result = await spawn('../markdownlint.js', ['--version']);
  t.regex(result.stdout, /^\d+\.\d+\.\d+$/);
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('--help option', async t => {
  const result = await spawn('../markdownlint.js', ['--help']);
  t.true(result.stdout.includes('markdownlint'));
  t.true(result.stdout.includes('--version'));
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('no files shows help', async t => {
  const result = await spawn('../markdownlint.js', []);
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('files and --stdin shows help', async t => {
  const result = await spawn('../markdownlint.js', ['--stdin', 'correct.md']);
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('--fix and --stdin shows help', async t => {
  const result = await spawn('../markdownlint.js', ['--fix', '--stdin', 'correct.md']);
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting of correct Markdown file yields no output', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', 'correct.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting of correct Markdown file yields no output with absolute path', async t => {
  const result = await spawn('../markdownlint.js', ['--config', path.resolve('test-config.json'), 'correct.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting of correct Markdown file with inline JSONC configuration yields no output', async t => {
  const result = await spawn('../markdownlint.js', ['inline-jsonc.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting of correct Markdown file with inline YAML configuration yields no output', async t => {
  const result = await spawn('../markdownlint.js', ['inline-yaml.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 7);
    t.is(error.exitCode, 1);
  }
});

test('linting of incorrect Markdown file fails prints issues as json', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', 'incorrect.md', '--json']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    const issues = JSON.parse(error.stderr);
    t.is(issues.length, 7);
    const issue = issues[0];
    // Property "ruleInformation" changes with library version
    t.true(issue.ruleInformation.length > 0);
    issue.ruleInformation = null;
    const expected = {
      fileName: 'incorrect.md',
      lineNumber: 1,
      ruleNames: ['MD041', 'first-line-heading', 'first-line-h1'],
      ruleDescription: 'First line in a file should be a top-level heading',
      ruleInformation: null,
      errorContext: '## header 2',
      errorDetail: null,
      errorRange: null,
      fixInfo: null
    };
    t.deepEqual(issues[0], expected);
    t.is(error.exitCode, 1);
  }
});

test('linting of incorrect Markdown file fails with absolute path', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', path.resolve('incorrect.md')]);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 7);
    t.is(error.exitCode, 1);
  }
});

test('linting of unreadable Markdown file fails', async t => {
  const unreadablePath = '../unreadable.test.md';
  fs.symlinkSync('nonexistent.dest.md', unreadablePath, 'file');

  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', unreadablePath]);
    t.fail();
  } catch (error) {
    t.is(error.exitCode, 4);
  } finally {
    fs.unlinkSync(unreadablePath, {force: true});
  }
});

test('linting of incorrect Markdown via npm run file fails with eol', async t => {
  try {
    const {default: spawn} = await import('nano-spawn');
    await spawn('npm', ['run', 'invalid']);
    t.fail();
  } catch (error) {
    t.regex(error.stderr, /MD\d{3}.*((\nnpm ERR!)|($))/);
  }
});

test('glob linting works with passing files', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/correct.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('glob linting works with failing files', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/*.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 15);
    t.is(error.exitCode, 1);
  }
});

test('dir linting works with passing .markdown files', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', 'subdir-correct']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('dir linting works with failing .markdown files', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', 'subdir-incorrect']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 9);
    t.is(error.exitCode, 1);
  }
});

test('dir linting works with failing .markdown files and absolute path', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', path.resolve('subdir-incorrect')]);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 9);
    t.is(error.exitCode, 1);
  }
});

test('glob linting with failing files passes when failures ignored by glob', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/i*.md', '--ignore', '**/incorrect.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('glob linting with failing files passes when everything ignored by glob', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/*.md', '--ignore', '**/*']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('glob linting with failing files has fewer errors when ignored by dir', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/*.md', '--ignore', 'subdir-incorrect']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 8);
    t.is(error.exitCode, 1);
  }
});

test('glob linting with failing files has fewer errors when ignored by dir and absolute path', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/*.md', '--ignore', path.resolve('subdir-incorrect')]);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 8);
    t.is(error.exitCode, 1);
  }
});

test('dir linting with failing files has fewer errors when ignored by file', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', 'subdir-incorrect/incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
    t.is(error.exitCode, 1);
  }
});

test('dir linting with failing files has fewer errors when ignored by file and absolute path', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', path.resolve('subdir-incorrect'), '--ignore', 'subdir-incorrect/incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
    t.is(error.exitCode, 1);
  }
});

test('glob linting with failing files passes when ignored by multiple globs', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', '**/*.md', '--ignore', '**/*.markdown', '--ignore', '**/*.MD']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('glob linting with directory ignore applies to all files within', async t => {
  const result = await spawn('../markdownlint.js', ['subdir-incorrect/**', '--ignore', 'subdir-incorrect']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting results are sorted by file/line/names/description', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', 'incorrect.md']);
    t.fail();
  } catch (error) {
    const expected = ['incorrect.md:1 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "## header 2"]', 'incorrect.md:1 MD041/first-line-heading/first-line-h1 First line in a file should be a top-level heading [Context: "## header 2"]', 'incorrect.md:2 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Above] [Context: "# header"]', 'incorrect.md:5:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]', 'incorrect.md:11:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]', 'incorrect.md:17:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]', 'incorrect.md:23:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('glob linting does not try to lint directories as files', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/*', '--ignore', '**/*.mdf']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.true(error.stderr.match(errorPattern).length > 0);
    t.is(error.exitCode, 1);
  }
});

test('--stdin with empty input has no output', async t => {
  const stdin = {string: ''};
  const result = await spawn('../markdownlint.js', ['--stdin'], {stdin});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('--stdin with valid input has no output', async t => {
  const stdin = {string: ['# Heading', '', 'Text', ''].join('\n')};
  const result = await spawn('../markdownlint.js', ['--stdin'], {stdin});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('--stdin with invalid input reports violations', async t => {
  const stdin = {string: ['Heading', '', 'Text ', ''].join('\n')};
  try {
    await spawn('../markdownlint.js', ['--stdin'], {stdin});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
    t.is(error.exitCode, 1);
  }
});

test('stdin support does not interfere with file linting', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'md043-config.json', 'md043-config.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('--output with empty input has empty output', async t => {
  const stdin = {string: ''};
  const output = '../outputA.txt';
  const result = await spawn('../markdownlint.js', ['--stdin', '--output', output], {stdin});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
  t.is(fs.readFileSync(output, 'utf8'), '');
  fs.unlinkSync(output);
});

test('--output with valid input has empty output', async t => {
  const stdin = {string: ['# Heading', '', 'Text', ''].join('\n')};
  const output = '../outputB.txt';
  const result = await spawn('../markdownlint.js', ['--stdin', '--output', output], {stdin});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
  t.is(fs.readFileSync(output, 'utf8'), '');
  fs.unlinkSync(output);
});

test('--output with invalid input outputs violations', async t => {
  const stdin = {string: ['Heading', '', 'Text ', ''].join('\n')};
  const output = '../outputC.txt';
  try {
    await spawn('../markdownlint.js', ['--stdin', '--output', output], {stdin});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, '');
    t.is(error.exitCode, 1);
    t.is(fs.readFileSync(output, 'utf8').match(errorPattern).length, 2);
    fs.unlinkSync(output);
  }
});

test('--output with invalid input and --json outputs issues as json', async t => {
  const stdin = {string: ['Heading', '', 'Text ', ''].join('\n')};
  const output = '../outputF.json';
  try {
    await spawn('../markdownlint.js', ['--stdin', '--output', output, '--json'], {stdin});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, '');
    t.is(error.exitCode, 1);
    t.is(JSON.parse(fs.readFileSync(output)).length, 2);
    fs.unlinkSync(output);
  }
});

test('--output with invalid path fails', async t => {
  const stdin = {string: ''};
  const output = 'invalid/outputD.txt';
  try {
    await spawn('../markdownlint.js', ['--stdin', '--output', output], {stdin});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.replace(/: ENOENT[^]*$/, ''), 'Cannot write to output file ' + output);
    t.is(error.exitCode, 2);
    t.throws(() => fs.accessSync(output, 'utf8'));
  }
});

test('configuration file can be YAML', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'md043-config.yaml', 'md043-config.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('configuration file can be JavaScript', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'md043-config.js', 'md043-config.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('configuration file can be TOML', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'md043-config.toml', 'md043-config.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('linting using a toml configuration file works', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.toml', '**/*.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 15);
    t.is(error.exitCode, 1);
  }
});

test('linting using a yaml configuration file works', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.yaml', '**/*.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 15);
    t.is(error.exitCode, 1);
  }
});

test('error on configuration file not found', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'non-existent-file-path.yaml', 'correct.md']);
  } catch (error) {
    t.is(error.stdout, '');
    t.regex(error.stderr, /Cannot read or parse config file 'non-existent-file-path\.yaml': ENOENT: no such file or directory, open '.*non-existent-file-path\.yaml'/);
    t.is(error.exitCode, 4);
  }
});

test('error on malformed YAML configuration file', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'malformed-config.yaml', 'correct.md']);
  } catch (error) {
    t.is(error.stdout, '');
    t.regex(error.stderr, /Cannot read or parse config file 'malformed-config.yaml': Unable to parse 'malformed-config.yaml'; Parser 0:/);
    t.is(error.exitCode, 4);
  }
});

function getCwdConfigFileTest(extension) {
  return async t => {
    try {
      await spawn(path.resolve('..', 'markdownlint.js'), ['.'], {
        cwd: path.join(__dirname, 'config-files', extension)
      });
      t.fail();
    } catch (error) {
      const expected = ["heading-dollar.md:1:10 MD026/no-trailing-punctuation Trailing punctuation in heading [Punctuation: '$']"].join('\n');
      t.is(error.stdout, '');
      t.is(error.stderr, expected);
      t.is(error.exitCode, 1);
    }
  };
}

test('.markdownlint.jsonc in cwd is used automatically', getCwdConfigFileTest('jsonc'));

test('.markdownlint.json in cwd is used automatically', getCwdConfigFileTest('json'));

test('.markdownlint.yaml in cwd is used automatically', getCwdConfigFileTest('yaml'));

test('.markdownlint.yml in cwd is used automatically', getCwdConfigFileTest('yml'));

test('.markdownlint.jsonc in cwd is used instead of .markdownlint.json or .markdownlint.yaml or .markdownlint.yml', getCwdConfigFileTest('jsonc-json-yaml-yml'));

test('.markdownlint.json in cwd is used instead of .markdownlint.yaml or .markdownlint.yml', getCwdConfigFileTest('json-yaml-yml'));

test('.markdownlint.yaml in cwd is used instead of .markdownlint.yml', getCwdConfigFileTest('yaml-yml'));

test('.markdownlint.json with JavaScript-style comments is handled', getCwdConfigFileTest('json-c'));

test('invalid JSON Pointer', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'nested-config.json', '--configPointer', 'INVALID', '**/*.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.regex(error.stderr, /Invalid JSON pointer\./);
    t.is(error.exitCode, 4);
  }
});

test('empty JSON Pointer', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'nested-config.json', '--configPointer', '/EMPTY', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 7);
    t.is(error.exitCode, 1);
  }
});

test('valid JSON Pointer with JSON configuration', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'nested-config.json', '--configPointer', '/key', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 1);
    t.is(error.exitCode, 1);
  }
});

test('valid JSON Pointer with TOML configuration', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'nested-config.toml', '--configPointer', '/key/subkey', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 3);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule from single file loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'custom-rules/files/test-rule-1.js', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 test-rule-1 Test rule broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Multiple custom rules from single file loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'custom-rules/files/test-rule-3-4.js', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 test-rule-3 Test rule 3 broken', 'stdin:1 test-rule-4 Test rule 4 broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rules from directory loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'custom-rules/files', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 test-rule-1 Test rule broken', 'stdin:1 test-rule-2 Test rule 2 broken', 'stdin:1 test-rule-3 Test rule 3 broken', 'stdin:1 test-rule-4 Test rule 4 broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rules from glob loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'custom-rules/files/**/*.js', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 test-rule-1 Test rule broken', 'stdin:1 test-rule-2 Test rule 2 broken', 'stdin:1 test-rule-3 Test rule 3 broken', 'stdin:1 test-rule-4 Test rule 4 broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule from node_modules package loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'markdownlint-cli-local-test-rule', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 markdownlint-cli-local-test-rule Test rule package broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule from node_modules package loaded relative to cwd', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn(path.resolve('..', 'markdownlint.js'), ['--rules', 'markdownlint-cli-local-test-rule', '--stdin'], {
      stdin,
      cwd: path.join(__dirname, 'custom-rules', 'relative-to-cwd')
    });
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 markdownlint-cli-local-test-rule Test rule package relative to cwd broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule with scoped package name via --rules', async t => {
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['--rules', '@scoped/custom-rule', 'scoped-test.md'], {
      cwd: path.join(__dirname, 'custom-rules', 'scoped-package')
    });
    t.fail();
  } catch (error) {
    const expected = ['scoped-test.md:1 scoped-rule Scoped rule'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule from package loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', './custom-rules/markdownlint-cli-local-test-rule', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 markdownlint-cli-local-test-rule Test rule package broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Custom rule from several packages loaded', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', './custom-rules/markdownlint-cli-local-test-rule', '--rules', './custom-rules/markdownlint-cli-local-test-rule-other', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['stdin:1 markdownlint-cli-local-test-rule Test rule package broken', 'stdin:1 markdownlint-cli-local-test-rule-other Test rule package other broken'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('Invalid custom rule name reports error', async t => {
  try {
    const stdin = {string: '# Input\n'};
    await spawn('../markdownlint.js', ['--rules', 'markdownlint-cli-local-test-rule', '--rules', 'invalid-package', '--stdin'], {stdin});
    t.fail();
  } catch (error) {
    const expected = ['Cannot load custom rule invalid-package: No such rule'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 3);
  }
});

test('fixing errors in a file yields fewer errors', async t => {
  const fixFileA = 'incorrect.a.mdf';
  try {
    fs.copyFileSync('incorrect.md', fixFileA);
    await spawn('../markdownlint.js', ['--fix', '--config', 'test-config.json', fixFileA]);
    t.fail();
  } catch (error) {
    const expected = [fixFileA + ':1 MD041/first-line-heading/first-line-h1 First line in a file should be a top-level heading [Context: "## header 2"]'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
    fs.unlinkSync(fixFileA);
  }
});

test('fixing errors in a file with absolute path yields fewer errors', async t => {
  const fixFileB = 'incorrect.b.mdf';
  try {
    fs.copyFileSync('incorrect.md', fixFileB);
    await spawn('../markdownlint.js', ['--fix', '--config', 'test-config.json', path.resolve(fixFileB)]);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 1);
    t.is(error.exitCode, 1);
    fs.unlinkSync(fixFileB);
  }
});

test('fixing errors with a glob yields fewer errors', async t => {
  const fixFileC = 'incorrect.c.mdf';
  const fixSubFileC = 'subdir-incorrect/incorrect.c.mdf';
  const fixFileGlob = '**/*.c.mdf';
  try {
    fs.copyFileSync('incorrect.md', fixFileC);
    fs.copyFileSync('subdir-incorrect/incorrect.md', fixSubFileC);
    await spawn('../markdownlint.js', ['--fix', '--config', 'test-config.json', fixFileGlob]);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
    t.is(error.exitCode, 1);
    fs.unlinkSync(fixFileC);
    fs.unlinkSync(fixSubFileC);
  }
});

test('.markdownlintignore is applied correctly', async t => {
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['.'], {
      cwd: path.join(__dirname, 'markdownlintignore')
    });
    t.fail();
  } catch (error) {
    const expected = ['incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character', 'subdir/incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr.replaceAll('\\', '/'), expected);
    t.is(error.exitCode, 1);
  }
});

test('.markdownlintignore works with semi-absolute paths', async t => {
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['./incorrect.md'], {
      cwd: path.join(__dirname, 'markdownlintignore')
    });
    t.fail();
  } catch (error) {
    const expected = ['./incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('--ignore-path works with .markdownlintignore', async t => {
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['--ignore-path', '.markdownlintignore', '.'], {
      cwd: path.join(__dirname, 'markdownlintignore')
    });
    t.fail();
  } catch (error) {
    const expected = ['incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character', 'subdir/incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr.replaceAll('\\', '/'), expected);
    t.is(error.exitCode, 1);
  }
});

test('--ignore-path works with .ignorefile', async t => {
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['--ignore-path', '.ignorefile', '.'], {
      cwd: path.join(__dirname, 'markdownlintignore')
    });
    t.fail();
  } catch (error) {
    const expected = ['incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character'].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    t.is(error.exitCode, 1);
  }
});

test('--ignore-path fails for missing file', async t => {
  const missingFile = 'missing-file';
  try {
    await spawn(path.resolve('..', 'markdownlint.js'), ['--ignore-path', missingFile, '.'], {
      cwd: path.join(__dirname, 'markdownlintignore')
    });
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.regex(error.stderr, /enoent.*no such file or directory/i);
    t.is(error.exitCode, 1);
  }
});

test('Linter text file --output must end with EOF newline', async t => {
  const output = '../outputE.txt';
  const endOfLine = new RegExp(os.EOL + '$');
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '--output', output, 'incorrect.md']);
    t.fail();
  } catch {
    t.regex(fs.readFileSync(output, 'utf8'), endOfLine);
    fs.unlinkSync(output);
  }
});

test('--dot option to include folders/files with a dot', async t => {
  try {
    await spawn('../markdownlint.js', ['--config', 'test-config.json', '--dot', '**/incorrect-dot.md', '**/.file-with-dot.md', '**/correct.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 11);
    t.is(error.exitCode, 1);
  }
});

test('without --dot option exclude folders/files with a dot', async t => {
  const result = await spawn('../markdownlint.js', ['--config', 'test-config.json', '**/incorrect-dot.md', '**/.file-with-dot.md', '**/correct.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('with --quiet option does not print to stdout or stderr', async t => {
  try {
    await spawn('../markdownlint.js', ['--quiet', '--config', 'test-config.json', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, '');
    t.is(error.exitCode, 1);
  }
});

test('--enable flag', async t => {
  try {
    await spawn('../markdownlint.js', ['--enable', 'MD041', '--config', 'default-false-config.yml', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, 'incorrect.md:1 MD041/first-line-heading/first-line-h1 First line in a file should be a top-level heading [Context: "## header 2"]');
    t.is(error.exitCode, 1);
  }
});

test('--enable flag does not modify already enabled rules', async t => {
  try {
    await spawn('../markdownlint.js', ['--enable', 'MD043', '--config', 'md043-config.yaml', 'correct.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, 'correct.md:1 MD043/required-headings Required heading structure [Expected: # First; Actual: # header]');
    t.is(error.exitCode, 1);
  }
});

test('--enable flag accepts rule alias', async t => {
  try {
    await spawn('../markdownlint.js', ['--enable', 'first-line-heading', '--config', 'default-false-config.yml', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, 'incorrect.md:1 MD041/first-line-heading/first-line-h1 First line in a file should be a top-level heading [Context: "## header 2"]');
    t.is(error.exitCode, 1);
  }
});

test('--disable flag', async t => {
  const result = await spawn('../markdownlint.js', ['--disable', 'MD014', 'MD022', 'MD041', '--', 'incorrect.md']);

  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);

  try {
    await spawn('../markdownlint.js', ['--disable', 'MD014', 'MD014', 'MD022', '--', 'incorrect.md']);
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, 'incorrect.md:1 MD041/first-line-heading/first-line-h1 First line in a file should be a top-level heading [Context: "## header 2"]');
    t.is(error.exitCode, 1);
  }
});

test('--disable flag overrides --enable flag', async t => {
  const result = await spawn('../markdownlint.js', ['--disable', 'MD041', '--enable', 'MD041', '--config', 'default-false-config.yml', 'incorrect.md']);
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('configuration can be .js in the CommonJS workspace', async t => {
  const result = await spawn('../../../markdownlint.js', ['--config', '.markdownlint.js', 'test.md'], {cwd: './workspace/commonjs'});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('configuration can be .cjs in the CommonJS workspace', async t => {
  const result = await spawn('../../../markdownlint.js', ['--config', '.markdownlint.cjs', 'test.md'], {cwd: './workspace/commonjs'});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});

test('configuration can be .cjs in the ESM (module) workspace', async t => {
  const result = await spawn('../../../markdownlint.js', ['--config', '.markdownlint.cjs', 'test.md'], {cwd: './workspace/module'});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(result.exitCode, 0);
});
