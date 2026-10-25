unit uReportsPDF;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fppdf, uDataModels, uBusinessRules;

procedure GenerarActaInhumacionPDF(const Inh: TInhumacion; const OutputPath: string);
procedure GenerarFolioInhumacionesPDF(const Lista: TInhumacionArray; const OutputPath: string);
procedure GenerarReciboPagoPDF(const Pago: TPagoMantenimiento; const OutputPath: string);
procedure GenerarPlanillaRutaPDF(const Afiliados: TAfiliadoArray; const OutputPath: string);
procedure GenerarCierreCajaPDF(const Pagos: TPagoArray; TotalEf, TotalDig: Currency; const OutputPath: string);

implementation

procedure PDFDrawLine(Page: TPDFPage; X1, Y1, X2, Y2: Single; LineWidth: Single = 0.5);
begin
  Page.DrawLine(X1, Y1, X2, Y2, LineWidth, True);
end;

procedure PDFDrawRect(Page: TPDFPage; X, Y, W, H: Single; LineWidth: Single = 0.5);
begin
  Page.DrawRect(X, Y, W, H, LineWidth, False, True, 0);
end;

procedure ConfigurarEncabezado(Doc: TPDFDocument; Page: TPDFPage; FontTitle, FontNormal: Integer; const TituloDoc: string);
begin
  PDFDrawLine(Page, 15, 12, 195, 12);

  Page.SetFont(FontNormal, 8);
  Page.WriteText(15, 16, 'CEMENTERIO PARQUE SAN NICOLAS · PARROQUIA SAN NICOLAS DE BARI');

  Page.SetFont(FontTitle, 13);
  Page.WriteText(15, 23, UpperCase(TituloDoc));

  Page.SetFont(FontNormal, 8);
  Page.WriteText(15, 28, 'Registro Eclesiastico y Administracion General de Sepelios');
  Page.WriteText(155, 28, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now));

  PDFDrawLine(Page, 15, 30, 195, 30);
end;

procedure GenerarActaInhumacionPDF(const Inh: TInhumacion; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Acta Oficial de Inhumacion');

    // Recuadro Principal: Datos del Difunto
    PDFDrawRect(Page, 15, 36, 180, 52);
    Page.SetFont(FontH, 10);
    Page.WriteText(20, 42, 'DATOS DEL FALLECIDO:');
    Page.SetFont(FontN, 9);
    Page.WriteText(20, 49, 'Nombre Completo: ' + Inh.NombreDifunto);
    Page.WriteText(20, 56, 'DNI: ' + Inh.DniDifunto);
    Page.WriteText(20, 63, 'Fecha Defuncion: ' + FormatearFecha(Inh.FechaFallecimiento));
    Page.WriteText(20, 70, 'Fecha Inhumacion: ' + FormatearFecha(Inh.FechaInhumacion));

    Page.SetFont(FontH, 10);
    Page.WriteText(115, 42, 'UBICACION CATASTRAL:');
    Page.SetFont(FontH, 11);
    Page.WriteText(115, 50, 'Parcela: ' + Inh.NomenclaturaParcela);
    Page.SetFont(FontN, 9);
    Page.WriteText(115, 57, 'Nivel Asignado: ' + IntToStr(Inh.NivelPosicion));
    if Inh.EsCovid then
    begin
      Page.SetFont(FontH, 9);
      Page.WriteText(115, 65, 'Protocolo: ESPECIAL COVID-19');
    end
    else
    begin
      Page.SetFont(FontN, 9);
      Page.WriteText(115, 65, 'Protocolo: ESTANDAR');
    end;

    // Recuadro Secundario: Datos del Servicio
    PDFDrawRect(Page, 15, 94, 180, 36);
    Page.SetFont(FontH, 10);
    Page.WriteText(20, 100, 'DATOS DEL SERVICIO FUNEBRE Y RESPONSABLE:');
    Page.SetFont(FontN, 9);
    Page.WriteText(20, 107, 'Empresa Funebrera: ' + Inh.EmpresaFunebrera);
    Page.WriteText(20, 114, 'Causa de Defuncion: ' + Inh.CausaDefuncion);
    Page.WriteText(20, 121, 'Familiar / Declarante: ' + Inh.NombreResponsable + ' (Tel: ' + Inh.TelefonoResponsable + ')');

    // Clausula
    Page.SetFont(FontN, 8);
    Page.WriteText(15, 140, 'Certifico que en el dia de la fecha se ha procedido a la inhumacion de los restos en el predio del');
    Page.WriteText(15, 144, 'Cementerio Parque San Nicolas, labrandose la presente acta para el Libro de Archivo Parroquial.');

    // Firmas
    PDFDrawLine(Page, 25, 185, 85, 185);
    Page.WriteText(30, 190, 'Firma Familiar / Declarante');
    Page.WriteText(35, 194, 'Aclaracion y DNI');

    PDFDrawLine(Page, 125, 185, 185, 185);
    Page.WriteText(130, 190, 'Direccion y Archivo Parroquial');
    Page.WriteText(137, 194, 'Sello Oficial Cementerio');

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarFolioInhumacionesPDF(const Lista: TInhumacionArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Folio del Libro de Inhumaciones');

    // Cabecera Tabla
    PDFDrawRect(Page, 15, 34, 180, 7);
    Page.SetFont(FontH, 8);
    Page.WriteText(17, 39, 'Fecha');
    Page.WriteText(40, 39, 'Nombre del Difunto');
    Page.WriteText(105, 39, 'DNI');
    Page.WriteText(130, 39, 'Parcela');
    Page.WriteText(155, 39, 'Nivel');
    Page.WriteText(170, 39, 'Protocolo');

    Y := 46;
    for i := Low(Lista) to High(Lista) do
    begin
      Page.SetFont(FontN, 7);
      Page.WriteText(17, Y, FormatearFecha(Lista[i].FechaInhumacion));
      Page.WriteText(40, Y, Copy(Lista[i].NombreDifunto, 1, 32));
      Page.WriteText(105, Y, Lista[i].DniDifunto);
      Page.WriteText(130, Y, Lista[i].NomenclaturaParcela);
      Page.WriteText(158, Y, IntToStr(Lista[i].NivelPosicion));
      if Lista[i].EsCovid then
        Page.WriteText(170, Y, 'COVID-19')
      else
        Page.WriteText(170, Y, 'Estandar');

      PDFDrawLine(Page, 15, Y + 2, 195, Y + 2);
      Inc(Y, 6);

      if Y > 280 then
      begin
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Folio del Libro de Inhumaciones (Cont.)');
        Y := 38;
      end;
    end;

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarReciboPagoPDF(const Pago: TPagoMantenimiento; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    // ORIGINAL (Afiliado)
    PDFDrawRect(Page, 15, 15, 180, 110);
    Page.SetFont(FontH, 11);
    Page.WriteText(20, 24, 'CEMENTERIO PARQUE SAN NICOLAS · RECIBO OFICIAL');
    Page.SetFont(FontH, 9);
    Page.WriteText(160, 24, 'ORIGINAL');
    Page.WriteText(20, 31, 'Recibo Nro: ' + Pago.NroRecibo);
    Page.SetFont(FontN, 9);
    Page.WriteText(145, 31, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now));
    PDFDrawLine(Page, 20, 34, 190, 34);

    Page.WriteText(20, 42, 'Recibimos de: ' + Pago.TitularNombre);
    Page.SetFont(FontH, 12);
    Page.WriteText(20, 52, 'La cantidad de: ' + FormatearMoneda(Pago.MontoPagado));
    Page.SetFont(FontN, 9);
    Page.WriteText(20, 60, 'En concepto de: ' + Pago.Observaciones);
    Page.WriteText(20, 67, 'Periodo Imputado: ' + Pago.PeriodoCubierto);
    Page.WriteText(20, 74, 'Forma de Pago: ' + MetodoPagoToStr(Pago.MetodoPago));

    PDFDrawLine(Page, 130, 105, 185, 105);
    Page.SetFont(FontN, 8);
    Page.WriteText(135, 110, 'Firma y Sello Caja');
    Page.WriteText(135, 114, 'Operador: ' + Pago.OperadorNombre);

    // Linea de corte
    PDFDrawLine(Page, 15, 138, 195, 138);
    Page.WriteText(85, 137, '- - - - - CORTAR AQUI - - - - -');

    // DUPLICADO (Administracion)
    PDFDrawRect(Page, 15, 148, 180, 110);
    Page.SetFont(FontH, 11);
    Page.WriteText(20, 157, 'CEMENTERIO PARQUE SAN NICOLAS · RECIBO OFICIAL');
    Page.SetFont(FontH, 9);
    Page.WriteText(150, 157, 'TALON CONTROL');
    Page.WriteText(20, 164, 'Recibo Nro: ' + Pago.NroRecibo);
    Page.SetFont(FontN, 9);
    Page.WriteText(145, 164, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now));
    PDFDrawLine(Page, 20, 167, 190, 167);

    Page.WriteText(20, 175, 'Titular: ' + Pago.TitularNombre);
    Page.SetFont(FontH, 12);
    Page.WriteText(20, 185, 'Monto Cobrado: ' + FormatearMoneda(Pago.MontoPagado));
    Page.SetFont(FontN, 9);
    Page.WriteText(20, 193, 'Concepto: ' + Pago.Observaciones);
    Page.WriteText(20, 200, 'Forma de Pago: ' + MetodoPagoToStr(Pago.MetodoPago));

    PDFDrawLine(Page, 130, 238, 185, 238);
    Page.SetFont(FontN, 8);
    Page.WriteText(135, 243, 'Firma y Sello Caja');
    Page.WriteText(135, 247, 'Operador: ' + Pago.OperadorNombre);

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarPlanillaRutaPDF(const Afiliados: TAfiliadoArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Planilla de Ruta y Cobranza Domiciliaria');

    // Cabecera Tabla
    PDFDrawRect(Page, 15, 34, 180, 7);
    Page.SetFont(FontH, 8);
    Page.WriteText(17, 39, 'Nro');
    Page.WriteText(30, 39, 'Nombre del Afiliado');
    Page.WriteText(95, 39, 'Direccion / Domicilio');
    Page.WriteText(145, 39, 'Cuota');
    Page.WriteText(168, 39, 'Cobrado / Firma');

    Y := 46;
    for i := Low(Afiliados) to High(Afiliados) do
    begin
      Page.SetFont(FontN, 7);
      Page.WriteText(17, Y, IntToStr(Afiliados[i].NumeroAfiliado));
      Page.WriteText(30, Y, Copy(Afiliados[i].NombreCompleto, 1, 28));
      Page.WriteText(95, Y, Copy(Afiliados[i].DireccionCobro, 1, 28));
      Page.SetFont(FontH, 7);
      Page.WriteText(145, Y, FormatearMoneda(Afiliados[i].MontoCuotaMensual));
      PDFDrawRect(Page, 168, Y - 3, 22, 5); // Casilla para marcar

      PDFDrawLine(Page, 15, Y + 2, 195, Y + 2);
      Inc(Y, 6);

      if Y > 280 then
      begin
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Planilla de Ruta para Cobrador (Cont.)');
        Y := 38;
      end;
    end;

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarCierreCajaPDF(const Pagos: TPagoArray; TotalEf, TotalDig: Currency; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Acta de Arqueo y Cierre Diario de Caja');

    // Cuadro de Resumen
    PDFDrawRect(Page, 15, 35, 180, 24);
    Page.SetFont(FontH, 9);
    Page.WriteText(20, 41, 'RESUMEN DEL CIERRE:');
    Page.SetFont(FontN, 9);
    Page.WriteText(20, 47, 'Total Efectivo: ' + FormatearMoneda(TotalEf));
    Page.WriteText(95, 47, 'Total Digital/Transf: ' + FormatearMoneda(TotalDig));
    Page.SetFont(FontH, 10);
    Page.WriteText(20, 54, 'TOTAL GENERAL RECAUDADO: ' + FormatearMoneda(TotalEf + TotalDig));

    // Cabecera Movimientos
    Page.SetFont(FontH, 9);
    Page.WriteText(15, 65, 'COMPROBANTES ASENTADOS EN EL DIA:');

    PDFDrawRect(Page, 15, 68, 180, 6);
    Page.SetFont(FontH, 7);
    Page.WriteText(17, 72, 'Recibo Nro');
    Page.WriteText(45, 72, 'Titular / Concepto');
    Page.WriteText(140, 72, 'Metodo');
    Page.WriteText(170, 72, 'Monto');

    Y := 78;
    for i := Low(Pagos) to High(Pagos) do
    begin
      Page.SetFont(FontN, 7);
      Page.WriteText(17, Y, Pagos[i].NroRecibo);
      Page.WriteText(45, Y, Copy(Pagos[i].TitularNombre + ' - ' + Pagos[i].Observaciones, 1, 44));
      Page.WriteText(140, Y, MetodoPagoToStr(Pagos[i].MetodoPago));
      Page.SetFont(FontH, 7);
      Page.WriteText(170, Y, FormatearMoneda(Pagos[i].MontoPagado));

      PDFDrawLine(Page, 15, Y + 2, 195, Y + 2);
      Inc(Y, 6);

      if Y > 260 then
      begin
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Detalle de Movimientos de Caja (Cont.)');
        Y := 38;
      end;
    end;

    // Firmas
    PDFDrawLine(Page, 30, 275, 85, 275);
    Page.SetFont(FontN, 8);
    Page.WriteText(35, 280, 'Firma Cajero de Turno');

    PDFDrawLine(Page, 125, 275, 180, 275);
    Page.WriteText(130, 280, 'Firma Tesoreria / Parroquia');

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

end.
