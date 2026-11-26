// The photo lightbox (prototype: assets/rozpad.js, block "Lightbox"). It works without the motion layer and
// with reduced motion: a native modal <dialog> traps focus, Esc closes it, the arrows page through the photos
// and focus returns to the photo that opened it. Without JavaScript every photo is a link to its full image.

import { track } from './analytics';

export interface LightboxHooks {
  /** Called after the dialog opens (the motion layer stops smooth scrolling) */
  onOpen?(): void;
  /** Called after the dialog closes */
  onClose?(): void;
}

const hooksOf = new WeakMap<HTMLDialogElement, LightboxHooks>();

const pad = (n: number): string => String(n).padStart(2, '0');

async function decodeImage(src: string, alt: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.alt = alt;
  image.src = src;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

/**
 * Wires the lightbox to every `[data-lb]` link on the page. Calling it again for the same dialog only
 * replaces the hooks (the page inits it at once, the motion layer later adds its hooks).
 */
export function initLightbox(root: HTMLDialogElement, hooks: LightboxHooks = {}): void {
  const wired = hooksOf.has(root);
  hooksOf.set(root, hooks);
  if (wired) return;

  const items = [...document.querySelectorAll<HTMLAnchorElement>('a[data-lb]')];
  const photo = root.querySelector<HTMLElement>('.lb-photo');
  const status = root.querySelector<HTMLElement>('.lb-status');
  const frame = root.querySelector<HTMLElement>('.lb-frame');
  const description = root.querySelector<HTMLElement>('.lb-description');
  const no = root.querySelector<HTMLElement>('.lb-no');
  const tag = root.querySelector<HTMLElement>('.lb-ph');
  const close = root.querySelector<HTMLButtonElement>('.lb-close');
  const prev = root.querySelector<HTMLButtonElement>('.lb-prev');
  const next = root.querySelector<HTMLButtonElement>('.lb-next');
  if (
    !photo ||
    !status ||
    !frame ||
    !description ||
    !no ||
    !close ||
    !prev ||
    !next ||
    !items.length
  )
    return;
  const counter = root.dataset['counter'] ?? '{n} / {total}';
  const viewport = document.documentElement;

  let index = 0;
  let selection = 0;
  let opener: HTMLElement | null = null;

  const show = async (n: number): Promise<void> => {
    index = (n + items.length) % items.length;
    const item = items[index];
    if (!item) return;
    const request = ++selection;
    const thumb = item.querySelector('img');
    const previewSrc = thumb?.complete && thumb.naturalWidth > 0 ? thumb.currentSrc : '';
    const fullSrc = item.dataset['full']
      ? new URL(item.dataset['full'], item.href).href
      : item.href;
    const alt = thumb?.alt ?? '';
    photo.replaceChildren();
    status.textContent = root.dataset['loading'] ?? '';
    frame.textContent = item.dataset['frame'] ?? '';
    description.textContent = item.dataset['lb'] ?? '';
    if (tag) tag.hidden = item.dataset['placeholder'] === undefined;
    no.textContent = counter.replace('{n}', pad(index + 1)).replace('{total}', pad(items.length));

    const isCurrent = (): boolean => root.open && selection === request;
    const display = (image: HTMLImageElement): void => {
      photo.replaceChildren(image);
      status.textContent = '';
    };
    // Only insert decoded images for the current selection. If the full image wins the race, leave it in place.
    const preview =
      previewSrc && previewSrc !== fullSrc
        ? decodeImage(previewSrc, alt).then((image) => {
            if (image && isCurrent() && !photo.firstElementChild) display(image);
          })
        : null;
    const full = await decodeImage(fullSrc, alt);
    if (!isCurrent()) return;
    if (full) {
      display(full);
      return;
    }
    await preview;
    if (isCurrent() && !photo.firstElementChild)
      status.textContent = root.dataset['unavailable'] ?? '';
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
      if (!viewport.classList.contains('lb-open')) {
        const scrollbarWidth = window.innerWidth - viewport.clientWidth;
        viewport.style.setProperty('--lb-scrollbar-width', `${scrollbarWidth}px`);
        viewport.classList.add('lb-open');
      }
      root.showModal();
      void show(n);
      close.focus({ preventScroll: true });
      hooksOf.get(root)?.onOpen?.();
      track('lightbox_open');
    });
  });
  prev.addEventListener('click', () => void show(index - 1));
  next.addEventListener('click', () => void show(index + 1));
  close.addEventListener('click', () => root.close());
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') void show(index - 1);
    else if (event.key === 'ArrowRight') void show(index + 1);
    else return;
    event.preventDefault();
  });
  // a click on the backdrop (the dialog itself, outside its content) closes it
  root.addEventListener('click', (event) => {
    if (event.target === root) root.close();
  });
  root.addEventListener('close', () => {
    if (root.open) return;
    photo.replaceChildren();
    status.textContent = '';
    viewport.classList.remove('lb-open');
    viewport.style.removeProperty('--lb-scrollbar-width');
    hooksOf.get(root)?.onClose?.();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
}
