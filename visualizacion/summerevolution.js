/**
* summerevolution.js
* Lógica para la visualización interactiva de la evolución de las temperaturas de verano.
* Utiliza D3.js para el renderizado del gráfico y GSAP con ScrollTrigger para el scrollytelling.
*/
(async () => {
  // --- 0. Carga robusta de librerías y polyfills ---
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
      s.onerror = () => reject(new Error(`Error al cargar ${name}`));
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
  
  async function init() {
    if (window.summerevolutionLoaded) return;
    window.summerevolutionLoaded = true;
    
    gsap.registerPlugin(ScrollTrigger);
    
    // --- 2. Carga de datos ---
    const DATA_URL = 'summerevolution.json'; // Asumimos que está en la misma carpeta
    let data;
    try {
      const response = await fetch(DATA_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      data = await response.json();
    } catch (e) {
      console.error("No se pudieron cargar los datos de la visualización:", e);
      document.getElementById('summerevolution-chart').innerHTML = '<p>Error al cargar los datos.</p>';
      return;
    }
    
    // --- 3. Configuración del gráfico D3 ---
    const container = document.getElementById('summerevolution-chart');
    const margin = container.clientWidth > 768 
        ? { top: 10, right: 30, bottom: 30, left: 40 } 
        : { top: 5, right: 15, bottom: 20, left: 35 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    const svg = d3.select(container).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // --- 3.1. Pre-cálculo de datos ---
    // Décadas
    const decades = [
      { start: 1972, end: 1979, label: '1972-79' },
      { start: 1980, end: 1989, label: 'Años 80' },
      { start: 1990, end: 1999, label: 'Años 90' },
      { start: 2000, end: 2009, label: 'Años 2000' },
      { start: 2010, end: 2019, label: 'Años 2010' },
      { start: 2020, end: 2025, label: '2020-25' }
    ];
    data.decadalData = decades.map(decade => {
      const yearsInDecade = data.yearlyData.filter(d => d.year >= decade.start && d.year <= decade.end);
      const meanTmax = d3.mean(yearsInDecade, d => d.meanTmax);
      return { ...decade, meanTmax };
    });
    
    // Puntos de min/max para cada año
    data.yearlyData.forEach(year => {
      const validPoints = year.dailyPoints.filter(p => p.tmax !== null);
      if (validPoints.length === 0) return;
      year.minTmaxPoint = validPoints.reduce((min, p) => p.tmax < min.tmax ? p : min, validPoints[0]);
      year.maxTmaxPoint = validPoints.reduce((max, p) => p.tmax > max.tmax ? p : max, validPoints[0]);
    });
    
    // Escalas
    const x = d3.scaleLinear().domain([0, 93]).range([0, width]);
    const y = d3.scaleLinear().domain([data.bounds.min - 2, data.bounds.max + 2]).range([height, 0]);
    const tempColor = d3.scaleSequential(d3.interpolateOranges).domain([data.bounds.min, data.bounds.max]);
    
    // Ejes
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `${d.toString().replace('.', ',')}°C`);
    const yAxisGroup = svg.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove(); // 1. Eliminar la línea del eje Y
    yAxisGroup.selectAll('.tick line').remove(); // 1. Eliminar las líneas de los ticks
    yAxisGroup.select(".tick:first-of-type").remove();
    yAxisGroup.select(".tick:last-of-type").remove();
    
    // Generadores de línea y área
    const lineGenerator = d3.line().x(d => x(d.day)).y(d => y(d.tmax)).defined(d => d.tmax !== null);
    const avgLineGenerator = d3.line().x(d => x(d.day)).y(d => y(d.avgTmax)).defined(d => d.avgTmax !== null);
    const areaGenerator = d3.area()
        .x(d => x(d.day))
        .y0(d => y(d.avgTmax))
        .y1(d => y(d.tmax))
        .defined(d => d.tmax !== null && d.avgTmax !== null);

    // --- 4. Dibujado de elementos ---
    const defs = svg.append('defs');

    const differenceArea = svg.append('path')
        .attr('class', 'difference-area')
        .style('opacity', 0);

    const historicalAvgLine = svg.append('path')
        .datum(data.historicalDailyAverage)
        .attr('class', 'historical-average-line')
        .attr('d', avgLineGenerator)
        .style('stroke', '#555')
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4 4')
        .style('fill', 'none');

    const yearGroups = svg.append('g')
        .selectAll('.year-group')
        .data(data.yearlyData)
        .join('g')
        .attr('class', 'year-group')
        .style('opacity', 0);

    yearGroups.each(function(d) {
        const group = d3.select(this);
        const year = d.year;
        const gradientId = `gradient-${year}`;

        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '0%');

        d.dailyPoints.forEach(point => {
            if (point.tmax !== null) {
                gradient.append('stop')
                    .attr('offset', `${(point.day / 93) * 100}%`)
                    .attr('stop-color', tempColor(point.tmax));
            }
        });

        group.append('path')
            .attr('class', 'line-halo')
            .attr('d', lineGenerator(d.dailyPoints))
            .style('stroke', 'rgba(0,0,0,0.1)')
            .style('stroke-width', 4)
            .style('fill', 'none')
            .style('stroke-linejoin', 'round')
            .style('stroke-linecap', 'round');

        group.append('path')
            .attr('class', 'line')
            .attr('d', lineGenerator(d.dailyPoints))
            .style('stroke', `url(#${gradientId})`)
            .style('stroke-width', 1.5)
            .style('fill', 'none');
    });

    const decadalLines = svg.append('g').attr('class', 'decadal-lines')
        .selectAll('.decade-line').data(data.decadalData).join('line')
        .attr('class', d => `decade-line decade-line-${d.end}`)
        .attr('x1', 0).attr('x2', width)
        .attr('y1', d => y(d.meanTmax)).attr('y2', d => y(d.meanTmax))
        .style('stroke', d => tempColor(d.meanTmax))
        .style('stroke-width', 2).style('stroke-dasharray', '3 3')
        .style('opacity', 0);

    const decadalLabels = svg.append('g').attr('class', 'decadal-labels')
        .selectAll('.decade-label').data(data.decadalData).join('text')
        .attr('class', d => `decade-label decade-label-${d.end}`)
        .attr('x', width - 5).attr('y', d => y(d.meanTmax))
        .attr('dy', '-0.6em')
        .attr('text-anchor', 'end')
        .style('font-size', '11px').style('font-weight', 'bold')
        .style('fill', '#202020')
        .text(d => `${d.label}: ${d.meanTmax.toFixed(1).replace('.', ',')}°C`)
        .style('opacity', 0);

    const yearMarkersGroup = svg.append('g').attr('class', 'year-markers');
    const tooltip = d3.select('#summerevolution-tooltip');

    // --- 5. Lógica de actualización y Scrollytelling ---
    let currentYearIndex = -1;

    function getFormattedDate(dayOfSummer) {
        const date = new Date(2023, 5, 21 + dayOfSummer);
        const day = date.getDate();
        const monthNames = ["junio", "julio", "agosto", "septiembre"];
        const month = monthNames[date.getMonth() - 5];
        return `${day} de ${month}`;
    }

    function updateVisuals(index) {
        if (index < 0 || index >= data.yearlyData.length) return;
        if (index === currentYearIndex) return;
        currentYearIndex = index;

        const yearData = data.yearlyData[currentYearIndex];
        const currentYear = yearData.year;

        // Actualizar área de diferencia
        const combinedData = yearData.dailyPoints.map(d => {
            const avgData = data.historicalDailyAverage.find(ad => ad.day === d.day);
            return {
                day: d.day,
                tmax: d.tmax,
                avgTmax: avgData ? avgData.avgTmax : null
            };
        });

        const isWarmer = yearData.meanTmax > data.periodMeanTmax;
        differenceArea
            .datum(combinedData)
            .transition()
            .duration(300)
            .attr('d', areaGenerator)
            .style('fill', isWarmer ? 'rgba(217, 83, 79, 0.3)' : 'rgba(0, 206, 182, 0.3)')
            .style('opacity', 1);


        // Actualizar líneas anuales
        yearGroups.each(function(d, i) {
            const group = d3.select(this);
            group.style('opacity', i === currentYearIndex ? 1 : (i < currentYearIndex ? 0.05 : 0));
            group.select('.line')
                .transition()
                .duration(200)
                .style('stroke-width', i === currentYearIndex ? 2.5 : 1.5);
        });
        d3.select(yearGroups.nodes()[currentYearIndex]).raise();
        historicalAvgLine.raise();
        differenceArea.raise();
        yearMarkersGroup.raise();


        // Lógica de Décadas
        const currentDecade = data.decadalData.find(d => currentYear >= d.start && currentYear <= d.end);
        const previousDecadeIndex = data.decadalData.findIndex(d => d.end === currentDecade?.end) - 1;
        const previousDecade = previousDecadeIndex >= 0 ? data.decadalData[previousDecadeIndex] : null;

        data.decadalData.forEach(decade => {
            let lineOpacity = 0,
                labelOpacity = 0;
            if (currentDecade && decade.end === currentDecade.end) {
                lineOpacity = 1;
                labelOpacity = 1;
            } else if (previousDecade && decade.end === previousDecade.end) {
                lineOpacity = 0.5;
                labelOpacity = 1;
            }
            decadalLines.filter(d => d.end === decade.end).transition().duration(300).style('opacity', lineOpacity);
            decadalLabels.filter(d => d.end === decade.end).transition().duration(300).style('opacity', labelOpacity);
        });

        if (currentDecade && previousDecade) {
            const y1 = y(currentDecade.meanTmax),
                y2 = y(previousDecade.meanTmax);
            const label1 = decadalLabels.filter(d => d.end === currentDecade.end);
            const label2 = decadalLabels.filter(d => d.end === previousDecade.end);
            if (Math.abs(y1 - y2) < 15) {
                label1.attr('dy', y1 < y2 ? '-0.6em' : '1.3em');
                label2.attr('dy', y2 < y1 ? '-0.6em' : '1.3em');
            } else {
                label1.attr('dy', '-0.6em');
                label2.attr('dy', '-0.6em');
            }
        }

        // Marcadores de min/max para el año activo
        yearMarkersGroup.selectAll('*').remove();
        if (yearData.minTmaxPoint && yearData.maxTmaxPoint) {
            const points = [{
                type: 'max',
                data: yearData.maxTmaxPoint,
                color: '#d9534f',
                anchor: 'start',
                dx: 15,
                dy: -15,
                textAnchor: 'start'
            }, {
                type: 'min',
                data: yearData.minTmaxPoint,
                color: '#00ceb6',
                anchor: 'end',
                dx: -15,
                dy: 15,
                textAnchor: 'end'
            }, ];

            points.forEach(p => {
                const markerGroup = yearMarkersGroup.append('g').style('opacity', 0);
                const pointX = x(p.data.day);
                const pointY = y(p.data.tmax);

                let textX = pointX + p.dx;
                let textY = pointY + p.dy;
                const textAnchor = (textX > width - 80) ? 'end' : (textX < 80 ? 'start' : p.textAnchor);

                if (textX > width - 80) textX = pointX - 15;
                if (textX < 80) textX = pointX + 15;
                if (textY < 15) textY = pointY + 30;
                if (textY > height - 15) textY = pointY - 30;

                const controlX = pointX + (textX - pointX) / 2;
                const controlY = textY;

                markerGroup.append('path')
                    .attr('d', `M${pointX},${pointY} Q${controlX},${controlY} ${textX},${textY}`)
                    .attr('stroke', '#333')
                    .attr('fill', 'none')
                    .attr('stroke-width', 1);

                markerGroup.append('circle')
                    .attr('cx', pointX)
                    .attr('cy', pointY)
                    .attr('r', 6)
                    .style('fill', p.color)
                    .style('stroke', '#fff')
                    .style('stroke-width', 1.5);

                markerGroup.append('text')
                    .attr('x', textX)
                    .attr('y', textY)
                    .attr('text-anchor', textAnchor)
                    .attr('alignment-baseline', 'middle')
                    .attr('dx', textAnchor === 'start' ? 5 : -5)
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#333')
                    .text(`${getFormattedDate(p.data.day)}: ${p.data.tmax.toFixed(1).replace('.', ',')}ºC`);

                markerGroup.transition().duration(500).style('opacity', 1);
            });
        }

        // Tooltip principal
        const textColor = tempColor(yearData.meanTmax);
        const darkerTextColor = d3.color(textColor).darker(1);

        const deviation = yearData.meanTmax - data.periodMeanTmax;
        const sign = deviation >= 0 ? '+' : '';
        const deviationValue = `<strong>${sign}${deviation.toFixed(1).replace('.', ',')}°C</strong>`;
        const meanValue = `<strong>${yearData.meanTmax.toFixed(1).replace('.', ',')}°C</strong>`;
        const deviationText = `${deviationValue} sobre la media del período`;
        const meanText = `${meanValue} de media durante el verano`;
        
        // 3. Usar el mismo color verde/rojo en el tooltip
        const deviationColor = isWarmer ? '#d9534f' : '#00ceb6';

        tooltip.html(`
                <div class="year" style="color: ${darkerTextColor};">${yearData.year}</div>
                <div class="mean" style="color: ${darkerTextColor};">${meanText}</div>
                <div class="deviation" style="color: ${deviationColor};">${deviationText}</div>
            `)
            .style('opacity', 1)
            .style('top', null)
            .style('bottom', '-3rem') // Dejamos espacio para las etiquetas inferiores
            .style('left', '50%')
            .style('transform', 'translateX(-50%)')
            .style('background-color', 'rgba(255, 255, 255, 0.6)');


        // Fondo con gradiente
        const container = d3.select('#summerevolution-container');
        const bgColor = d3.color(tempColor(yearData.meanTmax));
        if (bgColor) {
            bgColor.opacity = 0.2;
            container.style('background-color', bgColor.toString());
        } else {
            container.style('background-color', 'transparent');
        }
    }
      
      ScrollTrigger.create({
        trigger: '#summerevolution-scroll-spacer',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        onUpdate: self => {
          const yearIndex = Math.floor(self.progress * data.yearlyData.length);
          if (yearIndex < data.yearlyData.length) {
            updateVisuals(yearIndex);
          }
        },
        onLeave: () => {
          tooltip.style('opacity', 0);
          yearMarkersGroup.selectAll('*').remove(); // Limpiar marcadores al salir
        },
        onEnterBack: () => tooltip.style('opacity', 1),
      });
      
      // Estado inicial
      tooltip.style('opacity', 0);
      
      // --- 6. Leyenda ---
      const legendParent = d3.select('#summerevolution-legend');
      legendParent.html(''); // Limpiar leyenda anterior

      const details = legendParent.append('details');
      
      details.append('summary')
        .style('cursor', 'pointer')
        .style('font-weight', 'bold')
        .text('Leyenda (pulsa para desplegar)');

      const legendContainer = details.append('div')
        .attr('class', 'legend-content-wrapper');

      function createLegendItem(html) {
          const item = legendContainer.append('div')
              .attr('class', 'legend-item')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('margin-bottom', '8px');
          item.html(html);
      }
      
      const legendGradient = d3.range(0, 1, 0.1).map(t => tempColor.interpolator()(t));
      const symbolStyle = `width: 30px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 10px;`;

      // 5. Rediseño de la leyenda
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" style="stroke:#555; stroke-width:2; stroke-dasharray: 3 3;"></line></svg></div><div class="legend-text">Medias de las décadas actual y previa</div>`);
      
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><div class="legend-gradient" style="background: linear-gradient(to right, ${legendGradient.join(',')}); width: 30px; height: 10px;"></div></div><div class="legend-text">Evolución de las temperaturas máximas durante el año</div>`);

      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" style="stroke:#555; stroke-width:1.5; stroke-dasharray: 4 4;"></line></svg></div><div class="legend-text">Temperaturas máximas del verano promedio 1972-2025</div>`);
      
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><div style="width:15px; height:15px; background-color: rgba(217, 83, 79, 0.3); border: 1px solid #d9534f;"></div></div><div class="legend-text">Variación con respecto a la media del período (año más caluroso que la media)</div>`);
      
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><div style="width:15px; height:15px; background-color: rgba(0, 206, 182, 0.3); border: 1px solid #00ceb6;"></div></div><div class="legend-text">Variación con respecto a la media del período (año menos caluroso que la media)</div>`);
      
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><svg width="12" height="12"><circle cx="6" cy="6" r="5" style="fill: #d9534f;"></circle></svg></div><div class="legend-text">Día más caluroso del verano</div>`);
      
      createLegendItem(`<div class="legend-symbol" style="${symbolStyle}"><svg width="12" height="12"><circle cx="6" cy="6" r="5" style="fill: #00ceb6;"></circle></svg></div><div class="legend-text">Día menos caluroso del verano</div>`);
      
      function getDayOfYear(date) {
        return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
      }
    }
    
    // --- Lanzador ---
    onDOMReady(init);
  })();