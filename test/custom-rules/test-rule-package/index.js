module.exports = {
  names: ['test-rule-package'],
  description: 'Test rule package broken',
  tags: ['test'],
  function: (params, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
