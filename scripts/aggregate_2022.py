#!/usr/bin/env python3
"""
scripts/aggregate_2022.py

Genera dos ficheros JSON en data/processed/:
  - global_by_pollutant_2022.json
  - pollutant_by_country_2022.json

Ambos basados en las muertes atribuibles (AD) de 2022, género Total.
"""
import os
import pandas as pd

# ----- RUTAS -----
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))  # scripts/
PROJECT_ROOT  = os.path.abspath(os.path.join(BASE_DIR, os.pardir))
DATA_DIR      = os.path.join(PROJECT_ROOT, "data", "processed")
MEASURES_CSV  = os.path.join(DATA_DIR, "measures.csv")
POLLUTANTS_CSV= os.path.join(DATA_DIR, "pollutants.csv")
LOCATIONS_CSV = os.path.join(DATA_DIR, "locations.csv")

# Asegura la carpeta de salida
os.makedirs(DATA_DIR, exist_ok=True)

# ----- CARGA DE DATOS -----
meas  = pd.read_csv(MEASURES_CSV)
poll  = pd.read_csv(POLLUTANTS_CSV)
loc   = pd.read_csv(LOCATIONS_CSV)

# ----- FILTRADO COMÚN -----
df = meas[
    (meas.year == 2022) &
    (meas.indicator_id == "AD") &
    (meas.gender == "Total")
].copy()

# ----- 1) GLOBAL BY POLLUTANT -----
global_by_pollutant = (
    df.groupby("pollutant_id")["value"]
      .sum()
      .reset_index(name="total_deaths")
      .merge(poll[["pollutant_id","pollutant_name"]], on="pollutant_id", how="left")
      # orden lógico: PM25, NO2, O3
      .assign(_order=lambda d: d.pollutant_id.map({"PM25":0,"NO2":1,"O3":2}))
      .sort_values("_order")
      .drop(columns="_order")
)

out_global = os.path.join(DATA_DIR, "global_by_pollutant_2022.json")
global_by_pollutant.to_json(out_global, orient="records", force_ascii=False, indent=2)
print(f"✔️ {os.path.basename(out_global)} generado.")

# ----- 2) POLLUTANT BY COUNTRY -----
# Añade columna country uniendo con locations
df = df.merge(loc[["city_code","country"]], on="city_code", how="left")
# Añade pollutant_name
df = df.merge(poll[["pollutant_id","pollutant_name"]], on="pollutant_id", how="left")

country_by_pollutant = (
    df.groupby(["pollutant_id","pollutant_name","country"])["value"]
      .sum()
      .reset_index(name="total_deaths")
      .sort_values(["pollutant_id","total_deaths"], ascending=[True,False])
)

out_country = os.path.join(DATA_DIR, "pollutant_by_country_2022.json")
country_by_pollutant.to_json(out_country, orient="records", force_ascii=False, indent=2)
print(f"✔️ {os.path.basename(out_country)} generado.")

