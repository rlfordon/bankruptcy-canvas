import { XMLParser } from 'fast-xml-parser';

// USLM-tuned parser.
// - preserveOrder:true keeps source order of mixed-content elements (refs/text
//   interleaved). This is critical for rendering sections like §546 where the
//   text flow is "...under <ref>547</ref> or <ref>548</ref> may...". Without it,
//   fast-xml-parser collapses all refs and all text into separate buckets,
//   losing their interleaved ordering.
// - attributeNamePrefix '@_' is the library default; attrs live under ':@'.
// - trimValues:false preserves leading/trailing whitespace so spaces around
//   inline elements survive ("An action under " + <ref> + " may be commenced.").
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  preserveOrder: true,
  trimValues: false,
  processEntities: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUscXml(xml: string): any {
  return parser.parse(xml);
}
