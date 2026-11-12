/* CollabBill home page clone — interactions.
 *
 * The original page is a React bundle; this clone replaces it with small
 * vanilla implementations of the behaviors the static markup ships with:
 *   1. forced light theme (the original landing bundle removes .dark on mount)
 *   2. staggered reveal of elements that ship with inline opacity:0
 *   3. FAQ accordion (panels ship collapsed with height:0)
 *   4. "How it works" step tabs (desktop) with progress bar + crossfading stage
 *   5. "CollabBill in numbers" stat tiles (aria-pressed swap + canvas)
 *   6. header pill shrink on scroll
 *   7. mobile menu panel
 *   8. static pixel-noise painting for the decorative canvases
 */
(() => {
  window.__cloneErr = [];
  addEventListener("error", (e) => window.__cloneErr.push(String(e.message)));

  const html = document.documentElement;

  // 1. forced light theme (matches the original landing behavior)
  html.classList.remove("dark");
  html.style.colorScheme = "light";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const main = document.querySelector("main");

  // ---------- helpers ----------
  function clearRevealStyles(el) {
    // dropping the inline reveal styles lets the CSS transition to natural state
    el.style.removeProperty("opacity");
    el.style.removeProperty("transform");
    el.style.removeProperty("filter");
  }

  function staggerReveal(els, baseDelay = 0, step = 90) {
    els.forEach((el, i) => {
      const delay = reduceMotion ? 0 : baseDelay + Math.min(i * step, 900);
      setTimeout(() => {
        el.classList.add("reveal-ready");
        // force style flush so the transition runs
        void el.offsetWidth;
        clearRevealStyles(el);
      }, delay);
    });
  }

  // static pixel-noise fill for the decorative canvases
  function paintNoise(cv) {
    if (!cv || cv.dataset.painted) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) {
      // layout not ready (e.g. Tailwind still compiling) — retry shortly
      setTimeout(() => paintNoise(cv), 500);
      return;
    }
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    for (let i = 0; i < (w * h) / 26; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = "rgba(0,0,0," + (0.03 + Math.random() * 0.07) + ")";
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    cv.dataset.painted = "1";
  }

  // 2. reveal-on-view groups ----------------------------------------------
  const revealEls = [];
  main.querySelectorAll("*").forEach((el) => {
    const op = el.style.opacity;
    const hiddenByScale = el.style.transform && /scaleY\(0\)/.test(el.style.transform);
    if ((op === "0" || hiddenByScale) && !el.closest('[id^="faq-panel-"]')) {
      revealEls.push(el);
    }
  });

  const topChildren = Array.from(main.children);
  const groups = new Map();
  revealEls.forEach((el) => {
    let container = el;
    while (container.parentElement && !topChildren.includes(container.parentElement)) {
      container = container.parentElement;
    }
    const key = container.parentElement === main ? container : main;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  });

  groups.forEach((els, container) => {
    // DOM order for a pleasant cascade
    els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
    if (reduceMotion) {
      els.forEach(clearRevealStyles);
      return;
    }
    let revealed = false;
    const run = () => {
      if (revealed) return;
      revealed = true;
      staggerReveal(els);
    };
    // fallback: never leave content hidden, even if IO misbehaves
    setTimeout(run, 1400 + Math.random() * 400);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            io.disconnect();
            run();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(container);
  });

  // 3. FAQ accordion -------------------------------------------------------
  document.querySelectorAll('[id^="faq-panel-"]').forEach((panel) => {
    const btn = document.querySelector('[aria-controls="' + panel.id + '"]');
    if (!btn) return;
    const chevron = btn.querySelector("span.shadow-collabbill");
    let open = false;
    btn.addEventListener("click", () => {
      open = !open;
      btn.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
      if (open) {
        panel.classList.add("reveal-ready");
        panel.style.height = panel.scrollHeight + "px";
        panel.style.opacity = "1";
        if (chevron) chevron.style.transform = "rotate(180deg)";
        const onEnd = (e) => {
          if (e.propertyName === "height") {
            panel.style.height = "auto";
            panel.removeEventListener("transitionend", onEnd);
          }
        };
        panel.addEventListener("transitionend", onEnd);
      } else {
        panel.style.height = panel.scrollHeight + "px"; // from auto → px
        void panel.offsetWidth;
        panel.style.height = "0px";
        panel.style.opacity = "0";
        if (chevron) chevron.style.transform = "none";
      }
    });
  });

  // 4. "How it works" step tabs (desktop) ----------------------------------
  const hiwH2 = Array.from(main.querySelectorAll("h2")).find((h) =>
    h.textContent.includes("From first DM to final payment")
  );
  if (hiwH2) {
    const hiwRoot = hiwH2.closest("main > div");
    const lgGrid = Array.from(hiwRoot.querySelectorAll("div")).find((d) =>
      d.classList.contains("lg:grid")
    );
    const stepButtons = lgGrid
      ? Array.from(lgGrid.querySelectorAll(":scope button[aria-pressed]"))
      : [];
    const stage = lgGrid ? lgGrid.querySelector('[class*="370px"]') : null;
    const mobilePanels = hiwRoot.querySelectorAll('[class*="w-160"]');
    const activeDecor = stepButtons[0]
      ? Array.from(stepButtons[0].children).filter(
          (c) =>
            c.tagName === "CANVAS" ||
            (c.tagName === "DIV" &&
              (c.classList.contains("bg-brand") ||
                (c.className || "").toString().includes("mask-t-from-50%")))
        )
      : [];
    const initialStageHTML = stage ? stage.innerHTML : null;
    let activeStep = 0;

    function fillProgress(btn) {
      const bar = btn.querySelector(".bg-brand");
      if (!bar) return;
      bar.style.transition = "width 1.1s cubic-bezier(0.22,1,0.36,1)";
      bar.style.width = "0px";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (bar.style.width = "100%"))
      );
    }

    function setDecor(btn) {
      activeDecor.forEach((el) => btn.insertBefore(el, btn.firstChild));
      const cv = btn.querySelector("canvas");
      paintNoise(cv);
    }

    function setStage(i) {
      if (!stage) return;
      if (i === 0 && initialStageHTML) {
        swapStage(initialStageHTML);
      } else {
        const src = mobilePanels[i];
        const inner = src ? src.firstElementChild : null;
        swapStage(inner ? inner.outerHTML : "");
      }
      function swapStage(html) {
        const old = stage.firstElementChild;
        if (old) {
          old.style.transition = "opacity 0.25s ease";
          old.style.opacity = "0";
        }
        setTimeout(() => {
          stage.innerHTML = html;
          const layer = stage.firstElementChild;
          if (layer) {
            layer.style.opacity = "0";
            layer.classList.add("reveal-ready");
            void layer.offsetWidth;
            layer.style.opacity = "1";
            layer.style.filter = "none";
            layer.style.transform = "none";
            // reveal any nested opacity:0 content in the cloned mockup
            const nested = layer.querySelectorAll("[style*='opacity']");
            nested.forEach((n) => {
              if (parseFloat(n.style.opacity) < 1) {
                n.style.opacity = "1";
                n.style.transform = "none";
              }
            });
          }
        }, reduceMotion ? 0 : 240);
      }
    }

    stepButtons.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        if (i === activeStep) return;
        activeStep = i;
        stepButtons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
        setDecor(btn);
        fillProgress(btn);
        setStage(i);
      });
    });

    // initial state: paint the active button's canvas + fill its bar on reveal
    if (stepButtons[0]) {
      paintNoise(stepButtons[0].querySelector("canvas"));
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            io2.disconnect();
            fillProgress(stepButtons[0]);
          }
        });
      });
      io2.observe(stepButtons[0]);
    }
  }

  // 5. numbers stat tiles ---------------------------------------------------
  const live = main.querySelector('[aria-live="polite"]');
  const statsGrid = live ? live.nextElementSibling : null;
  if (live && statsGrid) {
    const statButtons = Array.from(statsGrid.querySelectorAll("button[aria-pressed]"));
    const canvas = statsGrid.querySelector("canvas");
    const paintNums = () => {
      if (!canvas || canvas.dataset.painted) return;
      paintNoise(canvas);
    };
    function setActive(i) {
      statButtons.forEach((b, j) => {
        b.setAttribute("aria-pressed", String(i === j));
        const inner = b.querySelector(":scope > div.relative");
        if (inner) {
          inner.classList.toggle("opacity-100", i === j);
          inner.classList.toggle("opacity-60", i !== j);
          inner.classList.toggle("group-hover:opacity-100", i !== j);
        }
      });
      if (canvas) statButtons[i].insertBefore(canvas, statButtons[i].firstChild);
      paintNums();
      // subtle re-entrance of the invoice mockup
      const mock = live.querySelector('[class*="aspect-square"] > div > div');
      if (mock && !reduceMotion) {
        mock.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        mock.style.opacity = "0";
        mock.style.transform = "translateY(10px)";
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            mock.style.opacity = "1";
            mock.style.transform = "none";
          })
        );
      }
    }
    statButtons.forEach((b, i) => {
      b.addEventListener("click", () => {
        if (b.getAttribute("aria-pressed") !== "true") setActive(i);
      });
    });
    paintNums();
  }

  // 6. header pill shrink ----------------------------------------------------
  const pill = document.querySelector("header .pointer-events-auto");
  if (pill) {
    pill.classList.add("header-pill");
    const onScroll = () => pill.classList.toggle("is-scrolled", scrollY > 24);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // 7. mobile menu -----------------------------------------------------------
  const burger = document.querySelector('button[aria-label="Open menu"]');
  if (burger) {
    let menu = null;
    const links = [
      ["Features", "/features"],
      ["Solutions", "/solutions"],
      ["Pricing", "/pricing"],
      ["FAQ", "/faq"],
      ["About", "/about"],
      ["Sign in", "https://app.collabbill.com/sign-in"],
    ];
    function closeMenu() {
      if (menu) menu.remove();
      menu = null;
      burger.setAttribute("aria-expanded", "false");
    }
    burger.addEventListener("click", () => {
      if (menu) return closeMenu();
      menu = document.createElement("div");
      menu.className = "clone-mobile-menu shadow-collabbill border-divide border";
      links.forEach(([label, href]) => {
        const a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        menu.appendChild(a);
      });
      const cta = document.createElement("a");
      cta.href = "https://app.collabbill.com";
      cta.textContent = "Try CollabBill Free";
      cta.className = "menu-cta";
      menu.appendChild(cta);
      document.body.appendChild(menu);
      burger.setAttribute("aria-expanded", "true");
    });
    document.addEventListener("click", (e) => {
      if (menu && !menu.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }
})();
