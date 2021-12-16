module.exports = {
  names: ['test-rule-package-other'],
  description: 'Test rule package other broken',
  tags: ['test'],
  function: (parameters, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
