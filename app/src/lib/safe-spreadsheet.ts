import DOMPurify from 'dompurify';
import { Element } from 'x-data-spreadsheet/src/component/element';
import Spreadsheet from 'x-data-spreadsheet';

// Upstream 1.1.9 puts typed/pasted cell strings into its HTML editor. Keep the
// existing editor/formula behaviour while sanitizing its shared HTML sink.
// This is a mitigation for GHSA-x5cw-843f-r366, not an upstream version fix.
const originalHtml = Element.prototype.html;
Element.prototype.html = function (content?: string) {
  return originalHtml.call(this, content === undefined ? undefined : DOMPurify.sanitize(String(content)));
};
export default Spreadsheet;
