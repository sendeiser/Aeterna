import json

with open('src/data/initial_seed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Parcelas count:', len(data['parcelas']))
print('Afiliados count:', len(data.get('afiliados', [])))
print('Inhumaciones count:', len(data.get('inhumaciones_covid', [])))

print('\nFirst 30 parcelas titulares:')
for i, p in enumerate(data['parcelas'][:30]):
    print(f"{i+1}. {p['nomenclatura']}: '{p.get('titular', '')}' (dir: '{p.get('direccion', '')}')")

print('\nAll Afiliados:')
for a in data.get('afiliados', []):
    print(f"#{a.get('numero_afiliado')}: '{a.get('nombre_completo')}' (dir: '{a.get('direccion_cobro')}')")
