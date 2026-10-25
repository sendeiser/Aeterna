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
procedure GenerarListadoParcelasPDF(const Parcelas: TParcelaArray; const OutputPath: string);

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
// Sanitizacion de Caracteres para PDF Type 1 Standard (Evita '?' y mojibake)
// ----------------------------------------------------------------------------

function SanitizePDFText(const S: string): string;
var
  i: Integer;
  c: Char;
  Res: string;
begin
  Res := '';
  i := 1;
  while i <= Length(S) do
  begin
    // Reemplazo de caracteres multi-byte UTF-8 acentuados
    if (i < Length(S)) and (Byte(S[i]) = $C3) then
    begin
      case Byte(S[i+1]) of
        $A1: Res := Res + 'a'; // á
        $A9: Res := Res + 'e'; // é
        $AD: Res := Res + 'i'; // í
        $B3: Res := Res + 'o'; // ó
        $BA: Res := Res + 'u'; // ú
        $BC: Res := Res + 'u'; // ü
        $B1: Res := Res + 'n'; // ñ
        $81: Res := Res + 'A'; // Á
        $89: Res := Res + 'E'; // É
        $8D: Res := Res + 'I'; // Í
        $93: Res := Res + 'O'; // Ó
        $9A: Res := Res + 'U'; // Ú
        $9C: Res := Res + 'U'; // Ü
        $91: Res := Res + 'N'; // Ñ
      else
        Res := Res + ' ';
      end;
      Inc(i, 2);
    end
    else
    begin
      c := S[i];
      case Byte(c) of
        $E1, $E0, $E2, $E4: Res := Res + 'a';
        $E9, $E8, $EA, $EB: Res := Res + 'e';
        $ED, $EC, $EE, $EF: Res := Res + 'i';
        $F3, $F2, $F4, $F6: Res := Res + 'o';
        $FA, $F9, $FB, $FC: Res := Res + 'u';
        $F1: Res := Res + 'n';
        $C1, $C0, $C2, $C4: Res := Res + 'A';
        $C9, $C8, $CA, $CB: Res := Res + 'E';
        $CD, $CC, $CE, $CF: Res := Res + 'I';
        $D3, $D2, $D4, $D6: Res := Res + 'O';
        $DA, $D9, $DB, $DC: Res := Res + 'U';
        $D1: Res := Res + 'N';
        32..126: Res := Res + c;
      else
        // Omitir bytes no imprimibles
      end;
      Inc(i);
    end;
  end;
  Result := Trim(Res);
end;

function BoolToTexto(Cond: Boolean; const Si, No: string): string;
begin
  if Cond then Result := Si else Result := No;
end;

// ----------------------------------------------------------------------------
// Primitivas Graficas Vectoriales PDF con Coordenadas Naturales Top-Down
// ----------------------------------------------------------------------------

procedure PDFDrawLineTop(Page: TPDFPage; X1, TopY1, X2, TopY2: Single; LineWidth: Single; Color: LongWord);
begin
  Page.SetColor(Color, True);
  Page.DrawLine(X1, 297.0 - TopY1, X2, 297.0 - TopY2, LineWidth, True);
end;

procedure PDFDrawRectTop(Page: TPDFPage; X, TopY, W, H: Single; LineWidth: Single; DoFill, DoStroke: Boolean; StrokeColor, FillColor: LongWord);
begin
  if DoStroke then Page.SetColor(StrokeColor, True);
  if DoFill then Page.SetColor(FillColor, False);
  Page.DrawRect(X, 297.0 - TopY - H, W, H, LineWidth, DoFill, DoStroke, 0);
end;

procedure PDFWriteTextTop(Page: TPDFPage; X, TopY: Single; const Text: string);
begin
  Page.WriteText(X, 297.0 - TopY, SanitizePDFText(Text));
end;

procedure ConfigurarEncabezadoInstitucional(Page: TPDFPage; FontTitle, FontNormal, FontBold: Integer; const TituloDoc, SubtituloDoc: string);
begin
  // Barra Superior Azul Marino Institucional (TopY: 10 a 22 mm)
  PDFDrawRectTop(Page, 15, 10, 180, 12, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
  Page.SetColor(COL_WHITE, False);
  Page.SetFont(FontBold, 8);
  PDFWriteTextTop(Page, 18, 14.5, 'DIOCESIS DE SAN NICOLAS DE LOS ARROYOS - PARROQUIA SAN NICOLAS DE BARI');
  Page.SetFont(FontNormal, 7);
  PDFWriteTextTop(Page, 18, 18.5, 'Cementerio Parque San Nicolas - Sistema Integrado de Administracion General');

  // Fecha y Estado Oficial en el extremo derecho superior (sin interferir con el titulo)
  Page.SetFont(FontBold, 8);
  PDFWriteTextTop(Page, 148, 14.5, 'FECHA: ' + FormatDateTime('dd/mm/yyyy', Now));
  Page.SetFont(FontNormal, 7);
  PDFWriteTextTop(Page, 148, 18.5, 'DOCUMENTO OFICIAL VALIDO');

  // Linea Dorada de Acento
  PDFDrawLineTop(Page, 15, 22.5, 195, 22.5, 1.2, COL_GOLD);

  // Recuadro del Titulo del Documento (TopY: 24 a 38 mm)
  PDFDrawRectTop(Page, 15, 24, 180, 14, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontTitle, 10);
  PDFWriteTextTop(Page, 18, 30, UpperCase(TituloDoc));

  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontNormal, 7);
  PDFWriteTextTop(Page, 18, 35, SubtituloDoc);

  PDFDrawLineTop(Page, 15, 38.5, 195, 38.5, 0.5, COL_SLATE_MED);
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

    // Encabezado Institucional en el TOP
    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Acta Notarial de Inhumacion y Registro Eclesiastico',
      'Libro Oficial Parroquial de Defunciones e Inhumaciones');

    // ---------------------------------------------------------
    // SECCION 1: DATOS CIVILES DEL DIFUNTO (TopY: 42..88)
    // ---------------------------------------------------------
    PDFDrawRectTop(Page, 15, 42, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 46.5, '1. IDENTIFICACION REGISTRAL Y CIVIL DEL DIFUNTO');

    PDFDrawRectTop(Page, 15, 48, 180, 40, 0.5, True, True, COL_SLATE_LIGHT, COL_WHITE);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 55, 'Apellidos y Nombres:');
    Page.SetFont(FontH, 11);
    Page.SetColor(COL_NAVY_DARK, False);
    PDFWriteTextTop(Page, 62, 55, Inh.NombreDifunto);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 63, 'Documento Nacional (DNI):');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 62, 63, BoolToTexto(Trim(Inh.DniDifunto) <> '', Inh.DniDifunto, 'S/D (Sin Documento)'));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 71, 'Fecha de Fallecimiento:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 62, 71, FormatearFecha(Inh.FechaFallecimiento));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 115, 71, 'Fecha Inhumacion:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 150, 71, FormatearFecha(Inh.FechaInhumacion));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 79, 'Causa de Defuncion:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 62, 79, BoolToTexto(Trim(Inh.CausaDefuncion) <> '', Inh.CausaDefuncion, 'Consta en Certificado Medico'));

    // ---------------------------------------------------------
    // SECCION 2: UBICACION CATASTRAL (TopY: 92..136)
    // ---------------------------------------------------------
    PDFDrawRectTop(Page, 15, 92, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 96.5, '2. ASIGNACION CATASTRAL Y DESTINO FINAL EN CEMENTERIO PARQUE');

    PDFDrawRectTop(Page, 15, 98, 180, 36, 0.5, True, True, COL_SLATE_LIGHT, COL_WHITE);

    // Badge Parcela
    PDFDrawRectTop(Page, 20, 103, 62, 26, 0.8, True, True, COL_NAVY_DARK, COL_BG_HEADER);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontH, 7);
    PDFWriteTextTop(Page, 23, 108, 'PARCELA ASIGNADA:');
    Page.SetColor(COL_NAVY_DARK, False);
    Page.SetFont(FontH, 14);
    PDFWriteTextTop(Page, 23, 120, BoolToTexto(Trim(Inh.NomenclaturaParcela) <> '', Inh.NomenclaturaParcela, 'S/P (A Asignar)'));

    // Datos Ubicación
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 90, 108, 'Nivel / Posicion:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 130, 108, 'Nivel ' + IntToStr(Inh.NivelPosicion) + ' (Bajo Tierra)');

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 90, 116, 'Sector Asignado:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 130, 116, 'Sector General Parque San Nicolas');

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 90, 124, 'Regimen Juridico:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 130, 124, 'Concesion a Perpetuidad / Notarial');

    // ---------------------------------------------------------
    // SECCION 3: OPERACION FUNERARIA (TopY: 138..180)
    // ---------------------------------------------------------
    PDFDrawRectTop(Page, 15, 138, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 142.5, '3. OPERACION FUNERARIA Y RESPONSABILIDAD REGISTRAL');

    PDFDrawRectTop(Page, 15, 144, 180, 36, 0.5, True, True, COL_SLATE_LIGHT, COL_WHITE);

    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 152, 'Empresa de Sepelios:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 62, 152, BoolToTexto(Trim(Inh.EmpresaFunebrera) <> '', Inh.EmpresaFunebrera, 'Aeterna Sepelios'));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 160, 'Familiar / Declarante:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 62, 160, BoolToTexto(Trim(Inh.NombreResponsable) <> '', Inh.NombreResponsable, 'Familiar Directo'));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 115, 160, 'Telefono:');
    Page.SetFont(FontN, 9);
    PDFWriteTextTop(Page, 145, 160, BoolToTexto(Trim(Inh.TelefonoResponsable) <> '', Inh.TelefonoResponsable, '-'));

    Page.SetFont(FontH, 9);
    PDFWriteTextTop(Page, 20, 168, 'Protocolo Sanitario:');
    if Inh.EsCovid then
    begin
      Page.SetFont(FontH, 9);
      Page.SetColor(COL_GOLD, False);
      PDFWriteTextTop(Page, 62, 168, 'PROTOCOLO ESPECIAL COVID-19 (Fallecido Infeccioso)');
    end
    else
    begin
      Page.SetFont(FontN, 9);
      Page.SetColor(COL_GREEN_DARK, False);
      PDFWriteTextTop(Page, 62, 168, 'Protocolo Sanitario Ordinario Cumplimentado');
    end;

    // ---------------------------------------------------------
    // SECCION 4: CONSTANCIA Y CERTIFICACION (TopY: 184..212)
    // ---------------------------------------------------------
    PDFDrawRectTop(Page, 15, 184, 180, 26, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_SLATE_DARK, False);
    Page.SetFont(FontI, 8);
    PDFWriteTextTop(Page, 18, 190, 'Certifico que en el dia de la fecha se ha procedido a la cristiana sepultura de los restos mortales');
    PDFWriteTextTop(Page, 18, 195, 'individualizados en la presente acta en el predio del Cementerio Parque San Nicolas, habiendose');
    PDFWriteTextTop(Page, 18, 200, 'cumplimentado todas las disposiciones civiles, eclesiasticas y sanitarias pertinentes.');
    PDFWriteTextTop(Page, 18, 205, 'Expedido para constancia del Archivo Parroquial de San Nicolas de Bari.');

    // ---------------------------------------------------------
    // AREA DE FIRMAS Y SELLOS (TopY: 232..255)
    // ---------------------------------------------------------
    PDFDrawLineTop(Page, 25, 235, 85, 235, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 28, 240, 'Firma Familiar / Declarante');
    Page.SetFont(FontN, 8);
    PDFWriteTextTop(Page, 33, 245, 'Aclaracion y Documento DNI');

    PDFDrawLineTop(Page, 125, 235, 185, 235, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 128, 240, 'Administracion y Archivo Parroquial');
    Page.SetFont(FontN, 8);
    PDFWriteTextTop(Page, 135, 245, 'Sello Oficial Cementerio Parque');

    // Pie de Pagina
    PDFDrawLineTop(Page, 15, 280, 195, 280, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 15, 284, 'Aeterna Suite XP - Parroquia San Nicolas de Bari - Sistema Registral Certificado');
    PDFWriteTextTop(Page, 160, 284, 'Pagina 1 de 1 - Original');

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
  i, PaginaActual: Integer;
  TopY: Single;
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
    PDFDrawRectTop(Page, 15, 41, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 46, 'Total de Actas en este Registro: ' + IntToStr(Length(Lista)) + ' difuntos asentados.');
    PDFWriteTextTop(Page, 145, 46, 'Folio Oficial Nro: ' + FormatDateTime('yyyy', Now) + '-01');

    // Cabecera Tabla Principal
    PDFDrawRectTop(Page, 15, 49, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 17, 54.5, 'FECHA');
    PDFWriteTextTop(Page, 38, 54.5, 'APELLIDOS Y NOMBRES DEL DIFUNTO');
    PDFWriteTextTop(Page, 106, 54.5, 'DNI');
    PDFWriteTextTop(Page, 130, 54.5, 'PARCELA');
    PDFWriteTextTop(Page, 154, 54.5, 'NIVEL');
    PDFWriteTextTop(Page, 170, 54.5, 'PROTOCOLO');

    TopY := 58;
    for i := Low(Lista) to High(Lista) do
    begin
      // Fondo alterno
      if (i mod 2 = 1) then
        PDFDrawRectTop(Page, 15, TopY, 180, 6.5, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 17, TopY + 4.8, FormatearFecha(Lista[i].FechaInhumacion));

      Page.SetFont(FontH, 7);
      PDFWriteTextTop(Page, 38, TopY + 4.8, Copy(SanitizePDFText(Lista[i].NombreDifunto), 1, 35));

      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 106, TopY + 4.8, BoolToTexto(Trim(Lista[i].DniDifunto) <> '', Lista[i].DniDifunto, 'S/D'));

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      PDFWriteTextTop(Page, 130, TopY + 4.8, BoolToTexto(Trim(Lista[i].NomenclaturaParcela) <> '', Lista[i].NomenclaturaParcela, 'S/P'));

      Page.SetFont(FontN, 7);
      Page.SetColor(COL_TEXT_BLACK, False);
      PDFWriteTextTop(Page, 157, TopY + 4.8, IntToStr(Lista[i].NivelPosicion));

      if Lista[i].EsCovid then
      begin
        Page.SetFont(FontH, 7);
        Page.SetColor(COL_GOLD, False);
        PDFWriteTextTop(Page, 170, TopY + 4.8, 'COVID-19');
      end
      else
      begin
        Page.SetFont(FontN, 7);
        Page.SetColor(COL_GREEN_DARK, False);
        PDFWriteTextTop(Page, 170, TopY + 4.8, 'Estandar');
      end;

      PDFDrawLineTop(Page, 15, TopY + 6.5, 195, TopY + 6.5, 0.3, COL_SLATE_LIGHT);
      TopY := TopY + 6.5;

      if TopY > 265 then
      begin
        // Pie de pagina
        PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Libro Parroquial de Inhumaciones');
        PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

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
        PDFDrawRectTop(Page, 15, 41, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
        Page.SetColor(COL_WHITE, False);
        Page.SetFont(FontH, 8);
        PDFWriteTextTop(Page, 17, 46.5, 'FECHA');
        PDFWriteTextTop(Page, 38, 46.5, 'APELLIDOS Y NOMBRES DEL DIFUNTO');
        PDFWriteTextTop(Page, 106, 46.5, 'DNI');
        PDFWriteTextTop(Page, 130, 46.5, 'PARCELA');
        PDFWriteTextTop(Page, 154, 46.5, 'NIVEL');
        PDFWriteTextTop(Page, 170, 46.5, 'PROTOCOLO');

        TopY := 51;
      end;
    end;

    // Pie de pagina final
    PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Libro Parroquial de Inhumaciones');
    PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 3. RECIBO OFICIAL DE COBRANZA (DUPLICADO ORIGINAL + TALON)
// ----------------------------------------------------------------------------

procedure DibujarCuerpoRecibo(Page: TPDFPage; FontH, FontN: Integer; const Pago: TPagoMantenimiento; TopYBase: Single; const TituloCopia: string);
begin
  // Recuadro Principal
  PDFDrawRectTop(Page, 15, TopYBase, 180, 115, 0.8, True, True, COL_NAVY_DARK, COL_WHITE);

  // Barra Superior
  PDFDrawRectTop(Page, 15, TopYBase, 180, 10, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
  Page.SetColor(COL_WHITE, False);
  Page.SetFont(FontH, 8);
  PDFWriteTextTop(Page, 18, TopYBase + 6.5, 'PARROQUIA SAN NICOLAS DE BARI - CEMENTERIO PARQUE SAN NICOLAS');
  Page.SetFont(FontH, 8);
  PDFWriteTextTop(Page, 150, TopYBase + 6.5, '[' + TituloCopia + ']');

  // Linea Dorada
  PDFDrawLineTop(Page, 15, TopYBase + 10, 195, TopYBase + 10, 1.0, COL_GOLD);

  // Titulo y Numero de Recibo
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontH, 11);
  PDFWriteTextTop(Page, 20, TopYBase + 18, 'RECIBO OFICIAL DE COBRANZA');

  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 20, TopYBase + 25, 'Comprobante Nro: ' + Pago.NroRecibo);
  Page.SetFont(FontN, 9);
  PDFWriteTextTop(Page, 85, TopYBase + 25, 'Fecha: ' + FormatDateTime('dd/mm/yyyy', Now));

  // Tarjeta Destacada de Importe
  PDFDrawRectTop(Page, 130, TopYBase + 14, 60, 16, 0.8, True, True, COL_NAVY_DARK, COL_BG_HEADER);
  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontH, 7);
  PDFWriteTextTop(Page, 134, TopYBase + 19, 'TOTAL COBRADO:');
  Page.SetColor(COL_NAVY_DARK, False);
  Page.SetFont(FontH, 12);
  PDFWriteTextTop(Page, 134, TopYBase + 27, FormatearMoneda(Pago.MontoPagado));

  PDFDrawLineTop(Page, 20, TopYBase + 33, 190, TopYBase + 33, 0.5, COL_SLATE_LIGHT);

  // Datos del Pago
  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 20, TopYBase + 42, 'Recibimos de:');
  Page.SetFont(FontH, 10);
  Page.SetColor(COL_NAVY_DARK, False);
  PDFWriteTextTop(Page, 55, TopYBase + 42, Pago.TitularNombre);

  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 20, TopYBase + 51, 'En Concepto de:');
  Page.SetFont(FontN, 9);
  PDFWriteTextTop(Page, 55, TopYBase + 51, Pago.Observaciones);

  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 20, TopYBase + 60, 'Periodo Imputado:');
  Page.SetFont(FontN, 9);
  PDFWriteTextTop(Page, 55, TopYBase + 60, Pago.PeriodoCubierto);

  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 20, TopYBase + 69, 'Metodo de Cobro:');
  Page.SetFont(FontN, 9);
  PDFWriteTextTop(Page, 55, TopYBase + 69, MetodoPagoToStr(Pago.MetodoPago));

  Page.SetFont(FontH, 9);
  PDFWriteTextTop(Page, 120, TopYBase + 69, 'Operador / Caja:');
  Page.SetFont(FontN, 9);
  PDFWriteTextTop(Page, 150, TopYBase + 69, Pago.OperadorNombre);

  // Recuadro de Validez
  PDFDrawRectTop(Page, 20, TopYBase + 78, 100, 16, 0.3, True, True, COL_SLATE_LIGHT, COL_BG_ROW);
  Page.SetColor(COL_SLATE_MED, False);
  Page.SetFont(FontN, 7);
  PDFWriteTextTop(Page, 23, TopYBase + 84, 'Comprobante valido de pago emitido por el Sistema Integrado Aeterna.');
  PDFWriteTextTop(Page, 23, TopYBase + 89, 'Conserve este comprobante como constancia oficial ante la Parroquia.');

  // Area de Firma
  PDFDrawLineTop(Page, 135, TopYBase + 98, 185, TopYBase + 98, 0.8, COL_SLATE_MED);
  Page.SetColor(COL_TEXT_BLACK, False);
  Page.SetFont(FontH, 8);
  PDFWriteTextTop(Page, 140, TopYBase + 103, 'Firma y Sello Caja Central');
  Page.SetFont(FontN, 7);
  PDFWriteTextTop(Page, 142, TopYBase + 107, 'Cementerio Parque San Nicolas');
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

    // Linea de Corte Perforada (TopY: 138 mm)
    PDFDrawLineTop(Page, 15, 138, 195, 138, 0.6, COL_SLATE_MED);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontH, 7);
    PDFWriteTextTop(Page, 75, 136.5, '- - - - - CORTE TALON ADMINISTRATIVO - - - - -');

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
  i, PaginaActual: Integer;
  TopY: Single;
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

    // Resumen de Cobrador (TopY: 41..48 mm)
    PDFDrawRectTop(Page, 15, 41, 180, 8, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 46, 'Cobrador Asignado: General / Oficial');
    PDFWriteTextTop(Page, 85, 46, 'Zona: Rutas y Domicilios Chamical');
    PDFWriteTextTop(Page, 150, 46, 'Total a Cobrar: ' + FormatearMoneda(TotalCuotasRuta));

    // Cabecera Tabla (TopY: 50..58 mm)
    PDFDrawRectTop(Page, 15, 50, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 17, 55.5, 'NRO');
    PDFWriteTextTop(Page, 32, 55.5, 'TITULAR DE AFILIACION');
    PDFWriteTextTop(Page, 85, 55.5, 'DIRECCION DE COBRO');
    PDFWriteTextTop(Page, 140, 55.5, 'ZONA');
    PDFWriteTextTop(Page, 165, 55.5, 'CUOTA');
    PDFWriteTextTop(Page, 182, 55.5, 'FIRMA');

    TopY := 59;
    for i := Low(Afiliados) to High(Afiliados) do
    begin
      if (i mod 2 = 1) then
        PDFDrawRectTop(Page, 15, TopY, 180, 7.0, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontH, 7);
      PDFWriteTextTop(Page, 17, TopY + 5, IntToStr(Afiliados[i].NumeroAfiliado));

      PDFWriteTextTop(Page, 32, TopY + 5, Copy(SanitizePDFText(Afiliados[i].NombreCompleto), 1, 30));

      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 85, TopY + 5, Copy(SanitizePDFText(Afiliados[i].DireccionCobro), 1, 32));
      PDFWriteTextTop(Page, 140, TopY + 5, Copy(SanitizePDFText(Afiliados[i].ZonaCobro), 1, 14));

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      PDFWriteTextTop(Page, 165, TopY + 5, FormatearMoneda(Afiliados[i].MontoCuotaMensual));

      // Casilla para firma / tilde
      PDFDrawRectTop(Page, 182, TopY + 1, 10, 5, 0.5, True, True, COL_SLATE_MED, COL_WHITE);

      PDFDrawLineTop(Page, 15, TopY + 7, 195, TopY + 7, 0.3, COL_SLATE_LIGHT);
      TopY := TopY + 7;

      if TopY > 248 then
      begin
        PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Planilla Oficial de Cobranza');
        PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Planilla de Ruta y Cobranza Domiciliaria (Cont.)',
          'Seguro Parroquial de Sepelios - Cobranza Mensual en Calle');

        PDFDrawRectTop(Page, 15, 41, 180, 8, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
        Page.SetColor(COL_WHITE, False);
        Page.SetFont(FontH, 8);
        PDFWriteTextTop(Page, 17, 46.5, 'NRO');
        PDFWriteTextTop(Page, 32, 46.5, 'TITULAR DE AFILIACION');
        PDFWriteTextTop(Page, 85, 46.5, 'DIRECCION DE COBRO');
        PDFWriteTextTop(Page, 140, 46.5, 'ZONA');
        PDFWriteTextTop(Page, 165, 46.5, 'CUOTA');
        PDFWriteTextTop(Page, 182, 46.5, 'FIRMA');

        TopY := 51;
      end;
    end;

    // Firmas de Cierre
    PDFDrawLineTop(Page, 25, 258, 80, 258, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 28, 263, 'Firma y Aclaracion Cobrador');

    PDFDrawLineTop(Page, 130, 258, 185, 258, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 133, 263, 'Recepcion y Control Tesoreria');

    // Pie
    PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Planilla Oficial de Cobranza');
    PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

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
  i, PaginaActual: Integer;
  TopY: Single;
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
    // 3 TARJETAS KPI DE CIERRE FINANCIERO (TopY: 41..61 mm)
    // ---------------------------------------------------------
    // Tarjeta 1: Efectivo
    PDFDrawRectTop(Page, 15, 41, 56, 20, 0.6, True, True, COL_GREEN_DARK, COL_BG_HEADER);
    Page.SetColor(COL_GREEN_DARK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 47, 'EFECTIVO EN CAJA:');
    Page.SetFont(FontH, 11);
    PDFWriteTextTop(Page, 18, 56, FormatearMoneda(TotalEf));

    // Tarjeta 2: Digital / Transferencias
    PDFDrawRectTop(Page, 77, 41, 56, 20, 0.6, True, True, COL_NAVY_MED, COL_BG_HEADER);
    Page.SetColor(COL_NAVY_MED, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 80, 47, 'TRANSFERENCIAS / QR:');
    Page.SetFont(FontH, 11);
    PDFWriteTextTop(Page, 80, 56, FormatearMoneda(TotalDig));

    // Tarjeta 3: Total General
    PDFDrawRectTop(Page, 139, 41, 56, 20, 0.8, True, True, COL_NAVY_DARK, COL_BG_HEADER);
    Page.SetColor(COL_GOLD, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 142, 47, 'TOTAL GENERAL RENDIDO:');
    Page.SetColor(COL_NAVY_DARK, False);
    Page.SetFont(FontH, 11);
    PDFWriteTextTop(Page, 142, 56, FormatearMoneda(TotalEf + TotalDig));

    // Detalle de Comprobantes (TopY: 64..70 mm)
    PDFDrawRectTop(Page, 15, 64, 180, 6, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 68.5, 'DETALLE DE COMPROBANTES ASENTADOS EN LA FECHA:');

    // Cabecera Tabla (TopY: 71..78 mm)
    PDFDrawRectTop(Page, 15, 71, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 17, 76, 'RECIBO');
    PDFWriteTextTop(Page, 42, 76, 'TITULAR / PAGADOR');
    PDFWriteTextTop(Page, 100, 76, 'CONCEPTO IMPUTADO');
    PDFWriteTextTop(Page, 150, 76, 'METODO');
    PDFWriteTextTop(Page, 175, 76, 'IMPORTE');

    TopY := 80;
    for i := Low(Pagos) to High(Pagos) do
    begin
      if (i mod 2 = 1) then
        PDFDrawRectTop(Page, 15, TopY, 180, 6.5, 0.3, True, False, COL_BG_ROW, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontH, 7);
      PDFWriteTextTop(Page, 17, TopY + 4.8, Pagos[i].NroRecibo);

      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 42, TopY + 4.8, Copy(SanitizePDFText(Pagos[i].TitularNombre), 1, 30));
      PDFWriteTextTop(Page, 100, TopY + 4.8, Copy(SanitizePDFText(Pagos[i].Observaciones), 1, 28));
      PDFWriteTextTop(Page, 150, TopY + 4.8, MetodoPagoToStr(Pagos[i].MetodoPago));

      Page.SetFont(FontH, 7);
      Page.SetColor(COL_NAVY_DARK, False);
      PDFWriteTextTop(Page, 175, TopY + 4.8, FormatearMoneda(Pagos[i].MontoPagado));

      PDFDrawLineTop(Page, 15, TopY + 6.5, 195, TopY + 6.5, 0.3, COL_SLATE_LIGHT);
      TopY := TopY + 6.5;

      if TopY > 230 then
      begin
        PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Acta Notarial de Cierre de Caja');
        PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Acta Notarial de Cierre Diario de Caja (Cont.)',
          'Control de Fondos y Rendicion de Cuentas - Cementerio Parque');

        PDFDrawRectTop(Page, 15, 41, 180, 7, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_HEADER);
        Page.SetColor(COL_TEXT_BLACK, False);
        Page.SetFont(FontH, 8);
        PDFWriteTextTop(Page, 17, 46, 'RECIBO');
        PDFWriteTextTop(Page, 42, 46, 'TITULAR / PAGADOR');
        PDFWriteTextTop(Page, 100, 46, 'CONCEPTO IMPUTADO');
        PDFWriteTextTop(Page, 150, 46, 'METODO');
        PDFWriteTextTop(Page, 175, 46, 'IMPORTE');

        TopY := 50;
      end;
    end;

    // Declaracion de Arqueo (TopY: 238..252 mm)
    PDFDrawRectTop(Page, 15, 238, 180, 14, 0.5, True, True, COL_SLATE_LIGHT, COL_BG_ROW);
    Page.SetColor(COL_SLATE_DARK, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 18, 243, 'Se certifica que en el dia de la fecha se ha realizado el arqueo fisico y digital de caja,');
    PDFWriteTextTop(Page, 18, 248, 'coincidiendo los valores rendidos con los comprobantes asentados en el sistema.');

    // Firmas (TopY: 258..272 mm)
    PDFDrawLineTop(Page, 25, 260, 85, 260, 0.8, COL_SLATE_MED);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 30, 265, 'Firma Cajero de Turno');

    PDFDrawLineTop(Page, 125, 260, 185, 260, 0.8, COL_SLATE_MED);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 130, 265, 'Firma Tesoreria / Parroquia');

    // Pie
    PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Acta Notarial de Cierre de Caja');
    PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

// ----------------------------------------------------------------------------
// 6. PADRON GENERAL DE PARCELAS Y CATASTRO COMPLETO
// ----------------------------------------------------------------------------

procedure GenerarListadoParcelasPDF(const Parcelas: TParcelaArray; const OutputPath: string);
var
  Doc: TPDFDocument;
  Section: TPDFSection;
  Page: TPDFPage;
  FontH, FontN: Integer;
  i, Total, PaginaActual, Ocupadas, EnMora, Disponibles: Integer;
  TotalDeuda: Currency;
  TopY: Single;
  NomTitular, EstadoStr: string;
begin
  Doc := TPDFDocument.Create(nil);
  try
    Doc.StartDocument;
    Section := Doc.Sections.AddSection;

    FontH := Doc.AddFont('Helvetica-Bold');
    FontN := Doc.AddFont('Helvetica');

    Total := Length(Parcelas);
    Ocupadas := 0;
    EnMora := 0;
    Disponibles := 0;
    TotalDeuda := 0;
    for i := 0 to Total - 1 do
    begin
      case Parcelas[i].Estado of
        epOcupada: Inc(Ocupadas);
        epEnMora: Inc(EnMora);
        epDisponible: Inc(Disponibles);
      end;
      TotalDeuda := TotalDeuda + Parcelas[i].SaldoMantenimiento;
    end;

    PaginaActual := 1;
    Page := Doc.Pages.AddPage;
    Page.PaperType := ptA4;
    Page.Orientation := ppoPortrait;
    Page.UnitOfMeasure := uomMillimeters;
    Section.AddPage(Page);

    ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
      'Padron General de Parcelas',
      'Registro Notarial de Concesiones, Estado Ocupacional y Mantenimiento');

    // Barra de Resumen Estadistico Ejecutivo (TopY: 41..49)
    PDFDrawRectTop(Page, 15, 41, 180, 8, 0.5, True, True, COL_SLATE_MED, COL_BG_ROW);
    Page.SetColor(COL_TEXT_BLACK, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 18, 46, Format('TOTAL: %d Parcelas  |  Ocupadas: %d  |  En Mora: %d  |  Disponibles: %d  |  Deuda Mantenimiento: %s',
      [Total, Ocupadas, EnMora, Disponibles, FormatearMoneda(TotalDeuda)]));

    // Cabecera de la Tabla (TopY: 51..58)
    PDFDrawRectTop(Page, 15, 51, 180, 7, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
    Page.SetColor(COL_WHITE, False);
    Page.SetFont(FontH, 8);
    PDFWriteTextTop(Page, 17, 56, 'PARCELA');
    PDFWriteTextTop(Page, 40, 56, 'SEC');
    PDFWriteTextTop(Page, 50, 56, 'MZ/FIL');
    PDFWriteTextTop(Page, 65, 56, 'NRO');
    PDFWriteTextTop(Page, 78, 56, 'ESTADO');
    PDFWriteTextTop(Page, 98, 56, 'CAPAC.');
    PDFWriteTextTop(Page, 114, 56, 'TITULAR DE LA CONCESION');
    PDFWriteTextTop(Page, 168, 56, 'SALDO DEUDA');

    TopY := 58;

    for i := 0 to Total - 1 do
    begin
      // Filas alternas
      if (i mod 2 = 1) then
        PDFDrawRectTop(Page, 15, TopY, 180, 6, 0, True, False, 0, COL_BG_ROW);

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontH, 8);
      PDFWriteTextTop(Page, 17, TopY + 4.5, Parcelas[i].Nomenclatura);

      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 41, TopY + 4.5, Parcelas[i].SectorId);
      PDFWriteTextTop(Page, 52, TopY + 4.5, Parcelas[i].ManzanaFila);
      PDFWriteTextTop(Page, 66, TopY + 4.5, Parcelas[i].NumeroParcela);

      EstadoStr := EstadoParcelaToStr(Parcelas[i].Estado);
      if Parcelas[i].Estado = epEnMora then
        Page.SetColor(COL_GOLD, False)
      else if Parcelas[i].Estado = epOcupada then
        Page.SetColor(COL_NAVY_DARK, False)
      else if Parcelas[i].Estado = epDisponible then
        Page.SetColor(COL_GREEN_DARK, False)
      else
        Page.SetColor(COL_SLATE_MED, False);
      Page.SetFont(FontH, 7);
      PDFWriteTextTop(Page, 78, TopY + 4.5, UpperCase(EstadoStr));

      Page.SetColor(COL_TEXT_BLACK, False);
      Page.SetFont(FontN, 7);
      PDFWriteTextTop(Page, 100, TopY + 4.5, Format('%d/%d', [Parcelas[i].EspaciosOcupados, Parcelas[i].CapacidadTotal]));

      NomTitular := Parcelas[i].TitularNombre;
      if NomTitular = '' then
        NomTitular := 'Sin Titular Asignado';
      if Length(NomTitular) > 34 then
        NomTitular := Copy(NomTitular, 1, 32) + '..';
      PDFWriteTextTop(Page, 114, TopY + 4.5, NomTitular);

      if Parcelas[i].SaldoMantenimiento > 0 then
      begin
        Page.SetColor(COL_GOLD, False);
        Page.SetFont(FontH, 7);
        PDFWriteTextTop(Page, 168, TopY + 4.5, FormatearMoneda(Parcelas[i].SaldoMantenimiento));
      end
      else
      begin
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        PDFWriteTextTop(Page, 168, TopY + 4.5, '$ 0,00');
      end;

      PDFDrawLineTop(Page, 15, TopY + 6, 195, TopY + 6, 0.2, COL_SLATE_LIGHT);
      TopY := TopY + 6;

      if TopY > 268 then
      begin
        // Pie de Pagina
        PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
        Page.SetColor(COL_SLATE_MED, False);
        Page.SetFont(FontN, 7);
        PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Padron Oficial de Parcelas');
        PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

        Inc(PaginaActual);
        Page := Doc.Pages.AddPage;
        Page.PaperType := ptA4;
        Page.Orientation := ppoPortrait;
        Page.UnitOfMeasure := uomMillimeters;
        Section.AddPage(Page);

        ConfigurarEncabezadoInstitucional(Page, FontH, FontN, FontH,
          'Padron General de Parcelas (Cont.)',
          'Registro Notarial de Concesiones, Estado Ocupacional y Mantenimiento');

        // Cabecera repetida en nueva pagina
        PDFDrawRectTop(Page, 15, 41, 180, 7, 0.5, True, False, COL_NAVY_DARK, COL_NAVY_DARK);
        Page.SetColor(COL_WHITE, False);
        Page.SetFont(FontH, 8);
        PDFWriteTextTop(Page, 17, 46, 'PARCELA');
        PDFWriteTextTop(Page, 40, 46, 'SEC');
        PDFWriteTextTop(Page, 50, 46, 'MZ/FIL');
        PDFWriteTextTop(Page, 65, 46, 'NRO');
        PDFWriteTextTop(Page, 78, 46, 'ESTADO');
        PDFWriteTextTop(Page, 98, 46, 'CAPAC.');
        PDFWriteTextTop(Page, 114, 46, 'TITULAR DE LA CONCESION');
        PDFWriteTextTop(Page, 168, 46, 'SALDO DEUDA');

        TopY := 48;
      end;
    end;

    // Pie final
    PDFDrawLineTop(Page, 15, 278, 195, 278, 0.5, COL_SLATE_LIGHT);
    Page.SetColor(COL_SLATE_MED, False);
    Page.SetFont(FontN, 7);
    PDFWriteTextTop(Page, 15, 283, 'Aeterna Suite XP - Padron Oficial de Parcelas');
    PDFWriteTextTop(Page, 170, 283, 'Pagina ' + IntToStr(PaginaActual));

    Doc.SaveToFile(OutputPath);
  finally
    Doc.Free;
  end;
end;

end.
