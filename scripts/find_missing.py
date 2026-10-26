import json
from clean_all_data import MANUAL_OVERRIDES

data = json.load(open('src/data/initial_seed.json', encoding='utf-8'))
missing = [p for p in data['parcelas'] if p['nomenclatura'] not in MANUAL_OVERRIDES]
print(f"Total parcelas: {len(data['parcelas'])}")
print(f"In MANUAL_OVERRIDES: {len(MANUAL_OVERRIDES)}")
print(f"Missing from overrides: {len(missing)}")

with open('scripts/missing_parcelas.txt', 'w', encoding='utf-8') as f:
    for p in missing:
        f.write(f"{p['nomenclatura']}\t{p['titular']}\t{p['direccion']}\t{p['estado']}\n")

print("Saved to scripts/missing_parcelas.txt")
