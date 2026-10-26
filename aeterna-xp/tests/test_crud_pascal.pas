program test_crud_pascal;

{$mode objfpc}{$H+}

uses
  Classes, SysUtils, uDataModels, uInhumacionesService, uParcelasService,
  uAfiliadosService, uSupabaseClient;

var
  Inh: TInhumacion;
  Afil: TAfiliadoSeguro;
  Parc: TParcela;
  Ok: Boolean;
begin
  WriteLn('=== Test CRUD en Pascal conectando a Supabase Cloud ===');

  // Test 1: Crear Inhumacion
  WriteLn('1. Probando CrearInhumacion...');
  FillChar(Inh, SizeOf(Inh), 0);
  Inh.NombreDifunto := 'TEST PASCAL DIFUNTO';
  Inh.DniDifunto := '88888888';
  Inh.FechaInhumacion := '2026-10-26';
  Inh.NivelPosicion := 1;
  Inh.EmpresaFunebrera := 'Aeterna Sepelios Test';
  Inh.NombreResponsable := 'Responsable Test';
  Inh.TelefonoResponsable := '3826-999999';
  Inh.Observaciones := 'Acta creada desde test Pascal';

  Ok := TInhumacionesService.CrearInhumacion(Inh);
  if Ok then
    WriteLn('[PASS] TInhumacionesService.CrearInhumacion exitoso.')
  else
  begin
    WriteLn('[FAIL] CrearInhumacion fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  // Test 2: Actualizar Inhumacion
  WriteLn('2. Probando ActualizarInhumacion...');
  Inh.NivelPosicion := 2;
  Inh.Observaciones := 'Acta actualizada desde test Pascal';
  Ok := TInhumacionesService.ActualizarInhumacion('', Inh);
  if Ok then
    WriteLn('[PASS] TInhumacionesService.ActualizarInhumacion exitoso.')
  else
  begin
    WriteLn('[FAIL] ActualizarInhumacion fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  // Test 3: Eliminar Inhumacion
  WriteLn('3. Probando EliminarInhumacion...');
  Ok := TInhumacionesService.EliminarInhumacion('TEST PASCAL DIFUNTO');
  if Ok then
    WriteLn('[PASS] TInhumacionesService.EliminarInhumacion exitoso.')
  else
  begin
    WriteLn('[FAIL] EliminarInhumacion fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  // Test 4: Crear, Actualizar y Eliminar Afiliado
  WriteLn('4. Probando CRUD Afiliado...');
  FillChar(Afil, SizeOf(Afil), 0);
  Afil.NumeroAfiliado := 88888;
  Afil.NombreCompleto := 'Afiliado Test Pascal';
  Afil.DireccionCobro := 'Calle Test 123';
  Afil.ZonaCobro := 'Zona Test';
  Afil.MontoCuotaMensual := 18000;
  Afil.Estado := eaActivo;

  Ok := TAfiliadosService.CrearAfiliado(Afil);
  if Ok then
    WriteLn('[PASS] TAfiliadosService.CrearAfiliado exitoso.')
  else
  begin
    WriteLn('[FAIL] CrearAfiliado fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  Afil.MontoCuotaMensual := 22000;
  Ok := TAfiliadosService.ActualizarAfiliado('', Afil);
  if Ok then
    WriteLn('[PASS] TAfiliadosService.ActualizarAfiliado exitoso.')
  else
  begin
    WriteLn('[FAIL] ActualizarAfiliado fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  Ok := TAfiliadosService.EliminarAfiliado('88888');
  if Ok then
    WriteLn('[PASS] TAfiliadosService.EliminarAfiliado exitoso.')
  else
  begin
    WriteLn('[FAIL] EliminarAfiliado fallo: ', Supabase.LastErrorMessage);
    Halt(1);
  end;

  WriteLn('=== Todos los tests de CRUD en Pascal pasaron exitosamente ===');
end.
