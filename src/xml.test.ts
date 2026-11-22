import { test, expect } from "vite-plus/test";
import { renderXML, escapeXML } from "./xml.ts";

test("empty and primitive values", () => {
  expect(renderXML()).toBe("");
  expect(renderXML(null)).toBe("");
  expect(renderXML([])).toBe("");
  expect(renderXML("")).toBe("");
  expect(renderXML("test")).toBe("test");
  expect(renderXML("scotch & whisky")).toBe("scotch &amp; whisky");
  expect(renderXML(`bob's "quote" <tag>`)).toBe("bob&apos;s &quot;quote&quot; &lt;tag&gt;");
  expect(escapeXML(`&"'<>`)).toBe("&amp;&quot;&apos;&lt;&gt;");
});

test("basic elements and empty states", () => {
  expect(renderXML({ a: {} })).toBe("<a/>");
  expect(renderXML({ a: null })).toBe("<a/>");
  expect(renderXML({ a: "" })).toBe("<a></a>");
  expect(renderXML({ a: undefined })).toBe("");
  expect(renderXML({ a: -1 })).toBe("<a>-1</a>");
  expect(renderXML({ a: false })).toBe("<a>false</a>");
  expect(renderXML({ a: "test" })).toBe("<a>test</a>");
  expect(renderXML({ a: "test", b: 123, c: -0.5 })).toBe("<a>test</a><b>123</b><c>-0.5</c>");
  expect(renderXML([{ a: 1 }, { b: 2 }, { a: 3 }])).toBe("<a>1</a><b>2</b><a>3</a>");
});

test("nested objects and repeated tag arrays", () => {
  expect(renderXML({ a: { b: { c: [1, 2, 3] } } })).toBe("<a><b><c>1</c><c>2</c><c>3</c></b></a>");
  expect(renderXML({ a: { b: [] } })).toBe("<a/>");
});

test("attributes via @prefix and $attr", () => {
  expect(renderXML({ b: { $attr: {} } })).toBe("<b/>");
  expect(
    renderXML({
      a: {
        "@attribute1": "some value",
        "@attribute2": 12345,
        "@ignored": undefined,
        "@nullish": null,
      },
    }),
  ).toBe('<a attribute1="some value" attribute2="12345"/>');

  expect(
    renderXML({
      a: {
        $attr: {
          anglebrackets: "this is <strong>strong</strong>",
          url: "http://google.com?s=opower&y=fun",
          empty: undefined,
        },
        $text: "text",
      },
    }),
  ).toBe(
    '<a anglebrackets="this is &lt;strong&gt;strong&lt;/strong&gt;" url="http://google.com?s=opower&amp;y=fun">text</a>',
  );

  expect(
    renderXML({
      a: {
        "@id": "1",
        $text: "",
      },
    }),
  ).toBe('<a id="1"></a>');
});

test("cdata support", () => {
  expect(renderXML({ a: { $cdata: "This is some <strong>CDATA</strong>" } })).toBe(
    "<a><![CDATA[This is some <strong>CDATA</strong>]]></a>",
  );
  expect(
    renderXML({
      a: {
        "@attribute1": "some value",
        "@attribute2": 12345,
        $cdata: "This is some <strong>CDATA</strong>",
      },
    }),
  ).toBe(
    '<a attribute1="some value" attribute2="12345"><![CDATA[This is some <strong>CDATA</strong>]]></a>',
  );
  expect(
    renderXML({
      a: { $cdata: "This is some <strong>CDATA</strong> with ]]> and then again ]]>" },
    }),
  ).toBe(
    "<a><![CDATA[This is some <strong>CDATA</strong> with ]]]]><![CDATA[> and then again ]]]]><![CDATA[>]]></a>",
  );
});

test("indentation options", () => {
  const tree = { a: { b: { c: [1, 2, 3] } } };

  expect(renderXML(tree, { indent: true })).toBe(
    "<a>\n  <b>\n    <c>1</c>\n    <c>2</c>\n    <c>3</c>\n  </b>\n</a>",
  );
  expect(renderXML(tree, { indent: 4 })).toBe(
    "<a>\n    <b>\n        <c>1</c>\n        <c>2</c>\n        <c>3</c>\n    </b>\n</a>",
  );
  expect(renderXML(tree, { indent: "\t" })).toBe(
    "<a>\n\t<b>\n\t\t<c>1</c>\n\t\t<c>2</c>\n\t\t<c>3</c>\n\t</b>\n</a>",
  );
  expect(renderXML({ guid: { "@permalink": true, $text: "content" } }, { indent: true })).toBe(
    '<guid permalink="true">content</guid>',
  );
});

test("xml declaration", () => {
  expect(renderXML({ a: "test" }, { declaration: true })).toBe(
    '<?xml version="1.0" encoding="UTF-8"?><a>test</a>',
  );
  expect(renderXML({ a: "test" }, { declaration: { encoding: "foo" } })).toBe(
    '<?xml version="1.0" encoding="foo"?><a>test</a>',
  );
  expect(renderXML({ a: "test" }, { declaration: { standalone: true } })).toBe(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a>test</a>',
  );
  expect(renderXML({ a: "test" }, { declaration: { standalone: false } })).toBe(
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?><a>test</a>',
  );
  expect(renderXML({ a: "test" }, { declaration: false })).toBe("<a>test</a>");
  expect(renderXML({ a: "test" }, { declaration: true, indent: true })).toBe(
    '<?xml version="1.0" encoding="UTF-8"?>\n<a>test</a>',
  );
});
