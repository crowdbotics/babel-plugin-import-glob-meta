# Babel Plugin Import Glob Meta

A babel plugin that converts imports with glob patterns to multiple imports of the matches found and adds metadata about those matches, including fetching a package.json `name` property.

## Getting Started

Install with npm:

```sh
npm install babel-plugin-import-glob-meta --save-dev
```

And add it to the babel config as a plugin:

```javascript
plugins: ['import-glob-meta]
```

## Usage

This plugin uses [is-glob](https://www.npmjs.com/package/is-glob) and [glob](https://www.npmjs.com/package/glob) to determine if an import pattern is a glob pattern and to find matching files, respectively.

It only supports default imports with a single specifier:

```javascript
import modules from "./**";
```

The pattern above is resolved into `index.js` matches, but one can also specify the filename after the glob marker:

```javascript
import options from "./**/options.js";
```

The first import example will be converted into something like this:

```javascript
import _ig from "./moduleA/index.js";
import _ig2 from "./moduleB/index.js";

let modules = [
  {
    name: "@modules/moduleA",
    value: _ig,
    path: "./moduleA/index.js",
  },
  {
    name: "@modules/moduleB",
    value: _ig2,
    path: "./moduleB/index.js",
  },
];
```

Each object in `modules` is made of the following object properties:

- `name` - Sibling - relative to the glob pattern - `package.json` `name` property.
- `value` - Reference of the placeholder specifier used in the import.
- `path` - Relative - to the file where the import is made - path of the matched file.

## Errors

Whenever a named import or multiple imports are found the following code frame error is thrown:

> 'Can only import the default export from a glob pattern'
