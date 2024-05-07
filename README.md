# tiny-virtual-list

[![npm](https://img.shields.io/npm/v/tiny-virtual-list.svg)](https://www.npmjs.com/package/tiny-virtual-list)  [![npm](https://img.shields.io/npm/dm/tiny-virtual-list.svg)](https://npm-stat.com/charts.html?package=tiny-virtual-list)  [![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)


A JS library for virtual list

### [Live Demo](https://mfuu.github.io/tiny-virtual-list/)

## Usage

**Install**

```shell
npm i tiny-virtual-list
```

**HTML**

```html
<div class="scroller">
  <ul class="container">
    <!-- default rendered items -->
    <li>1</li>
    <li>2</li>
    <li>3</li>
  </ul>
</div>
```

**JavaScript**

```js
import Virtual from 'tiny-virtual-list';

const container = document.getElementById('container');
const scroller = document.getElementById('scroller');

new Virtual(container, {
  count: 100,
  scroller: scroller,

  onUpdate: ({ start, end, total, front, behind }) => {
    container.innerHTML = '';

    for(let i = start; i <= end; i++) {
      const item = document.createElement('li');
      item.innerHTML = `${i}`;
      container.append(item);
    }
    container.style.padding = `${front}px 0px ${behind}px`;
  }
})
```

## Options

```js
new Virtual(element, {
  size: 0, // estimated size
  count: 0, // Total number of list items
  buffer: 1, // Render range buffer.
  scroller: HTMLElement | window | document, // Virtual list scrolling element
  direction: 'vertical', // `vertical/horizontal`, scroll direction
  debounceTime: 0, // debounce time on scroll
  throttleTime: 0, // throttle time on scroll

  onUpdate: (range) => {
    // rendering params changed
  },
  onScroll: ({ offset, top, bottom, direction }) => {
    if (top === true) {
      // scrolled to the top of list
    }
    if (bottom === true) {
      // scrolled to the bottom of list
    }
  },
})
```


### Methods

```js
let virtual = new Virtual();
```

```js
// Removes the virtual functionality completely
virtual.destroy();

// Get or set the option value, depending on whether the `value` is passed in
virtual.option(key, value?);

// Update sizes
virtual.refresh();

// Recalculate the range
virtual.updateRange(start?);

// Listen to the scrolling events of the scroller
virtual.addScrollEventListener();

// Remove the scroll listener of the scroller
virtual.removeScrollEventListener();

// Git item size by index
virtual.getSize(index: Number);

// Get the current scroll offset (scrollLeft / scrollTop)
virtual.getOffset();

// Get the scroll element's size (offsetWidth / offsetHeight)
virtual.getClientSize();

// Get the current scroll size (scrollWidth / scrollHeight)
virtual.getScrollSize();

// Scroll to bottom of list
virtual.scrollToBottom();

// Scroll to the specified index position
virtual.scrollToIndex(index: Number);

// Scroll to the specified offset
virtual.scrollToOffset(offset: Number);
```

## Utils
 
```js
Virtual.utils.debounce(fn: Function, wait: Number);
Virtual.utils.throttle(fn: Function, wait: Number);
```
