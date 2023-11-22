declare class Virtual {
  public el: HTMLElement;

  public options: Sortable.Options;

  /**
   * @param el The Parent which holds the list items.
   * @param options Options to customise the behavior of the virtual list.
   */
  constructor(el: HTMLElement, options: Virtual.Options);

  /**
   * Removes the virtual functionality completely.
   */
  destroy(): void;

  /**
   * Get or set the option value, depending on whether the `value` is passed in.
   * @param name a Sortable.Options property.
   * @param value a value.
   */
  option<K extends keyof Virtual.Options>(name: K, value: Virtual.Options[K]): void;
  option<K extends keyof Virtual.Options>(name: K): Virtual.Options[K];

  /**
   * Recalculate the range. The callback function `onUpdate` will be triggered after the calculation is completed.
   */
  refresh(): void;

  /**
   * Git item size by `index`.
   * @param index
   */
  getSize(index: Number): Number;

  /**
   * Get the current scroll size (scrollLeft / scrollTop).
   */
  getOffset(): Number;

  /**
   * Get the scroll element's size (clientWidth / clientHeight).
   */
  getClientSize(): Number;

  /**
   * Get the current scrolling distance (scrollWidth / scrollHeight).
   */
  getScrollSize(): Number;

  /**
   * Scroll to the bottom of the current scroll element.
   */
  scrollToBottom(): void;

  /**
   * Scroll to the specified offset of the current scroll element.
   * @param offset
   */
  scrollToOffset(offset: Number): void;

  /**
   * Scroll to the specified index position.
   * @param index
   */
  scrollToIndex(index: Number): void;
}

declare namespace Virtual {
  export interface Options extends VirtualOptions {}

  export interface ScrollState {
    top: Boolean;
    bottom: Boolean;
    offset: Number;
    direction: 'forward' | 'backward' | '';
  }

  export interface Range {
    start: Number;
    end: Number;
    front: Number;
    behind: Number;
    render: Number;
  }

  export interface VirtualOptions {
    /**
     * Virtual list scrolling element.
     * @defaults `null`
     */
    scroller: HTMLElement;

    /**
     * The unique key values of all items in the list.
     * @defaults `[]`
     */
    itemCount: any[];

    /**
     * HTML data attributes.
     * @defaults `'data-index'`
     */
    dataIndex?: String;

    /**
     * Top / Left size to be ignored.
     * @defaults `0`
     */
    ignoreSize?: Number;

    /**
     * Specifying the scrolling direction of the virtual list.
     * @defaults `vertical`
     */
    direction?: 'vertical' | 'horizontal';

    /**
     * debounce time on scroll.
     * @defaults `null`
     */
    debounceTime?: Number;

    /**
     * throttle time on scroll.
     * @defaults `null`
     */
    throttleTime?: Number;

    /**
     * Triggered when the virtual list is scrolled.
     */
    onScroll?: (params: ScrollState) => void;

    /**
     * Triggered when the rendering parameters of the virtual list change.
     */
    onUpdate?: (params: Range) => void;
  }
}

export = Sortable;
