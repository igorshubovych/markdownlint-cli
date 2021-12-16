module.exports = {
  names: ['test-rule-1'],
  description: 'Test rule broken',
  tags: ['test'],
  function: (parameters, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
