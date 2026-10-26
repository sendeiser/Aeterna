import json

with open('src/data/initial_seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('scripts/all_raw_parcelas.txt', 'w', encoding='utf-8') as out:
    for i, p in enumerate(data['parcelas']):
        tit = p.get('titular', '')
        d = p.get('direccion', '')
        nom = p.get('nomenclatura', '')
        out.write(f"[{i:3d}] {nom:10s} | TIT: {tit} | DIR: {d}\n")

print(f"Dumped {len(data['parcelas'])} parcelas to scripts/all_raw_parcelas.txt")
