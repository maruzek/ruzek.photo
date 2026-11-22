// With a mouse (fine pointer), a click on an e-mail link copies the address and shows a toast with a link to the
// mail app; on touch the link opens the mail app as usual. The link stays a real mailto: without JS and for the
// browser's own "copy address". Loaded lazily (CopyToast.astro), outside the first-render JS budget.
const FINE = '(hover: hover) and (pointer: fine)';
const SHOW_MS = 6000;

export function initCopyEmail(doc: Document = document): () => void {
  const toast = doc.querySelector<HTMLElement>('[data-copy-toast]');
  const text = toast?.querySelector<HTMLElement>('[data-copy-text]');
  const open = toast?.querySelector<HTMLAnchorElement>('[data-copy-open]');
  const live = doc.querySelector<HTMLElement>('[data-copy-live]');
  if (!toast || !text || !open || !live) return () => undefined;
  let timer = 0;
  // the toast holds a link: it stays while hovered or focused (WCAG 2.2.1)
  const later = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (toast.matches(':hover, :focus-within')) later();
      else toast.hidden = true;
    }, SHOW_MS);
  };
  const show = (message: string, href: string): void => {
    text.textContent = message;
    open.href = href;
    toast.hidden = false;
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = message)); // a fresh change is announced again
    later();
  };
  const onClick = (e: MouseEvent): void => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-copy-email]');
    if (
      !a ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    // only a mouse click copies; Enter on the link (detail 0) opens the mail app as before, so keyboard focus
    // never has to reach a toast that disappears
    if (!matchMedia(FINE).matches || e.detail === 0) return;
    e.preventDefault();
    const address = decodeURIComponent(a.href.replace(/^mailto:/, '').split('?')[0] ?? '');
    const copied =
      navigator.clipboard?.writeText(address) ?? Promise.reject(new Error('no clipboard'));
    copied.then(
      () => show(toast.dataset['copied'] ?? '', a.href),
      () => show(toast.dataset['failed'] ?? '', a.href),
    );
  };
  doc.addEventListener('click', onClick);
  toast.dataset['ready'] = ''; // tests wait for this before clicking
  return () => {
    doc.removeEventListener('click', onClick);
    clearTimeout(timer);
    delete toast.dataset['ready'];
  };
}
