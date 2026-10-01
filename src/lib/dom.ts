export function resolveElement(
  target: string | HTMLElement | null | undefined,
): HTMLElement | null {
  if (!target) return null;
  if (typeof target === "string") {
    const el = document.querySelector(target);
    return el instanceof HTMLElement ? el : null;
  }
  return target;
}

export function requireElement(
  target: string | HTMLElement,
  label = "container",
): HTMLElement {
  const el = resolveElement(target);
  if (!el) {
    throw new Error(`ChessEvalBar: could not find ${label} "${String(target)}"`);
  }
  return el;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function empty(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function stripCebClasses(node: HTMLElement): void {
  for (const cls of [...node.classList]) {
    if (cls === "ceb" || cls.startsWith("ceb-") || cls.startsWith("ceb--")) {
      node.classList.remove(cls);
    }
  }
}

export function clearCebVars(node: HTMLElement): void {
  const style = node.style;
  for (let i = style.length - 1; i >= 0; i -= 1) {
    const key = style.item(i);
    if (key?.startsWith("--ceb-")) style.removeProperty(key);
  }
}

export function setVars(
  node: HTMLElement,
  vars: Record<string, string | number | undefined>,
): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue;
    node.style.setProperty(key, String(value));
  }
}

export function applyDataset(node: HTMLElement, data: Record<string, string | number | boolean | null | undefined>): void {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === false) {
      delete node.dataset[key];
    } else {
      node.dataset[key] = String(value);
    }
  }
}

export function boardSize(boardEl: HTMLElement): number {
  const size = Math.max(boardEl.clientWidth, boardEl.clientHeight);
  return size > 0 ? size : boardEl.offsetWidth || 400;
}

export function observeSize(
  el: HTMLElement,
  onChange: (size: number) => void,
): {disconnect: () => void} {
  let last = -1;
  let raf = 0;
  const ro = new ResizeObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const size = boardSize(el);
      if (size === last) return;
      last = size;
      onChange(size);
    });
  });
  ro.observe(el);
  return {
    disconnect() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
    },
  };
}

export function wrapWithLayout(
  boardEl: HTMLElement,
  layoutClass: string,
): HTMLElement {
  const parent = boardEl.parentElement;
  if (parent?.classList.contains("ceb-layout")) {
    parent.classList.remove("ceb-layout--row", "ceb-layout--column");
    for (const cls of layoutClass.split(/\s+/).filter(Boolean)) parent.classList.add(cls);
    return parent;
  }
  const wrap = el("div", layoutClass);
  parent?.insertBefore(wrap, boardEl);
  wrap.appendChild(boardEl);
  return wrap;
}

export function teardownBoardAttach(
  layout: HTMLElement,
  boardEl: HTMLElement,
  barRoot: HTMLElement,
): void {
  barRoot.remove();
  const remaining = layout.querySelectorAll(":scope > .ceb-layout__slot").length;
  if (remaining > 0) return;
  boardEl.classList.remove("ceb-layout__board");
  if (!layout.classList.contains("ceb-layout")) return;
  const parent = layout.parentElement;
  if (!parent) return;
  parent.insertBefore(boardEl, layout);
  layout.remove();
}
