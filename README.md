# xml

Zero-dependency, runtime-agnostic XML serializer for JavaScript and TypeScript.

## Usage

```ts
import { renderXML } from "xml";

const xml = renderXML(
  {
    rss: {
      "@version": "2.0",
      channel: {
        title: "Feed",
        link: "https://example.com",
        item: [
          { title: "First", $cdata: "Some <b>HTML</b>" },
          { title: "Second", "@featured": true, "@draft": undefined },
        ],
      },
    },
  },
  { declaration: true, indent: true },
);
```

Output:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Feed</title>
    <link>https://example.com</link>
    <item><![CDATA[Some <b>HTML</b>]]><title>First</title></item>
    <item featured="true">
      <title>Second</title>
    </item>
  </channel>
</rss>
```

## Syntax

| Input                                            | Output                         |
| ------------------------------------------------ | ------------------------------ |
| `{ tag: "text" }`                                | `<tag>text</tag>`              |
| `{ tag: "" }`                                    | `<tag></tag>`                  |
| `{ tag: null }` or `{ tag: {} }`                 | `<tag/>`                       |
| `{ tag: undefined }`                             | _(omitted)_                    |
| `{ tag: [1, 2] }`                                | `<tag>1</tag><tag>2</tag>`     |
| `[{ a: 1 }, { b: 2 }, { a: 3 }]`                 | `<a>1</a><b>2</b><a>3</a>`     |
| `{ tag: { "@id": 1, $text: "hi" } }`             | `<tag id="1">hi</tag>`         |
| `{ tag: { $attr: { id: 1, skip: undefined } } }` | `<tag id="1"/>`                |
| `{ tag: { $cdata: "1 < 2" } }`                   | `<tag><![CDATA[1 < 2]]></tag>` |

`null` and `undefined` attribute values are ignored automatically.

## Options

```ts
renderXML(node, {
  // true = 2 spaces, number = N spaces, string = custom indent (e.g. "\t")
  indent: true,

  // true or { version?: string, encoding?: string, standalone?: boolean | "yes" | "no" }
  declaration: { encoding: "UTF-8", standalone: true },
});
```

## Utilities

```ts
import { escapeXML } from "xml";

escapeXML(`a & b < c > "d" 'e'`);
// => "a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;"
```

## License

MIT
