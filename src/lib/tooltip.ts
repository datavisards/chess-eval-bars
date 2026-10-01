const TIP_CLASS = "ceb-tooltip";
const Z = "2147483647";

let installed = false;
let current: HTMLElement | null = null;

function hoverHost(from: EventTarget | null): HTMLElement | null {
  if (!(from instanceof Element)) return null;
  const node = from.closest("[data-hover]");
  return node instanceof HTMLElement ? node : null;
}

function tipNode(): HTMLElement {
  let node = document.body.querySelector<HTMLElement>(`:scope > .${TIP_CLASS}`);
  if (!node) {
    node = document.createElement("div");
    node.className = TIP_CLASS;
    node.setAttribute("role", "tooltip");
    node.hidden = true;
    document.body.appendChild(node);
  }
  node.style.zIndex = Z;
  return node;
}

function place(tip: HTMLElement, anchor: HTMLElement): void {
  const r = anchor.getBoundingClientRect();
  const gap = 8;
  const byBar =
    anchor.classList.contains("ceb") && !anchor.classList.contains("ceb__label");
  const vertical = byBar && anchor.classList.contains("ceb--vertical");

  tip.style.position = "fixed";
  if (vertical) {
    tip.style.left = `${Math.round(r.left - gap)}px`;
    tip.style.top = `${Math.round(r.top + r.height / 2)}px`;
    tip.style.transform = "translate(-100%, -50%)";
  } else {
    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    tip.style.top = `${Math.round(r.bottom + 6)}px`;
    tip.style.transform = "translate(-50%, 0)";
  }

  const t = tip.getBoundingClientRect();
  const pad = 8;
  let dx = 0;
  let dy = 0;
  if (t.left < pad) dx = pad - t.left;
  if (t.right > window.innerWidth - pad) dx -= t.right - (window.innerWidth - pad);
  if (t.top < pad) dy = pad - t.top;
  if (t.bottom > window.innerHeight - pad) dy -= t.bottom - (window.innerHeight - pad);
  if (dx || dy) {
    tip.style.transform = `${tip.style.transform} translate(${dx}px, ${dy}px)`;
  }
}

function show(anchor: HTMLElement): void {
  const text = anchor.dataset.hover?.trim();
  if (!text) {
    hideHoverTooltip();
    return;
  }
  current = anchor;
  const tip = tipNode();
  tip.textContent = text;
  tip.hidden = false;
  place(tip, anchor);
}

export function hideHoverTooltip(root?: HTMLElement): void {
  if (root && current && root !== current && !root.contains(current)) return;
  current = null;
  const tip = document.querySelector<HTMLElement>(`.${TIP_CLASS}`);
  if (tip) tip.hidden = true;
}

function onOver(event: Event): void {
  const host = hoverHost(event.target);
  if (host) show(host);
}

function onOut(event: PointerEvent | MouseEvent): void {
  const host = hoverHost(event.target);
  if (!host) return;
  const related = event.relatedTarget;
  if (related instanceof Node && host.contains(related)) return;
  if (hoverHost(related) === host) return;
  if (current === host) hideHoverTooltip();
}

export function installHoverTooltips(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut);
  document.addEventListener("scroll", () => hideHoverTooltip(), true);
  window.addEventListener("resize", () => hideHoverTooltip());
}
