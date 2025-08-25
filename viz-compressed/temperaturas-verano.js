
/**
 * Main Visualization Script
 * 
 * Consolidates and orchestrates all climate visualizations.
 * It handles robust library loading, DOM readiness, and sequential
 * initialization of each visualization module.
 */
(async () => {
    // --- 0. Unified Library Loader ---
    const libs = [
        { name: 'd3', url: 'https://d3js.org/d3.v7.min.js' },
        { name: 'gsap', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js' },
        { name: 'ScrollTrigger', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js' }
    ];

    async function loadLibraries() {
        for (const { name, url } of libs) {
            if (window[name]) continue;
            try {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = url;
                    s.async = true;
                    s.onload = resolve;
                    s.onerror = () => reject(new Error(`Error loading library ${name}`));
                    document.head.appendChild(s);
                });
                console.log(`✅ Library ${name} loaded.`);
            } catch (error) {
                console.error(error);
                // Stop execution if a core library fails
                return false; 
            }
        }
        return true;
    }

    // --- 1. DOM Readiness Helper ---
    function onDOMReady(fn) {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        }
    }

    // --- 2. Visualization Modules ---

    // --- MODULE: Summer Evolution ---
    async function initSummerEvolution() {
        if (window.summerevolutionLoaded) return;
        window.summerevolutionLoaded = true;
        console.log('🚀 Initializing Summer Evolution...');

        gsap.registerPlugin(ScrollTrigger);

        const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/summerevolution.json?t=' + Date.now();
        const FALLBACK_URL = './summerevolution.json';

        async function loadData() {
            try {
                const res = await fetch(DATA_URL, { mode: 'cors', credentials: 'omit' });
                if (!res.ok) throw new Error(res.status);
                return res.json();
            } catch (err) {
                console.warn('❌ Fallo al cargar JSON remoto para Summer Evolution', err);
                const res2 = await fetch(FALLBACK_URL);
                if (!res2.ok) throw new Error(res2.status);
                return res2.json();
            }
        }

        let data;
        try {
            data = await loadData();
        } catch (err) {
            console.error('❌ No se pudieron cargar los datos para Summer Evolution.', err);
            document.getElementById('summerevolution-container').innerHTML = '<p style="color: red; text-align: center;">Error al cargar datos.</p>';
            return;
        }

        const container = document.getElementById('summerevolution-chart');
        if (!container) return;
        
        const margin = container.clientWidth > 768 
            ? { top: 10, right: 30, bottom: 30, left: 40 } 
            : { top: 5, right: 15, bottom: 20, left: 35 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 700 - margin.top - margin.bottom;
        
        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

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

        data.yearlyData.forEach(year => {
            const validPoints = year.dailyPoints.filter(p => p.tmax !== null);
            if (validPoints.length === 0) return;
            year.minTmaxPoint = validPoints.reduce((min, p) => p.tmax < min.tmax ? p : min, validPoints[0]);
            year.maxTmaxPoint = validPoints.reduce((max, p) => p.tmax > max.tmax ? p : max, validPoints[0]);
        });

        const x = d3.scaleLinear().domain([0, 93]).range([0, width]);
        const y = d3.scaleLinear().domain([data.bounds.min, data.bounds.max]).range([height, 0]);
        const tempColor = d3.scaleSequential(d3.interpolateOranges).domain([data.bounds.min, data.bounds.max]);
        const opacityScale = d3.scaleLinear().domain([data.bounds.min, data.bounds.max]).range([0.1, 0.5]);

        const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `${d.toString().replace('.', ',')}°C`);
        const yAxisGroup = svg.append('g').call(yAxis);
        yAxisGroup.select('.domain').remove();
        yAxisGroup.selectAll('.tick line').remove();
        yAxisGroup.select(".tick:first-of-type").remove();
        yAxisGroup.select(".tick:last-of-type").remove();

        const lineGenerator = d3.line().x(d => x(d.day)).y(d => y(d.tmax)).defined(d => d.tmax !== null);
        const avgLineGenerator = d3.line().x(d => x(d.day)).y(d => y(d.avgTmax)).defined(d => d.avgTmax !== null);
        const areaGenerator = d3.area()
            .x(d => x(d.day))
            .y0(d => y(d.avgTmax))
            .y1(d => y(d.tmax))
            .defined(d => d.tmax !== null && d.avgTmax !== null);

        const defs = svg.append('defs');
        const differenceArea = svg.append('path').attr('class', 'difference-area').style('opacity', 0);
        const historicalAvgLine = svg.append('path').datum(data.historicalDailyAverage).attr('class', 'historical-average-line').attr('d', avgLineGenerator).style('stroke', '#555').style('stroke-width', 1.5).style('stroke-dasharray', '4 4').style('fill', 'none');
        const yearGroups = svg.append('g').selectAll('.year-group').data(data.yearlyData).join('g').attr('class', 'year-group').style('opacity', 0);

        yearGroups.each(function(d) {
            const group = d3.select(this);
            const year = d.year;
            const gradientId = `gradient-${year}`;
            const gradient = defs.append('linearGradient').attr('id', gradientId).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
            d.dailyPoints.forEach(point => {
                if (point.tmax !== null) {
                    gradient.append('stop').attr('offset', `${(point.day / 93) * 100}%`).attr('stop-color', tempColor(point.tmax));
                }
            });
            group.append('path').attr('class', 'line-halo').attr('d', lineGenerator(d.dailyPoints)).style('stroke', 'rgba(0,0,0,0.1)').style('stroke-width', 4).style('fill', 'none').style('stroke-linejoin', 'round').style('stroke-linecap', 'round');
            group.append('path').attr('class', 'line').attr('d', lineGenerator(d.dailyPoints)).style('stroke', `url(#${gradientId})`).style('stroke-width', 1.5).style('fill', 'none');
        });

        const decadalLines = svg.append('g').attr('class', 'decadal-lines').selectAll('.decade-line').data(data.decadalData).join('line').attr('class', d => `decade-line decade-line-${d.end}`).attr('x1', 0).attr('x2', width).attr('y1', d => y(d.meanTmax)).attr('y2', d => y(d.meanTmax)).style('stroke', d => tempColor(d.meanTmax)).style('stroke-width', 2).style('stroke-dasharray', '3 3').style('opacity', 0);
        const decadalLabels = svg.append('g').attr('class', 'decadal-labels').selectAll('.decade-label').data(data.decadalData).join('text').attr('class', d => `decade-label decade-label-${d.end}`).attr('x', width - 5).attr('y', d => y(d.meanTmax)).attr('dy', '-0.6em').attr('text-anchor', 'end').style('font-size', '11px').style('font-weight', 'bold').style('fill', '#202020').text(d => `${d.label}: ${d.meanTmax.toFixed(1).replace('.', ',')}°C`).style('opacity', 0);
        const yearMarkersGroup = svg.append('g').attr('class', 'year-markers');
        const tooltip = d3.select('#summerevolution-tooltip');
        let currentYearIndex = -1;

        function getFormattedDate(dayOfSummer) {
            const date = new Date(2023, 5, 21 + dayOfSummer);
            const day = date.getDate();
            const monthNames = ["junio", "julio", "agosto", "septiembre"];
            const month = monthNames[date.getMonth() - 5];
            return `${day} de ${month}`;
        }

        function updateVisuals(index) {
            if (index < 0 || index >= data.yearlyData.length || index === currentYearIndex) return;
            currentYearIndex = index;
            const yearData = data.yearlyData[currentYearIndex];
            const currentYear = yearData.year;
            const combinedData = yearData.dailyPoints.map(d => ({ day: d.day, tmax: d.tmax, avgTmax: data.historicalDailyAverage.find(ad => ad.day === d.day)?.avgTmax ?? null }));
            const isWarmer = yearData.meanTmax > data.periodMeanTmax;
            differenceArea.datum(combinedData).transition().duration(300).attr('d', areaGenerator).style('fill', isWarmer ? 'rgba(217, 83, 79, 0.3)' : 'rgba(0, 206, 182, 0.3)').style('opacity', 1);
            yearGroups.each(function(d, i) {
                d3.select(this).style('opacity', i === currentYearIndex ? 1 : (i < currentYearIndex ? 0.05 : 0)).select('.line').transition().duration(200).style('stroke-width', i === currentYearIndex ? 2.5 : 1.5);
            });
            d3.select(yearGroups.nodes()[currentYearIndex]).raise();
            historicalAvgLine.raise();
            differenceArea.raise();
            yearMarkersGroup.raise();
            const currentDecade = data.decadalData.find(d => currentYear >= d.start && currentYear <= d.end);
            const previousDecade = data.decadalData[data.decadalData.findIndex(d => d.end === currentDecade?.end) - 1];
            data.decadalData.forEach(decade => {
                let lineOpacity = 0, labelOpacity = 0;
                if (currentDecade && decade.end === currentDecade.end) { lineOpacity = 1; labelOpacity = 1; }
                else if (previousDecade && decade.end === previousDecade.end) { lineOpacity = 0.5; labelOpacity = 1; }
                decadalLines.filter(d => d.end === decade.end).transition().duration(300).style('opacity', lineOpacity);
                decadalLabels.filter(d => d.end === decade.end).transition().duration(300).style('opacity', labelOpacity);
            });
            if (currentDecade && previousDecade) {
                const y1 = y(currentDecade.meanTmax), y2 = y(previousDecade.meanTmax);
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
            yearMarkersGroup.selectAll('*').remove();
            if (yearData.minTmaxPoint && yearData.maxTmaxPoint) {
                [{ type: 'max', data: yearData.maxTmaxPoint, color: '#d9534f', anchor: 'start', dx: 15, dy: -15, textAnchor: 'start' }, { type: 'min', data: yearData.minTmaxPoint, color: '#00ceb6', anchor: 'end', dx: -15, dy: 15, textAnchor: 'end' }].forEach(p => {
                    const markerGroup = yearMarkersGroup.append('g').style('opacity', 0);
                    const pointX = x(p.data.day), pointY = y(p.data.tmax);
                    let textX = pointX + p.dx, textY = pointY + p.dy;
                    const textAnchor = (textX > width - 80) ? 'end' : (textX < 80 ? 'start' : p.textAnchor);
                    if (textX > width - 80) textX = pointX - 15;
                    if (textX < 80) textX = pointX + 15;
                    if (textY < 15) textY = pointY + 30;
                    if (textY > height - 15) textY = pointY - 30;
                    markerGroup.append('path').attr('d', `M${pointX},${pointY} Q${pointX + (textX - pointX) / 2},${textY} ${textX},${textY}`).attr('stroke', '#333').attr('fill', 'none').attr('stroke-width', 1);
                    markerGroup.append('circle').attr('cx', pointX).attr('cy', pointY).attr('r', 6).style('fill', p.color).style('stroke', '#fff').style('stroke-width', 1.5);
                    markerGroup.append('text').attr('x', textX).attr('y', textY).attr('text-anchor', textAnchor).attr('alignment-baseline', 'middle').attr('dx', textAnchor === 'start' ? 5 : -5).style('font-size', '12px').style('font-weight', 'bold').style('fill', '#333').text(`${getFormattedDate(p.data.day)}: ${p.data.tmax.toFixed(1).replace('.', ',')}ºC`);
                    markerGroup.transition().duration(500).style('opacity', 1);
                });
            }
            const textColor = tempColor(yearData.meanTmax);
            const darkerTextColor = d3.color(textColor).darker(1);
            const deviation = yearData.meanTmax - data.periodMeanTmax;
            const deviationColor = isWarmer ? '#d9534f' : '#00ceb6';
            tooltip.html(`<div class="year" style="color: ${darkerTextColor};">${yearData.year}</div><div class="mean" style="color: ${darkerTextColor};"><strong>${yearData.meanTmax.toFixed(1).replace('.', ',')}°C</strong> de media durante el verano</div><div class="deviation" style="color: ${deviationColor};"><strong>${deviation >= 0 ? '+' : ''}${deviation.toFixed(1).replace('.', ',')}°C</strong> sobre la media del período</div>`).style('opacity', 1).style('top', null).style('bottom', '-3rem').style('left', '50%').style('transform', 'translateX(-50%)').style('background-color', 'rgba(255, 255, 255, 0.6)');
            const bgColor = d3.color(tempColor(yearData.meanTmax));
            d3.select('#summerevolution-container').style('background-color', bgColor ? (bgColor.opacity = opacityScale(yearData.meanTmax), bgColor.toString()) : 'transparent');
        }

        ScrollTrigger.create({
            trigger: '#summerevolution-scroll-spacer',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
            onUpdate: self => {
                const yearIndex = Math.floor(self.progress * data.yearlyData.length);
                if (yearIndex < data.yearlyData.length) updateVisuals(yearIndex);
            },
            onLeave: () => { tooltip.style('opacity', 0); yearMarkersGroup.selectAll('*').remove(); },
            onEnterBack: () => tooltip.style('opacity', 1),
        });
        tooltip.style('opacity', 0);
    }

    // --- MODULE: Longer Summer ---
    async function initLongerSummer() {
        if (window.__longerSummerLoaded) return;
        window.__longerSummerLoaded = true;
        console.log('🚀 Initializing Longer Summer...');

        const yearInfo = document.getElementById('longer-summer-year-info');
        const dayTrack = document.getElementById('longer-summer-day-track');
        const decadeAveragesContainer = document.getElementById('longer-summer-decade-averages-container');
        const monthLabelsContainer = document.getElementById('longer-summer-month-labels-container');
        const scrollSpacer = document.getElementById('longer-summer-scroll-spacer');

        if (!yearInfo || !dayTrack || !decadeAveragesContainer || !monthLabelsContainer || !scrollSpacer) {
            console.warn('Faltan contenedores del gráfico “longer-summer”');
            return;
        }
        
        const yearInfoContent = document.createElement('div');
        yearInfo.appendChild(yearInfoContent);

        const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/duracion-veranos.json?t=' + Date.now();
        const FALLBACK_URL = './veranos.json';

        async function loadData() {
            try {
                const res = await fetch(DATA_URL, { mode: 'cors', credentials: 'omit' });
                if (!res.ok) throw new Error(res.status);
                return res.json();
            } catch (err) {
                console.warn('❌ Fallo al cargar JSON remoto para Longer Summer', err);
                const res2 = await fetch(FALLBACK_URL);
                if (!res2.ok) throw new Error(res2.status);
                return res2.json();
            }
        }

        let data;
        try {
            data = await loadData();
        } catch (err) {
            console.error('❌ No se pudieron cargar los datos para Longer Summer.', err);
            yearInfoContent.textContent = 'No se pudieron cargar los datos.';
            return;
        }

        const START_DAY_OF_YEAR = 91;
        const END_DAY_OF_YEAR = 304;
        const TOTAL_DAYS = END_DAY_OF_YEAR - START_DAY_OF_YEAR + 1;
        const absoluteMonthTicks = [91, 121, 152, 182, 213, 244, 274];
        const relativeMonthTicks = absoluteMonthTicks.map(t => t - START_DAY_OF_YEAR);

        function formatHumanDate(dateStr) {
            const d = new Date(dateStr);
            return `${d.getDate()} de ${d.toLocaleString('es-ES', { month: 'long' })}`;
        }

        for (let i = 0; i < TOTAL_DAYS; i++) {
            const dayMarker = document.createElement('div');
            dayMarker.classList.add('longer-summer-day-marker');
            if (relativeMonthTicks.includes(i)) dayMarker.classList.add('longer-summer-month-tick');
            dayTrack.appendChild(dayMarker);
        }
        const dayMarkers = Array.from(dayTrack.children);

        (function createMonthLabels(container) {
            const months = [
                { name: 'ABR', start: 91, days: 30 }, { name: 'MAY', start: 121, days: 31 },
                { name: 'JUN', start: 152, days: 30 }, { name: 'JUL', start: 182, days: 31 },
                { name: 'AGO', start: 213, days: 31 }, { name: 'SEP', start: 244, days: 30 },
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

        const years = data.sort((a, b) => a.año - b.año);
        const decades = {
            1970: years.filter(d => d.año >= 1972 && d.año <= 1979), 1980: years.filter(d => d.año >= 1980 && d.año <= 1989),
            1990: years.filter(d => d.año >= 1990 && d.año <= 1999), 2000: years.filter(d => d.año >= 2000 && d.año <= 2009),
            2010: years.filter(d => d.año >= 2010 && d.año <= 2019), 2020: years.filter(d => d.año >= 2020 && d.año <= 2025),
        };
        const renderedDecades = new Set();
        let currentYearIndex = -1;

        function updateVisualization(idx) {
            if (idx === currentYearIndex) return;
            currentYearIndex = idx;
            const yd = years[idx];
            const getDayOfYear = d3.timeFormat('%j');
            const absStart = +getDayOfYear(new Date(yd.fecha_inicio));
            const absEnd = +getDayOfYear(new Date(yd.fecha_fin));
            const start = Math.max(0, absStart - START_DAY_OF_YEAR);
            const end = Math.min(TOTAL_DAYS - 1, absEnd - START_DAY_OF_YEAR);
            const yearHTML = `<span class="longer-summer-year">${yd.año}</span>`;
            const detailsHTML = `<span class="longer-summer-details"><span class="longer-summer-detail-days">${yd.duracion_verano_dias} días</span>, entre el ${formatHumanDate(yd.fecha_inicio)} y el ${formatHumanDate(yd.fecha_fin)}</span>`;
            
            gsap.timeline()
                .to(yearInfoContent, { duration: 0.4, opacity: 0, onComplete: () => { yearInfoContent.innerHTML = `${yearHTML}${detailsHTML}`; } })
                .to(yearInfoContent, { duration: 0.5, opacity: 1 })
                .to(dayMarkers, { backgroundColor: '#d7d8d8', duration: 0.5, stagger: 0.001 }, 0)
                .to(dayMarkers.slice(start, end + 1), { backgroundColor: '#c90022', duration: 0.5, stagger: 0.001 }, '>.1');
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
            bar.innerHTML = `<div>Década de <strong>${decade}: ${avgDuration} días</strong> de media</div>`;
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
                const idx = Math.min(years.length - 1, Math.floor(self.progress * years.length));
                if (idx !== currentYearIndex) updateVisualization(idx);
                for (const d in decades) {
                    if (years[idx].año >= decades[d][decades[d].length - 1].año) createDecadeAverage(d);
                }
            },
        });
        updateVisualization(0);
    }

    // --- MODULE: Hot Days ---
    async function initHotDays() {
        if (window.__hotDaysLoaded) return;
        window.__hotDaysLoaded = true;
        console.log('🚀 Initializing Hot Days...');

        const yearInfo = document.getElementById('hot-days-year-info');
        const gridContainer = document.getElementById('hot-days-grid-container');
        const scrollSpacer = document.getElementById('hot-days-scroll-spacer');

        if (!yearInfo || !gridContainer || !scrollSpacer) {
            console.warn('Faltan contenedores del gráfico “hot-days”');
            return;
        }

        const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/hotdays.json?t=' + Date.now();
        const FALLBACK_URL = './hotdays.json';

        async function loadData() {
            try {
                const res = await fetch(DATA_URL, { mode: 'cors', credentials: 'omit' });
                if (!res.ok) throw new Error(res.status);
                return res.json();
            } catch (err) {
                console.warn('❌ Fallo al cargar JSON remoto para Hot Days', err);
                const res2 = await fetch(FALLBACK_URL);
                if (!res2.ok) throw new Error(res2.status);
                return res2.json();
            }
        }

        let data;
        try {
            data = await loadData();
        } catch (err) {
            console.error('❌ No se pudieron cargar los datos para Hot Days.', err);
            yearInfo.innerHTML = '<p style="color: red; text-align: center;">Error al cargar datos.</p>';
            return;
        }

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
            cell.classList.add(`month-${month + 1}`);
            let monthLabelHTML = '';
            if (day === 1) {
                const monthName = currentDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
                monthLabelHTML = `<div class="month-label">${monthName}</div>`;
                cell.classList.add('month-start');
            }
            cell.innerHTML = `<div class="emoji">🔥</div><div class="date-label">${day}/${month + 1}</div>${monthLabelHTML}`;
            gridContainer.appendChild(cell);
            cells.push(cell);
        }

        const yearElement = document.createElement('div');
        yearElement.classList.add('year');
        const counterElement = document.createElement('div');
        counterElement.classList.add('hot-days-counter');
        const feverBarContainer = document.createElement('div');
        feverBarContainer.classList.add('fever-bar-container');
        const feverBarInner = document.createElement('div');
        feverBarInner.classList.add('fever-bar-inner');
        feverBarContainer.appendChild(feverBarInner);
        yearInfo.append(yearElement, counterElement, feverBarContainer);

        let currentYearIndex = -1;
        const emojiElements = cells.map(c => c.querySelector('.emoji'));
        gsap.set(emojiElements, { opacity: 0, scale: 0 });

        function updateVisualization(index, animateEmojis = false) {
            const yearData = data[index];
            if (!yearData) return;
            yearElement.textContent = yearData.año;
            const hotDaysCount = yearData.dias.filter(isHot => isHot).length;
            counterElement.textContent = `${hotDaysCount} días por encima de la media`;
            gsap.to(feverBarInner, { duration: 0.4, width: `${(hotDaysCount / TOTAL_DAYS) * 100}%` });
            const hotEmojis = [], coldEmojis = [];
            yearData.dias.forEach((isHot, i) => (isHot ? hotEmojis : coldEmojis).push(emojiElements[i]));
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
                const newIndex = Math.min(data.length - 1, Math.floor(self.progress * data.length));
                if (newIndex !== currentYearIndex) {
                    currentYearIndex = newIndex;
                    gsap.to([yearElement, counterElement, feverBarContainer], {
                        duration: 0.3, opacity: 0, onComplete: () => {
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

    // --- MODULE: Climate Stripes ---
    async function initClimateStripes() {
        if (window.climateStripesLoaded) return;
        window.climateStripesLoaded = true;
        console.log('🚀 Initializing Climate Stripes...');

        const visContainer = document.getElementById('climate-stripes-visualization');
        const tooltip = document.getElementById('climate-stripes-tooltip');
        const container = document.getElementById('climate-stripes-container');

        if (!visContainer || !tooltip || !container) {
            console.error('Faltan elementos esenciales del DOM para Climate Stripes.');
            return;
        }

        const DATA_URL = 'https://narrativas.ideal.es/temperaturas-verano/climate-stripes.json?t=' + Date.now();
        const FALLBACK_URL = './climate-stripes.json';

        async function loadData() {
            try {
                const res = await fetch(DATA_URL, { mode: 'cors', credentials: 'omit' });
                if (!res.ok) throw new Error(res.status);
                return res.json();
            } catch (err) {
                console.warn('❌ Fallo al cargar JSON remoto para Climate Stripes', err);
                const res2 = await fetch(FALLBACK_URL);
                if (!res2.ok) throw new Error(res2.status);
                return res2.json();
            }
        }

        let data;
        try {
            data = await loadData();
        } catch (err) {
            console.error('❌ No se pudieron cargar los datos para Climate Stripes.', err);
            container.innerHTML = '<p style="color: red; text-align: center;">Error al cargar datos.</p>';
            return;
        }

        const track = document.createElement('div');
        track.className = 'climate-stripes-track';
        visContainer.appendChild(track);

        const GRAY_COLOR = '#e0e0e0';
        const TOTAL_BAR_HEIGHT = 34; // 32px height + 2px gap
        const MONTHS = [
            { name: 'Ene', days: 31 }, { name: 'Feb', days: 28 }, { name: 'Mar', days: 31 },
            { name: 'Abr', days: 30 }, { name: 'May', days: 31 }, { name: 'Jun', days: 30 },
            { name: 'Jul', days: 31 }, { name: 'Ago', days: 31 }, { name: 'Sep', days: 30 },
            { name: 'Oct', days: 31 }, { name: 'Nov', days: 30 }, { name: 'Dic', days: 31 }
        ];

        function getColorForTemp(tmax) {
            if (tmax === null) return GRAY_COLOR;
            if (tmax >= 35) return '#de092a';
            if (tmax >= 30) return '#fcc34f';
            if (tmax >= 25) return '#fde46f';
            return GRAY_COLOR;
        }

        const yearsData = data.sort((a, b) => a.year - b.year);
        const allYearBars = [];

        yearsData.forEach((yearData, index) => {
            const bar = document.createElement('div');
            bar.className = 'year-stripe-bar';
            bar.dataset.index = index;
            const isLeap = yearData.days.length === 366;
            const totalDaysInYear = isLeap ? 366 : 365;
            
            let ticksHTML = '';
            yearData.days.forEach((day) => {
                const dayDate = new Date(day.date);
                const isMonthStart = dayDate.getUTCDate() === 1;
                ticksHTML += `<div class="day-tick ${isMonthStart ? 'month-separator-tick' : ''}" style="background-color: ${getColorForTemp(day.tmax)};"></div>`;
            });

            let monthLabelsHTML = '';
            MONTHS.forEach((month, monthIndex) => {
                const monthDays = (monthIndex === 1 && isLeap) ? 29 : month.days;
                monthLabelsHTML += `<div class="month-label-item" style="width: ${(monthDays / totalDaysInYear) * 100}%">${monthIndex === 0 ? '' : month.name}</div>`;
            });

            const heatwaveMaskStops = yearData.days.map((day, i) => {
                const pos = (i / totalDaysInYear) * 100;
                const nextPos = ((i + 1) / totalDaysInYear) * 100;
                return `${day.isHeatwaveDay ? 'black' : 'transparent'} ${pos}%, ${day.isHeatwaveDay ? 'black' : 'transparent'} ${nextPos}%`;
            }).join(', ');

            bar.innerHTML = `
                <div class="year-label">${yearData.year}</div>
                <div class="day-ticks-container">${ticksHTML}</div>
                <div class="month-labels-container">${monthLabelsHTML}</div>
                <div class="heatwave-overlay" style="mask-image: linear-gradient(to right, ${heatwaveMaskStops}); -webkit-mask-image: linear-gradient(to right, ${heatwaveMaskStops});"></div>
            `;
            
            track.appendChild(bar);
            allYearBars.push(bar);
            gsap.set(bar, { autoAlpha: 0 });
        });

        track.addEventListener('mousemove', (e) => {
            const bar = e.target.closest('.year-stripe-bar');
            if (!bar) {
                tooltip.style.display = 'none';
                return;
            }
            const yearData = yearsData[parseInt(bar.dataset.index, 10)];
            if (!yearData) return;
            tooltip.style.display = 'block';
            const { clientX: x, clientY: y } = e;
            const { offsetWidth: w, offsetHeight: h } = tooltip;
            tooltip.style.left = `${x + 15 + w > window.innerWidth ? x - 15 - w : x + 15}px`;
            tooltip.style.top = `${y - 15 - h < 0 ? y + 15 : y - 15 - h}px`;
            let html = `<div class="tooltip-year">${yearData.year}</div>Olas de calor: <strong>${yearData.heatwaveCount}</strong><br>`;
            if (yearData.heatwaveCount > 0) html += ` - Duración total: <strong>${yearData.heatwaveTotalDays} días</strong><br> - Intensidad media: <strong>${yearData.heatwaveAvgIntensity}°C</strong><br>`;
            html += `Días por encima de 40°C: <strong>${yearData.daysOver40}</strong>`;
            if (yearData.annotation) html += `<div class="tooltip-annotation">${yearData.annotation}</div>`;
            tooltip.innerHTML = html;
        });
        track.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

        ScrollTrigger.create({
            trigger: container,
            pin: visContainer,
            start: 'top top',
            end: `+=${yearsData.length * 80}`,
            scrub: 1,
            onUpdate: self => {
                let targetYearIndex = Math.floor(self.progress * yearsData.length);
                targetYearIndex = Math.min(targetYearIndex, yearsData.length - 1);
                allYearBars.forEach((bar, index) => gsap.to(bar, { autoAlpha: index <= targetYearIndex ? 1 : 0, duration: 0.3 }));
                const yOffset = Math.min(0, visContainer.offsetHeight - (targetYearIndex + 1) * TOTAL_BAR_HEIGHT);
                gsap.to(track, { y: yOffset, duration: 0.3, ease: 'power1.out' });
            }
        });
    }

    // --- 3. Main Execution ---
    async function main() {
        console.log('DOM ready. Loading dependencies...');
        const librariesLoaded = await loadLibraries();
        if (!librariesLoaded) {
            console.error("Halting execution due to library loading failure.");
            return;
        }
        console.log('✅ All libraries loaded. Initializing visualizations...');
        
        // Initialize visualizations sequentially
        await initSummerEvolution();
        await initLongerSummer();
        await initHotDays();
        await initClimateStripes();

        console.log('🎉 All visualizations initialized.');
    }

    onDOMReady(main);

})();
