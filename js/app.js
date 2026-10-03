(function () {
  const { CONFIG, PRODUCTS } = window;
  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const isImg = (s) => /\.(png|jpe?g|webp|gif|svg)$/i.test(s || "");
  const iconHtml = (s) => (isImg(s) ? `<img class="icon-img" src="${esc(s)}" alt="">` : esc(s || ""));

  const home = $("home");
  const detail = $("detail");
  let current = null;

  function renderGrid() {
    $("grid").innerHTML = PRODUCTS.map(
      (p, i) => `
      <article class="card" style="--i:${i}">
        <div class="card__media" aria-hidden="true"><span>${iconHtml(p.icon)}</span></div>
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

  function shippingCost() {
    const S = window.SHIPPING;
    if (!S || !$("ship-mode") || $("ship-mode").value !== "envio") return 0;
    const zone = S.zones[S.provinces[$("ship-prov").value]];
    if (!zone) return 0;
    return S.freeFrom && current && current.price >= S.freeFrom ? 0 : zone.price;
  }

  function updateTotal() {
    const t = $("d-total");
    if (!t || !current) return;
    const envio = $("ship-mode").value === "envio";
    $("ship-fields").hidden = !envio;
    const c = shippingCost();
    t.textContent = envio
      ? `Envío: ${c ? money(c) : "gratis"} · Total: ${money(current.price + c)}`
      : `Total: ${money(current.price)}`;
  }

  function initShipping() {
    const S = window.SHIPPING;
    const mode = $("ship-mode");
    if (!S || !mode) return;
    mode.innerHTML =
      (S.retiro.enabled ? `<option value="retiro">${esc(S.retiro.label)}</option>` : "") +
      `<option value="envio">Envío a domicilio (todo el país)</option>`;
    $("ship-prov").innerHTML = Object.keys(S.provinces)
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((p) => `<option value="${esc(p)}">${esc(p)} (${money(S.zones[S.provinces[p]].price)})</option>`)
      .join("");
    mode.addEventListener("change", updateTotal);
    $("ship-prov").addEventListener("change", updateTotal);
  }

  function showDetail(p) {
    current = p;
    $("d-media").innerHTML = iconHtml(p.icon);
    $("d-title").textContent = p.name;
    $("d-desc").textContent = p.long;
    $("d-price").textContent = money(p.price);
    $("comment").value = "";
    updateTotal();
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

  // JSONP: Apps Script no envía cabeceras CORS, pero sí permite cargar la respuesta como <script>
  function sendOrder(order) {
    return new Promise((resolve, reject) => {
      const cb = "__order_" + Date.now();
      const s = document.createElement("script");
      const done = () => {
        clearTimeout(t);
        delete window[cb];
        s.remove();
      };
      const t = setTimeout(() => { done(); reject(new Error("timeout")); }, 30000);
      window[cb] = (data) => { done(); resolve(data); };
      s.onerror = () => { done(); reject(new Error("script error")); };
      const q = new URLSearchParams({ d: JSON.stringify(order), callback: cb });
      s.src = CONFIG.sheetEndpoint + (CONFIG.sheetEndpoint.includes("?") ? "&" : "?") + q;
      document.head.appendChild(s);
    });
  }

  async function buy() {
    if (!current) return;
    const envio = !!$("ship-mode") && $("ship-mode").value === "envio";
    let entrega = { tipo: "retiro" };
    if (envio) {
      entrega = {
        tipo: "envio",
        provincia: $("ship-prov").value,
        localidad: $("ship-city").value.trim().slice(0, 100),
        cp: $("ship-cp").value.trim().slice(0, 10),
        direccion: $("ship-addr").value.trim().slice(0, 200),
      };
      if (!entrega.localidad || !entrega.cp || !entrega.direccion) {
        setStatus("Completá localidad, código postal y dirección para el envío.", true);
        return;
      }
    }

    const btn = $("buy");
    btn.disabled = true;
    btn.textContent = "Preparando tu pago…";
    setStatus("Guardando tu elección…");

    const order = {
      productId: current.id,
      producto: current.name,
      precio: current.price,
      entrega,
      comentario: $("comment").value.trim().slice(0, 600),
      nombre: $("name").value.trim(),
      contacto: $("phone").value.trim().slice(0, 40),
      email: $("email").value.trim().slice(0, 120),
      origen: document.title,
    };

    let payUrl = current.mpLink || "";

    if (CONFIG.sheetEndpoint) {
      try {
        const data = await sendOrder(order);
        if (data.init_point) payUrl = data.init_point;
        else if (data.error) console.warn("Error del servidor de pedidos:", data.error);
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
    initShipping();
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
