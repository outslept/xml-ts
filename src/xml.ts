import { PassThrough } from "node:stream";
import escapeForXML from "./escapeForXML.js";

const DEFAULT_INDENT = "    ";

export interface XmlDeclaration {
  encoding?: string;
  standalone?: string | boolean;
}

export interface XmlOptions {
  indent?: string | boolean;
  stream?: boolean;
  declaration?: XmlDeclaration;
}

export type XmlOptionsInput = XmlOptions | string | boolean | null;

export interface XmlElementData {
  name: string | undefined;
  interrupt: XmlElementHandle | false;
  attributes: string[];
  content: unknown[];
  icount: number;
  indents: string;
  indent: string;
}

export interface XmlElementHandle {
  _elem: XmlElementData;
  append?: (interrupt: boolean, output?: unknown) => void;
  end?: () => void;
  push(input: unknown): void;
  close(input?: unknown): void;
}

type Append = (interrupt: boolean, output?: unknown) => void;

export function element(...input: unknown[]): XmlElementHandle {
  const self: XmlElementHandle = {
    _elem: resolve(input),

    push(input: unknown) {
      const append = this.append;
      if (!append) {
        throw new Error("not assigned to a parent!");
      }

      const { indent, icount } = this._elem;

      format(append, resolve(input, indent, icount + (indent ? 1 : 0)), () => append(true));
    },

    close(input?: unknown) {
      if (input !== undefined) {
        this.push(input);
      }
      this.end?.();
    },
  };

  return self;
}

export const xml = Object.assign(
  function xml(input: unknown, options: XmlOptionsInput = {}): string | PassThrough {
    const settings: XmlOptions =
      options !== null && typeof options === "object"
        ? options
        : { indent: options as string | boolean | undefined };

    let stream: PassThrough | null = settings.stream ? new PassThrough() : null;
    let output = "";
    let interrupted = false;
    let instant = true;

    const indent =
      settings.indent === true
        ? DEFAULT_INDENT
        : typeof settings.indent === "string"
          ? settings.indent
          : "";

    const delay = (callback: () => void): void => {
      if (instant) {
        queueMicrotask(callback);
      } else {
        callback();
      }
    };

    const append: Append = (interrupt, out) => {
      if (out !== undefined) {
        output += out as string;
      }

      if (interrupt && !interrupted) {
        stream ??= new PassThrough();
        interrupted = true;
      }

      if (interrupt && interrupted) {
        const data = output;
        output = "";

        delay(() => {
          stream?.write(data);
        });
      }
    };

    const add = (value: unknown, last?: () => void): void => {
      format(append, resolve(value, indent, indent ? 1 : 0), last);
    };

    const end = (): void => {
      if (!stream) return;

      const data = output;
      output = "";

      delay(() => {
        stream?.write(data);
        stream?.end();
      });
    };

    const addXmlDeclaration = (declaration: XmlDeclaration): void => {
      const attributes: Record<string, unknown> = {
        version: "1.0",
        encoding: declaration.encoding || "UTF-8",
      };

      if (declaration.standalone) {
        attributes.standalone = declaration.standalone;
      }

      add({ "?xml": { _attr: attributes } });
      output = output.replace("/>", "?>");
    };

    queueMicrotask(() => {
      instant = false;
    });

    if (settings.declaration) {
      addXmlDeclaration(settings.declaration);
    }

    if (Array.isArray(input)) {
      let hasFinalValue = false;

      input.forEach((value, index) => {
        const isLast = index === input.length - 1;
        if (isLast) hasFinalValue = true;
        add(value, isLast ? end : undefined);
      });

      if (!hasFinalValue) {
        end();
      }
    } else {
      add(input, end);
    }

    return stream ?? output;
  },
  { element, Element: element },
);

export default xml;

function resolve(data: unknown, indent = "", indentCount = 0): XmlElementData {
  const indentSpaces = createIndent(indent, indentCount);
  let name: string | undefined;
  let values = data;
  let interrupt: XmlElementHandle | false = false;

  if (data !== null && typeof data === "object") {
    const keys = Object.keys(data);
    name = keys[0];
    values = (data as Record<string, unknown>)[name as string];

    if (isElementHandle(values)) {
      const elem = values._elem;
      elem.name = name;
      elem.icount = indentCount;
      elem.indent = indent;
      elem.indents = indentSpaces;
      elem.interrupt = values;
      return elem;
    }
  }

  const attributes: string[] = [];
  const content: unknown[] = [];

  const getAttributes = (value: unknown): void => {
    for (const key of Object.keys(Object(value))) {
      attributes.push(attribute(key, (value as Record<string, unknown>)[key]));
    }
  };

  if (values !== null && typeof values === "object") {
    const record = values as Record<string, unknown>;

    if (record._attr) {
      getAttributes(record._attr);
    }

    if (record._cdata) {
      const cdata = record._cdata as string;
      content.push(("<![CDATA[" + cdata).replace(/\]\]>/g, "]]]]><![CDATA[>") + "]]>");
    }

    if (Array.isArray(values)) {
      let isStringContent = false;
      content.push("");

      values.forEach((value: unknown) => {
        if (value !== null && typeof value === "object") {
          const childName = Object.keys(value)[0];

          if (childName === "_attr") {
            getAttributes((value as Record<string, unknown>)._attr);
          } else {
            content.push(resolve(value, indent, indentCount + 1));
          }
        } else {
          content.pop();
          isStringContent = true;
          content.push(escapeForXML(value));
        }
      });

      if (!isStringContent) {
        content.push("");
      }
    }
  } else if (values !== null) {
    content.push(escapeForXML(values));
  }

  return {
    name,
    interrupt,
    attributes,
    content,
    icount: indentCount,
    indents: indentSpaces,
    indent,
  };
}

function createIndent(character: string, count: number): string {
  return character.repeat(Math.max(0, count - 1));
}

function isElementHandle(value: unknown): value is XmlElementHandle {
  return (
    value !== null &&
    typeof value === "object" &&
    "_elem" in value &&
    Boolean((value as { _elem?: unknown })._elem)
  );
}

function format(append: Append, input: unknown, end?: () => void): void {
  if (input === null || typeof input !== "object") {
    append(false, input);
    end?.();
    return;
  }

  const elem = input as XmlElementData;
  const len = elem.interrupt ? 1 : elem.content.length;
  let contentIndex = 0;

  function proceed(): void {
    while (contentIndex < elem.content.length) {
      const value = elem.content[contentIndex++];

      if (value === undefined) continue;
      if (interrupt(value)) return;

      format(append, value);
    }

    append(
      false,
      (len > 1 ? elem.indents : "") +
        (elem.name ? `</${elem.name}>` : "") +
        (elem.indent && !end ? "\n" : ""),
    );

    end?.();
  }

  function interrupt(value: unknown): boolean {
    if (value === null || typeof value !== "object") return false;

    const child = value as XmlElementData;
    if (!child.interrupt) return false;

    const handle = child.interrupt;
    handle.append = append;
    handle.end = proceed;
    child.interrupt = false;
    append(true);

    return true;
  }

  append(
    false,
    elem.indents +
      (elem.name ? `<${elem.name}` : "") +
      (elem.attributes.length ? ` ${elem.attributes.join(" ")}` : "") +
      (len ? (elem.name ? ">" : "") : elem.name ? "/>" : "") +
      (elem.indent && len > 1 ? "\n" : ""),
  );

  if (!len) {
    append(false, elem.indent ? "\n" : "");
    end?.();
    return;
  }

  if (!interrupt(elem)) {
    proceed();
  }
}

function attribute(key: string, value: unknown): string {
  return key + '="' + (escapeForXML(value) as string) + '"';
}
