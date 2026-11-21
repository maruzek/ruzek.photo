// The photo lightbox (prototype: assets/rozpad.js, block "Lightbox"). It works without the motion layer and
// with reduced motion: a native modal <dialog> traps focus, Esc closes it, the arrows page through the photos
// and focus returns to the photo that opened it. Without JavaScript every photo is a link to its full image.

export interface LightboxHooks {
  /** Called after the dialog opens (the motion layer stops smooth scrolling) */
  onOpen?(): void;
  /** Called after the dialog closes */
  onClose?(): void;
}

const hooksOf = new WeakMap<HTMLDialogElement, LightboxHooks>();

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Wires the lightbox to every `[data-lb]` link on the page. Calling it again for the same dialog only
 * replaces the hooks (the page inits it at once, the motion layer later adds its hooks).
 */
export function initLightbox(root: HTMLDialogElement, hooks: LightboxHooks = {}): void {
  const wired = hooksOf.has(root);
  hooksOf.set(root, hooks);
  if (wired) return;

  const items = [...document.querySelectorAll<HTMLElement>('[data-lb]')];
  const img = root.querySelector<HTMLImageElement>('.lb-stage img');
  const cap = root.querySelector<HTMLElement>('.lb-cap');
  const no = root.querySelector<HTMLElement>('.lb-no');
  const close = root.querySelector<HTMLButtonElement>('.lb-close');
  const prev = root.querySelector<HTMLButtonElement>('.lb-prev');
  const next = root.querySelector<HTMLButtonElement>('.lb-next');
  if (!img || !cap || !no || !close || !prev || !next || items.length === 0) return;
  const counter = root.dataset['counter'] ?? '{n} / {total}';

  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (n: number): void => {
    index = (n + items.length) % items.length;
    const item = items[index];
    if (!item) return;
    const thumb = item.querySelector('img');
    img.src = item.dataset['full'] ?? thumb?.currentSrc ?? '';
    img.alt = thumb?.alt ?? '';
    // the thumbnail carries the photo's proportions; the dialog image keeps them while it loads
    if (thumb) {
      img.width = thumb.width;
      img.height = thumb.height;
    }
    cap.textContent = item.dataset['lb'] ?? '';
    no.textContent = counter.replace('{n}', pad(index + 1)).replace('{total}', pad(items.length));
  };

  items.forEach((item, n) => {
    item.addEventListener('click', (event) => {
      // a modified click (new tab, download) keeps the link's own behaviour
      if (
        event instanceof MouseEvent &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      )
        return;
      event.preventDefault();
      opener = item;
      show(n);
      root.showModal();
      document.documentElement.classList.add('lb-open');
      close.focus();
      hooksOf.get(root)?.onOpen?.();
    });
  });
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', () => root.close());
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
    else return;
    event.preventDefault();
  });
  // a click on the backdrop (the dialog itself, outside its content) closes it
  root.addEventListener('click', (event) => {
    if (event.target === root) root.close();
  });
  root.addEventListener('close', () => {
    document.documentElement.classList.remove('lb-open');
    hooksOf.get(root)?.onClose?.();
    if (opener?.isConnected) opener.focus();
  });
}
