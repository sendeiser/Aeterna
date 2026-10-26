import json

data = json.load(open('src/data/initial_seed.json', encoding='utf-8'))

print("=== AFILIADOS ===")
for a in data.get('afiliados', []):
    print(a)

print("\n=== INHUMACIONES COVID SAMPLE ===")
for inh in data.get('inhumaciones_covid', [])[:10]:
    print(inh)
