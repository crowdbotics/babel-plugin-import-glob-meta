const babel = require('babel-core');
const plugin = require('../');
const path = require('path');
const fs = require('fs');

function loadFixture(name) {
  const fixture = path.join(__dirname, "fixtures", name);
  return {
    content: fs.readFileSync(fixture, 'utf8'),
    filename: fixture
  }
}

it('converts default glob imports', () => {
  const { content, filename } = loadFixture("index.js");
  const { code } = babel.transform(content, { plugins: [plugin], filename });
  expect(code).toMatchSnapshot();
});

it('throws error on named glob imports', () => {
  const { content, filename } = loadFixture("index.bad.js");
  expect(() => babel.transform(content, { plugins: [plugin], filename }))
    .toThrow('Can only import the default export from a glob pattern');
});
