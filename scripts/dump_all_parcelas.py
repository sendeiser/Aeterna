import json

with open('src/data/initial_seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total parcelas: {len(data['parcelas'])}")
for i, p in enumerate(data['parcelas']):
    tit = p.get('titular', '')
    d = p.get('direccion', '')
    nom = p.get('nomenclatura', '')
    print(f"[{i:3d}] {nom:10s} | TITULAR: {tit:40s} | DIR: {d}")
