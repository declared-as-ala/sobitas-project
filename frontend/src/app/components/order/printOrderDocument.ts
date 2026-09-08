/** Print the same escaped React document shown on screen, without storefront chrome.
 * Copy styles, not executable scripts; wait for styles/fonts/images instead of a 250ms race. */
export async function printOrderDocument(target: Window, source: HTMLElement, logoUrl: string) {
  const doc = target.document;
  doc.open();
  doc.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  doc.close();
  // Next's font variables live on <html>, not in the stylesheet's :root.
  doc.documentElement.className = [...document.documentElement.classList].filter(name => name !== 'dark').join(' ');
  doc.body.className = 'font-sans antialiased';
  doc.title = 'Bon de commande';
  const pending: Promise<unknown>[] = [];
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => {
    const clone = style.cloneNode(true) as HTMLElement;
    if (clone instanceof HTMLLinkElement) {
      clone.href = (style as HTMLLinkElement).href;
      pending.push(new Promise(resolve => { clone.onload = resolve; clone.onerror = resolve; }));
    }
    doc.head.appendChild(clone);
  });
  const documentCopy = source.cloneNode(true) as HTMLElement;
  doc.body.appendChild(documentCopy);
  if (logoUrl) {
    const logo = doc.createElement('img');
    logo.alt = 'Protein.tn';
    logo.width = 144;
    logo.height = 48;
    logo.style.objectFit = 'contain';
    logo.style.objectPosition = 'left';
    logo.style.marginBottom = '1rem';
    pending.push(new Promise(resolve => { logo.onload = resolve; logo.onerror = () => { logo.remove(); resolve(undefined); }; }));
    logo.src = logoUrl;
    documentCopy.querySelector('header > div')?.prepend(logo);
  }
  await Promise.all(pending);
  await doc.fonts.ready;
  target.focus();
  target.print();
}
