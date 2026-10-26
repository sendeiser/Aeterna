import json

data = json.load(open('src/data/initial_seed.json', encoding='utf-8'))

with open('scripts/all_inhumaciones.txt', 'w', encoding='utf-8') as f:
    for i, inh in enumerate(data.get('inhumaciones_covid', [])):
        f.write(f"{i}: {inh}\n")

print(f"Total inhumaciones: {len(data.get('inhumaciones_covid', []))}")
