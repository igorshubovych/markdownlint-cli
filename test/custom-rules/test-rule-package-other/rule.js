module.exports = {
  names: ['test-rule-package-other'],
  description: 'Test rule package other broken',
  tags: ['test'],
  function: (params, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
