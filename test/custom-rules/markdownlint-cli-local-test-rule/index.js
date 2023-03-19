module.exports = {
  names: ['markdownlint-cli-local-test-rule'],
  description: 'Test rule package broken',
  tags: ['test'],
  function: (parameters, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
