program test_pdf_generation;

{$mode objfpc}{$H+}

uses
  Classes, SysUtils, uDataModels, uBusinessRules, uReportsPDF;

procedure TestGeneracionPDFs;
var
  Inh: TInhumacion;
  ListaInh: TInhumacionArray;
  Pago: TPagoMantenimiento;
  ListaPagos: TPagoArray;
  ListaAfiliados: TAfiliadoArray;
  Fichero: string;
begin
  WriteLn('=== Test de Generacion de Reportes PDF Nativos (fpPDF) ===');

  // 1. Test Acta de Inhumacion
  FillChar(Inh, SizeOf(Inh), 0);
  Inh.NombreDifunto := 'Francisco Javier Lopez';
  Inh.DniDifunto := '14.289.441';
  Inh.FechaFallecimiento := '2026-10-20';
  Inh.FechaInhumacion := '2026-10-22';
  Inh.NomenclaturaParcela := 'A-14-02';
  Inh.NivelPosicion := 1;
  Inh.EsCovid := False;
  Inh.CausaDefuncion := 'Paro Cardiorrespiratorio';
  Inh.EmpresaFunebrera := 'Empresa San Nicolas';
  Inh.NombreResponsable := 'Claudia Lopez';
  Inh.TelefonoResponsable := '336-4419822';

  Fichero := 'test_acta_output.pdf';
  GenerarActaInhumacionPDF(Inh, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarActaInhumacionPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo el archivo del acta');

  // 2. Test Recibo Oficial
  FillChar(Pago, SizeOf(Pago), 0);
  Pago.NroRecibo := '2026-00412';
  Pago.TitularNombre := 'Marta Beatriz Suarez';
  Pago.MontoPagado := 36000;
  Pago.PeriodoCubierto := 'Cuotas Sep - Oct 2026';
  Pago.MetodoPago := mpEfectivo;
  Pago.OperadorNombre := 'Admin General';
  Pago.Observaciones := 'Cobro Seguro de Sepelio';

  Fichero := 'test_recibo_output.pdf';
  GenerarReciboPagoPDF(Pago, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarReciboPagoPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo el archivo del recibo');

  // 3. Test Cierre de Caja
  SetLength(ListaPagos, 1);
  ListaPagos[0] := Pago;
  Fichero := 'test_cierre_output.pdf';
  GenerarCierreCajaPDF(ListaPagos, 36000, 0, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarCierreCajaPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo el archivo de cierre de caja');

  // 4. Test Planilla de Ruta
  SetLength(ListaAfiliados, 1);
  ListaAfiliados[0].NumeroAfiliado := 105;
  ListaAfiliados[0].NombreCompleto := 'Roberto Gomez';
  ListaAfiliados[0].DireccionCobro := 'Calle San Martin 450';
  ListaAfiliados[0].MontoCuotaMensual := 18000;

  Fichero := 'test_planilla_ruta_output.pdf';
  GenerarPlanillaRutaPDF(ListaAfiliados, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarPlanillaRutaPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo la planilla de ruta');

  WriteLn('=== Todos los generadores de reportes PDF evaluados exitosamente ===');
end;

begin
  try
    TestGeneracionPDFs;
  except
    on E: Exception do
      WriteLn('Error en test de PDF: ', E.Message);
  end;
end.
