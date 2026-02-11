type ParsedSSEMessage = unknown;

type ParseResult = {
  events: ParsedSSEMessage[];
  buffer: string;
};

export function parseSSEMessages(buffer: string, chunk: string): ParseResult {
  const combined = buffer + chunk;
  const rawEvents = combined.split("\n\n");
  const nextBuffer = rawEvents.pop() ?? "";
  const events: ParsedSSEMessage[] = [];

  for (const rawEvent of rawEvents) {
    const dataLines = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""));

    if (dataLines.length === 0) {
      continue;
    }

    const payload = dataLines.join("\n");
    try {
      events.push(JSON.parse(payload));
    } catch {
      // Ignore malformed events so one bad chunk does not break the stream.
    }
  }

  return { events, buffer: nextBuffer };
}
