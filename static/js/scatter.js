// Función para renderizar el gráfico de líneas de DALY PM2.5 por país
function renderTimeSeriesChart() {
    // Limpiar contenido previo
    d3.select("#scatter-viz").html("");
    
    // Dimensiones del gráfico
    const margin = { top: 40, right: 85, bottom: 90, left: 80 }; // Aumentado el margen derecho para la leyenda
    const width = 1000 - margin.left - margin.right; // Ajustado el ancho total
    const height = 500 - margin.top - margin.bottom; // Mantenido la altura
    
    // Crear SVG
    const svg = d3.select("#scatter-viz")
        .append("svg")
        .attr("width", "100%") // Usar ancho relativo para mejor adaptación
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet"); // Mantener proporciones
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Cargar datos
    d3.json("data/processed/daly_pm25_timeseries.json").then(function(data) {
        // Función para extraer país del código de ciudad
        // Función para extraer país del código de ciudad
        function getCountryFromCode(cityCode) {
            const countryMap = {
                'FR': 'Francia',
                'EL': 'Grecia', 
                'ES': 'España',
                'IT': 'Italia',
                'DE': 'Alemania',  
                'NL': 'Países Bajos',
                'BE': 'Bélgica',
                'AT': 'Austria',
                'PT': 'Portugal',
                'PL': 'Polonia'/*,
                'GE': 'Alemania'*/   // Añadir GE como alternativa para Alemania si aparece en los datos
            };
            const countryCode = cityCode.substring(0, 2);
            return countryMap[countryCode] || countryCode; // Mostrar el código en lugar de 'Otros'
        }
        
        // Procesar datos: agrupar por país y año
        const processedData = [];
        
        data.forEach(city => {
            const country = getCountryFromCode(city.city_code);
            city.values.forEach(yearData => {
                // Filtrar años válidos y valores numéricos
                if (yearData.year >= 2005 && yearData.year <= 2022 && 
                    typeof yearData.daly === 'number' && yearData.daly > 0) {
                    processedData.push({
                        country: country,
                        year: yearData.year,
                        daly: yearData.daly
                    });
                }
            });
        });
        
        // Agrupar por país y año, sumando los DALY
        const countryYearData = d3.rollup(
            processedData,
            v => d3.sum(v, d => d.daly),
            d => d.country,
            d => d.year
        );
        
        // Convertir a formato adecuado para D3
        const timeSeriesData = [];
        countryYearData.forEach((years, country) => {
            const countryData = {
                country: country,
                values: []
            };
            years.forEach((daly, year) => {
                countryData.values.push({ year: year, daly: daly });
            });
            // Ordenar por año
            countryData.values.sort((a, b) => a.year - b.year);
            timeSeriesData.push(countryData);
        });
        
        // Filtrar países con datos suficientes (al menos 5 años)
        const filteredData = timeSeriesData.filter(d => d.values.length >= 5);
        
        // Escalas
        const xScale = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d.year))
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d.daly) * 1.7])
            .range([height, 0]);
        
        // Escala de colores para países
        const colorScale = d3.scaleOrdinal()
            .domain(filteredData.map(d => d.country))
            .range([
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                '#BB8FCE', '#85C1E9'
            ]);
        
        // Generador de líneas
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.daly))
            .curve(d3.curveMonotoneX);
        
        // Ejes
        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));
        
        // Etiquetas de ejes
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("Año");
        
        g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("DALY (Años de Vida Ajustados por Discapacidad)");
        
        // Título del gráfico
        g.append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#333");
        
        // Tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        // Dibujar líneas
        const countryLines = g.selectAll(".country-line")
            .data(filteredData)
            .enter()
            .append("g")
            .attr("class", "country-line");
        
        countryLines.append("path")
            .attr("class", "line")
            .attr("d", d => line(d.values))
            .style("fill", "none")
            .style("stroke", d => colorScale(d.country))
            .style("stroke-width", 2.5)
            .style("opacity", 0.8);
        
        // Puntos en las líneas
        countryLines.selectAll(".dot")
            .data(d => d.values.map(v => ({...v, country: d.country})))
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.daly))
            .attr("r", 4)
            .style("fill", d => colorScale(d.country))
            .style("stroke", "white")
            .style("stroke-width", 2)
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                tooltip.html(`<strong>${d.country}</strong><br>` +
                           `Año: ${d.year}<br>` +
                           `DALY: ${d3.format(",")(Math.round(d.daly))}<br>` +
                           `<small>Años de vida ajustados por discapacidad</small>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
        // Leyenda
        const legend = g.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 20}, ${height / 2.2})`);
        
        const legendItems = legend.selectAll(".legend-item")
            .data(filteredData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 25})`)
            .style("cursor", "pointer") // Añadir cursor pointer para indicar que es clickeable
            .on("click", function(event, d) {
                // Obtener el país seleccionado
                const selectedCountry = d.country;
                
                // Seleccionar todas las líneas y puntos
                const allLines = g.selectAll(".line");
                const allDots = g.selectAll(".dot");
                
                // Comprobar si la línea ya está resaltada
                const isHighlighted = d3.select(this).classed("highlighted");
                
                // Restablecer todas las líneas y puntos
                allLines.style("opacity", 0.8).style("stroke-width", 2.5);
                allDots.style("opacity", 1).attr("r", 4);
                legendItems.classed("highlighted", false);
                
                // Si no estaba resaltada, resaltar la línea seleccionada
                if (!isHighlighted) {
                    // Atenuar todas las líneas y puntos
                    allLines.style("opacity", 0.2);
                    allDots.style("opacity", 0.2);
                    
                    // Resaltar la línea y puntos seleccionados
                    g.selectAll(".line").filter(line => line.country === selectedCountry)
                        .style("opacity", 1)
                        .style("stroke-width", 4);
                    
                    g.selectAll(".dot").filter(dot => dot.country === selectedCountry)
                        .style("opacity", 1)
                        .attr("r", 6);
                    
                    // Marcar esta leyenda como resaltada
                    d3.select(this).classed("highlighted", true);
                }
            })
            .on("mouseover", function() {
                d3.select(this).style("opacity", 0.8);
            })
            .on("mouseout", function() {
                d3.select(this).style("opacity", 1);
            });
        
        legendItems.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 0)
            .attr("y2", 0)
            .style("stroke", d => colorScale(d.country))
            .style("stroke-width", 3);
        
        legendItems.append("text")
            .attr("x", 25)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text(d => d.country);
        
    }).catch(function(error) {
        console.error('Error al cargar los datos:', error);
        d3.select("#scatter-viz")
            .append("div")
            .style("text-align", "center")
            .style("padding", "50px")
            .style("color", "#666")
            .text("Error al cargar los datos del gráfico");
    });
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Solo renderizar si estamos en la pestaña de correlación
    const scatterPanel = document.getElementById('scatter-viz');
    if (scatterPanel) {
        // Ocultar el filtro de país si estamos en la pestaña de correlación
        if (scatterPanel.classList.contains('active')) {
            document.getElementById('country-select').style.display = 'none';
            document.querySelector('label[for="country-select"]').style.display = 'none';
        }
        renderTimeSeriesChart();
    }
});