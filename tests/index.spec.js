const babel = require('babel-core');
const plugin = require('../');
const path = require('path');
const fs = require('fs');

function loadFixture() {
  const fixture = path.join(__dirname, "fixtures", "index.js");
  return {
    content: fs.readFileSync(fixture, 'utf8'),
    path: fixture
  }
}

it('converts named glob imports', () => {
  const { content } = loadFixture();
  const { code } = babel.transform(content, { plugins: [plugin] });
  expect(code).toMatchSnapshot();
});
