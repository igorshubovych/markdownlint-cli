module.exports = {
  names: ['markdownlint-cli-local-test-rule-other'],
  description: 'Test rule package other broken',
  tags: ['test'],
  function: (parameters, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
