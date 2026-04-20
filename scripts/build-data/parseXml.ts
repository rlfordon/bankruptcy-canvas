import { XMLParser } from 'fast-xml-parser';

// fast-xml-parser options tuned for USLM:
// - preserveOrder: false keeps hierarchy simple; we read structurally.
// - attributeNamePrefix '@_' is the library default.
// - isArray forces repeated elements to always be arrays for deterministic shape.
const REPEATING = new Set([
  'chapter', 'subchapter', 'section', 'subsection', 'paragraph',
  'subparagraph', 'clause', 'subclause', 'ref', 'note', 'p',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (tag) => REPEATING.has(tag),
  trimValues: false,
  processEntities: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUscXml(xml: string): any {
  return parser.parse(xml);
}
