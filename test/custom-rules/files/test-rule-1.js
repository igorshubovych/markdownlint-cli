module.exports = {
  names: ['test-rule-1'],
  description: 'Test rule broken',
  tags: ['test'],
  function: (params, onError) => {
    onError({
      lineNumber: 1
    });
  }
};
