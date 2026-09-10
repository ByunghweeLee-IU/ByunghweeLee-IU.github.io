// Opt-in sizing for HTML embeds hosted on this site.
document.querySelectorAll('iframe[data-auto-resize]').forEach((iframe) => {
  let observer;
  let pending;
  function connect() {
    observer?.disconnect();
    cancelAnimationFrame(pending);
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc?.body) return;

    // Standalone pages may fill their viewport. In an embed, measure content
    // instead, so the frame can shrink as well as grow without a sizing loop.
    const style = doc.createElement('style');
    style.textContent = 'html, body { min-height: 0 !important; height: auto !important; } html { overflow: hidden !important; scrollbar-gutter: auto !important; }';
    doc.head.append(style);
    function resize() {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (iframe.contentDocument !== doc) return;
        const body = doc.body;
        const margin = parseFloat(doc.defaultView.getComputedStyle(body).marginBottom) || 0;
        const height = Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight) + margin) + 1;
        if (height > 1 && iframe.style.height !== `${height}px`) {
          iframe.style.height = `${height}px`;
        }
      });
    }
    observer = new ResizeObserver(resize);
    observer.observe(doc.body);
    doc.fonts?.ready.then(resize);
    resize();
  }
  iframe.addEventListener('load', connect);
  connect();
});
