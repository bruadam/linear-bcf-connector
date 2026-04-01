import AdmZip from "adm-zip";

export interface BcfTopic {
  guid: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  creationDate?: string;
  modifiedDate?: string;
  labels?: string[];
  viewpoints?: BcfViewpoint[];
}

export interface BcfViewpoint {
  guid: string;
  snapshotData?: string; // base64 image
}

/**
 * Parse a BCF ZIP file buffer and return an array of BCF topics.
 */
export async function parseBcfZip(buffer: Buffer): Promise<BcfTopic[]> {
  const zip = new AdmZip(buffer);
  const topics: BcfTopic[] = [];

  for (const entry of zip.getEntries()) {
    // markup.bcf files contain the topic data
    if (!entry.entryName.endsWith("markup.bcf")) continue;

    const xml = entry.getData().toString("utf8");
    const topic = parseMarkupXml(xml);
    if (topic) {
      // Try to attach viewpoint snapshot
      const folder = entry.entryName.replace("markup.bcf", "");
      const viewpoints: BcfViewpoint[] = [];
      for (const snapshotEntry of zip.getEntries()) {
        if (
          snapshotEntry.entryName.startsWith(folder) &&
          (snapshotEntry.entryName.endsWith(".png") ||
            snapshotEntry.entryName.endsWith(".jpg"))
        ) {
          const vpGuid = snapshotEntry.entryName
            .replace(folder, "")
            .replace(/\.[^.]+$/, "");
          viewpoints.push({
            guid: vpGuid,
            snapshotData: snapshotEntry.getData().toString("base64"),
          });
        }
      }
      topic.viewpoints = viewpoints;
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Minimal XML parser for BCF markup.bcf files.
 * Extracts topic metadata without requiring an XML parser dependency.
 */
function parseMarkupXml(xml: string): BcfTopic | null {
  const getTag = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"));
    return match ? match[1].trim() : undefined;
  };

  const getAttr = (tag: string, attr: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
    return match ? match[1].trim() : undefined;
  };

  const guid = getAttr("Topic", "Guid") ?? getTag("Guid");
  if (!guid) return null;

  const labels: string[] = [];
  const labelMatches = xml.matchAll(/<Label>([^<]+)<\/Label>/gi);
  for (const m of labelMatches) {
    labels.push(m[1].trim());
  }

  return {
    guid,
    title: getTag("Title") ?? "Untitled",
    description: getTag("Description"),
    status: getTag("TopicStatus") ?? getAttr("Topic", "TopicStatus"),
    priority: getTag("Priority"),
    assignedTo: getTag("AssignedTo"),
    dueDate: getTag("DueDate"),
    creationDate: getTag("CreationDate"),
    modifiedDate: getTag("ModifiedDate"),
    labels,
  };
}

/**
 * Build a minimal BCF markup.bcf XML string from a topic object.
 */
export function buildMarkupXml(topic: BcfTopic): string {
  const esc = (s: string | undefined) =>
    (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Topic Guid="${topic.guid}" TopicStatus="${esc(topic.status ?? "Open")}" TopicType="Issue">
    <Title>${esc(topic.title)}</Title>
    <Priority>${esc(topic.priority ?? "Normal")}</Priority>
    <AssignedTo>${esc(topic.assignedTo)}</AssignedTo>
    ${topic.dueDate ? `<DueDate>${topic.dueDate}</DueDate>` : ""}
    <Description>${esc(topic.description)}</Description>
    <CreationDate>${topic.creationDate ?? new Date().toISOString()}</CreationDate>
    <ModifiedDate>${topic.modifiedDate ?? new Date().toISOString()}</ModifiedDate>
    ${(topic.labels ?? []).map((l) => `<Label>${esc(l)}</Label>`).join("\n    ")}
  </Topic>
</Markup>`;
}
