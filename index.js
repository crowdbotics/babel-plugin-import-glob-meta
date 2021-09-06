const glob = require('glob');
const isGlob = require('is-glob');
const Path = require('path');
const fs = require('fs');
const identifierfy = require('identifierfy');

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
  let pkgPath = Path.join(Path.dirname(index), "package.json")
  if (!fs.exists(pkgPath)) {
    return
  }
  let pkg = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(pkg).name;
}

// From novemberborn/babel-plugin-import-glob
function memberify(subpath) {
  const pieces = subpath.split(Path.sep)
  const prefixReservedWords = pieces.length === 1
  const ids = []
  for (let index = 0; index < pieces.length; index++) {
    const name = pieces[index]
    const id = identifierfy(name, {
      prefixReservedWords,
      prefixInvalidIdentifiers: index === 0
    })
    if (id === null) {
      return null
    }
    ids.push(id)
  }
  return ids.join('$')
}

function generateNameForImport(file, baseDir) {
  const name = memberify(Path.basename(Path.dirname(file)))
  const pakage = readPackageName(Path.resolve(baseDir, file));

  if (!pakage) {
    pakage = name
  }

  return {
    name, pakage
  }
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

        // Return let modules = [] on no matches
        if (!files) {
          path.replaceWith(
            t.variableDeclaration("let", [
              t.variableDeclarator(
                t.identifier(specifiers[0].local.name), t.arrayExpression([])
              )
            ])
          )
          return
        }

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

        const noDeepSearch = item => {
          let depth = Path.relative(baseDir, item).split(Path.sep).length;
          return depth == 2
        }

        files = files.filter(removeCurrent).filter(onlyIndex).filter(noDeepSearch);

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
          const { name, pakage } = generateNameForImport(file, baseDir)
          // Generate an unique placeholder for the import specifier name
          const placeholder = path.scope.generateUid('_ig')
          dict.push({
            name, file, placeholder, pakage
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
          // Add an object with name, value, path and package of the imported object
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
                ),
                t.objectProperty(
                  t.stringLiteral("package"), t.stringLiteral(item.pakage)
                ),
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
