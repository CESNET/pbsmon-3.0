interface PrintAttributeValueProps {
  attrKey: string;
  attrValue: any;
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
  } else {
    return String(attrValue);
  }
}