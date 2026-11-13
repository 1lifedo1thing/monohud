export type Size = { width: number; height: number };
type Listener = (size: Size) => void;

const listeners = new WeakMap<Element, Set<Listener>>();
let observer: ResizeObserver | undefined;

/** All frames share one ResizeObserver; a page can hold hundreds of them cheaply. */
function sharedObserver(): ResizeObserver {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.borderBoxSize?.[0];
      const size = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height };
      listeners.get(entry.target)?.forEach((listener) => listener(size));
    }
  });
  return observer;
}

export function observeSize(element: Element, listener: Listener): () => void {
  let set = listeners.get(element);
  if (!set) {
    set = new Set();
    listeners.set(element, set);
    sharedObserver().observe(element);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(element);
      sharedObserver().unobserve(element);
    }
  };
}
