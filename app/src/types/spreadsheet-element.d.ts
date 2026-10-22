declare module 'x-data-spreadsheet/src/component/element' {
  export class Element {
    constructor(tag: string | HTMLElement, className?: string);
    el: HTMLElement;
    html(content?: string): Element | string;
  }
}
