import json
import re

# Complete manual overrides for parcelas
from clean_all_data import MANUAL_OVERRIDES

raw_data = json.load(open('src/data/initial_seed.json', encoding='utf-8'))
parcelas = raw_data['parcelas']

cleaned_parcelas = []
for p in parcelas:
    nom = p['nomenclatura']
    saldo = p.get('saldo_mantenimiento', 0)
    estado = p.get('estado', 'ocupada')
    
    if nom in MANUAL_OVERRIDES:
        titular = MANUAL_OVERRIDES[nom]['titular']
        direccion = MANUAL_OVERRIDES[nom]['direccion']
        # If titular was empty, available
        if not titular:
            estado = 'disponible'
        elif titular == 'Municipalidad de Chamical':
            estado = 'ocupada'
        elif estado == 'disponible' and titular:
            estado = 'ocupada'
    else:
        raw_titular = (p.get('titular') or '').strip()
        raw_dir = (p.get('direccion') or '').strip()
        
        if 'MUNICIPALIDAD' in raw_titular.upper():
            titular = 'Municipalidad de Chamical'
            direccion = 'Parque San Nicolás, Chamical'
            estado = 'ocupada'
        elif 'DISPONIBLE' in raw_titular.upper() or 'PARCELA' in raw_titular.upper() or not raw_titular:
            titular = None
            direccion = None
            estado = 'disponible'
        else:
            titular = raw_titular
            direccion = raw_dir

    cleaned_parcelas.append({
        'nomenclatura': nom,
        'sector': p.get('sector', nom.split('-')[0]),
        'manzana': p.get('manzana', nom.split('-')[1] if len(nom.split('-')) > 1 else '01'),
        'numero': p.get('numero', nom.split('-')[2] if len(nom.split('-')) > 2 else '01'),
        'titular': titular,
        'direccion': direccion,
        'saldo_mantenimiento': saldo,
        'estado': estado
    })

clean_afiliados = [
    {
        "numero_afiliado": 1,
        "nombre_completo": "Moreno, Luciana",
        "dni": "28.341.902",
        "direccion_cobro": "B° Loma Blanca 161",
        "zona_cobro": "Zona 2 - B° Loma Blanca",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 2,
        "nombre_completo": "Peña, Juan Carlos",
        "dni": "14.230.814",
        "direccion_cobro": "Av. Castro Barros 240",
        "zona_cobro": "Zona 1 - Ruta 1 / B° Tiro",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 3,
        "nombre_completo": "Montañez, Norma Magdalena",
        "dni": "18.441.902",
        "direccion_cobro": "Manuel Villanueva 636",
        "zona_cobro": "Zona 3 - Centro Chamical",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 6,
        "nombre_completo": "Bonaudi de Martínez, Elena Úrsula",
        "dni": "12.809.331",
        "direccion_cobro": "Calle 2 N° 45, B° 20 de Junio",
        "zona_cobro": "Zona 1 - Ruta 1 / B° Tiro",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 9,
        "nombre_completo": "Zárate, Nélida Esther",
        "dni": "16.512.980",
        "direccion_cobro": "Calle 9 de Julio 384",
        "zona_cobro": "Zona 1 - Ruta 1 / B° Tiro",
        "monto_cuota_mensual": 18000.0,
        "estado": "mora"
    },
    {
        "numero_afiliado": 12,
        "nombre_completo": "Gutiérrez, Héctor Rogelio",
        "dni": "14.882.109",
        "direccion_cobro": "Av. 12 de Octubre 340",
        "zona_cobro": "Zona 1 - Ruta 1 / B° Tiro",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 14,
        "nombre_completo": "Mercado de Corzo, Ramona Isabel",
        "dni": "11.204.912",
        "direccion_cobro": "B° Loma Blanca Mza 4 Lote 12",
        "zona_cobro": "Zona 2 - B° Loma Blanca",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    },
    {
        "numero_afiliado": 28,
        "nombre_completo": "Carrizo, Waldo Benjamín",
        "dni": "22.451.980",
        "direccion_cobro": "Calle Facundo Quiroga 115",
        "zona_cobro": "Zona 3 - Centro Chamical",
        "monto_cuota_mensual": 18000.0,
        "estado": "mora"
    },
    {
        "numero_afiliado": 45,
        "nombre_completo": "Toledo, Carlos Alberto",
        "dni": "17.390.418",
        "direccion_cobro": "Gob. Gordillo 88",
        "zona_cobro": "Zona 3 - Centro Chamical",
        "monto_cuota_mensual": 18000.0,
        "estado": "activo"
    }
]

clean_inhumaciones = [
    {"nombre_difunto": "Acevedo, Ramona Celina", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Fuentes, Cristian Esteban", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Tejada, Antonio Ramón", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Oyola, Carlos Melitón", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Alsina, Sixto", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Adaro, José Oliva", "fecha_inhumacion": "2021-04-15", "parcela": "A-11-45", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Funes, Luis Alberto", "fecha_inhumacion": "2021-04-15", "parcela": "A-11-39", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Cabrera, Juan Nicolás", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-38", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Salinas, Héctor Ramón", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-38", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Navarro, César Darío", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-43", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Valdez, Germán", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-40", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Vera, Irma Elena", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-56", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Aldeco, Miguel Ángel", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-52", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Romero, Roberto", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Ferreyra, Guillermo Roque", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Vega, Mariano Orlando", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Lozada, Noelia Rosalía", "fecha_inhumacion": "2021-04-15", "parcela": "A-14-53", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Lozada, Francisco Gabriel", "fecha_inhumacion": "2021-04-15", "parcela": "A-12-53", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Molina, Ángel Humberto", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Arroyo, Atilio del Valle", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Kemerer, Zoilo", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Jofré, Mariela Rosalía", "fecha_inhumacion": "2021-04-15", "parcela": "A-16-43", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Machuca, Emanuel Nicolás", "fecha_inhumacion": "2021-04-15", "parcela": "A-16-44", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Adi, Jorge Enrique", "fecha_inhumacion": "2021-04-15", "parcela": "A-16-47", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Oviedo, Mónica Beatriz", "fecha_inhumacion": "2021-04-15", "parcela": "A-16-46", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Albarracín, José Edilberto", "fecha_inhumacion": "2021-04-15", "parcela": "A-16-46", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Rodríguez, Mónica", "fecha_inhumacion": "2021-04-15", "parcela": "Sector Salinas", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Quinteros, Armando Ruperto", "fecha_inhumacion": "2021-04-15", "parcela": "A-26-100", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Castillo, Eusebia del Valle", "fecha_inhumacion": "2021-04-15", "parcela": "A-26-74", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"},
    {"nombre_difunto": "Benegas, Martín Osvaldo", "fecha_inhumacion": "2021-04-15", "parcela": "A-26-98", "es_covid": True, "causa_defuncion": "Protocolo COVID-19 / Sanitario"}
]

result = {
    "parcelas": cleaned_parcelas,
    "inhumaciones_covid": clean_inhumaciones,
    "afiliados": clean_afiliados
}

# Save backup
with open('src/data/initial_seed.json.bak', 'w', encoding='utf-8') as f:
    json.dump(raw_data, f, ensure_ascii=False, indent=2)

# Save cleaned initial_seed.json
with open('src/data/initial_seed.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Successfully cleaned initial_seed.json!")
print(f"Total parcelas: {len(cleaned_parcelas)}")
print(f"Total afiliados: {len(clean_afiliados)}")
print(f"Total inhumaciones: {len(clean_inhumaciones)}")
