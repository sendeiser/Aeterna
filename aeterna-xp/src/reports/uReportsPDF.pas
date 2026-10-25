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

const
  // Paleta Institucional Profesional
  COL_NAVY_DARK   = (26 shl 16) or (43 shl 8) or 76;     // #1A2B4C - Azul Marino Institucional
  COL_NAVY_MED    = (30 shl 16) or (58 shl 8) or 138;    // #1E3A8A - Azul Zafiro
  COL_SLATE_DARK  = (51 shl 16) or (65 shl 8) or 85;     // #334155 - Pizarra Oscuro
  COL_SLATE_MED   = (100 shl 16) or (116 shl 8) or 139;  // #64748B - Pizarra Medio
  COL_SLATE_LIGHT = (226 shl 16) or (232 shl 8) or 240;  // #E2E8F0 - Gris Borde Sutil
  COL_BG_ROW      = (248 shl 16) or (250 shl 8) or 252;  // #F8FAFC - Fila Alterna
  COL_BG_HEADER   = (241 shl 16) or (245 shl 8) or 249;  // #F1F5F9 - Gris Claro Encabezado
  COL_WHITE       = (255 shl 16) or (255 shl 8) or 255;  // #FFFFFF - Blanco Puro
  COL_GOLD        = (180 shl 16) or (83 shl 8) or 9;      // #B45309 - Dorado / Ambar
  COL_TEXT_BLACK  = (15 shl 16) or (23 shl 8) or 42;      // #0F172A - Texto Principal
  COL_GREEN_DARK  = (6 shl 16) or (95 shl 8) or 70;      // #065F46 - Esmeralda

// ----------------------------------------------------------------------------
// Primitivas Graficas Vectoriales PDF
// ----------------------------------------------------------------------------

procedure PDFDrawLine(Page: TPDFPage; X1, Y1, X2, Y2: Single; LineWidth: Single; Color: LongWord);
begin
  Page.SetColor(Color, True);
  Page.DrawLine(X1, Y1, X2, Y2, LineWidth, True);
end;

procedure PDFDrawRect(Page: TPDFPage; X, Y, W, H: Single; LineWidth: Single; DoFill, DoStroke: Boolean; StrokeColor, FillColor: LongWord);
begin
  if DoStroke then
    Page.SetColor(StrokeColor, True);
  if DoFill then
    Page.SetColor(FillColor, False);
  Page.DrawRect(X, Y, W, H, LineWidth, DoFill, DoStroke, 0);
end;

procedure ConfigurarEncabezadoInstitucional(Page: TPDFPage; FontTitle, FontNormal, FontBold: Integer; const TituloDoc, SubtituloDoc: string);
begin
  // Barra Superior Azul Marino Institucional
  PDFDrawRect(Page, 15, 10, 180, 12, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
  Page.SetColor(COL_WHITE, False);
  Page.SetFont(FontBold, 8);
  Page.WriteText(18, 15, 'DIOCESIS DE SAN NICOLAS DE LOS ARROYOS - PARROQUIA SAN NICOLAS DE BARI');
  Page.SetFont(FontNormal, 7);
  Page.WriteText(18, 19, 'Cementerio Parque San Nicolas - Sistema Integrado de Administracion General');

  // Linea Dorada de Acento
  PDFDrawLine(Page, 15, 22, 195, 22, 1.2, COL_GOLD);

  // Recuadro del Titulo del Documento
  PDFDrawRect(Page, 15, 23, 180, 14, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontTitle, 12);
  Page.WriteText(18, 29, UpperCase(TituloDoc));

  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontNormal, 8);
  Page.WriteText(18, 34, SubtituloDoc);

  Page.SetFont(FontBold, 8);
  Page.WriteText(145, 29, 'FECHA: ' + FormatDateTime('dd/mm/yyyy', Now));
  Page.SetFont(FontNormal, 7);
  Page.WriteText(145, 34, 'DOCUMENTO OFICIAL VALIDO');

  PDFDrawLine(Page, 15, 37.5, 195, 37.5, 0.5, COL_SLATE_MED);
end;

// ----------------------------------------------------------------------------
// 1. ACTA OFICIAL DE INHUMACION
// ----------------------------------------------------------------------------

procedure GenerarActaInhumacionPDF(const Inh: TInhumacion; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN, FontI: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');
    FontI := Doc.AddFont('Helvetica-Oblique');

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    // Encabezado Institucional
    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Acta Notarial de Inhumacion y Registro Eclesiastico',
      'Libro Oficial Parroquial de Defunciones e Inhumaciones');

    // ---------------------------------------------------------
    // SECCION 1: DATOS CIVILES DEL DIFUNTO
    // ---------------------------------------------------------
    PDFDrawRect(Page, 15, 42, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 46.5, '1. IDENTIFICACION REGISTRAL Y CIVIL DEL DIFUNTO');

    PDFDrawRect(Page, 15, 48, 180, 42, 0.5, True, True, COL_SLATE_LIGHT, COL_WHITE);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    Page.WriteText(20, 55, 'Apellidos y Nombres:');
    Page.SetFont(FontH, 11);
    Page.SetColor(COL_NAVY_DARK, False);
    Page.WriteText(62, 55, Inh.NombreDifunto);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    Page.WriteText(20, 63, 'DNI / Documento:');
    Page.SetFont(FontN, 9);
    Page.WriteText(62, 63, Inh.DniDifunto);

    Page.SetFont(FontH, 9);
    Page.WriteText(115, 63, 'Fecha Defuncion:');
    Page.SetFont(FontN, 9);
    Page.WriteText(150, 63, FormatearFecha(Inh.FechaFallecimiento));

    Page.SetFont(FontH, 9);
    Page.WriteText(20, 71, 'Causa de Defuncion:');
    Page.SetFont(FontN, 9);
    if Inh.CausaDefuncion <> '' then
      Page.WriteText(62, 71, Inh.CausaDefuncion)
    else
      Page.WriteText(62, 71, 'Causa Natural / Certificado Medico de Defuncion en Regla');

    Page.SetFont(FontH, 9);
    Page.WriteText(20, 79, 'Fecha Inhumacion:');
    Page.SetFont(FontN, 9);
    Page.WriteText(62, 79, FormatearFecha(Inh.FechaInhumacion));

    Page.SetFont(FontH, 9);
    Page.WriteText(115, 79, 'Protocolo COVID:');
    if Inh.EsCovid then
    begin
      Page.SetFont(FontH, 9);
      Page.SetColor(COL_GOLD, False);
      Page.WriteText(150, 79, 'SI (Protocolo Sanitario)');
    end
    else
    begin
      Page.SetFont(FontN, 9);
      Page.SetColor(COL_GREEN_DARK, False);
      Page.WriteText(150, 79, 'No (Sepelio Estandar)');
    end;

    // ---------------------------------------------------------
    // SECCION 2: UBICACION CATASTRAL EN EL CEMENTERIO PARQUE
    // ---------------------------------------------------------
    PDFDrawRect(Page, 15, 94, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 98.5, '2. ASIGNACION CATASTRAL DE FOSA EN CEMENTERIO PARQUE');

    PDFDrawRect(Page, 15, 100, 180, 36, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_ROW);

    // Tarjeta Destacada de Parcela
    PDFDrawRect(Page, 20, 104, 65, 28, 0.8, True, True, COL_NAVY_DARK, COL_WHITE);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(24, 109, 'PARCELA DESIGNADA:');
    Page.SetColor(COL_NAVY_DARK, False);
    Page.SetFont(FontH, 13);
    Page.WriteText(24, 117, Inh.NomenclaturaParcela);
    Page.SetColor(COL_GOLD, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(24, 126, 'NIVEL EN FOSA: ' + IntToStr(Inh.NivelPosicion));

    // Detalles adicionales
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    Page.WriteText(92, 108, 'Sector del Parque:');
    Page.SetFont(FontN, 9);
    Page.WriteText(130, 108, 'Sector Parquizado A / E / Salinas');

    Page.SetFont(FontH, 9);
    Page.WriteText(92, 116, 'Profundidad / Posicion:');
    Page.SetFont(FontN, 9);
    case Inh.NivelPosicion of
      1: Page.WriteText(130, 116, 'Nivel 1 (Superior / Cabecera)');
      2: Page.WriteText(130, 116, 'Nivel 2 (Intermedio)');
      3: Page.WriteText(130, 116, 'Nivel 3 (Fondo)');
    else
      Page.WriteText(130, 116, 'Nivel Estandar');
    end;

    Page.SetFont(FontH, 9);
    Page.WriteText(92, 124, 'Estado de Concesion:');
    Page.SetFont(FontN, 9);
    Page.WriteText(130, 124, 'Asentado en Registro General de Concesiones');

    // ---------------------------------------------------------
    // SECCION 3: EMPRESA FUNEBRERA Y RESPONSABLE FAMILIAR
    // ---------------------------------------------------------
    PDFDrawRect(Page, 15, 140, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 144.5, '3. EMPRESA FUNEBRERA RESPONSABLE Y FAMILIAR DECLARANTE');

    PDFDrawRect(Page, 15, 146, 180, 32, 0.5, True, True, COL_SLATE_LIGHT, COL_WHITE);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    Page.WriteText(20, 153, 'Empresa Funebrera:');
    Page.SetFont(FontN, 9);
    Page.WriteText(62, 153, Inh.EmpresaFunebrera);

    Page.SetFont(FontH, 9);
    Page.WriteText(20, 161, 'Familiar / Declarante:');
    Page.SetFont(FontN, 9);
    Page.WriteText(62, 161, Inh.NombreResponsable);

    Page.SetFont(FontH, 9);
    Page.WriteText(20, 169, 'Telefono de Contacto:');
    Page.SetFont(FontN, 9);
    Page.WriteText(62, 169, Inh.TelefonoResponsable);

    // ---------------------------------------------------------
    // SECCION 4: CONSTANCIA Y CERTIFICACION
    // ---------------------------------------------------------
    PDFDrawRect(Page, 15, 182, 180, 24, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_SLATE_DARK, False);
    Page.SetFont(FontI, 8);
    Page.WriteText(18, 188, 'Certifico que en el dia de la fecha se ha procedido a la cristiana sepultura de los restos mortales');
    Page.WriteText(18, 192, 'individualizados en la presente acta en el predio del Cementerio Parque San Nicolas, habiendose');
    Page.WriteText(18, 196, 'cumplimentado todas las disposiciones civiles, eclesiasticas y sanitarias pertinentes.');
    Page.WriteText(18, 200, 'Expedido para constancia del Archivo Parroquial de San Nicolas de Bari.');

    // ---------------------------------------------------------
    // AREA DE FIRMAS Y SELLOS
    // ---------------------------------------------------------
    // Firma Declarante
    PDFDrawLine(Page, 25, 238, 85, 238, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(28, 243, 'Firma Familiar / Declarante');
    Page.SetFont(FontN, 8);
    Page.WriteText(33, 247, 'Aclaracion y Documento DNI');

    // Firma Administracion
    PDFDrawLine(Page, 125, 238, 185, 238, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    Page.WriteText(128, 243, 'Administracion y Archivo Parroquial');
    Page.SetFont(FontN, 8);
    Page.WriteText(135, 247, 'Sello Oficial Cementerio Parque');

    // Pie de Pagina
    PDFDrawLine(Page, 15, 275, 195, 275, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    Page.WriteText(15, 279, 'Aeterna Suite XP - Parroquia San Nicolas de Bari - Sistema Registral Certificado');
    Page.WriteText(160, 279, 'Pagina 1 de 1 - Original');

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 2. FOLIO DEL LIBRO DE INHUMACIONES
// ----------------------------------------------------------------------------

procedure GenerarFolioInhumacionesPDF(const Lista: TInhumacionArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y, PaginaActual: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    PaginaActual := 1;
    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Libro Oficial Parroquial de Inhumaciones',
      'Folio Cronologico de Asientos Funerarios y Catastrales');

    // Barra de Resumen del Folio
    PDFDrawRect(Page, 15, 40, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 44.5, 'Total de Actas en este Registro: ' + IntToStr(Length(Lista)) + ' difuntos asentados.');
    Page.WriteText(145, 44.5, 'Folio Oficial Nro: ' + FormatDateTime('yyyy', Now) + '-01');

    // Cabecera Tabla Principal
    PDFDrawRect(Page, 15, 49, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(17, 54, 'FECHA');
    Page.WriteText(38, 54, 'APELLIDOS Y NOMBRES DEL DIFUNTO');
    Page.WriteText(106, 54, 'DNI');
    Page.WriteText(130, 54, 'PARCELA');
    Page.WriteText(154, 54, 'NIVEL');
    Page.WriteText(170, 54, 'PROTOCOLO');

    Y := 63;
    for i := Low(Lista) to High(Lista) do
    begin
      // Fondo alterno
      if (i mod 2 = 1) then
        PDFDrawRect(Page, 15, Y - 4.5, 180, 6.5, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontN, 7);
      Page.WriteText(17, Y, FormatearFecha(Lista[i].FechaInhumacion));

      Page.SetFont(FontH, 7);
      Page.WriteText(38, Y, Copy(Lista[i].NombreDifunto, 1, 35));

      Page.SetFont(FontN, 7);
      Page.WriteText(106, Y, Lista[i].DniDifunto);

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      Page.WriteText(130, Y, Lista[i].NomenclaturaParcela);

      Page.SetFont(FontN, 7);
      Page.SetColor(COL_TEXT_BLACK, False);
      Page.WriteText(157, Y, IntToStr(Lista[i].NivelPosicion));

      if Lista[i].EsCovid then
      begin
        Page.SetFont(FontH, 7);
        Page.SetColor(COL_GOLD, False);
        Page.WriteText(170, Y, 'COVID-19');
      end
      else
      begin
        Page.SetFont(FontN, 7);
        Page.SetColor(COL_GREEN_DARK, False);
        Page.WriteText(170, Y, 'Estandar');
      end;

      PDFDrawLine(Page, 15, Y + 2, 195, Y + 2, 0.3, COL_SLATE_LIGHT);
      Inc(Y, 7);

      if Y > 270 then
      begin
        // Pie de pagina
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        Page.WriteText(15, 282, 'Aeterna Suite XP - Libro Parroquial de Inhumaciones');
        Page.WriteText(170, 282, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Libro Oficial Parroquial de Inhumaciones (Continuacion)',
          'Folio Cronologico de Asientos Funerarios y Catastrales');

        // Repetir Cabecera Tabla
        PDFDrawRect(Page, 15, 42, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
        Page.SetColor(COL_WHITE, False);
        Page.SetFont(FontH, 8);
        Page.WriteText(17, 47, 'FECHA');
        Page.WriteText(38, 47, 'APELLIDOS Y NOMBRES DEL DIFUNTO');
        Page.WriteText(106, 47, 'DNI');
        Page.WriteText(130, 47, 'PARCELA');
        Page.WriteText(154, 47, 'NIVEL');
        Page.WriteText(170, 47, 'PROTOCOLO');

        Y := 56;
      end;
    end;

    // Pie de pagina final
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    Page.WriteText(15, 282, 'Aeterna Suite XP - Libro Parroquial de Inhumaciones');
    Page.WriteText(170, 282, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 3. RECIBO OFICIAL DE COBRANZA (DUPLICADO ORIGINAL + TALON)
// ----------------------------------------------------------------------------

procedure DibujarCuerpoRecibo(Page: TPDFPage; FontH, FontN: Integer; const Pago: TPagoMantenimiento; YBase: Single; const TituloCopia: string);
begin
  // Recuadro Principal
  PDFDrawRect(Page, 15, YBase, 180, 115, 0.8, True, True, COL_NAVY_DARK, COL_WHITE);

  // Barra Superior
  PDFDrawRect(Page, 15, YBase, 180, 10, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
  Page.SetColor(COL_WHITE, False);
  Page.SetFont(FontH, 8);
  Page.WriteText(18, YBase + 6, 'PARROQUIA SAN NICOLAS DE BARI - CEMENTERIO PARQUE SAN NICOLAS');
  Page.SetFont(FontH, 8);
  Page.WriteText(150, YBase + 6, '[' + TituloCopia + ']');

  // Linea Dorada
  PDFDrawLine(Page, 15, YBase + 10, 195, YBase + 10, 1.0, COL_GOLD);

  // Titulo y Numero de Recibo
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontH, 11);
  Page.WriteText(20, YBase + 18, 'RECIBO OFICIAL DE COBRANZA');

  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  Page.WriteText(20, YBase + 25, 'Comprobante Nro: ' + Pago.NroRecibo);
  Page.SetFont(FontN, 9);
  Page.WriteText(85, YBase + 25, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now));

  // Tarjeta Destacada de Importe
  PDFDrawRect(Page, 130, YBase + 14, 60, 16, 0.8, True, True, COL_NAVY_DARK, COL_BG_HEADER);
  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontH, 7);
  Page.WriteText(134, YBase + 19, 'TOTAL COBRADO:');
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontH, 12);
  Page.WriteText(134, YBase + 27, FormatearMoneda(Pago.MontoPagado));

  PDFDrawLine(Page, 20, YBase + 33, 190, YBase + 33, 0.5, COL_SLATE_LIGHT);

  // Datos del Pago
  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  Page.WriteText(20, YBase + 42, 'Recibimos de:');
  Page.SetFont(FontH, 10);
  Page.SetColor(COL_NAVY_DARK, False);
  Page.WriteText(55, YBase + 42, Pago.TitularNombre);

  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  Page.WriteText(20, YBase + 51, 'En Concepto de:');
  Page.SetFont(FontN, 9);
  Page.WriteText(55, YBase + 51, Pago.Observaciones);

  Page.SetFont(FontH, 9);
  Page.WriteText(20, YBase + 60, 'Periodo Imputado:');
  Page.SetFont(FontN, 9);
  Page.WriteText(55, YBase + 60, Pago.PeriodoCubierto);

  Page.SetFont(FontH, 9);
  Page.WriteText(20, YBase + 69, 'Metodo de Cobro:');
  Page.SetFont(FontN, 9);
  Page.WriteText(55, YBase + 69, MetodoPagoToStr(Pago.MetodoPago));

  Page.SetFont(FontH, 9);
  Page.WriteText(120, YBase + 69, 'Operador / Caja:');
  Page.SetFont(FontN, 9);
  Page.WriteText(150, YBase + 69, Pago.OperadorNombre);

  // Recuadro de Validez
  PDFDrawRect(Page, 20, YBase + 78, 100, 16, 0.3, True, True, COL_SLATE_LIGHT, COL_BG_ROW);
  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontN, 7);
  Page.WriteText(23, YBase + 83, 'Comprobante valido de pago emitido por el Sistema Integrado Aeterna.');
  Page.WriteText(23, YBase + 88, 'Conserve este comprobante como constancia oficial ante la Parroquia.');

  // Area de Firma
  PDFDrawLine(Page, 135, YBase + 98, 185, YBase + 98, 0.8, COL_SLATE_MED);
  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 8);
  Page.WriteText(140, YBase + 102, 'Firma y Sello Caja Central');
  Page.SetFont(FontN, 7);
  Page.WriteText(142, YBase + 106, 'Cementerio Parque San Nicolas');
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

    // 1. ORIGINAL (Para el Titular / Afiliado)
    DibujarCuerpoRecibo(Page, FontH, FontN, Pago, 12, 'ORIGINAL CONTRIBUYENTE');

    // Linea de Corte Perforada
    PDFDrawLine(Page, 15, 138, 195, 138, 0.6, COL_SLATE_MED);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontH, 7);
    Page.WriteText(75, 137, '- - - - - CORTE TALON ADMINISTRATIVO - - - - -');

    // 2. DUPLICADO (Para Archivo y Caja Parroquial)
    DibujarCuerpoRecibo(Page, FontH, FontN, Pago, 148, 'TALON ARCHIVO PARROQUIAL');

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 4. PLANILLA DE RUTA PARA COBRADOR
// ----------------------------------------------------------------------------

procedure GenerarPlanillaRutaPDF(const Afiliados: TAfiliadoArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y, PaginaActual: Integer;
  TotalCuotasRuta: Currency;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    PaginaActual := 1;
    TotalCuotasRuta := 0;
    for i := Low(Afiliados) to High(Afiliados) do
      TotalCuotasRuta := TotalCuotasRuta + Afiliados[i].MontoCuotaMensual;

    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Planilla de Ruta y Cobranza Domiciliaria',
      'Seguro Parroquial de Sepelios - Cobranza Mensual en Calle');

    // Resumen de Cobrador
    PDFDrawRect(Page, 15, 40, 180, 8, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 45, 'Cobrador Asignado: General / Oficial');
    Page.WriteText(85, 45, 'Zona: Rutas y Domicilios Chamical');
    Page.WriteText(150, 45, 'Total a Cobrar: ' + FormatearMoneda(TotalCuotasRuta));

    // Cabecera Tabla
    PDFDrawRect(Page, 15, 50, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(17, 55, 'NRO');
    Page.WriteText(32, 55, 'TITULAR DE AFILIACION');
    Page.WriteText(85, 55, 'DIRECCION DE COBRO');
    Page.WriteText(140, 55, 'ZONA');
    Page.WriteText(165, 55, 'CUOTA');
    Page.WriteText(182, 55, 'FIRMA');

    Y := 64;
    for i := Low(Afiliados) to High(Afiliados) do
    begin
      if (i mod 2 = 1) then
        PDFDrawRect(Page, 15, Y - 4.5, 180, 7.0, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontH, 7);
      Page.WriteText(17, Y, IntToStr(Afiliados[i].NumeroAfiliado));

      Page.WriteText(32, Y, Copy(Afiliados[i].NombreCompleto, 1, 30));

      Page.SetFont(FontN, 7);
      Page.WriteText(85, Y, Copy(Afiliados[i].DireccionCobro, 1, 32));
      Page.WriteText(140, Y, Copy(Afiliados[i].ZonaCobro, 1, 14));

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      Page.WriteText(165, Y, FormatearMoneda(Afiliados[i].MontoCuotaMensual));

      // Casilla para firma / tilde
      PDFDrawRect(Page, 182, Y - 3.5, 10, 5, 0.5, True, True, COL_SLATE_MED, COL_WHITE);

      PDFDrawLine(Page, 15, Y + 2.5, 195, Y + 2.5, 0.3, COL_SLATE_LIGHT);
      Inc(Y, 7);

      if Y > 265 then
      begin
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        Page.WriteText(15, 282, 'Aeterna Suite XP - Planilla Oficial de Cobranza');
        Page.WriteText(170, 282, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Planilla de Ruta y Cobranza Domiciliaria (Cont.)',
          'Seguro Parroquial de Sepelios - Cobranza Mensual en Calle');

        PDFDrawRect(Page, 15, 42, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
        Page.SetColor(COL_WHITE, False);
        Page.SetFont(FontH, 8);
        Page.WriteText(17, 47, 'NRO');
        Page.WriteText(32, 47, 'TITULAR DE AFILIACION');
        Page.WriteText(85, 47, 'DIRECCION DE COBRO');
        Page.WriteText(140, 47, 'ZONA');
        Page.WriteText(165, 47, 'CUOTA');
        Page.WriteText(182, 47, 'FIRMA');

        Y := 56;
      end;
    end;

    // Firmas de Cierre
    PDFDrawLine(Page, 25, 255, 80, 255, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(28, 260, 'Firma y Aclaracion Cobrador');

    PDFDrawLine(Page, 130, 255, 185, 255, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    Page.WriteText(133, 260, 'Recepcion y Control Tesoreria');

    // Pie
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    Page.WriteText(15, 282, 'Aeterna Suite XP - Planilla Oficial de Cobranza');
    Page.WriteText(170, 282, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 5. ACTA DE ARQUEO Y CIERRE DIARIO DE CAJA
// ----------------------------------------------------------------------------

procedure GenerarCierreCajaPDF(const Pagos: TPagoArray; TotalEf, TotalDig: Currency; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Y, PaginaActual: Integer;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    PaginaActual := 1;
    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Acta Notarial de Arqueo y Cierre Diario de Caja',
      'Control de Fondos y Rendicion de Cuentas - Cementerio Parque');

    // ---------------------------------------------------------
    // 3 TARJETAS KPI DE CIERRE FINANCIERO
    // ---------------------------------------------------------
    // Tarjeta 1: Efectivo
    PDFDrawRect(Page, 15, 41, 56, 20, 0.6, True, True, COL_GREEN_DARK, COL_BG_HEADER);
    Page.SetColor(COL_GREEN_DARK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 46, 'EFECTIVO EN CAJA:');
    Page.SetFont(FontH, 11);
    Page.WriteText(18, 54, FormatearMoneda(TotalEf));

    // Tarjeta 2: Digital / Transferencias
    PDFDrawRect(Page, 77, 41, 56, 20, 0.6, True, True, COL_NAVY_MED, COL_BG_HEADER);
    Page.SetColor(COL_NAVY_MED, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(80, 46, 'TRANSFERENCIAS / QR:');
    Page.SetFont(FontH, 11);
    Page.WriteText(80, 54, FormatearMoneda(TotalDig));

    // Tarjeta 3: Total General
    PDFDrawRect(Page, 139, 41, 56, 20, 0.8, True, True, COL_NAVY_DARK, COL_BG_HEADER);
    Page.SetColor(COL_GOLD, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(142, 46, 'TOTAL GENERAL RENDIDO:');
    Page.SetColor(COL_NAVY_DARK, False);
    Page.SetFont(FontH, 11);
    Page.WriteText(142, 54, FormatearMoneda(TotalEf + TotalDig));

    // Detalle de Comprobantes
    PDFDrawRect(Page, 15, 66, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(18, 70.5, 'DETALLE DE COMPROBANTES ASENTADOS EN LA FECHA:');

    // Cabecera Tabla
    PDFDrawRect(Page, 15, 72, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(17, 76.5, 'RECIBO');
    Page.WriteText(42, 76.5, 'TITULAR / PAGADOR');
    Page.WriteText(100, 76.5, 'CONCEPTO IMPUTADO');
    Page.WriteText(150, 76.5, 'METODO');
    Page.WriteText(175, 76.5, 'IMPORTE');

    Y := 85;
    for i := Low(Pagos) to High(Pagos) do
    begin
      if (i mod 2 = 1) then
        PDFDrawRect(Page, 15, Y - 4.5, 180, 6.5, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontH, 7);
      Page.WriteText(17, Y, Pagos[i].NroRecibo);

      Page.SetFont(FontN, 7);
      Page.WriteText(42, Y, Copy(Pagos[i].TitularNombre, 1, 30));
      Page.WriteText(100, Y, Copy(Pagos[i].Observaciones, 1, 28));
      Page.WriteText(150, Y, MetodoPagoToStr(Pagos[i].MetodoPago));

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      Page.WriteText(175, Y, FormatearMoneda(Pagos[i].MontoPagado));

      PDFDrawLine(Page, 15, Y + 2, 195, Y + 2, 0.3, COL_SLATE_LIGHT);
      Inc(Y, 7);

      if Y > 245 then
      begin
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        Page.WriteText(15, 282, 'Aeterna Suite XP - Acta Notarial de Cierre de Caja');
        Page.WriteText(170, 282, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Acta Notarial de Cierre Diario de Caja (Cont.)',
          'Control de Fondos y Rendicion de Cuentas - Cementerio Parque');

        PDFDrawRect(Page, 15, 42, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
        Page.SetColor(COL_TEXT_BLACK, False);
        Page.SetFont(FontH, 8);
        Page.WriteText(17, 46.5, 'RECIBO');
        Page.WriteText(42, 46.5, 'TITULAR / PAGADOR');
        Page.WriteText(100, 46.5, 'CONCEPTO IMPUTADO');
        Page.WriteText(150, 46.5, 'METODO');
        Page.WriteText(175, 46.5, 'IMPORTE');

        Y := 55;
      end;
    end;

    // Declaracion de Arqueo
    PDFDrawRect(Page, 15, 246, 180, 14, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_ROW);
    Page.SetColor(COL_SLATE_DARK, False);
    Page.SetFont(FontN, 7);
    Page.WriteText(18, 251, 'Se certifica que en el dia de la fecha se ha realizado el arqueo fisico y digital de caja,');
    Page.WriteText(18, 256, 'coincidiendo los valores rendidos con los comprobantes asentados en el sistema.');

    // Firmas
    PDFDrawLine(Page, 25, 273, 85, 273, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    Page.WriteText(30, 277, 'Firma Cajero de Turno');

    PDFDrawLine(Page, 125, 273, 185, 273, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    Page.WriteText(130, 277, 'Firma Tesoreria / Parroquia');

    // Pie
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    Page.WriteText(15, 283, 'Aeterna Suite XP - Acta Notarial de Cierre de Caja');
    Page.WriteText(170, 283, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

end.
