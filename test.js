import test from 'ava';
import execa from 'execa';

test(async t => {
  t.true((await execa('./cli.js', ['--version'])).stdout.length > 0);
});
