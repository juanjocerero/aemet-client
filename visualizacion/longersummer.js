document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);
  
  const yearInfo = document.getElementById('year-info');
  // Crear un contenedor interno para el contenido que se animará
  const yearInfoContent = document.createElement('div');
  yearInfo.appendChild(yearInfoContent);
  
  const dayTrack = document.getElementById('day-track');
  const decadeAveragesContainer = document.getElementById('decade-averages-container');
  const monthLabelsContainer = document.getElementById('month-labels-container');
  
  // --- CONFIGURACIÓN DEL RANGO DE FECHAS ---
  const START_DAY_OF_YEAR = 91; // 1 de Abril
  const END_DAY_OF_YEAR = 304;  // 31 de Octubre
  const TOTAL_DAYS = END_DAY_OF_YEAR - START_DAY_OF_YEAR + 1; // 214 días
  
  // Ticks para el 1 de cada mes (Abril a Octubre), en formato de día del año
  const absoluteMonthTicks = [91, 121, 152, 182, 213, 244, 274];
  const relativeMonthTicks = absoluteMonthTicks.map(tick => tick - START_DAY_OF_YEAR);
  
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const dayMarker = document.createElement('div');
    dayMarker.classList.add('day-marker');
    if (relativeMonthTicks.includes(i)) {
      dayMarker.classList.add('month-tick');
    }
    dayTrack.appendChild(dayMarker);
  }
  const dayMarkers = Array.from(dayTrack.children);
  
  function formatHumanDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'long' });
    return `${day} de ${month}`;
  }
  
  function createMonthLabels(container) {
    const months = [
      { name: 'ABR', start: 91, days: 30 },
      { name: 'MAY', start: 121, days: 31 },
      { name: 'JUN', start: 152, days: 30 },
      { name: 'JUL', start: 182, days: 31 },
      { name: 'AGO', start: 213, days: 31 },
      { name: 'SEP', start: 244, days: 30 },
      { name: 'OCT', start: 274, days: 31 },
    ];
    
    months.forEach(month => {
      const label = document.createElement('div');
      label.classList.add('month-label');
      label.textContent = month.name;
      const relativeStart = month.start - START_DAY_OF_YEAR;
      label.style.left = `${(relativeStart / TOTAL_DAYS) * 100}%`;
      label.style.width = `${(month.days / TOTAL_DAYS) * 100}%`;
      container.appendChild(label);
    });
  }
  
  createMonthLabels(monthLabelsContainer);
  
  d3.json("veranos.json").then(data => {
    const years = data.sort((a, b) => a.año - b.año);
    const decades = {
      '1970': years.filter(d => d.año >= 1972 && d.año <= 1979),
      '1980': years.filter(d => d.año >= 1980 && d.año <= 1989),
      '1990': years.filter(d => d.año >= 1990 && d.año <= 1999),
      '2000': years.filter(d => d.año >= 2000 && d.año <= 2009),
      '2010': years.filter(d => d.año >= 2010 && d.año <= 2019),
      '2020': years.filter(d => d.año >= 2020 && d.año <= 2025),
    };
    const renderedDecades = new Set();
    
    let currentYearIndex = 0;
    
    function updateVisualization(yearIndex, animate = true) {
      const yearData = years[yearIndex];
      const getDayOfYear = d3.timeFormat("%j");
      const absoluteStartDay = +getDayOfYear(new Date(yearData.fecha_inicio));
      const absoluteEndDay = +getDayOfYear(new Date(yearData.fecha_fin));
      
      const startDay = Math.max(0, absoluteStartDay - START_DAY_OF_YEAR);
      const endDay = Math.min(TOTAL_DAYS - 1, absoluteEndDay - START_DAY_OF_YEAR);
      
      const yearHTML = `<span class="year">${yearData.año}</span>`;
      const detailsHTML = `<span class="details"><span class="detail-days">${yearData.duracion_verano_dias} días</span>, entre el ${formatHumanDate(yearData.fecha_inicio)} y el ${formatHumanDate(yearData.fecha_fin)}</span>`;
      
      if (animate) {
        gsap.timeline()
        .to(yearInfoContent, { 
          duration: 0.4, 
          opacity: 0, 
          onComplete: () => yearInfoContent.innerHTML = `${yearHTML}${detailsHTML}`
        })
        .to(yearInfoContent, { duration: 0.5, opacity: 1 })
        .to(dayMarkers, { backgroundColor: '#d7d8d8', duration: 0.5, stagger: 0.001 }, 0)
        .to(dayMarkers.slice(startDay, endDay + 1), { backgroundColor: '#c90022', duration: 0.5, stagger: 0.001 }, ">.1");
      } else {
        yearInfoContent.innerHTML = `${yearHTML}${detailsHTML}`;
        dayMarkers.forEach((marker, i) => {
          marker.style.backgroundColor = (i >= startDay && i <= endDay) ? '#c90022' : '#d7d8d8';
        });
      }
    }
    
    function createDecadeAverage(decade) {
      if (renderedDecades.has(decade)) return;
      
      const decadeData = decades[decade];
      const avgDuration = Math.round(d3.mean(decadeData, d => d.duracion_verano_dias));
      const getDayOfYear = d3.timeFormat("%j");
      const avgAbsoluteStartDay = Math.round(d3.mean(decadeData, d => +getDayOfYear(new Date(d.fecha_inicio))));
      
      const avgStartDay = Math.max(0, avgAbsoluteStartDay - START_DAY_OF_YEAR);
      const avgEndDay = Math.min(TOTAL_DAYS - 1, avgStartDay + avgDuration);
      
      const decadeBar = document.createElement('div');
      decadeBar.classList.add('decade-average-bar');
      
      const decadeInfo = document.createElement('div');
      decadeInfo.innerHTML = `Década de <strong>${decade}: ${avgDuration} días</strong> de media`;
      decadeBar.appendChild(decadeInfo);
      
      const decadeDayTrackContainer = document.createElement('div');
      decadeDayTrackContainer.style.position = 'relative';
      
      const decadeDayTrack = document.createElement('div');
      decadeDayTrack.classList.add('day-track');
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const dayMarker = document.createElement('div');
        dayMarker.classList.add('day-marker');
        if (i >= avgStartDay && i <= avgEndDay) {
          dayMarker.style.backgroundColor = '#fcc34f';
        }
        if (relativeMonthTicks.includes(i)) {
          dayMarker.classList.add('month-tick');
        }
        decadeDayTrack.appendChild(dayMarker);
      }
      decadeDayTrackContainer.appendChild(decadeDayTrack);
      
      decadeBar.appendChild(decadeDayTrackContainer);
      decadeAveragesContainer.appendChild(decadeBar);
      
      gsap.from(decadeBar, { opacity: 0, y: 50, duration: 0.5 });
      
      renderedDecades.add(decade);
    }
    
    ScrollTrigger.create({
      trigger: "#scroll-spacer",
      start: "top top",
      end: "bottom bottom",
      scrub: 2,
      onUpdate: self => {
        const progress = self.progress;
        const yearIndex = Math.min(years.length - 1, Math.floor(progress * years.length));
        
        if (yearIndex !== currentYearIndex) {
          currentYearIndex = yearIndex;
          updateVisualization(currentYearIndex);
        }
        
        for (const decade in decades) {
          const lastYear = decades[decade][decades[decade].length - 1].año;
          if (years[currentYearIndex].año >= lastYear) {
            createDecadeAverage(decade);
          }
        }
      }
    });
    
    updateVisualization(0, false);
    
  }).catch(error => {
    console.error("Error al cargar los datos:", error);
  });
});