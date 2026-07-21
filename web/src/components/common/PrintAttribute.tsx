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
  } else {
    return String(attrValue);
  }
}