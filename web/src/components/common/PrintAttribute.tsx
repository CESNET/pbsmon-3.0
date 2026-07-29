interface PrintAttributeValueProps {
  attrKey: string;
  attrValue: any;
}

// Splits an XML string into lines with an indent depth each. Regex-based
// rather than a full parser, so it degrades gracefully (just leaves odd
// spots unindented) instead of throwing on malformed/partial XML.
function splitXmlLines(xml: string): { text: string; depth: number }[] {
  const withBreaks = xml.trim().replace(/>\s*</g, ">\n<");
  let pad = 0;
  return withBreaks.split("\n").map((raw) => {
    const line = raw.trim();
    const isClosingTag = /^<\//.test(line);
    const isSelfClosing = /\/>$/.test(line);
    // An element whose content and closing tag are both on this line (eg.
    // "<job>text</job>") nets to zero depth change - without this check it
    // still counts as an unclosed opening tag below, permanently pushing
    // every following sibling one level too far right.
    const isFullElement = /^<(\w[-\w:.]*)\b[^>]*>[\s\S]*<\/\1>$/.test(line);
    const isOpeningTag =
      /^<\w/.test(line) && !isClosingTag && !isSelfClosing && !isFullElement;

    if (isClosingTag) {
      pad = Math.max(pad - 1, 0);
    }
    const depth = pad;
    if (isOpeningTag) {
      pad += 1;
    }
    return { text: line, depth };
  });
}

export function PrintAttributeValue({
  attrKey,
  attrValue,
}: PrintAttributeValueProps) {
  const timeValues = [
    'last_state_change_time',
    'last_used_time',
    'credential_validity',
    'ctime',
    'etime',
    'history_timestamp',
    'mtime',
    'obittime',
    'qtime',
    'stime',
    'estimated.start_time'
  ]
  const commeSeparatedValues = [
    'Variable_List',
    'jobs',
  ]
  const xmlValues = [
    'Submit_arguments',
  ]
  if (timeValues.includes(attrKey)) {
    const ts = typeof attrValue === "number" ? attrValue * 1000 : Number(attrValue) * 1000
    const date = new Date(ts);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${day}.${month}.${year} ${time}`;
  } else if (commeSeparatedValues.includes(attrKey)) {
    const str = String(attrValue);
    const parts = str.split(",");
    if (parts.length === 1) {
      return str;
    }
    // Force each key=value pair onto its own line via layout (inline-block +
    // full width) rather than <br>, so the line break is a soft wrap as far
    // as the browser's clipboard serializer is concerned: selecting and
    // copying still yields the original flat comma-separated string with no
    // injected newlines.
    return parts.map((part, i) => (
      <span key={i} className="inline-block w-full">
        {part}
        {i < parts.length - 1 && ","}
      </span>
    ));
  } else if (xmlValues.includes(attrKey)) {
    const str = String(attrValue);
    if (!str.includes("<")) {
      return str;
    }
    // Indentation and line breaks are done via CSS (inline-block + padding),
    // not literal spaces/newlines, so selecting and copying with the mouse
    // still yields the original flat XML string, same as Variable_List.
    return (
      <span className="font-mono text-xs break-all">
        {splitXmlLines(str).map((line, i) => (
          <span
            key={i}
            className="inline-block w-full"
            style={{ paddingLeft: `${line.depth * 1.25}em` }}
          >
            {line.text}
          </span>
        ))}
      </span>
    );
  } else {
    return String(attrValue);
  }
}