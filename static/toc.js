document.addEventListener("DOMContentLoaded", function () {
  const toc = document.querySelector(".page-toc");
  const list = document.querySelector(".page-toc-list");
  const toggle = document.querySelector(".page-toc-toggle");
  const headings = Array.from(document.querySelectorAll(".content h2[id]"));

  if (!toc || !list || !toggle || !headings.length) return;

  const links = headings.map((heading) => {
    const labelSource = heading.cloneNode(true);
    labelSource.querySelectorAll(".header-anchor").forEach((anchor) => anchor.remove());

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "page-toc-link";
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = labelSource.textContent.trim();
    item.className = "page-toc-item";
    item.appendChild(link);
    list.appendChild(item);
    return link;
  });

  const setActiveHeading = (activeIndex) => {
    links.forEach((link, index) => {
      if (index === activeIndex) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  let updateQueued = false;
  const updateActiveHeading = () => {
    const readingLine = Math.min(180, window.innerHeight * 0.24);
    let activeIndex = 0;

    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= readingLine) {
        activeIndex = index;
      }
    });

    setActiveHeading(activeIndex);
    updateQueued = false;
  };

  const queueActiveHeadingUpdate = () => {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(updateActiveHeading);
  };

  toggle.addEventListener("click", function () {
    const isOpen = toc.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.forEach((link) => {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 899px)").matches) {
        toc.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  const compactLayout = window.matchMedia("(max-width: 899px)");
  const syncLayout = (event) => {
    const isCompact = event.matches;
    toc.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", String(!isCompact));
  };

  if (typeof compactLayout.addEventListener === "function") {
    compactLayout.addEventListener("change", syncLayout);
  } else {
    compactLayout.addListener(syncLayout);
  }

  document.body.classList.add("toc-ready");
  syncLayout(compactLayout);
  updateActiveHeading();
  window.addEventListener("scroll", queueActiveHeadingUpdate, { passive: true });
  window.addEventListener("resize", queueActiveHeadingUpdate);
});
