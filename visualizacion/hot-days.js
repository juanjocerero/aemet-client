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

    /* Carga de datos (robusta) */
    const DATA_URL = './hot-days.json'; // Asumimos que está en la misma carpeta

    async function loadData() {
      try {
        const res = await fetch(DATA_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error(res.status);
        return res.json();
      } catch (err) {
        console.warn(`❌ Fallo al cargar ${DATA_URL}`, err);
        yearInfo.innerHTML = '<p>No se pudieron cargar los datos de la visualización.</p>';
        return null;
      }
    }

    const data = await loadData();
    if (!data) return;

    /* Crear la cuadrícula */
    const TOTAL_DAYS = 92;
    const cells = [];
    const summerStartDate = new Date(1972, 5, 21); // Usar un año no bisiesto para consistencia

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const cell = document.createElement('div');
      cell.classList.add('day-cell');

      const currentDate = new Date(summerStartDate);
      currentDate.setDate(summerStartDate.getDate() + i);
      
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1;
      const label = `${day}/${month}`;

      cell.innerHTML = `
        <div class="emoji">🔥</div>
        <div class="date-label">${label}</div>
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

    let currentYearIndex = -1;

    function updateVisualization(index) {
      const yearData = data[index];
      if (!yearData) return;

      // Actualizar el año
      yearElement.textContent = yearData.año;

      // Calcular y actualizar el contador
      const hotDaysCount = yearData.dias.filter(isHot => isHot).length;
      counterElement.textContent = `${hotDaysCount} días por encima de la media`;

      // Actualizar la cuadrícula
      yearData.dias.forEach((isHot, i) => {
        if (cells[i]) {
          cells[i].classList.toggle('is-hot', isHot);
        }
      });
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
          // Usamos un tween para la transición del año y el contador
          gsap.to([yearElement, counterElement], { 
            duration: 0.3, 
            opacity: 0, 
            onComplete: () => {
              updateVisualization(newIndex);
              gsap.to([yearElement, counterElement], { duration: 0.3, opacity: 1 });
            }
          });
          // La actualización de la cuadrícula es casi instantánea con las clases
          updateVisualization(newIndex);
        }
      },
    });

    // Estado inicial
    updateVisualization(0);
    yearElement.style.opacity = 1;
    counterElement.style.opacity = 1;

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
