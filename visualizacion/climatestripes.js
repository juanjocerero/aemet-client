/* visualizacion/climatestripes.js */
(async () => {
  // --- 0. Carga robusta de librerías --- 
  const libs = [
    { name: 'd3', url: 'https://d3js.org/d3.v7.min.js' },
    { name: 'gsap', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js' },
    { name: 'ScrollTrigger', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js' }
  ];

  for (const { name, url } of libs) {
    if (window[name]) continue;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Error al cargar ${name} desde ${url}`));
      document.head.appendChild(s);
    });
  }

  // --- 1. Helpers y configuración inicial ---
  function onDOMReady(fn) {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
  }

  async function initClimateStripes() {
    if (window.climateStripesLoaded) return;
    window.climateStripesLoaded = true;

    gsap.registerPlugin(ScrollTrigger);

    // --- 2. Referencias al DOM y constantes ---
    const visContainer = document.getElementById('climate-stripes-visualization');
    const tooltip = document.getElementById('climate-stripes-tooltip');
    const container = document.getElementById('climate-stripes-container');

    if (!visContainer || !tooltip || !container) {
      console.error('Faltan elementos esenciales del DOM para la visualización.');
      return;
    }

    const track = document.createElement('div');
    track.className = 'climate-stripes-track';
    visContainer.appendChild(track);

    const GRAY_COLOR = '#e0e0e0';
    const BAR_HEIGHT = 32;
    const BAR_GAP = 2;
    const TOTAL_BAR_HEIGHT = BAR_HEIGHT + BAR_GAP;

    const MONTHS = [
        { name: 'Ene', days: 31 }, { name: 'Feb', days: 28 }, { name: 'Mar', days: 31 },
        { name: 'Abr', days: 30 }, { name: 'May', days: 31 }, { name: 'Jun', days: 30 },
        { name: 'Jul', days: 31 }, { name: 'Ago', days: 31 }, { name: 'Sep', days: 30 },
        { name: 'Oct', days: 31 }, { name: 'Nov', days: 30 }, { name: 'Dic', days: 31 }
    ];
    
    /* Carga de datos (robusta) */
    const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/hotdays.json?t=' + Date.now();
    const FALLBACK_URL = './hotdays.json';
    
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

    // --- 4. Escalas y Lógica de la Visualización ---
    function getColorForTemp(tmax) {
        if (tmax === null) return GRAY_COLOR;
        if (tmax >= 35) return '#de092a';
        if (tmax >= 30) return '#fcc34f';
        if (tmax >= 25) return '#fde46f';
        return GRAY_COLOR;
    }

    const yearsData = data.sort((a, b) => a.year - b.year);
    const totalYears = yearsData.length;
    const allYearBars = [];

    // --- 5. Pre-renderizado de todas las barras ---
    yearsData.forEach(yearData => {
        const bar = document.createElement('div');
        bar.className = 'year-stripe-bar';

        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.textContent = yearData.year;

        const ticksContainer = document.createElement('div');
        ticksContainer.className = 'day-ticks-container';

        const isLeap = yearData.days.length === 366;
        const totalDaysInYear = isLeap ? 366 : 365;

        yearData.days.forEach((day, index) => {
            const tick = document.createElement('div');
            tick.className = 'day-tick';
            tick.style.backgroundColor = getColorForTemp(day.tmax);
            
            const dayDate = new Date(day.date);
            if (dayDate.getUTCDate() === 1) {
                tick.classList.add('month-separator-tick');
            }

            ticksContainer.appendChild(tick);
        });

        // Añadir etiquetas de meses
        const monthLabelsContainer = document.createElement('div');
        monthLabelsContainer.className = 'month-labels-container';
        MONTHS.forEach((month, index) => {
            const monthDays = (index === 1 && isLeap) ? 29 : month.days;
            const label = document.createElement('div');
            label.className = 'month-label-item';
            label.textContent = index === 0 ? '' : month.name;
            label.style.width = `${(monthDays / totalDaysInYear) * 100}%`;
            monthLabelsContainer.appendChild(label);
        });

        // Añadir capa de patrón para días > 40ºC
        const patternOverlay = document.createElement('div');
        patternOverlay.className = 'pattern-overlay';

        const maskStops = yearData.days.map((day, i) => {
            const pos = (i / totalDaysInYear) * 100;
            const nextPos = ((i + 1) / totalDaysInYear) * 100;
            const color = day.tmax >= 40 ? 'black' : 'transparent';
            return `${color} ${pos}%, ${color} ${nextPos}%`;
        });

        patternOverlay.style.maskImage = `linear-gradient(to right, ${maskStops.join(', ')})`;
        patternOverlay.style.WebkitMaskImage = `linear-gradient(to right, ${maskStops.join(', ')})`;

        // Añadir capa para olas de calor
        const heatwaveOverlay = document.createElement('div');
        heatwaveOverlay.style.position = 'absolute';
        heatwaveOverlay.style.top = '0';
        heatwaveOverlay.style.left = '0';
        heatwaveOverlay.style.width = '100%';
        heatwaveOverlay.style.height = '100%';
        heatwaveOverlay.style.pointerEvents = 'none';
        heatwaveOverlay.style.backgroundColor = '#c90022';
        heatwaveOverlay.style.opacity = '0.7';
        heatwaveOverlay.style.mixBlendMode = 'multiply';

        const heatwaveMaskStops = yearData.days.map((day, i) => {
            const pos = (i / totalDaysInYear) * 100;
            const nextPos = ((i + 1) / totalDaysInYear) * 100;
            const color = day.isHeatwaveDay ? 'black' : 'transparent';
            return `${color} ${pos}%, ${color} ${nextPos}%`;
        });

        heatwaveOverlay.style.maskImage = `linear-gradient(to right, ${heatwaveMaskStops.join(', ')})`;
        heatwaveOverlay.style.WebkitMaskImage = `linear-gradient(to right, ${heatwaveMaskStops.join(', ')})`;

        bar.appendChild(yearLabel);
        bar.appendChild(ticksContainer);
        bar.appendChild(monthLabelsContainer);
        bar.appendChild(patternOverlay); // Añadir la capa del patrón
        bar.appendChild(heatwaveOverlay); // Añadir la capa de olas de calor
        track.appendChild(bar);
        allYearBars.push(bar);

        gsap.set(bar, { autoAlpha: 0 });

        bar.addEventListener('mousemove', (e) => {
            tooltip.style.display = 'block';
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;
            const margin = 15;
            let newLeft = e.clientX + margin;
            let newTop = e.clientY - margin - tooltipHeight;
            if (newLeft + tooltipWidth > window.innerWidth) newLeft = e.clientX - margin - tooltipWidth;
            if (newTop < 0) newTop = e.clientY + margin;
            tooltip.style.left = `${newLeft}px`;
            tooltip.style.top = `${newTop}px`;
            
            let tooltipHTML = `<div class="tooltip-year">${yearData.year}</div>`;
            tooltipHTML += `Olas de calor: <strong>${yearData.heatwaveCount}</strong><br>`;
            if (yearData.heatwaveCount > 0) {
                tooltipHTML += ` - Duración total: <strong>${yearData.heatwaveTotalDays} días</strong><br>`;
                tooltipHTML += ` - Intensidad media: <strong>${yearData.heatwaveAvgIntensity}°C</strong><br>`;
            }
            tooltipHTML += `Días por encima de 40°C: <strong>${yearData.daysOver40}</strong>`;
            if (yearData.annotation) tooltipHTML += `<div class="tooltip-annotation">${yearData.annotation}</div>`;
            tooltip.innerHTML = tooltipHTML;
        });

        bar.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });

    // --- 6. Scrollytelling con GSAP ---
    ScrollTrigger.create({
        trigger: container,
        pin: visContainer,
        start: 'top top',
        end: `+=${totalYears * 80}`,
        scrub: 1,
        onUpdate: self => {
            const progress = self.progress;
            let targetYearIndex = Math.floor(progress * totalYears);
            targetYearIndex = Math.min(targetYearIndex, totalYears - 1);

            allYearBars.forEach((bar, index) => {
                gsap.to(bar, { autoAlpha: index <= targetYearIndex ? 1 : 0, duration: 0.3 });
            });

            const viewportHeight = visContainer.offsetHeight;
            const visibleTrackHeight = (targetYearIndex + 1) * TOTAL_BAR_HEIGHT;
            const yOffset = Math.min(0, viewportHeight - visibleTrackHeight);
            gsap.to(track, { y: yOffset, duration: 0.3, ease: 'power1.out' });
        }
    });

    // Forzar la visibilidad de la primera barra al cargar
    if (allYearBars.length > 0) {
        gsap.to(allYearBars[0], { autoAlpha: 1, duration: 0.3 });
    }
  }

  onDOMReady(initClimateStripes);

})();
