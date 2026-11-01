# xml-ts

TypeScript ESM port of [`xml`](https://github.com/dylang/node-xml) for generating XML strings and Node.js streams from plain objects, with support for attributes, CDATA, indentation, and async streaming elements.

## Usage

### Basic XML, Attributes & CDATA

Each XML element is represented as a single-key object `{ tagName: content }`:

```ts
import { xml } from "xml-ts";

const output = xml(
  {
    toys: [
      { _attr: { Decade: "80s", Locale: "US" } },
      { toy: "Transformers" },
      { toy: [{ _attr: { knowing: "half the battle" } }, "GI Joe"] },
      {
        toy: [
          { name: "He-Man" },
          { description: { _cdata: "<strong>Master of the Universe!</strong>" } },
        ],
      },
    ],
  },
  { indent: "  ", declaration: { encoding: "UTF-8", standalone: "yes" } },
);
```

Output:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<toys Decade="80s" Locale="US">
  <toy>Transformers</toy>
  <toy knowing="half the battle">GI Joe</toy>
  <toy>
    <name>He-Man</name>
    <description><![CDATA[<strong>Master of the Universe!</strong>]]></description>
  </toy>
</toys>
```

### Streaming with `xml.element()`

Use `element()` (or `{ stream: true }`) to return a Node.js `PassThrough` stream and push child nodes asynchronously:

```ts
import { xml, element } from "xml-ts";

const itemStream = element({ _attr: { Decade: "80s" } });
const stream = xml({ toys: itemStream }, { stream: true, indent: true });

stream.pipe(process.stdout);

itemStream.push({ toy: "Transformers" });
itemStream.push({ toy: "GI Joe" });
itemStream.close({ toy: "He-Man" });
```

## API

### `xml(input: unknown, options?: XmlOptionsInput): string | PassThrough`

Serializes `input` into an XML string (or a `PassThrough` stream when `options.stream` is `true` or an unclosed `element()` is used). Passing a `boolean` or `string` as the second argument is shorthand for `{ indent: options }`.

| Option | Type | Default | Description |
|---|---|---|---|
| `indent` | `boolean \| string` | `false` | Pretty-print with indentation (`true` uses 4 spaces, or pass a custom string like `"\t"`). |
| `stream` | `boolean` | `false` | Always return a Node.js `PassThrough` stream. |
| `declaration` | `XmlDeclaration` | `undefined` | Prepend `<?xml version="1.0" ...?>` with optional `encoding` (default `"UTF-8"`) and `standalone`. |

### Special Keys

- `_attr`: Object of key-value pairs rendered as XML attributes on the element.
- `_cdata`: String wrapped in `<![CDATA[...]]>` (automatically escapes nested `]]>` sequences).
- `null` / `[]`: Renders a self-closing tag (`<tag/>`).

### `element(...input: unknown[]): XmlElementHandle`
Aliases: `xml.element`, `xml.Element`

Creates a deferred element handle for streaming:
- `handle.push(input)` - format and flush a child element to the parent stream.
- `handle.close(input?)` - optionally push a final child element and close the tag.
