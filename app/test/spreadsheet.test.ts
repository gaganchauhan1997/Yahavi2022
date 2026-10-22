import { it, expect } from 'vitest';
import '../src/lib/safe-spreadsheet';
import { Element } from 'x-data-spreadsheet/src/component/element';
it('sanitizes the real upstream HTML editor sink while preserving formatting', () => {
  const element = new Element('div');
  element.html('<b>Budget</b><img src=x onerror="alert(document.cookie)"><svg onload="alert(1)"></svg>');
  expect(element.el.innerHTML).toContain('<b>Budget</b>');
  expect(element.el.innerHTML).not.toMatch(/onerror|onload/);
});
