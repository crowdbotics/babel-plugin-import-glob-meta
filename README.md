# Babel Plugin Import Glob Meta

A babel plugin that converts imports with glob patterns to multiple imports of the matches found and adds metadata about those matches, including fetching a package.json `name` property.

Based on the ideas from:

- https://github.com/novemberborn/babel-plugin-import-glob
- https://github.com/jescalan/babel-plugin-import-glob-array

## Getting Started

Install with npm:

```sh
npm install babel-plugin-import-glob-meta --save-dev
```

And add it to the babel config as a plugin:

```javascript
plugins: ["import-glob-meta"];
```

## Usage

This plugin uses [is-glob](https://www.npmjs.com/package/is-glob) and [glob](https://www.npmjs.com/package/glob) to determine if an import pattern is a glob pattern and to find matching files, respectively.

It only supports default imports with a single specifier:

```javascript
import modules from "./*";
```

The pattern above is resolved into `index.js` matches, but one can also specify the filename after the glob marker:

```javascript
import options from "./*/options.js";
```

The first import example will be converted into something like this:

```javascript
import _ig from "./moduleA/index.js";
import _ig2 from "./module-B/index.js";

let modules = [
  {
    name: "moduleA",
    value: _ig,
    path: "./moduleA/index.js",
    package: "@modules/moduleA",
  },
  {
    name: "moduleB",
    value: _ig2,
    path: "./module-B/index.js",
    package: "@modules/module-B",
  },
];
```

Each object in `modules` is made of the following object properties:

- `name` - [identifierfy](https://github.com/novemberborn/identifierfy)'d name of the parent directory of the file.
- `value` - Reference of the placeholder specifier used in the import.
- `path` - Relative - to the file where the import is made - path of the matched file.
- `package` - Sibling - relative to the glob pattern - `package.json` `name` property.

## Errors

Whenever a named import or multiple imports are found the following code frame error is thrown:

> 'Can only import the default export from a glob pattern'

If there's no pattern matches the import is replaced by:

```javascript
let modules = [];
```
