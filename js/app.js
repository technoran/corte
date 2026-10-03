(function () {
  const { CONFIG, PRODUCTS } = window;
  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const home = $("home");
  const detail = $("detail");
  let current = null;

  function renderGrid() {
    $("grid").innerHTML = PRODUCTS.map(
      (p, i) => `
      <article class="card" style="--i:${i}">
        <div class="card__media" aria-hidden="true"><span>${p.icon}</span></div>
        <div class="card__body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.short)}</p>
          <div class="card__foot">
            <span class="price">${money(p.price)}</span>
            <a class="btn" href="#producto/${p.id}">Lo quiero</a>
          </div>
        </div>
      </article>`
    ).join("");
  }

  function setStatus(msg, isError) {
    const s = $("d-status");
    s.textContent = msg;
    s.classList.toggle("is-error", !!isError);
  }

  function showDetail(p) {
    current = p;
    $("d-media").textContent = p.icon;
    $("d-title").textContent = p.name;
    $("d-desc").textContent = p.long;
    $("d-price").textContent = money(p.price);
    $("comment").value = "";
    setStatus("");
    $("buy").disabled = false;
    $("buy").textContent = "Comprar";
    home.hidden = true;
    detail.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function route() {
    const m = location.hash.match(/^#producto\/(.+)$/);
    const p = m && PRODUCTS.find((x) => x.id === m[1]);
    if (p) return showDetail(p);
    current = null;
    detail.hidden = true;
    home.hidden = false;
    if (location.hash.length > 1) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView();
    }
  }

  async function buy() {
    if (!current) return;
    const btn = $("buy");
    btn.disabled = true;
    btn.textContent = "Preparando tu pago…";
    setStatus("Guardando tu elección…");

    const order = {
      productId: current.id,
      producto: current.name,
      precio: current.price,
      comentario: $("comment").value.trim(),
      nombre: $("name").value.trim(),
      contacto: $("contact").value.trim(),
      origen: document.title,
    };

    let payUrl = current.mpLink || "";

    if (CONFIG.sheetEndpoint) {
      try {
        // text/plain evita el preflight CORS que Apps Script no soporta
        const res = await fetch(CONFIG.sheetEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(order),
        });
        const data = await res.json();
        if (data.init_point) payUrl = data.init_point;
      } catch (e) {
        console.warn("No se pudo contactar al servidor de pedidos", e);
      }
    }

    if (!payUrl) {
      btn.disabled = false;
      btn.textContent = "Comprar";
      setStatus("Todavía no está configurado el pago. Escribinos por WhatsApp y lo resolvemos al instante.", true);
      return;
    }

    setStatus("Abriendo Mercado Pago…");
    // Los links de Mercado Pago son universal links: en el celular abren la app si está
    // instalada y, si no, la versión web.
    window.location.href = payUrl;
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Comprar";
    }, 4000);
  }

  function initCarousel() {
    const root = $("carousel");
    const works = window.WORKS || [];
    if (!root || !works.length) return;
    root.innerHTML = `
      <div class="car__track">${works
        .map(
          (w, i) => `<figure class="car__slide" role="group" aria-label="${i + 1} de ${works.length}">
            ${w.image ? `<img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">` : `<span class="car__icon" aria-hidden="true">${w.icon || ""}</span>`}
            <figcaption class="car__cap"><b>${esc(w.title)}</b><span>${esc(w.note || "")}</span></figcaption>
          </figure>`
        )
        .join("")}</div>
      <button class="car__btn car__btn--prev" type="button" aria-label="Anterior">‹</button>
      <button class="car__btn car__btn--next" type="button" aria-label="Siguiente">›</button>
      <div class="car__dots">${works.map((_, i) => `<button type="button" aria-label="Ir al trabajo ${i + 1}"></button>`).join("")}</div>`;

    const track = root.querySelector(".car__track");
    const dots = [...root.querySelectorAll(".car__dots button")];
    const n = works.length;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, timer = null;

    const go = (k) => {
      i = (k + n) % n;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, j) => d.setAttribute("aria-current", j === i));
    };
    const stop = () => clearInterval(timer);
    const play = () => {
      stop();
      if (!reduce && n > 1 && !document.hidden) timer = setInterval(() => go(i + 1), 4000);
    };

    root.querySelector(".car__btn--prev").addEventListener("click", () => { go(i - 1); play(); });
    root.querySelector(".car__btn--next").addEventListener("click", () => { go(i + 1); play(); });
    dots.forEach((d, j) => d.addEventListener("click", () => { go(j); play(); }));
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", play);
    document.addEventListener("visibilitychange", play);

    let x0 = null;
    root.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (x0 !== null) {
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
      }
      x0 = null;
      play();
    });

    go(0);
    play();
  }

  function init() {
    initCarousel();
    document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
    document.querySelectorAll("[data-wa]").forEach((a) => {
      a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Hola! Quiero hacer una consulta.")}`;
    });
    document.querySelectorAll("[data-brand]").forEach((e) => (e.textContent = CONFIG.negocio));
    renderGrid();
    $("buy").addEventListener("click", buy);
    $("back").addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState("", document.title, location.pathname + "#creaciones");
      route();
    });
    window.addEventListener("hashchange", route);
    route();

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((en) => en.isIntersecting && (en.target.classList.add("in"), io.unobserve(en.target))),
        { threshold: 0.12 }
      );
      document.querySelectorAll(".reveal, .card").forEach((el) => io.observe(el));
    } else {
      document.querySelectorAll(".reveal, .card").forEach((el) => el.classList.add("in"));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
