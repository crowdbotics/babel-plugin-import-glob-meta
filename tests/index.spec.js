const babel = require("babel-core");
const plugin = require("../");
const path = require("path");
const fs = require("fs");

function loadFixture(name) {
  const fixture = path.join(__dirname, "fixtures", name);
  return {
    content: fs.readFileSync(fixture, "utf8"),
    filename: fixture
  };
}

it("converts default glob imports", () => {
  const { content, filename } = loadFixture("index.js");
  const { code } = babel.transform(content, {
    plugins: [[plugin, { fs: fs }]],
    filename
  });
  expect(code).toMatchSnapshot();
});

it("throws error on named glob imports", () => {
  const { content, filename } = loadFixture("index.bad.js");
  expect(() =>
    babel.transform(content, {
      plugins: [[plugin, { fs: fs }]],
      filename
    })
  ).toThrow("Can only import the default export from a glob pattern");
});

it("returns empty array on zero matches", () => {
  const { content, filename } = loadFixture("index.empty.js");
  const { code } = babel.transform(content, {
    plugins: [[plugin, { fs: fs }]],
    filename
  });
  expect(code).toMatchSnapshot();
});

it("gracefully resolves package names when fs isn't available (i.e. in a browser)", () => {
  const { content, filename } = loadFixture("index.js");
  const { code } = babel.transform(content, {
    plugins: [[plugin, { fs: undefined }]],
    filename
  });
  expect(code).toMatchSnapshot();
});
