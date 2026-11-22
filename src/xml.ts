const XML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
};

export type XMLPrimitive = string | number | boolean | null | undefined;

export interface XMLObject {
  [key: `@${string}`]: XMLPrimitive;
  $attr?: Record<string, XMLPrimitive>;
  $text?: XMLPrimitive;
  $cdata?: string;
  [tag: string]: XMLNode;
}

export type XMLNode = XMLPrimitive | XMLObject | XMLNode[];

export interface XMLDeclaration {
  version?: string;
  encoding?: string;
  standalone?: boolean | "yes" | "no";
}

export interface RenderXMLOptions {
  indent?: boolean | number | string;
  declaration?: boolean | XMLDeclaration;
}

export function escapeXML(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => XML_ESCAPE_MAP[char]!);
}

export function renderXML(node?: XMLNode, options: RenderXMLOptions = {}): string {
  const indent = resolveIndent(options.indent);
  const parts: string[] = [];

  if (options.declaration) {
    parts.push(renderDeclaration(options.declaration));
  }

  parts.push(...renderNode(node, indent, 0));

  return parts.join(indent ? "\n" : "");
}

export { renderXML as xml };
export default renderXML;

function resolveIndent(indent?: boolean | number | string): string {
  if (indent === true) return "  ";
  if (typeof indent === "number") return " ".repeat(Math.max(0, indent));
  if (typeof indent === "string") return indent;
  return "";
}

function renderDeclaration(declaration: boolean | XMLDeclaration): string {
  const decl = typeof declaration === "object" ? declaration : {};
  const version = escapeXML(decl.version ?? "1.0");
  const encoding = escapeXML(decl.encoding ?? "UTF-8");
  const standalone =
    decl.standalone === true ? "yes" : decl.standalone === false ? "no" : decl.standalone;

  return `<?xml version="${version}" encoding="${encoding}"${
    standalone ? ` standalone="${escapeXML(standalone)}"` : ""
  }?>`;
}

function renderNode(node: XMLNode, indent: string, depth: number): string[] {
  if (node === undefined || node === null) {
    return [];
  }
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    const text = escapeXML(String(node));
    return text ? [indent.repeat(depth) + text] : [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((item) => renderNode(item, indent, depth));
  }
  return Object.entries(node).flatMap(([tag, value]) => renderTag(tag, value, indent, depth));
}

function renderTag(name: string, value: XMLNode, indent: string, depth: number): string[] {
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => renderTag(name, item, indent, depth));
  }

  const pad = indent.repeat(depth);

  if (value === null) {
    return [`${pad}<${name}/>`];
  }
  if (typeof value !== "object") {
    return [`${pad}<${name}>${escapeXML(String(value))}</${name}>`];
  }

  const attrs: string[] = [];
  const inline: string[] = [];
  const children: string[] = [];
  let hasInline = false;

  for (const [key, val] of Object.entries(value)) {
    if (key === "$attr" && val !== null && typeof val === "object" && !Array.isArray(val)) {
      for (const [attrName, attrVal] of Object.entries(val)) {
        if (attrVal !== undefined && attrVal !== null) {
          attrs.push(`${attrName}="${escapeXML(String(attrVal))}"`);
        }
      }
    } else if (key.startsWith("@")) {
      if (val !== undefined && val !== null) {
        attrs.push(`${key.slice(1)}="${escapeXML(String(val))}"`);
      }
    } else if (key === "$text") {
      if (val !== undefined && val !== null) {
        hasInline = true;
        inline.push(escapeXML(String(val)));
      }
    } else if (key === "$cdata") {
      if (val !== undefined && val !== null) {
        hasInline = true;
        inline.push(`<![CDATA[${String(val).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`);
      }
    } else {
      children.push(...renderTag(key, val as XMLNode, indent, depth + 1));
    }
  }

  const attrString = attrs.length ? ` ${attrs.join(" ")}` : "";

  if (children.length > 0) {
    if (hasInline) {
      children.unshift(indent.repeat(depth + 1) + inline.join(""));
    }
    const sep = indent ? "\n" : "";
    return [`${pad}<${name}${attrString}>${sep}${children.join(sep)}${sep}${pad}</${name}>`];
  }

  if (hasInline) {
    return [`${pad}<${name}${attrString}>${inline.join("")}</${name}>`];
  }

  return [`${pad}<${name}${attrString}/>`];
}
