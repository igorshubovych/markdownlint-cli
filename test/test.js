'use strict';

const fs = require('fs');
const path = require('path');
const test = require('ava');
const execa = require('execa');

const errorPattern = /(\.md|\.markdown|\.mdf|stdin):\d+(:\d+)? MD\d{3}/gm;

process.chdir('./test');

test('--version option', async t => {
  const result = await execa('../markdownlint.js', ['--version'], {stripFinalNewline: false});
  t.regex(result.stdout, /^\d+\.\d+\.\d+\n$/);
  t.is(result.stderr, '');
});

test('--help option', async t => {
  const result = await execa('../markdownlint.js', ['--help'], {stripFinalNewline: false});
  t.true(result.stdout.includes('markdownlint'));
  t.true(result.stdout.includes('--version'));
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
});

test('no files shows help', async t => {
  const result = await execa('../markdownlint.js', [], {stripFinalNewline: false});
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
});

test('files and --stdin shows help', async t => {
  const result = await execa('../markdownlint.js', ['--stdin', 'correct.md'], {stripFinalNewline: false});
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
});

test('--fix and --stdin shows help', async t => {
  const result = await execa('../markdownlint.js', ['--fix', '--stdin', 'correct.md'], {stripFinalNewline: false});
  t.true(result.stdout.includes('--help'));
  t.is(result.stderr, '');
});

test('linting of correct Markdown file yields no output', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'correct.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('linting of correct Markdown file yields no output with absolute path', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', path.resolve('test-config.json'), 'correct.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('linting of incorrect Markdown file fails', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 8);
  }
});

test('linting of incorrect Markdown file fails with absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('incorrect.md')],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 8);
  }
});

test('linting of incorrect Markdown via npm run file fails with eol', async t => {
  try {
    await execa('npm', ['run', 'invalid'], {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.regex(error.stderr, /\nnpm ERR! code ELIFECYCLE/);
  }
});

test('glob linting works with passing files', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/correct.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('glob linting works with failing files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 17);
  }
});

test('dir linting works with passing .markdown files', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'subdir-correct'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('dir linting works with failing .markdown files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 10);
  }
});

test('dir linting works with failing .markdown files and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('subdir-incorrect')],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 10);
  }
});

test('glob linting with failing files passes when failures ignored by glob', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/*.md', '--ignore', '**/incorrect.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('glob linting with failing files passes when everything ignored by glob', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', '**/*.md', '--ignore', '**/*'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('glob linting with failing files has fewer errors when ignored by dir', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md', '--ignore', 'subdir-incorrect'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 9);
  }
});

test('glob linting with failing files has fewer errors when ignored by dir and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*.md', '--ignore', path.resolve('subdir-incorrect')],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 9);
  }
});

test('dir linting with failing files has fewer errors when ignored by file', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', 'subdir-incorrect/incorrect.md'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
  }
});

test('dir linting with failing files has fewer errors when ignored by file and absolute path', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', path.resolve('subdir-incorrect'), '--ignore', 'subdir-incorrect/incorrect.md'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
  }
});

test('glob linting with failing files passes when ignored by multiple globs', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'test-config.json', 'subdir-incorrect', '--ignore', '**/*.md', '--ignore', '**/*.markdown'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('linting results are sorted by file/line/names/description', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', 'incorrect.md'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'incorrect.md:1 MD002/first-heading-h1/first-header-h1 First heading should be a top level heading [Expected: h1; Actual: h2]',
      'incorrect.md:1 MD022/blanks-around-headings/blanks-around-headers Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "## header 2"]',
      'incorrect.md:1 MD041/first-line-heading/first-line-h1 First line in file should be a top level heading [Context: "## header 2"]',
      'incorrect.md:2 MD022/blanks-around-headings/blanks-around-headers Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Above] [Context: "# header"]',
      'incorrect.md:5:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md:11:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md:17:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      'incorrect.md:23:1 MD014/commands-show-output Dollar signs used before commands without showing output [Context: "$ code"]',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('glob linting does not try to lint directories as files', async t => {
  try {
    await execa('../markdownlint.js',
      ['--config', 'test-config.json', '**/*', '--ignore', '**/*.mdf'],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.true(error.stderr.match(errorPattern).length > 0);
  }
});

test('--stdin with empty input has no output', async t => {
  const input = '';
  const result = await execa('../markdownlint.js', ['--stdin'], {input, stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('--stdin with valid input has no output', async t => {
  const input = [
    '# Heading',
    '',
    'Text',
    ''
  ].join('\n');
  const result = await execa('../markdownlint.js', ['--stdin'], {input, stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('--stdin with invalid input reports violations', async t => {
  const input = [
    'Heading',
    '',
    'Text ',
    ''
  ].join('\n');
  try {
    await execa('../markdownlint.js', ['--stdin'], {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
  }
});

test('stdin support does not interfere with file linting', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'md043-config.json', 'md043-config.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('--output with empty input has empty output', async t => {
  const input = '';
  const output = '../outputA.txt';
  const result = await execa('../markdownlint.js',
    ['--stdin', '--output', output],
    {input, stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(fs.readFileSync(output, 'utf8'), '');
  fs.unlinkSync(output);
});

test('--output with valid input has empty output', async t => {
  const input = [
    '# Heading',
    '',
    'Text',
    ''
  ].join('\n');
  const output = '../outputB.txt';
  const result = await execa('../markdownlint.js',
    ['--stdin', '--output', output],
    {input, stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
  t.is(fs.readFileSync(output, 'utf8'), '');
  fs.unlinkSync(output);
});

test('--output with invalid input outputs violations', async t => {
  const input = [
    'Heading',
    '',
    'Text ',
    ''
  ].join('\n');
  const output = '../outputC.txt';
  try {
    await execa('../markdownlint.js',
      ['--stdin', '--output', output],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr, '');
    t.is(fs.readFileSync(output, 'utf8').match(errorPattern).length, 2);
    fs.unlinkSync(output);
  }
});

test('--output with invalid path fails', async t => {
  const input = '';
  const output = 'invalid/outputD.txt';
  try {
    await execa('../markdownlint.js',
      ['--stdin', '--output', output],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.replace(/: ENOENT[^]*$/, ''), 'Cannot write to output file ' + output);
    t.throws(() => fs.accessSync(output, 'utf8'));
  }
});

test('configuration file can be YAML', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'md043-config.yaml', 'md043-config.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

test('configuration file can be JavaScript', async t => {
  const result = await execa('../markdownlint.js',
    ['--config', 'md043-config.js', 'md043-config.md'],
    {stripFinalNewline: false});
  t.is(result.stdout, '');
  t.is(result.stderr, '');
});

function getCwdConfigFileTest(extension) {
  return async t => {
    try {
      await execa(
        path.resolve('..', 'markdownlint.js'), ['.'], {
          cwd: path.join(__dirname, 'config-files', extension),
          stripFinalNewline: false
        });
      t.fail();
    } catch (error) {
      const expected = [
        'heading-dollar.md:1:10 MD026/no-trailing-punctuation Trailing punctuation in heading [Punctuation: \'$\']',
        ''
      ].join('\n');
      t.is(error.stdout, '');
      t.is(error.stderr, expected);
    }
  };
}

test('.markdownlint.json in cwd is used automatically', getCwdConfigFileTest('json'));

test('.markdownlint.yaml in cwd is used automatically', getCwdConfigFileTest('yaml'));

test('.markdownlint.yml in cwd is used automatically', getCwdConfigFileTest('yml'));

test('.markdownlint.json in cwd is used instead of .markdownlint.yaml or .markdownlint.yml', getCwdConfigFileTest('json-yaml-yml'));

test('.markdownlint.yaml in cwd is used instead of .markdownlint.yml', getCwdConfigFileTest('yaml-yml'));

test('.markdownlint.json with JavaScript-style comments is handled', getCwdConfigFileTest('jsonc'));

test('Custom rule from single file loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files/test-rule-1.js', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-1 Test rule broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Multiple custom rules from single file loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files/test-rule-3-4.js', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-3 Test rule 3 broken',
      'stdin:1 test-rule-4 Test rule 4 broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rules from directory loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-1 Test rule broken',
      'stdin:1 test-rule-2 Test rule 2 broken',
      'stdin:1 test-rule-3 Test rule 3 broken',
      'stdin:1 test-rule-4 Test rule 4 broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rules from glob loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', 'custom-rules/files/**/*.js', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-1 Test rule broken',
      'stdin:1 test-rule-2 Test rule 2 broken',
      'stdin:1 test-rule-3 Test rule 3 broken',
      'stdin:1 test-rule-4 Test rule 4 broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rule from node_modules package loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', 'test-rule-package', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-package Test rule package broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rule from node_modules package loaded relative to cwd', async t => {
  try {
    const input = '# Input\n';
    await execa(path.resolve('..', 'markdownlint.js'),
      ['--rules', 'test-rule-package', '--stdin'], {
        input,
        cwd: path.join(__dirname, 'custom-rules', 'relative-to-cwd'),
        stripFinalNewline: false
      });
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-package Test rule package relative to cwd broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rule from package loaded', async t => {
  try {
    const input = '# Input\n';
    await execa('../markdownlint.js',
      ['--rules', './custom-rules/test-rule-package', '--stdin'],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-package Test rule package broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Custom rule from several packages loaded', async t => {
  try {
    const input = '# Input\n';
    await execa(
      '../markdownlint.js', [
        '--rules',
        './custom-rules/test-rule-package',
        '--rules',
        './custom-rules/test-rule-package-other',
        '--stdin'
      ],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'stdin:1 test-rule-package Test rule package broken',
      'stdin:1 test-rule-package-other Test rule package other broken',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('Invalid custom rule name reports error', async t => {
  try {
    const input = '# Input\n';
    await execa(
      '../markdownlint.js', [
        '--rules',
        'test-rule-package',
        '--rules',
        'invalid-package',
        '--stdin'
      ],
      {input, stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      'Cannot load custom rule invalid-package: No such rule',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('fixing errors in a file yields fewer errors', async t => {
  const fixFileA = 'incorrect.a.mdf';
  try {
    fs.copyFileSync('incorrect.md', fixFileA);
    await execa('../markdownlint.js',
      ['--fix', '--config', 'test-config.json', fixFileA],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    const expected = [
      fixFileA + ':1 MD002/first-heading-h1/first-header-h1 First heading should be a top level heading [Expected: h1; Actual: h2]',
      fixFileA + ':1 MD041/first-line-heading/first-line-h1 First line in file should be a top level heading [Context: "## header 2"]',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
    fs.unlinkSync(fixFileA);
  }
});

test('fixing errors in a file with absolute path yields fewer errors', async t => {
  const fixFileB = 'incorrect.b.mdf';
  try {
    fs.copyFileSync('incorrect.md', fixFileB);
    await execa('../markdownlint.js',
      ['--fix', '--config', 'test-config.json', path.resolve(fixFileB)],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 2);
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
    await execa('../markdownlint.js',
      ['--fix', '--config', 'test-config.json', fixFileGlob],
      {stripFinalNewline: false});
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.is(error.stderr.match(errorPattern).length, 4);
    fs.unlinkSync(fixFileC);
    fs.unlinkSync(fixSubFileC);
  }
});

test('.markdownlintignore is applied correctly', async t => {
  try {
    await execa(
      path.resolve('..', 'markdownlint.js'), ['.'], {
        cwd: path.join(__dirname, 'markdownlintignore'),
        stripFinalNewline: false
      });
    t.fail();
  } catch (error) {
    const expected = [
      'incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      'subdir/incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('.markdownlintignore works with semi-absolute paths', async t => {
  try {
    await execa(
      path.resolve('..', 'markdownlint.js'), ['./incorrect.md'], {
        cwd: path.join(__dirname, 'markdownlintignore'),
        stripFinalNewline: false
      });
    t.fail();
  } catch (error) {
    const expected = [
      './incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('--ignore-path works with .markdownlintignore', async t => {
  try {
    await execa(
      path.resolve('..', 'markdownlint.js'), ['--ignore-path', '.markdownlintignore', '.'], {
        cwd: path.join(__dirname, 'markdownlintignore'),
        stripFinalNewline: false
      });
    t.fail();
  } catch (error) {
    const expected = [
      'incorrect.md:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      'subdir/incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('--ignore-path works with .ignorefile', async t => {
  try {
    await execa(
      path.resolve('..', 'markdownlint.js'), ['--ignore-path', '.ignorefile', '.'], {
        cwd: path.join(__dirname, 'markdownlintignore'),
        stripFinalNewline: false
      });
    t.fail();
  } catch (error) {
    const expected = [
      'incorrect.markdown:1:8 MD047/single-trailing-newline Files should end with a single newline character',
      ''
    ].join('\n');
    t.is(error.stdout, '');
    t.is(error.stderr, expected);
  }
});

test('--ignore-path fails for missing file', async t => {
  const missingFile = 'missing-file';
  try {
    await execa(
      path.resolve('..', 'markdownlint.js'),
      ['--ignore-path', missingFile, '.'], {
        cwd: path.join(__dirname, 'markdownlintignore'),
        stripFinalNewline: false
      }
    );
    t.fail();
  } catch (error) {
    t.is(error.stdout, '');
    t.regex(error.stderr, /enoent.*no such file or directory/i);
  }
});
