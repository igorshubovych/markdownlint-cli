import test from 'ava';
import execa from 'execa';

test(async t => {
  t.true((await execa('./markdownlint.js', ['--version'])).stdout.length > 0);
});
