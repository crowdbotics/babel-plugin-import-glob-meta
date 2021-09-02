module.exports = function testPlugin(babel) {
  const { types: t } = babel;

  return {
    visitor: {
      ImportDeclaration(path, state) {
        // console.log("Found Import")
      }
    }
  };
};
