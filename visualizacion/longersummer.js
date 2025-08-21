/*  longer-summer.js  –  versión CMS-friendly + carga robusta de libs  */
(async () => {
  /* ---------- 0️⃣  Cargar librerías si no existen ---------- */
  const libs = [
    { name: 'd3',            url: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js' },
    { name: 'gsap',          url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js' },
    { name: 'ScrollTrigger', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js' }
  ];

  for (const { name, url } of libs) {
    if (window[name]) continue;                      // ya está
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
  async function initLongerSummer() {
    if (window.__longerSummerLoaded) return;
    window.__longerSummerLoaded = true;

    /* Registro de plugins */
    gsap.registerPlugin(ScrollTrigger);

    /* Referencias al DOM */
    const yearInfo = document.getElementById('longer-summer-year-info');
    const yearInfoContent = document.createElement('div');
    yearInfo?.appendChild(yearInfoContent);

    const dayTrack = document.getElementById('longer-summer-day-track');
    const decadeAveragesContainer = document.getElementById('longer-summer-decade-averages-container');
    const monthLabelsContainer = document.getElementById('longer-summer-month-labels-container');
    const scrollSpacer = document.getElementById('longer-summer-scroll-spacer');

    if (!yearInfo || !dayTrack || !decadeAveragesContainer || !monthLabelsContainer || !scrollSpacer) {
      console.warn('Faltan contenedores del gráfico “longer-summer”');
      return;
    }

    /* Constantes y utilidades */
    const START_DAY_OF_YEAR = 91;
    const END_DAY_OF_YEAR = 304;
    const TOTAL_DAYS = END_DAY_OF_YEAR - START_DAY_OF_YEAR + 1;
    const absoluteMonthTicks = [91, 121, 152, 182, 213, 244, 274];
    const relativeMonthTicks = absoluteMonthTicks.map(t => t - START_DAY_OF_YEAR);

    function formatHumanDate(dateStr) {
      const d = new Date(dateStr);
      return `${d.getDate()} de ${d.toLocaleString('es-ES', { month: 'long' })}`;
    }

    /* Pintar ticks de días */
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const dayMarker = document.createElement('div');
      dayMarker.classList.add('longer-summer-day-marker');
      if (relativeMonthTicks.includes(i)) dayMarker.classList.add('longer-summer-month-tick');
      dayTrack.appendChild(dayMarker);
    }
    const dayMarkers = Array.from(dayTrack.children);

    /* Etiquetas de meses */
    (function createMonthLabels(container) {
      const months = [
        { name: 'ABR', start: 91, days: 30 },
        { name: 'MAY', start: 121, days: 31 },
        { name: 'JUN', start: 152, days: 30 },
        { name: 'JUL', start: 182, days: 31 },
        { name: 'AGO', start: 213, days: 31 },
        { name: 'SEP', start: 244, days: 30 },
        { name: 'OCT', start: 274, days: 31 },
      ];
      months.forEach(m => {
        const label = document.createElement('div');
        label.classList.add('longer-summer-month-label');
        label.textContent = m.name;
        label.style.left = `${((m.start - START_DAY_OF_YEAR) / TOTAL_DAYS) * 100}%`;
        label.style.width = `${(m.days / TOTAL_DAYS) * 100}%`;
        container.appendChild(label);
      });
    })(monthLabelsContainer);

    /* Carga de datos (robusta) */
    const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/duracion-veranos.json?t=' + Date.now();
    const FALLBACK_URL = './veranos.json';

    async function loadData() {
      try {
        const res = await fetch(DATA_URL, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(res.status);
        return res.json();
      } catch (err) {
        console.warn('❌ Fallo al cargar JSON remoto', err);
        const res2 = await fetch(FALLBACK_URL);
        if (!res2.ok) throw new Error(res2.status);
        return res2.json();
      }
    }

    let data;
    try {
      data = await loadData();
      console.log('✅ JSON cargado', data);
    } catch (err) {
      console.error('❌ Ni remoto ni fallback disponible', err);
      yearInfoContent.textContent = 'No se pudieron cargar los datos.';
      return;
    }

    /* Procesar datos y pintar visualización */
    const years = data.sort((a, b) => a.año - b.año);
    const decades = {
      1970: years.filter(d => d.año >= 1972 && d.año <= 1979),
      1980: years.filter(d => d.año >= 1980 && d.año <= 1989),
      1990: years.filter(d => d.año >= 1990 && d.año <= 1999),
      2000: years.filter(d => d.año >= 2000 && d.año <= 2009),
      2010: years.filter(d => d.año >= 2010 && d.año <= 2019),
      2020: years.filter(d => d.año >= 2020 && d.año <= 2025),
    };
    const renderedDecades = new Set();
    let currentYearIndex = 0;

    function updateVisualization(idx, animate = true) {
      const yd = years[idx];
      const getDayOfYear = d3.timeFormat('%j');
      const absStart = +getDayOfYear(new Date(yd.fecha_inicio));
      const absEnd = +getDayOfYear(new Date(yd.fecha_fin));

      const start = Math.max(0, absStart - START_DAY_OF_YEAR);
      const end = Math.min(TOTAL_DAYS - 1, absEnd - START_DAY_OF_YEAR);

      const yearHTML = `<span class="longer-summer-year">${yd.año}</span>`;
      const detailsHTML = `<span class="longer-summer-details"><span class="longer-summer-detail-days">${yd.duracion_verano_dias} días</span>, entre el ${formatHumanDate(yd.fecha_inicio)} y el ${formatHumanDate(yd.fecha_fin)}</span>`;

      if (animate) {
        gsap.timeline()
          .to(yearInfoContent, { duration: 0.4, opacity: 0, onComplete: () => { yearInfoContent.innerHTML = `${yearHTML}${detailsHTML}`; } })
          .to(yearInfoContent, { duration: 0.5, opacity: 1 })
          .to(dayMarkers, { backgroundColor: '#d7d8d8', duration: 0.5, stagger: 0.001 }, 0)
          .to(dayMarkers.slice(start, end + 1), { backgroundColor: '#c90022', duration: 0.5, stagger: 0.001 }, '>.1');
      } else {
        yearInfoContent.innerHTML = `${yearHTML}${detailsHTML}`;
        dayMarkers.forEach((m, i) => { m.style.backgroundColor = (i >= start && i <= end) ? '#c90022' : '#d7d8d8'; });
      }
    }

    function createDecadeAverage(decade) {
      if (renderedDecades.has(decade)) return;
      const decadeData = decades[decade];
      const avgDuration = Math.round(d3.mean(decadeData, d => d.duracion_verano_dias));
      const getDayOfYear = d3.timeFormat('%j');
      const avgAbsStart = Math.round(d3.mean(decadeData, d => +getDayOfYear(new Date(d.fecha_inicio))));
      const avgStart = Math.max(0, avgAbsStart - START_DAY_OF_YEAR);
      const avgEnd = Math.min(TOTAL_DAYS - 1, avgStart + avgDuration);

      const bar = document.createElement('div');
      bar.classList.add('longer-summer-decade-average-bar');
      const info = document.createElement('div');
      info.innerHTML = `Década de <strong>${decade}: ${avgDuration} días</strong> de media`;
      bar.appendChild(info);

      const trackContainer = document.createElement('div');
      trackContainer.style.position = 'relative';
      const decadeTrack = document.createElement('div');
      decadeTrack.classList.add('longer-summer-day-track');
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const dm = document.createElement('div');
        dm.classList.add('longer-summer-day-marker');
        if (i >= avgStart && i <= avgEnd) dm.style.backgroundColor = '#fcc34f';
        if (relativeMonthTicks.includes(i)) dm.classList.add('longer-summer-month-tick');
        decadeTrack.appendChild(dm);
      }
      trackContainer.appendChild(decadeTrack);
      bar.appendChild(trackContainer);
      decadeAveragesContainer.appendChild(bar);
      gsap.from(bar, { opacity: 0, y: 50, duration: 0.5 });
      renderedDecades.add(decade);
    }

    ScrollTrigger.create({
      trigger: scrollSpacer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
      onUpdate(self) {
        const progress = self.progress;
        const idx = Math.min(years.length - 1, Math.floor(progress * years.length));
        if (idx !== currentYearIndex) {
          currentYearIndex = idx;
          updateVisualization(currentYearIndex);
        }
        for (const d in decades) {
          const last = decades[d][decades[d].length - 1].año;
          if (years[idx].año >= last) createDecadeAverage(d);
        }
      },
    });

    updateVisualization(0, false);
  }

  /* ---------- Lanzar cuando el DOM esté listo ---------- */
  onDOMReady(initLongerSummer);

  /* ---------- Observar si el CMS inserta el contenedor dinámicamente ---------- */
  function waitForContainer(selector) {
    const obs = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        obs.disconnect();
        onDOMReady(initLongerSummer);
      }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  waitForContainer('#longer-summer-scroll-spacer');
})();