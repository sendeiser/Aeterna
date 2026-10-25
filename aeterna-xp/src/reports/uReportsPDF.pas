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

procedure ConfigurarEncabezado(Doc: TPDFDocument; Page: TPDFPage; FontTitle, FontNormal: Integer; const TituloDoc: string);
begin
  // Linea superior
  Page.DrawLine(40, 800, 555, 800, 2);
  Page.WriteText(40, 780, 'CEMENTERIO PARQUE SAN NICOLAS · PARROQUIA SAN NICOLAS DE BARI', FontTitle, 11);
  Page.WriteText(40, 765, UpperCase(TituloDoc), FontTitle, 14);
  Page.WriteText(40, 750, 'Registro Eclesiastico y Administracion General de Sepelios', FontNormal, 9);
  Page.WriteText(450, 750, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now), FontNormal, 9);
  Page.DrawLine(40, 742, 555, 742, 1);
end;

procedure GenerarActaInhumacionPDF(const Inh: TInhumacion; const OutputPath: string);
var
  Doc: TPDFDocument;
  Page: TPDFPage;
  FontH, FontN, FontB: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.PaperType := ptA4;
    Doc.Title := 'Acta de Inhumacion - ' + Inh.NombreDifunto;
    FontH := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontB := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica', 'Helvetica');

    Page := Doc.Pages.AddPage;
    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Acta Oficial de Inhumacion');

    // Recuadro Principal
    Page.DrawRect(40, 520, 515, 200, 1, False, True);

    Page.WriteText(60, 695, 'DATOS DEL FALLECIDO:', FontB, 11);
    Page.WriteText(60, 675, 'Nombre Completo: ' + Inh.NombreDifunto, FontN, 10);
    Page.WriteText(60, 655, 'Documento Nacional de Identidad (DNI): ' + Inh.DniDifunto, FontN, 10);
    Page.WriteText(60, 635, 'Fecha de Defuncion: ' + FormatearFecha(Inh.FechaFallecimiento), FontN, 10);
    Page.WriteText(60, 615, 'Fecha de Inhumacion: ' + FormatearFecha(Inh.FechaInhumacion), FontN, 10);

    Page.WriteText(320, 695, 'UBICACION CATASTRAL:', FontB, 11);
    Page.WriteText(320, 675, 'Parcela Nro: ' + Inh.NomenclaturaParcela, FontB, 12);
    Page.WriteText(320, 655, 'Nivel / Espacio Ocupado: ' + IntToStr(Inh.NivelPosicion), FontN, 10);
    if Inh.EsCovid then
      Page.WriteText(320, 635, 'Protocolo Sanitario: ESPECIAL COVID-19', FontB, 10)
    else
      Page.WriteText(320, 635, 'Protocolo Sanitario: ESTANDAR', FontN, 10);

    // Datos del Servicio
    Page.DrawRect(40, 390, 515, 115, 1, False, True);
    Page.WriteText(60, 480, 'DATOS DEL SERVICIO FUNEBRE Y RESPONSABLE:', FontB, 11);
    Page.WriteText(60, 460, 'Empresa Funebrera: ' + Inh.EmpresaFunebrera, FontN, 10);
    Page.WriteText(60, 440, 'Causa de Defuncion: ' + Inh.CausaDefuncion, FontN, 10);
    Page.WriteText(60, 420, 'Familiar / Declarante: ' + Inh.NombreResponsable + ' (Tel: ' + Inh.TelefonoResponsable + ')', FontN, 10);

    // Clausula Institucional
    Page.WriteText(40, 350, 'Certifico que en el dia de la fecha se ha procedido a la inhumacion de los restos del extinto en el predio del', FontN, 9);
    Page.WriteText(40, 335, 'Cementerio Parque San Nicolas, labrandose la presente acta para constancia en el Libro de Archivo Parroquial.', FontN, 9);

    // Firmas
    Page.DrawLine(60, 200, 240, 200, 1);
    Page.WriteText(80, 185, 'Firma Familiar / Declarante', FontN, 9);
    Page.WriteText(95, 170, 'Aclaracion y DNI', FontN, 9);

    Page.DrawLine(350, 200, 530, 200, 1);
    Page.WriteText(370, 185, 'Direccion y Archivo Parroquial', FontN, 9);
    Page.WriteText(385, 170, 'Sello Oficial Cementerio', FontN, 9);

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarFolioInhumacionesPDF(const Lista: TInhumacionArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y, Pag: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.PaperType := ptA4;
    Doc.Title := 'Folio de Inhumaciones';
    FontH := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica', 'Helvetica');

    Page := Doc.Pages.AddPage;
    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Folio del Libro de Inhumaciones');

    // Cabecera de Tabla
    Y := 720;
    Page.DrawRect(40, Y, 515, 20, 1, False, True);
    Page.WriteText(45, Y + 5, 'Fecha', FontH, 9);
    Page.WriteText(110, Y + 5, 'Nombre del Difunto', FontH, 9);
    Page.WriteText(290, Y + 5, 'DNI', FontH, 9);
    Page.WriteText(360, Y + 5, 'Parcela', FontH, 9);
    Page.WriteText(430, Y + 5, 'Nivel', FontH, 9);
    Page.WriteText(470, Y + 5, 'Protocolo', FontH, 9);

    Y := 695;
    for i := Low(Lista) to High(Lista) do
    begin
      Page.WriteText(45, Y, FormatearFecha(Lista[i].FechaInhumacion), FontN, 8);
      Page.WriteText(110, Y, Copy(Lista[i].NombreDifunto, 1, 32), FontN, 8);
      Page.WriteText(290, Y, Lista[i].DniDifunto, FontN, 8);
      Page.WriteText(360, Y, Lista[i].NomenclaturaParcela, FontN, 8);
      Page.WriteText(435, Y, IntToStr(Lista[i].NivelPosicion), FontN, 8);
      if Lista[i].EsCovid then
        Page.WriteText(470, Y, 'COVID-19', FontH, 8)
      else
        Page.WriteText(470, Y, 'Estandar', FontN, 8);

      Page.DrawLine(40, Y - 4, 555, Y - 4, 1);
      Dec(Y, 18);

      if Y < 60 then
      begin
        Page := Doc.Pages.AddPage;
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Folio del Libro de Inhumaciones (Cont.)');
        Y := 720;
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
  Page: TPDFPage;
  FontH, FontN, FontB: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.PaperType := ptA4;
    Doc.Title := 'Recibo Oficial Nro ' + Pago.NroRecibo;
    FontH := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontB := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica', 'Helvetica');

    Page := Doc.Pages.AddPage;

    // ORIGINAL (Para el Afiliado / Titular)
    Page.DrawRect(40, 480, 515, 340, 1, False, True);
    Page.WriteText(55, 800, 'CEMENTERIO PARQUE SAN NICOLAS · RECIBO OFICIAL', FontH, 12);
    Page.WriteText(430, 800, 'ORIGINAL', FontB, 11);
    Page.WriteText(55, 780, 'Recibo Nro: ' + Pago.NroRecibo, FontB, 11);
    Page.WriteText(400, 780, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now), FontN, 10);
    Page.DrawLine(55, 770, 540, 770, 1);

    Page.WriteText(55, 745, 'Recibimos de: ' + Pago.TitularNombre, FontN, 11);
    Page.WriteText(55, 725, 'La cantidad de: ' + FormatearMoneda(Pago.MontoPagado), FontB, 13);
    Page.WriteText(55, 705, 'En concepto de: ' + Pago.Observaciones, FontN, 10);
    Page.WriteText(55, 685, 'Periodo Imputado: ' + Pago.PeriodoCubierto, FontN, 10);
    Page.WriteText(55, 665, 'Forma de Pago: ' + MetodoPagoToStr(Pago.MetodoPago), FontN, 10);

    Page.DrawLine(360, 530, 520, 530, 1);
    Page.WriteText(380, 515, 'Operador: ' + Pago.OperadorNombre, FontN, 9);
    Page.WriteText(405, 500, 'Firma y Sello Caja', FontN, 9);

    // Linea punteada de corte
    Page.DrawLine(40, 440, 555, 440, 1);
    Page.WriteText(240, 445, '- - - - - - - - - CORTAR AQUI - - - - - - - - -', FontN, 8);

    // DUPLICADO (Para el Archivo de Administracion)
    Page.DrawRect(40, 80, 515, 340, 1, False, True);
    Page.WriteText(55, 400, 'CEMENTERIO PARQUE SAN NICOLAS · RECIBO OFICIAL', FontH, 12);
    Page.WriteText(410, 400, 'TALON CONTROL', FontB, 11);
    Page.WriteText(55, 380, 'Recibo Nro: ' + Pago.NroRecibo, FontB, 11);
    Page.WriteText(400, 380, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now), FontN, 10);
    Page.DrawLine(55, 370, 540, 370, 1);

    Page.WriteText(55, 345, 'Titular: ' + Pago.TitularNombre, FontN, 11);
    Page.WriteText(55, 325, 'Monto Cobrado: ' + FormatearMoneda(Pago.MontoPagado), FontB, 13);
    Page.WriteText(55, 305, 'Concepto: ' + Pago.Observaciones, FontN, 10);
    Page.WriteText(55, 285, 'Forma de Pago: ' + MetodoPagoToStr(Pago.MetodoPago), FontN, 10);

    Page.DrawLine(360, 130, 520, 130, 1);
    Page.WriteText(380, 115, 'Operador: ' + Pago.OperadorNombre, FontN, 9);
    Page.WriteText(405, 100, 'Firma y Sello Caja', FontN, 9);

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

procedure GenerarPlanillaRutaPDF(const Afiliados: TAfiliadoArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.PaperType := ptA4;
    Doc.Title := 'Planilla de Ruta para Cobrador';
    FontH := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica', 'Helvetica');

    Page := Doc.Pages.AddPage;
    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Planilla de Ruta y Cobranza Domiciliaria');

    Y := 720;
    Page.DrawRect(40, Y, 515, 20, 1, False, True);
    Page.WriteText(45, Y + 5, 'Nro', FontH, 9);
    Page.WriteText(75, Y + 5, 'Nombre del Afiliado', FontH, 9);
    Page.WriteText(240, Y + 5, 'Direccion / Domicilio', FontH, 9);
    Page.WriteText(400, Y + 5, 'Cuota', FontH, 9);
    Page.WriteText(460, Y + 5, 'Firma / Cobrado', FontH, 9);

    Y := 695;
    for i := Low(Afiliados) to High(Afiliados) do
    begin
      Page.WriteText(45, Y, IntToStr(Afiliados[i].NumeroAfiliado), FontN, 8);
      Page.WriteText(75, Y, Copy(Afiliados[i].NombreCompleto, 1, 26), FontN, 8);
      Page.WriteText(240, Y, Copy(Afiliados[i].DireccionCobro, 1, 30), FontN, 8);
      Page.WriteText(400, Y, FormatearMoneda(Afiliados[i].MontoCuotaMensual), FontH, 8);
      Page.DrawRect(465, Y - 2, 80, 14, 1, False, True); // Casilla para tildar o firmar

      Page.DrawLine(40, Y - 4, 555, Y - 4, 1);
      Dec(Y, 18);

      if Y < 60 then
      begin
        Page := Doc.Pages.AddPage;
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Planilla de Ruta para Cobrador (Cont.)');
        Y := 720;
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
  Page: TPDFPage;
  FontH, FontN, FontB: Integer;
  i, Y: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.PaperType := ptA4;
    Doc.Title := 'Cierre Diario de Caja';
    FontH := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontB := Doc.AddFont('Helvetica-Bold', 'Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica', 'Helvetica');

    Page := Doc.Pages.AddPage;
    ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Acta de Arqueo y Cierre Diario de Caja');

    // Cuadro de Totales
    Page.DrawRect(40, 650, 515, 75, 1, False, True);
    Page.WriteText(55, 705, 'RESUMEN DEL CIERRE:', FontB, 11);
    Page.WriteText(55, 685, 'Total Efectivo: ' + FormatearMoneda(TotalEf), FontN, 10);
    Page.WriteText(240, 685, 'Total Digital/Transf: ' + FormatearMoneda(TotalDig), FontN, 10);
    Page.WriteText(55, 665, 'TOTAL GENERAL RECAUDADO: ' + FormatearMoneda(TotalEf + TotalDig), FontB, 12);

    // Listado de Movimientos
    Page.WriteText(40, 630, 'DETALLE DE COMPROBANTES ASENTADOS EN EL DIA:', FontB, 10);
    Y := 605;
    Page.DrawRect(40, Y, 515, 18, 1, False, True);
    Page.WriteText(45, Y + 4, 'Recibo Nro', FontH, 9);
    Page.WriteText(140, Y + 4, 'Titular / Concepto', FontH, 9);
    Page.WriteText(370, Y + 4, 'Metodo', FontH, 9);
    Page.WriteText(470, Y + 4, 'Monto', FontH, 9);

    Y := 585;
    for i := Low(Pagos) to High(Pagos) do
    begin
      Page.WriteText(45, Y, Pagos[i].NroRecibo, FontN, 8);
      Page.WriteText(140, Y, Copy(Pagos[i].TitularNombre + ' - ' + Pagos[i].Observaciones, 1, 40), FontN, 8);
      Page.WriteText(370, Y, MetodoPagoToStr(Pagos[i].MetodoPago), FontN, 8);
      Page.WriteText(470, Y, FormatearMoneda(Pagos[i].MontoPagado), FontH, 8);

      Page.DrawLine(40, Y - 3, 555, Y - 3, 1);
      Dec(Y, 16);

      if Y < 120 then
      begin
        Page := Doc.Pages.AddPage;
        ConfigurarEncabezado(Doc, Page, FontH, FontN, 'Detalle de Movimientos de Caja (Cont.)');
        Y := 720;
      end;
    end;

    // Firmas de Cierre
    Page.DrawLine(80, 80, 240, 80, 1);
    Page.WriteText(100, 65, 'Firma Cajero de Turno', FontN, 9);

    Page.DrawLine(350, 80, 510, 80, 1);
    Page.WriteText(370, 65, 'Firma Tesoreria / Direccion', FontN, 9);

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

end.
