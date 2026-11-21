// "Spočítat cenu" links point to `#poptavka?sluzba=match`. No element has that id, so the browser does not
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
