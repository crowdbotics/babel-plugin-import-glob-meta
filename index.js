const glob = require('glob');
const isGlob = require('is-glob');
const Path = require('path');
const fs = require('fs');

/* Checks the type of the import specifiers. Throws an error if any specifier isn't a default specifier. */
function assertImportDefaultSpecifier(path, specifiers) {
  let hasError = specifiers.length === 0 || specifiers.length > 1
  if (!hasError) {
    for (const { type } of specifiers) {
      if (type !== 'ImportDefaultSpecifier') {
        hasError = true
        break
      }
    }
  }
  if (hasError) {
    throw path.buildCodeFrameError('Can only import the default export from a glob pattern');
  }
}

/* Read a sibling package.json file and return the name property from it. */
function readPackageName(index) {
  let pkg = fs.readFileSync(Path.join(Path.dirname(index), "package.json"), 'utf8');
  return JSON.parse(pkg).name;
}

module.exports = function importGlobMetaPlugin(babel) {
  const { types: t } = babel;

  return {
    visitor: {
      ImportDeclaration(path, state) {
        const { node: { specifiers, source } } = path

        const importPath = source.value
        const currentFilePath = state.file.opts.filename
        const baseDir = Path.resolve(Path.dirname(currentFilePath))

        // If this is not a local import, don't do anything
        if (importPath[0] !== '.' && importPath[0] !== '/') return

        // If the import specifier doesn't contain a glob pattern, don't do anything
        if (!isGlob(importPath)) return

        assertImportDefaultSpecifier(path, specifiers)

        // Find file matches based on the glob pattern
        let files = glob.sync(
          Path.join(baseDir, importPath),
          {
            cwd: currentFilePath,
            nodir: true,
            strict: true
          }
        )

        // Ignore the current file itself
        const removeCurrent = item => {
          return item != currentFilePath
        }

        // Assume index.js if there's no trailing filename in the pattern
        const onlyIndex = item => {
          let isMainImport = importPath[importPath.length - 1] === "*";
          let isIndex = Path.basename(item) == "index.js";
          if (isMainImport) {
            return isIndex
          } else {
            return true
          }
        }

        files = files.filter(removeCurrent).filter(onlyIndex)

        // Compute relative paths
        files = files.map(file => {
          rel = Path.relative(baseDir, file)
          if (rel.charAt(0) != ".") {
            rel = `./${rel}`
          }
          return rel
        })

        let dict = []
        files.map(file => {
          let name = readPackageName(Path.resolve(baseDir, file));
          // Generate an unique placeholder for the import specifier name
          const placeholder = path.scope.generateUid('_ig')
          dict.push({
            name, file, placeholder
          })
        })

        let importRemappings = [], assignRemappings = [];
        dict.map(item => {
          // Add import with placeholder name for specifier and relative path as source
          importRemappings.push(
            t.importDeclaration(
              [
                t.importDefaultSpecifier(t.identifier(item.placeholder))
              ],
              t.stringLiteral(item.file)
            )
          )
          // Add an object with name, value and path of the imported object
          assignRemappings.push(
            t.objectExpression(
              [
                t.objectProperty(
                  t.stringLiteral("name"), t.stringLiteral(item.name)
                ),
                t.objectProperty(
                  t.stringLiteral("value"), t.identifier(item.placeholder)
                ),
                t.objectProperty(
                  t.stringLiteral("path"), t.stringLiteral(item.file)
                )
              ]
            )
          )
        });

        let assignMap = t.variableDeclaration("let", [
          t.variableDeclarator(t.identifier(specifiers[0].local.name), t.arrayExpression(
            assignRemappings
          ))
        ])

        // Replace the path with the new imports and variable assignment
        path.replaceWithMultiple([
          ...importRemappings,
          assignMap
        ])
      }
    }
  };
};
