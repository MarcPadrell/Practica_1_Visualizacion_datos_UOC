// Función principal para renderizar el gráfico
function renderBarChart(data) {
    // Limpiar cualquier contenido previo
    d3.select("#bar-chart").html("");
    
    // Dimensiones del gráfico
    const width = 800;
    const height = 450;
    const margin = { top: 30, right: 30, bottom: 50, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Crear el elemento SVG
    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
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
    
    // Ejes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));
    
    // Etiqueta del eje Y
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("Muertes atribuibles");
    
    // Tooltip
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
        .attr("y", innerHeight) // Posición inicial para animación
        .attr("width", x.bandwidth())
        .attr("height", 0) // Altura inicial para animación
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 1);
            tooltip.html(`${d.pollutant_name}: ${d3.format(",")(d.total_deaths)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        // Animación de entrada
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
        .style("opacity", 0) // Inicialmente invisible
        .transition()
        .delay(800) // Esperar a que terminen las barras
        .duration(500)
        .style("opacity", 1); // Hacer visible
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

// Modificar el evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Configurar navegación
    setupNavigation();
    
    // Mostrar mensaje de carga
    d3.select("#bar-chart").html("<p style='text-align:center;padding:20px;'>Cargando datos...</p>");
    
    // Cargar ambos conjuntos de datos
    Promise.all([
        d3.json("data/processed/global_by_pollutant_2022.json"),
        d3.json("data/processed/pollutant_by_country_2022.json")
    ])
    .then(function([global, country]) {
        globalData = global;
        countryData = country;
        
        // Obtener lista única de países
        const countries = [...new Set(countryData.map(d => d.country))];
        
        // Poblar el selector de países existente
        const select = document.getElementById('country-select');
        
        // Limpiar opciones existentes excepto Global
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Asegurarse que la primera opción sea "Global"
        select.options[0].value = "Global";
        select.options[0].text = "Global";
        
        // Agregar países ordenados alfabéticamente
        countries.sort().forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.text = country;
            select.appendChild(option);
        });
        
        // Agregar event listener para el selector
        select.addEventListener('change', function(event) {
            const selectedCountry = event.target.value;
            if (selectedCountry === "Global") {
                renderBarChart(globalData);
            } else {
                const filteredData = countryData.filter(d => d.country === selectedCountry);
                renderBarChart(filteredData);
            }
        });
        
        // Renderizar datos globales inicialmente
        renderBarChart(globalData);
    })
    .catch(function(error) {
        console.error("Error al cargar los datos:", error);
        d3.select("#error-message").classed("hidden", false);
    });
});