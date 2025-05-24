
import os
import pandas as pd

# Definimos varias posibles ubicaciones donde podría estar el archivo de datos
# Esto hace que el script sea más flexible y funcione en diferentes entornos
RAW_PATHS = [
    "data/raw/dataset.xlsx",  # Ubicación estándar en la estructura del proyecto
    "dataset.xlsx",          # En caso de que esté en el directorio raíz
    "/mnt/data/dataset.xlsx" # Posible ubicación en entornos de servidor/contenedor
]

# Buscamos el archivo en las posibles ubicaciones y usamos el primero que encontremos
for p in RAW_PATHS:
    if os.path.exists(p):
        RAW_PATH = p
        break
else:  # Este else pertenece al bucle for - se ejecuta si no se encuentra ningún archivo
    raise FileNotFoundError(f"No se encontró el fichero Excel en ninguna de las rutas: {RAW_PATHS}")

# Definimos dónde se guardarán los archivos procesados
OUT_DIR = "data/processed/"

# Nos aseguramos de que la carpeta de salida exista, creándola si es necesario
os.makedirs(OUT_DIR, exist_ok=True)

def load_raw():
    """Carga el dataset original desde Excel y realiza una limpieza básica.
    
    - Carga el archivo Excel usando openpyxl como motor
    - Limpia los nombres de las columnas (elimina saltos de línea y espacios extra)
    - Filtra solo los datos del escenario base de la OMS y que tengan código de ciudad
    
    Returns:
        DataFrame: Datos filtrados y con columnas limpias
    """
    df = pd.read_excel(RAW_PATH, engine="openpyxl")
    df.columns = df.columns.str.replace("\n", " ").str.strip()  # Limpieza de nombres de columnas
    baseline_label = "Baseline from WHO 2021 AQG"
    df = df[(df["Scenario"] == baseline_label) & df["City Code"].notna()]  # Solo escenario base y con código de ciudad
    return df

def build_locations(df):
    """Extrae y procesa la información de ubicaciones (ciudades y países).
    
    Crea un archivo CSV con los códigos de ciudad, países y nombres de ciudades,
    eliminando duplicados para tener una tabla de referencia limpia.
    
    Args:
        df: DataFrame con los datos originales
    """
    loc = (
        df[["City Code", "Country Or Territory", "City Or Territory"]]
        .drop_duplicates()  # Eliminamos filas duplicadas para tener una entrada por ciudad
        .rename(columns={  # Renombramos las columnas a un formato más estándar
            "City Code": "city_code",
            "Country Or Territory": "country",
            "City Or Territory": "city"
        })
    )
    # Guardamos la tabla de ubicaciones
    loc.to_csv(os.path.join(OUT_DIR, "locations.csv"), index=False)

def build_pollutants(df):
    """Procesa la información de contaminantes del aire.
    
    Crea un archivo CSV con los nombres de contaminantes, sus IDs simplificados
    y la unidad de medida (µg/m³ para todos).
    
    Args:
        df: DataFrame con los datos originales
    """
    pol = (
        df[["Air Pollutant"]]
        .drop_duplicates()  # Una fila por cada tipo de contaminante
        .rename(columns={"Air Pollutant": "pollutant_name"})
    )
    # Creamos un ID simplificado eliminando caracteres especiales
    pol["pollutant_id"] = pol["pollutant_name"].str.replace(r"[^A-Za-z0-9]", "", regex=True)
    # Añadimos la unidad de medida (la misma para todos los contaminantes)
    pol["unit"] = "µg/m³"
    # Guardamos la tabla de contaminantes con el orden de columnas deseado
    pol[["pollutant_id", "pollutant_name", "unit"]]\
        .to_csv(os.path.join(OUT_DIR, "pollutants.csv"), index=False)

def build_indicators():
    """Crea una tabla de referencia para los indicadores de salud.
    
    En lugar de extraer esta información del dataset, la definimos directamente
    ya que son solo dos indicadores bien conocidos con descripciones fijas.
    """
    # Creamos un DataFrame con los dos indicadores de salud principales
    ind = pd.DataFrame([
        {"indicator_id": "AD",   "indicator_name": "Attributable deaths (AD)",              "description": "Número de muertes atribuibles"},
        {"indicator_id": "DALY","indicator_name": "Disability-Adjusted Life Years (DALY)", "description": "Años de vida ajustados por discapacidad"}
    ])
    # Guardamos la tabla de indicadores
    ind.to_csv(os.path.join(OUT_DIR, "indicators.csv"), index=False)

def build_measures(df):
    """Procesa las mediciones principales combinando diferentes indicadores de salud.
    
    Esta función es la más compleja y realiza varias operaciones:
    1. Procesa las muertes atribuibles (AD)
    2. Calcula los DALY sumando YLL (años de vida perdidos) y YLD (años vividos con discapacidad)
    3. Combina ambos conjuntos de datos
    4. Relaciona con la tabla de contaminantes para usar IDs consistentes
    
    Args:
        df: DataFrame con los datos originales
    """
    # 1. Procesamos las muertes atribuibles (AD)
    ad = df[df["Health Indicator"] == "Attributable deaths (AD)"].rename(columns={
        "Year": "year",
        "City Code": "city_code",
        "Air Pollutant": "pollutant_name",
        "Value": "value",
        "Value - lower CI": "lower_ci",
        "Value - upper CI": "upper_ci",
        "Air Pollution Population Weighted Average [ug/m3]": "pop_weighted_avg",
        "Sex": "gender",
        "Description Of Age Group": "age_group"
    })
    ad["indicator_id"] = "AD"  # Asignamos el ID del indicador
    # Seleccionamos y ordenamos las columnas que nos interesan
    ad = ad[["year","city_code","pollutant_name","indicator_id","value","lower_ci","upper_ci","pop_weighted_avg","gender","age_group"]]

    # 2. Calculamos los DALY sumando YLL y YLD
    # Primero filtramos los datos relevantes
    ylyd = df[df["Health Indicator"].isin(["Years of Life Lost (YLL)","Years Lived with Disability (YLD)"])]
    # Definimos las columnas por las que agruparemos
    group_cols = ["Year","City Code","Air Pollutant","Sex","Description Of Age Group","Air Pollution Population Weighted Average [ug/m3]"]
    # Agrupamos y sumamos los valores para obtener el DALY total
    daly = (ylyd.groupby(group_cols)[["Value","Value - lower CI","Value - upper CI"]]
                .sum()  # Sumamos YLL + YLD para obtener DALY
                .reset_index()  # Convertimos el índice de nuevo en columnas
                .rename(columns={  # Renombramos las columnas al formato estándar
                    "Year": "year",
                    "City Code": "city_code",
                    "Air Pollutant": "pollutant_name",
                    "Value": "value",
                    "Value - lower CI": "lower_ci",
                    "Value - upper CI": "upper_ci",
                    "Air Pollution Population Weighted Average [ug/m3]": "pop_weighted_avg",
                    "Sex": "gender",
                    "Description Of Age Group": "age_group"
                }))
    daly["indicator_id"] = "DALY"  # Asignamos el ID del indicador
    # Seleccionamos y ordenamos las columnas que nos interesan
    daly = daly[["year","city_code","pollutant_name","indicator_id","value","lower_ci","upper_ci","pop_weighted_avg","gender","age_group"]]

    # 3. Combinamos ambos conjuntos de datos (AD y DALY)
    combined = pd.concat([ad, daly], ignore_index=True)
    
    # 4. Relacionamos con la tabla de contaminantes para usar IDs consistentes
    pol = pd.read_csv(os.path.join(OUT_DIR, "pollutants.csv"))
    measures = combined.merge(pol, on="pollutant_name", how="left")
    
    # Seleccionamos las columnas finales en el orden deseado
    measures = measures[["year","city_code","pollutant_id","indicator_id","value","lower_ci","upper_ci","pop_weighted_avg","gender","age_group"]]
    
    # Guardamos la tabla de mediciones
    measures.to_csv(os.path.join(OUT_DIR, "measures.csv"), index=False)

def main():
    """Función principal que ejecuta todo el proceso de transformación de datos.
    
    Coordina la ejecución de todas las funciones en el orden correcto:
    1. Carga los datos crudos
    2. Genera las tablas de referencia (ubicaciones, contaminantes, indicadores)
    3. Procesa las mediciones principales
    """
    df = load_raw()  # Cargamos los datos originales
    build_locations(df)  # Generamos tabla de ubicaciones
    build_pollutants(df)  # Generamos tabla de contaminantes
    build_indicators()  # Generamos tabla de indicadores
    build_measures(df)  # Procesamos y generamos tabla de mediciones
    print("✔️ Todos los CSV se han generado correctamente en data/processed/")

# Punto de entrada del script cuando se ejecuta directamente
if __name__ == "__main__":
    main()



