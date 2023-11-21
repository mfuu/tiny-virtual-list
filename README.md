# virtual-list-core

[![npm](https://img.shields.io/npm/v/virtual-list-core.svg)](https://www.npmjs.com/package/virtual-list-core)  [![npm](https://img.shields.io/npm/dm/virtual-list-core.svg)](https://npm-stat.com/charts.html?package=virtual-list-core)  [![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)


A JS library for virtual list

### [Live Demo](https://mfuu.github.io/virtual-list-core/)

## Usage

**Install**

```shell
npm i virtual-list-core --save
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
import Virtual from 'virtual-list-core';

const container = document.getElementById('container');
const scroller = document.getElementById('scroller');

new Virtual(container, {
  scroller: scroller,
  itemCount: 100,

  onUpdate: ({ start, end, front, behind }) => {
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
  scroller: null | HTMLElement | window | document, // Virtual list scrolling element
  itemCount: null, // Total number of list items
  ignoreSize: 0, // Top height value to be ignored
  dataIndex: 'data-index', // HTML data attributes
  direction: 'vertical', // `vertical/horizontal`, scroll direction
  debounceTime: 0, // debounce time on scroll
  throttleTime: 0, // throttle time on scroll

  onUpdate: (range) => {
    // Triggered when the rendering params changed
  },
  onScroll: ({ offset, top, bottom, direction }) => {
    // Triggered when the virtual list scroller is scrolled
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
// Get or set the option value, depending on whether the `value` is passed in
virtual.option(key, value?);

// Recalculate the range
virtual.refresh();

// Git item size by `index`
virtual.getSize(index: Number);

// Get the current scroll size (scrollLeft / scrollTop)
virtual.getOffset();

// Get the scroll element's size (offsetWidth / offsetHeight)
virtual.getClientSize();

// Get the current scrolling distance (scrollWidth / scrollHeight)
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
