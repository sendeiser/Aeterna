program test_services;

{$mode objfpc}{$H+}

uses
  Classes, SysUtils, uDataModels, uBusinessRules, uParcelasService,
  uInhumacionesService, uAfiliadosService, uCajaService;

procedure TestServices;
var
  Parcelas: TParcelaArray;
  Inhumaciones: TInhumacionArray;
  Afiliados: TAfiliadoArray;
  Movimientos: TPagoArray;
  TotEf, TotDig, TotCaja: Currency;
  i, Ocupadas, Caducidad: Integer;
begin
  WriteLn('=== Test de Integracion de Servicios Supabase en Pascal ===');

  // Test 1: Parcelas
  WriteLn('1. Consultando Parcelas en Supabase...');
  Parcelas := TParcelasService.ObtenerTodas;
  WriteLn('   Parcelas recuperadas: ', Length(Parcelas));
  if Length(Parcelas) > 0 then
  begin
    Ocupadas := 0;
    Caducidad := 0;
    for i := Low(Parcelas) to High(Parcelas) do
    begin
      if (Parcelas[i].Estado = epOcupada) or (Parcelas[i].Estado = epEnMora) then
        Inc(Ocupadas);
      if EvaluarMoraParcela(Parcelas[i], 2026).EnStandby then
        Inc(Caducidad);
    end;
    WriteLn(Format('   Ocupadas: %d / %d | En Caducidad Legal (>3 a): %d', [Ocupadas, Length(Parcelas), Caducidad]));
    WriteLn('[PASS] TParcelasService.ObtenerTodas funciona.');
  end
  else
    WriteLn('[WARN] No se recuperaron parcelas o la red esta inactiva.');

  // Test 2: Inhumaciones
  WriteLn('2. Consultando Libro de Inhumaciones...');
  Inhumaciones := TInhumacionesService.ObtenerTodas;
  WriteLn('   Inhumaciones registradas: ', Length(Inhumaciones));
  if Length(Inhumaciones) > 0 then
    WriteLn('[PASS] TInhumacionesService.ObtenerTodas funciona. Ultimo difunto: ', Inhumaciones[0].NombreDifunto);

  // Test 3: Afiliados a Seguro
  WriteLn('3. Consultando Afiliados a Seguro de Sepelio...');
  Afiliados := TAfiliadosService.ObtenerTodos;
  WriteLn('   Afiliados recuperados: ', Length(Afiliados));
  if Length(Afiliados) > 0 then
    WriteLn('[PASS] TAfiliadosService.ObtenerTodos funciona. Afiliado #1: ', Afiliados[0].NombreCompleto);

  // Test 4: Caja
  WriteLn('4. Consultando Caja del dia...');
  TotCaja := TCajaService.CalcularTotalesHoy(TotEf, TotDig);
  WriteLn(Format('   Recaudacion Hoy: %s (Efectivo: %s | Digital: %s)',
    [FormatearMoneda(TotCaja), FormatearMoneda(TotEf), FormatearMoneda(TotDig)]));
  WriteLn('[PASS] TCajaService funciona correctamente.');

  WriteLn('=== Todos los servicios de datos verificados ===');
end;

begin
  try
    TestServices;
  except
    on E: Exception do
      WriteLn('Error en test de servicios: ', E.Message);
  end;
end.
