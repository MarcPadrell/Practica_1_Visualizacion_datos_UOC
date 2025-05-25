#!/usr/bin/env python3
"""
scripts/aggregate_daly_pm25.py

Genera el fichero JSON con la evolución 2005–2022 de DALYs por PM2.5
para las 10 ciudades con mayor carga acumulada.
Salida: data/processed/daly_pm25_timeseries.json
"""

import os
import json
import pandas as pd

# Rutas
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT   = os.path.abspath(os.path.join(BASE_DIR, os.pardir))
PROCESSED_DIR  = os.path.join(PROJECT_ROOT, "data", "processed")
MEASURES_CSV   = os.path.join(PROCESSED_DIR, "measures.csv")
LOCATIONS_CSV  = os.path.join(PROCESSED_DIR, "locations.csv")
OUT_JSON       = os.path.join(PROCESSED_DIR, "daly_pm25_timeseries.json")

# Asegura que existe el directorio de salida
os.makedirs(PROCESSED_DIR, exist_ok=True)

# 1) Cargo los datos
meas = pd.read_csv(MEASURES_CSV)
loc  = pd.read_csv(LOCATIONS_CSV)

# 2) Filtro solo DALY y PM2.5, género Total
df = meas[
    (meas.indicator_id == "DALY") &
    (meas.pollutant_id  == "PM25") &
    (meas.gender        == "Total")
].copy()

# 3) Calculo de top 5 ciudades por DALY acumulado 2005–2022
top5_codes = (
    df.groupby("city_code")["value"]
      .sum()
      .nlargest(5)
      .index
      .tolist()
)

# 4) Construyo la serie para cada ciudad
series = []
for code in top5_codes:
    city_name = loc.loc[loc.city_code == code, "city"].iat[0]
    sub = df[df.city_code == code]
    # Serie anual
    values = (
        sub[["year","value"]]
        .sort_values("year")
        .rename(columns={"value":"daly"})
        .to_dict(orient="records")
    )
    series.append({
        "city_code": code,
        "city": city_name,
        "values": values
    })

# 5) Grabo JSON
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(series, f, ensure_ascii=False, indent=2)

print(f"✔️ JSON generado en: {OUT_JSON}")
