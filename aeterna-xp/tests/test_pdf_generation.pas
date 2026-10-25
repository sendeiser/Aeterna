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
  ListaParc: TParcelaArray;
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

  // 1.b Test Folio del Libro
  SetLength(ListaInh, 2);
  ListaInh[0] := Inh;
  ListaInh[1] := Inh;
  ListaInh[1].NombreDifunto := 'Marta Sanchez';
  ListaInh[1].NomenclaturaParcela := 'E-05-12';
  Fichero := 'test_folio_output.pdf';
  GenerarFolioInhumacionesPDF(ListaInh, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarFolioInhumacionesPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo el archivo del folio');

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

  // 5. Test Padron General de Parcelas
  SetLength(ListaParc, 2);
  ListaParc[0].Nomenclatura := 'A-25-96';
  ListaParc[0].SectorId := 'A';
  ListaParc[0].ManzanaFila := '25';
  ListaParc[0].NumeroParcela := '96';
  ListaParc[0].Estado := epOcupada;
  ListaParc[0].CapacidadTotal := 3;
  ListaParc[0].EspaciosOcupados := 2;
  ListaParc[0].TitularNombre := 'Vazquez Donoso, Marcelo Ignacio';
  ListaParc[0].SaldoMantenimiento := 0;

  ListaParc[1].Nomenclatura := 'A-19-85';
  ListaParc[1].SectorId := 'A';
  ListaParc[1].ManzanaFila := '19';
  ListaParc[1].NumeroParcela := '85';
  ListaParc[1].Estado := epEnMora;
  ListaParc[1].CapacidadTotal := 3;
  ListaParc[1].EspaciosOcupados := 1;
  ListaParc[1].TitularNombre := 'Abdala, Carla Vanesa';
  ListaParc[1].SaldoMantenimiento := 100000;

  Fichero := 'test_padron_parcelas_output.pdf';
  GenerarListadoParcelasPDF(ListaParc, Fichero);
  if FileExists(Fichero) then
    WriteLn('[PASS] GenerarListadoParcelasPDF produjo archivo: ', Fichero)
  else
    WriteLn('[FAIL] No se creo el padron de parcelas');

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
