// Función principal para renderizar el gráfico
function renderBarChart(data) {
    // Ordenar datos de mayor a menor
    data.sort((a, b) => b.total_deaths - a.total_deaths);

    // Limpiar cualquier contenido previo
    d3.select("#bar-chart").html("");
    
    // Dimensiones del gráfico
    const width = "120%";
    const height = 450;
    const margin = { top: 30, right: 200, bottom: 50, left: 80 }; // Aumentado el margen derecho para el ranking
    
    
    // Crear el elemento SVG
    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    const innerWidth = parseInt(svg.style("width")) - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Crear el grupo principal con margen
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Escalas
    const x = d3.scaleBand()
        .domain(data.map(d => d.pollutant_name))
        .range([0, innerWidth])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_deaths) * 1.1])
        .range([innerHeight, 0]);
    
    // Función para determinar el color según el valor
    function getBarColor(d, index, data) {
        // Si solo hay una barra, será de color naranja
        if (data.length === 1) return "#FF7F0E";
        
        // Ordenar los datos por total_deaths para identificar máximo y mínimo
        const sortedData = [...data].sort((a, b) => b.total_deaths - a.total_deaths);
        
        // Asignar colores según la posición
        if (d.total_deaths === sortedData[0].total_deaths) {
            return "#FF0000"; // Rojo para el valor más alto
        } else if (d.total_deaths === sortedData[sortedData.length - 1].total_deaths) {
            return "#FFCC00"; // Amarillo para el valor más bajo
        } else {
            return "#FF7F0E"; // Naranja para valores intermedios
        }
    }
    
    // Ejes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));
    
    // Título del eje X
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Tipo de Contaminante");
    
    // Etiqueta del eje Y
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("Muertes atribuibles");
    
    // Tooltip mejorado
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    // Barras
    g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.pollutant_name))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .style("fill", (d, i) => {
            if (d.total_deaths === d3.max(data, d => d.total_deaths)) {
                return "#FF0000"; // Rojo para el máximo
            } else if (d.total_deaths === d3.min(data, d => d.total_deaths)) {
                return "#FFCC00"; // Amarillo para el mínimo
            } else {
                return "#FF7F0E"; // Naranja para el resto
            }
        })
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 1);
            tooltip.html(`<strong>${d.pollutant_name}</strong><br>` +
                        `Muertes atribuibles: ${d3.format(",")(d.total_deaths)}<br>` +
                        `<small>Representa el impacto en la mortalidad<br>por este contaminante</small>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .transition()
        .duration(800)
        .attr("y", d => y(d.total_deaths))
        .attr("height", d => innerHeight - y(d.total_deaths));

    // Etiquetas de valores
    g.selectAll(".value-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => x(d.pollutant_name) + x.bandwidth() / 2)
        .attr("y", d => y(d.total_deaths) - 5)
        .attr("text-anchor", "middle")
        .text(d => d3.format(",")(d.total_deaths))
        .style("opacity", 0)
        .transition()
        .delay(800)
        .duration(500)
        .style("opacity", 1);
}

// Función para manejar la navegación entre visualizaciones
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-menu li');
    const vizPanels = document.querySelectorAll('.viz-panel');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Actualizar clase activa en menú
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar panel correspondiente
            const targetViz = this.getAttribute('data-viz');
            vizPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetViz) {
                    panel.classList.add('active');
                }
            });
            
            // Actualizar título según visualización
            const titles = {
                'bar-chart': 'Muertes atribuibles por contaminante en 2022',
                'map-viz': 'Mapa de contaminación por ciudades',
                'scatter-viz': 'Correlación entre contaminantes y muertes',
                'timeseries-viz': 'Evolución temporal de la contaminación'
            };
            
            document.querySelector('h1').textContent = titles[targetViz] || 'Visualización de datos';
        });
    });
}

// Cargar los datos
// Variables globales para los datos
let globalData = [];
let countryData = [];

// Función para calcular el top 3 de países
// Function to calculate the top 3 countries globally
function calculateTop3CountriesGlobally(countryData) {
    const totalDeathsByCountry = {};
    countryData.forEach(d => {
        if (!totalDeathsByCountry[d.country]) {
            totalDeathsByCountry[d.country] = 0;
        }
        totalDeathsByCountry[d.country] += d.total_deaths;
    });
    return Object.entries(totalDeathsByCountry)
        .map(([country, total_deaths]) => ({ country, total_deaths }))
        .sort((a, b) => b.total_deaths - a.total_deaths)
        .slice(0, 3);
}

// Function to create the fixed ranking table
function createFixedRankingTable(top3Countries) {
    const rankingDiv = document.createElement('div');
    rankingDiv.className = 'fixed-ranking';
    const title = document.createElement('h3');
    title.textContent = 'Top 3 Países con Más Muertes';
    rankingDiv.appendChild(title);
    const table = document.createElement('table');
    table.className = 'fixed-ranking-table';
    top3Countries.forEach((country, index) => {
        const row = table.insertRow();
        const rankCell = row.insertCell();
        rankCell.innerHTML = `<span class="rank">${index + 1}.</span> ${country.country}`;
        const deathsCell = row.insertCell();
        deathsCell.className = 'deaths';
        deathsCell.textContent = d3.format(',')(country.total_deaths);
    });
    rankingDiv.appendChild(table);
    document.querySelector('#bar-chart').appendChild(rankingDiv);
}

// Modify DOMContentLoaded to include the fixed ranking table

document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    d3.select("#bar-chart").html("<p style='text-align:center;padding:20px;'>Cargando datos...</p>");
    Promise.all([
        d3.json("data/processed/global_by_pollutant_2022.json"),
        d3.json("data/processed/pollutant_by_country_2022.json")
    ])
    .then(function([global, country]) {
        globalData = global;
        countryData = country;
        const top3Countries = calculateTop3CountriesGlobally(countryData);
        createFixedRankingTable(top3Countries);
        renderBarChart(globalData);
        const select = document.getElementById('country-select');
        const countries = [...new Set(countryData.map(d => d.country))].sort();
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            select.appendChild(option);
        });
        select.addEventListener('change', function() {
            const selectedCountry = this.value;
            if (selectedCountry === 'Global') {
                renderBarChart(globalData);
            } else {
                const countrySpecificData = countryData
                    .filter(d => d.country === selectedCountry)
                    .sort((a, b) => b.total_deaths - a.total_deaths);
                renderBarChart(countrySpecificData);
            }
        });
    })
    .catch(function(error) {
        console.error('Error al cargar los datos:', error);
        document.querySelector('#error-message').classList.remove('hidden');
    });
});