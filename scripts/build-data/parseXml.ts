import { XMLParser } from 'fast-xml-parser';

// fast-xml-parser options tuned for USLM:
// - preserveOrder: false keeps hierarchy simple; we read structurally.
// - attributeNamePrefix '@_' is the library default.
// - isArray forces repeated elements to always be arrays for deterministic shape.
// - trimValues: false keeps leading/trailing whitespace around text nodes so inline
//   ordering like "An action under <ref>section 547</ref> may be commenced." survives.
// - isArray is keyed on local tag name only; tags in REPEATING are forced to array
//   wherever they appear, regardless of parent context.
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
