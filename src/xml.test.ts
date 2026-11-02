import { test, expect } from "vite-plus/test";
import xml from "./xml.ts";

test("no elements", () => {
  expect(xml()).toBe("");
  expect(xml([])).toBe("");
  expect(xml("test")).toBe("test");
  expect(xml("scotch & whisky")).toBe("scotch &amp; whisky");
  expect(xml("bob's escape character")).toBe("bob&apos;s escape character");
});

test("simple options", () => {
  expect(xml([{ a: {} }])).toBe("<a/>");
  expect(xml([{ a: null }])).toBe("<a/>");
  expect(xml([{ a: [] }])).toBe("<a></a>");
  expect(xml([{ a: -1 }])).toBe("<a>-1</a>");
  expect(xml([{ a: false }])).toBe("<a>false</a>");
  expect(xml([{ a: "test" }])).toBe("<a>test</a>");
  expect(xml({ a: {} })).toBe("<a/>");
  expect(xml({ a: null })).toBe("<a/>");
  expect(xml({ a: [] })).toBe("<a></a>");
  expect(xml({ a: -1 })).toBe("<a>-1</a>");
  expect(xml({ a: false })).toBe("<a>false</a>");
  expect(xml({ a: "test" })).toBe("<a>test</a>");
  expect(xml([{ a: "test" }, { b: 123 }, { c: -0.5 }])).toBe("<a>test</a><b>123</b><c>-0.5</c>");
});

test("deeply nested objects", () => {
  expect(xml([{ a: [{ b: [{ c: 1 }, { c: 2 }, { c: 3 }] }] }])).toBe(
    "<a><b><c>1</c><c>2</c><c>3</c></b></a>",
  );
});

test("indents property", () => {
  expect(xml([{ a: [{ b: [{ c: 1 }, { c: 2 }, { c: 3 }] }] }], true)).toBe(
    "<a>\n    <b>\n        <c>1</c>\n        <c>2</c>\n        <c>3</c>\n    </b>\n</a>",
  );
  expect(xml([{ a: [{ b: [{ c: 1 }, { c: 2 }, { c: 3 }] }] }], "  ")).toBe(
    "<a>\n  <b>\n    <c>1</c>\n    <c>2</c>\n    <c>3</c>\n  </b>\n</a>",
  );
  expect(xml([{ a: [{ b: [{ c: 1 }, { c: 2 }, { c: 3 }] }] }], "\t")).toBe(
    "<a>\n\t<b>\n\t\t<c>1</c>\n\t\t<c>2</c>\n\t\t<c>3</c>\n\t</b>\n</a>",
  );
  expect(xml({ guid: [{ _attr: { premalink: true } }, "content"] }, true)).toBe(
    '<guid premalink="true">content</guid>',
  );
});

test("supports xml attributes", () => {
  expect(xml([{ b: { _attr: {} } }])).toBe("<b/>");
  expect(
    xml([
      {
        a: {
          _attr: {
            attribute1: "some value",
            attribute2: 12345,
          },
        },
      },
    ]),
  ).toBe('<a attribute1="some value" attribute2="12345"/>');
  expect(
    xml([
      {
        a: [
          {
            _attr: {
              attribute1: "some value",
              attribute2: 12345,
            },
          },
        ],
      },
    ]),
  ).toBe('<a attribute1="some value" attribute2="12345"></a>');
  expect(
    xml([
      {
        a: [
          {
            _attr: {
              attribute1: "some value",
              attribute2: 12345,
            },
          },
          "content",
        ],
      },
    ]),
  ).toBe('<a attribute1="some value" attribute2="12345">content</a>');
});

test("supports cdata", () => {
  expect(xml([{ a: { _cdata: "This is some <strong>CDATA</strong>" } }])).toBe(
    "<a><![CDATA[This is some <strong>CDATA</strong>]]></a>",
  );
  expect(
    xml([
      {
        a: {
          _attr: { attribute1: "some value", attribute2: 12345 },
          _cdata: "This is some <strong>CDATA</strong>",
        },
      },
    ]),
  ).toBe(
    '<a attribute1="some value" attribute2="12345"><![CDATA[This is some <strong>CDATA</strong>]]></a>',
  );
  expect(
    xml([{ a: { _cdata: "This is some <strong>CDATA</strong> with ]]> and then again ]]>" } }]),
  ).toBe(
    "<a><![CDATA[This is some <strong>CDATA</strong> with ]]]]><![CDATA[> and then again ]]]]><![CDATA[>]]></a>",
  );
});

test("supports encoding", () => {
  expect(
    xml([
      {
        a: [
          {
            _attr: {
              anglebrackets: "this is <strong>strong</strong>",
              url: "http://google.com?s=opower&y=fun",
            },
          },
          "text",
        ],
      },
    ]),
  ).toBe(
    '<a anglebrackets="this is &lt;strong&gt;strong&lt;/strong&gt;" url="http://google.com?s=opower&amp;y=fun">text</a>',
  );
});

test("supports stream interface", () => {
  const elem = xml.element({ _attr: { decade: "80s", locale: "US" } });
  const xmlStream = xml({ toys: elem }, { stream: true });
  const results = [
    '<toys decade="80s" locale="US">',
    "<toy>Transformers</toy>",
    "<toy><name>He-man</name></toy>",
    "<toy>GI Joe</toy>",
    "</toys>",
  ];

  elem.push({ toy: "Transformers" });
  elem.push({ toy: [{ name: "He-man" }] });
  elem.push({ toy: "GI Joe" });
  elem.close();

  xmlStream.on("data", (stanza: string) => {
    expect(stanza).toBe(results.shift());
  });

  return new Promise<void>((resolve, reject) => {
    xmlStream.on("close", () => {
      expect(results).toEqual([]);
      resolve();
    });
    xmlStream.on("error", reject);
  });
});

test("streams end properly", () => {
  const elem = xml.element({ _attr: { decade: "80s", locale: "US" } });
  const xmlStream = xml({ toys: elem }, { stream: true });

  let gotData = false;

  expect.assertions(7);

  elem.push({ toy: "Transformers" });
  elem.push({ toy: "GI Joe" });
  elem.push({ toy: [{ name: "He-man" }] });
  elem.close();

  xmlStream.on("data", (data: string) => {
    expect(data).toBeTruthy();
    gotData = true;
  });

  xmlStream.on("end", () => {
    expect(gotData).toBeTruthy();
  });

  return new Promise<void>((resolve, reject) => {
    xmlStream.on("close", () => {
      expect(gotData).toBeTruthy();
      resolve();
    });
    xmlStream.on("error", reject);
  });
});

test("xml declaration options", () => {
  expect(xml([{ a: "test" }], { declaration: true })).toBe(
    '<?xml version="1.0" encoding="UTF-8"?><a>test</a>',
  );
  expect(xml([{ a: "test" }], { declaration: { encoding: "foo" } })).toBe(
    '<?xml version="1.0" encoding="foo"?><a>test</a>',
  );
  expect(xml([{ a: "test" }], { declaration: { standalone: "yes" } })).toBe(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a>test</a>',
  );
  expect(xml([{ a: "test" }], { declaration: false })).toBe("<a>test</a>");
  expect(xml([{ a: "test" }], { declaration: true, indent: "\n" })).toBe(
    '<?xml version="1.0" encoding="UTF-8"?>\n<a>test</a>',
  );
  expect(xml([{ a: "test" }], {})).toBe("<a>test</a>");
});
