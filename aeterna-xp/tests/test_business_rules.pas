program test_business_rules;

{$mode objfpc}{$H+}

uses
  Classes, SysUtils, uDataModels, uBusinessRules;

procedure TestReglasNegocio;
var
  P1, P2, P3: TParcela;
  Eval1, Eval2, Eval3: TEvaluacionMoraParcela;
  Af1: TAfiliadoSeguro;
  MoraAf: Integer;
begin
  WriteLn('=== Test de Reglas de Negocio Institucionales ===');

  // Test 1: Parcela disponible
  FillChar(P1, SizeOf(P1), 0);
  P1.Nomenclatura := 'A-01-01';
  P1.Estado := epDisponible;
  P1.TitularNombre := '';
  Eval1 := EvaluarMoraParcela(P1, 2026);
  if not Eval1.EnStandby then
    WriteLn('[PASS] Parcela disponible no cae en stand-by')
  else
    WriteLn('[FAIL] Parcela disponible no deberia estar en stand-by');

  // Test 2: Parcela con 5 años de deuda (ultimo pago 2021)
  FillChar(P2, SizeOf(P2), 0);
  P2.Nomenclatura := 'A-12-45';
  P2.Estado := epOcupada;
  P2.TitularNombre := 'Juan Perez';
  P2.FechaUltimoPago := '2021-04-10';
  Eval2 := EvaluarMoraParcela(P2, 2026);
  if Eval2.EnStandby and (Eval2.AniosMora = 5) then
    WriteLn('[PASS] Parcela con deuda 2021 cae en stand-by (5 anios mora)')
  else
    WriteLn('[FAIL] Parcela 2021 deberia estar en stand-by');

  // Test 3: Parcela al dia (ultimo pago 2025)
  FillChar(P3, SizeOf(P3), 0);
  P3.Nomenclatura := 'E-05-12';
  P3.Estado := epOcupada;
  P3.TitularNombre := 'Maria Gonzalez';
  P3.FechaUltimoPago := '2025-11-20';
  Eval3 := EvaluarMoraParcela(P3, 2026);
  if (not Eval3.EnStandby) and (Eval3.AniosMora = 1) then
    WriteLn('[PASS] Parcela 2025 NO cae en stand-by (1 anio mora)')
  else
    WriteLn('[FAIL] Parcela 2025 no deberia estar en stand-by');

  // Test 4: Afiliado con mora
  FillChar(Af1, SizeOf(Af1), 0);
  Af1.NumeroAfiliado := 102;
  Af1.NombreCompleto := 'Carlos Benitez';
  SetLength(Af1.CuotasPagadas, 5);
  Af1.CuotasPagadas[0] := 1;
  Af1.CuotasPagadas[1] := 2;
  Af1.CuotasPagadas[2] := 3;
  Af1.CuotasPagadas[3] := 4;
  Af1.CuotasPagadas[4] := 5; // Pago hasta Mayo (mes 5)
  MoraAf := EvaluarMoraAfiliado(Af1, 10); // Mes actual Octubre (mes 10)
  if MoraAf = 5 then
    WriteLn('[PASS] Afiliado con 5 meses de mora detectado correctamente')
  else
    WriteLn('[FAIL] Mora calculada incorrecta: ', MoraAf);

  WriteLn('Todos los tests de reglas de negocio ejecutados.');
end;

begin
  try
    TestReglasNegocio;
  except
    on E: Exception do
      WriteLn('Error en tests: ', E.Message);
  end;
end.
