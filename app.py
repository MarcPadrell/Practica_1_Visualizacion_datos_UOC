import os
from flask import Flask, render_template, jsonify, send_from_directory

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

# Rutas para servir los archivos JSON
@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('data/processed', filename)

# Ruta para servir archivos estáticos adicionales (como la librería D3)
@app.route('/lib/<path:filename>')
def serve_lib(filename):
    return send_from_directory('static/lib', filename)

# Añadir estas importaciones
import sys
import importlib.util

# Función para importar scripts Python dinámicamente
def import_script(script_path):
    spec = importlib.util.spec_from_file_location("module.name", script_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["module.name"] = module
    spec.loader.exec_module(module)
    return module

# Rutas para ejecutar scripts de procesamiento
@app.route('/process/clean_data')
def process_clean_data():
    script_path = os.path.join(app.root_path, 'scripts', 'clean_data.py')
    script = import_script(script_path)
    script.main()
    return jsonify({"status": "success", "message": "Datos procesados correctamente"})

@app.route('/process/aggregate_2022')
def process_aggregate_2022():
    script_path = os.path.join(app.root_path, 'scripts', 'aggregate_2022.py')
    script = import_script(script_path)
    # Asumiendo que el script tiene una función main() o similar
    # Si no, puedes modificar esta parte según la estructura del script
    return jsonify({"status": "success", "message": "Datos agregados correctamente"})

@app.route('/process/aggregate_daly_pm25')
def process_aggregate_daly_pm25():
    script_path = os.path.join(app.root_path, 'scripts', 'aggregate_daly_pm25.py')
    script = import_script(script_path)
    # Asumiendo que el script tiene una función main() o similar
    return jsonify({"status": "success", "message": "Datos de DALY PM2.5 procesados correctamente"})

@app.route('/api/pollutants')
def get_pollutants():
    with open('data/processed/global_by_pollutant_2022.json', 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/countries')
def get_countries():
    with open('data/processed/pollutant_by_country_2022.json', 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/timeseries')
def get_timeseries():
    with open('data/processed/daly_pm25_timeseries.json', 'r') as f:
        data = json.load(f)
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)