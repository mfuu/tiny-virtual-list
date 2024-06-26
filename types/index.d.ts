export interface ScrollEvent {
  /**
   * scrolled to the top of list
   */
  top: boolean;

  /**
   * scrolled to the bottom of list
   */
  bottom: boolean;

  /**
   * scroll top/left
   */
  offset: number;

  /**
   * scroll direction
   */
  direction: 'front' | 'behind' | '';
}

export interface Range {
  start: number;
  end: number;
  total: number;
  front: number;
  behind: number;
}

export interface VirtualOptions {
  /**
   * Estimated size.
   * @defaults `0`
   */
  size?: number;

  /**
   * Total number of list items.
   * @defaults `0`
   */
  count: number;

  /**
   * Render range buffer.
   * @defaults `1`
   */
  buffer?: number;

  /**
   * Virtual list scrolling element.
   * @defaults `undefined`
   */
  scroller: HTMLElement | Document | Window;

  /**
   * Specifying the scrolling direction of the virtual list.
   * @defaults `vertical`
   */
  direction?: 'vertical' | 'horizontal';

  /**
   * debounce time on scroll.
   * @defaults `0`
   */
  debounceTime?: number;

  /**
   * throttle time on scroll.
   * @defaults `0`
   */
  throttleTime?: number;

  /**
   * The `options.scroller` element is scrolled.
   */
  onScroll?: (event: ScrollEvent) => void;

  /**
   * The rendering range of the virtual list changes.
   */
  onUpdate?: (range: Range) => void;
}

export interface Utils {
  /**
   * @param fn callback function
   * @param wait debounce time
   */
  debounce<T extends (...args: any) => any>(fn: T, wait: number): T & { cancel(): void };

  /**
   * @param fn callback function
   * @param wait throttle time
   */
  throttle<T extends (...args: any) => any>(fn: T, wait: number): T & { cancel(): void };
}

declare class Virtual {
  public el: HTMLElement;

  public options: VirtualOptions;

  /**
   * @param el The Parent which holds the virtual list items.
   * @param options Options to customise the behavior of the virtual list.
   */
  constructor(el: HTMLElement, options: VirtualOptions);

  /**
   * Public methods exposed by Virtual
   * @example
   * import virtual from 'tiny-virtual-list';
   *
   * virtual.utils.debounce(fn, 0);
   *
   * virtual.utils.throttle(fn, 0);
   */
  static utils: Utils;

  /**
   * Removes the virtual functionality completely.
   */
  destroy(): void;

  /**
   * Get or set the option value, depending on whether the `value` is passed in.
   * @param name a VirtualOptions property.
   * @param value a value.
   */
  option<K extends keyof VirtualOptions>(name: K, value: VirtualOptions[K]): void;
  option<K extends keyof VirtualOptions>(name: K): VirtualOptions[K];

  /**
   * Call this method after the list is re-rendered.
   */
  refresh(): void;

  /**
   * Recalculate the range.
   * @param start range's start
   */
  updateRange(start?: number): void;

  /**
   * Listen to the scrolling events of the scroller.
   */
  addScrollEventListener(): void;

  /**
   * Remove the scroll listener of the scroller.
   */
  removeScrollEventListener(): void;

  /**
   * Git item size by index.
   * @param index list item's index
   */
  getSize(index: number): number;

  /**
   * Get the current scroll size (scrollLeft / scrollTop).
   */
  getOffset(): number;

  /**
   * Get the scroll element's size (clientWidth / clientHeight).
   */
  getClientSize(): number;

  /**
   * Get the current scrolling distance (scrollWidth / scrollHeight).
   */
  getScrollSize(): number;

  /**
   * Scroll to the bottom of the current scroll element.
   */
  scrollToBottom(): void;

  /**
   * Scroll to the specified offset of the current scroll element.
   * @param offset target offset scroll to
   */
  scrollToOffset(offset: number): void;

  /**
   * Scroll to the specified index position.
   * @param index target index scroll to
   */
  scrollToIndex(index: number): void;
}

export default Virtual;
