/*  hot-days.js  –  versión CMS-friendly + carga robusta de libs  */
(async () => {
  /* ---------- 0️⃣  Cargar librerías si no existen ---------- */
  const libs = [
    { name: 'd3',            url: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js' },
    { name: 'gsap',          url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js' },
    { name: 'ScrollTrigger', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js' }
  ];

  for (const { name, url } of libs) {
    if (window[name]) continue;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      document.head.appendChild(s);
    });
  }

  /* ---------- 1️⃣  Helpers para lanzar cuando el DOM esté listo ---------- */
  function onDOMReady(fn) {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
  }

  /* ---------- 2️⃣  Función principal ---------- */
  async function initHotDays() {
    if (window.__hotDaysLoaded) return;
    window.__hotDaysLoaded = true;

    gsap.registerPlugin(ScrollTrigger);

    const yearInfo = document.getElementById('hot-days-year-info');
    const gridContainer = document.getElementById('hot-days-grid-container');
    const scrollSpacer = document.getElementById('hot-days-scroll-spacer');

    if (!yearInfo || !gridContainer || !scrollSpacer) {
      console.warn('Faltan contenedores del gráfico “hot-days”');
      return;
    }

    const DATA_URL = './hot-days.json';
    async function loadData() {
      try {
        const res = await fetch(DATA_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error(res.status);
        return res.json();
      } catch (err) {
        console.warn(`❌ Fallo al cargar ${DATA_URL}`, err);
        yearInfo.innerHTML = '<p>No se pudieron cargar los datos.</p>';
        return null;
      }
    }

    const data = await loadData();
    if (!data) return;

    const TOTAL_DAYS = 92;
    const cells = [];
    const summerStartDate = new Date(1972, 5, 21);

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const cell = document.createElement('div');
      cell.classList.add('day-cell');
      const currentDate = new Date(summerStartDate);
      currentDate.setDate(summerStartDate.getDate() + i);
      const day = currentDate.getDate();
      const month = currentDate.getMonth();
      const label = `${day}/${month + 1}`;
      cell.classList.add(`month-${month + 1}`);
      let monthLabel = '';
      if (day === 1) {
        const monthName = currentDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
        monthLabel = `<div class="month-label">${monthName}</div>`;
        cell.classList.add('month-start');
      }
      cell.innerHTML = `
        <div class="emoji">🔥</div>
        <div class="date-label">${label}</div>
        ${monthLabel}
      `;
      gridContainer.appendChild(cell);
      cells.push(cell);
    }

    const yearElement = document.createElement('div');
    yearElement.classList.add('year');
    yearInfo.appendChild(yearElement);

    const counterElement = document.createElement('div');
    counterElement.classList.add('hot-days-counter');
    yearInfo.appendChild(counterElement);

    const feverBarContainer = document.createElement('div');
    feverBarContainer.classList.add('fever-bar-container');
    const feverBarInner = document.createElement('div');
    feverBarInner.classList.add('fever-bar-inner');
    feverBarContainer.appendChild(feverBarInner);
    yearInfo.appendChild(feverBarContainer);

    let currentYearIndex = -1;
    const emojiElements = cells.map(c => c.querySelector('.emoji'));
    gsap.set(emojiElements, { opacity: 0, scale: 0 });

    function updateVisualization(index, animateEmojis = false) {
      const yearData = data[index];
      if (!yearData) return;

      yearElement.textContent = yearData.año;
      const hotDaysCount = yearData.dias.filter(isHot => isHot).length;
      counterElement.textContent = `${hotDaysCount} días por encima de la media`;

      const percentage = (hotDaysCount / TOTAL_DAYS) * 100;
      gsap.to(feverBarInner, { duration: 0.4, width: `${percentage}%` });

      const hotEmojis = [];
      const coldEmojis = [];
      yearData.dias.forEach((isHot, i) => {
        const emoji = emojiElements[i];
        if(isHot) hotEmojis.push(emoji);
        else coldEmojis.push(emoji);
      });

      if (animateEmojis) {
        gsap.to(coldEmojis, { duration: 0.3, opacity: 0, scale: 0, ease: 'power1.in' });
        gsap.to(hotEmojis, { duration: 0.4, opacity: 1, scale: 1, stagger: 0.01, ease: 'power2.out', delay: 0.1 });
      } else {
        gsap.set(hotEmojis, { opacity: 1, scale: 1 });
        gsap.set(coldEmojis, { opacity: 0, scale: 0 });
      }
    }

    ScrollTrigger.create({
      trigger: scrollSpacer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate(self) {
        const progress = self.progress;
        const newIndex = Math.min(data.length - 1, Math.floor(progress * data.length));
        if (newIndex !== currentYearIndex) {
          currentYearIndex = newIndex;
          gsap.to([yearElement, counterElement, feverBarContainer], { 
            duration: 0.3, 
            opacity: 0, 
            onComplete: () => {
              updateVisualization(newIndex, true);
              gsap.to([yearElement, counterElement, feverBarContainer], { duration: 0.3, opacity: 1 });
            }
          });
        }
      },
    });

    updateVisualization(0, false);
    gsap.set([yearElement, counterElement, feverBarContainer], { opacity: 1 });
    gsap.to(cells.map(c => c.querySelector('.emoji')).filter((e, i) => data[0].dias[i]), {
        duration: 0.5, opacity: 1, scale: 1, stagger: 0.01, delay: 0.5
    });
  }

  /* ---------- Lanzar cuando el DOM esté listo ---------- */
  onDOMReady(initHotDays);

  /* ---------- Observar si el CMS inserta el contenedor dinámicamente ---------- */
  function waitForContainer(selector) {
    const obs = new MutationObserver((mutations, observer) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        onDOMReady(initHotDays);
      }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  waitForContainer('#hot-days-visualization-container');

})();
