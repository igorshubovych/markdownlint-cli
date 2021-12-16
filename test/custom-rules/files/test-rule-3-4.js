module.exports = [
  {
    names: ['test-rule-3'],
    description: 'Test rule 3 broken',
    tags: ['test'],
    function: (parameters, onError) => {
      onError({
        lineNumber: 1
      });
    }
  },
  {
    names: ['test-rule-4'],
    description: 'Test rule 4 broken',
    tags: ['test'],
    function: (parameters, onError) => {
      onError({
        lineNumber: 1
      });
    }
  }
];
