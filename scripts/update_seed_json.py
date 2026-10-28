import json
import re

with open('src/data/initial_seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('scripts/migrate_fix_inhumaciones_clean.cjs', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r"parcela:\s*'([^']+)',\s*difunto:\s*'([^']+)',\s*fecha:\s*'([^']+)',\s*nivel:\s*(\d+),\s*covid:\s*(true|false)")
matches = pattern.findall(content)

clean_inhs = []
for p, d, fe, niv, cov in matches:
    clean_inhs.append({
        'nombre_difunto': d,
        'fecha_inhumacion': fe,
        'parcela': p,
        'nivel_posicion': int(niv),
        'es_covid': cov == 'true',
        'causa_defuncion': 'Protocolo COVID-19 / Sanitario' if cov == 'true' else 'Inhumación Estándar'
    })

print(f"Extracted {len(clean_inhs)} clean inhumaciones.")
data['inhumaciones_covid'] = clean_inhs

with open('src/data/initial_seed.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Updated src/data/initial_seed.json with clean inhumaciones.")
