const XML_CHARACTER_MAP: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
};

type Replaceable = {
  replace(pattern: RegExp, replacer: (match: string, character: string) => string): unknown;
};

export default function escapeForXML(value: unknown): unknown {
  if (value && typeof (value as { replace?: unknown }).replace === "function") {
    return (value as Replaceable).replace(
      /([&"<>'])/g,
      (_match, character) => XML_CHARACTER_MAP[character]!,
    );
  }

  return value;
}
