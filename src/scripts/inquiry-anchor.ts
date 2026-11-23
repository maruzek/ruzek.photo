// "Spočítat cenu" links point to `#poptavka?sluzba=sport`. No element has that id, so the browser does not
// scroll, and the form island hydrates only when visible (client:visible). This scrolls to the section;
// the island reads the parameters from the hash once it hydrates.
function go(): void {
  const m = /^#([\w-]+)\?/.exec(location.hash);
  if (!m?.[1]) return;
  const el = document.getElementById(m[1]);
  if (!el) return;
  el.scrollIntoView();
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

go();
addEventListener('hashchange', go);

// A same-fragment click normally does not fire hashchange. Handle it when the motion layer has not handled it.
window.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
  const href = link?.getAttribute('href');
  if (!href || href !== location.hash || !/^#[\w-]+\?/.test(href)) return;
  event.preventDefault();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
});
