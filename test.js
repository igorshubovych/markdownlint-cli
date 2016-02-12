import test from 'ava';
import execa from 'execa';

test('--version option', async t => {
  const result = await execa('./markdownlint.js', ['--version']);
  t.true(result.stdout.length > 0);
});

test('--help option', async t => {
  const result = await execa('./markdownlint.js', ['--help']);
  t.true(result.stdout.indexOf('markdownlint') >= 0);
  t.true(result.stdout.indexOf('--version') >= 0);
  t.true(result.stdout.indexOf('--help') >= 0);
});
