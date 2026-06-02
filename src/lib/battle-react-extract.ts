/** Pull a React Variant component from model output (jsx fence or raw function). */
export function extractVariantCode(text: string): string | null {
  const completeFence = text.match(/```(?:jsx|tsx|javascript|js)?\n([\s\S]*?)```/);
  if (completeFence) {
    return normalizeVariantCode(completeFence[1]);
  }

  if (/```(?:jsx|tsx|javascript|js)?\n/.test(text) && !completeFence) {
    return null;
  }

  if (text.includes("function Variant") && text.includes("return")) {
    return normalizeVariantCode(text);
  }

  return null;
}

/** JSX string for AI Elements JSXPreview (return body only). */
export function extractVariantJsx(text: string, streaming = false): string | null {
  const completeFence = text.match(/```(?:jsx|tsx|javascript|js)?\n([\s\S]*?)```/);
  const source = completeFence?.[1] ?? (streaming ? text.match(/```(?:jsx|tsx|javascript|js)?\n([\s\S]*)$/)?.[1] : undefined);

  if (source) {
    return jsxFromVariantSource(source, streaming && !completeFence);
  }

  if (text.includes("function Variant") && text.includes("return")) {
    return jsxFromVariantSource(text, streaming);
  }

  return null;
}

function normalizeVariantCode(raw: string): string | null {
  let code = raw.trim();
  if (!code.includes("function Variant")) {
    return null;
  }

  code = code
    .replace(/export\s+default\s+function\s+Variant/g, "function Variant")
    .replace(/export\s+default\s+/g, "")
    .replace(/:\s*React\.FC<[^>]*>/g, "")
    .replace(/:\s*JSX\.Element/g, "")
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n");

  return code;
}

function extractBalancedReturnBody(code: string): string | null {
  const returnMatch = code.match(/\breturn\s*\(/);
  if (!returnMatch || returnMatch.index === undefined) return null;

  let index = returnMatch.index + returnMatch[0].length;
  let depth = 1;
  const start = index;

  while (index < code.length && depth > 0) {
    const char = code[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    index += 1;
  }

  if (depth !== 0) return null;
  return code.slice(start, index - 1).trim();
}

function jsxFromVariantSource(source: string, partial = false): string | null {
  const code = normalizeVariantCode(source) ?? source.trim();

  const balanced = extractBalancedReturnBody(code);
  if (balanced) {
    return balanced;
  }

  if (code.trim().startsWith("<")) {
    return code.trim();
  }

  if (partial) {
    const openReturn = code.match(/return\s*\(\s*([\s\S]*)$/);
    if (openReturn?.[1]?.includes("<")) {
      return openReturn[1].trim();
    }
  }

  return null;
}

export function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}
