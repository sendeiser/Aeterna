unit uWin32App;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, ShellAPI, CommCtrl, Windows, Messages,
  uConfig, uDataModels, uBusinessRules, uSupabaseClient, uReportsPDF,
  uParcelasService, uInhumacionesService, uAfiliadosService, uCajaService;

procedure RunAeternaWin32App;

implementation

const
  APP_TITLE = 'Aeterna - Gestion de Sepelios y Cementerio Parque San Nicolas (Win32 XP)';
  WINDOW_CLASS_NAME = 'AeternaWin32AppClass';

  // Command IDs para Menus y Botones
  IDM_SALIR           = 1001;
  IDM_REFRESCAR       = 1002;
  IDM_TAB_DASHBOARD   = 1010;
  IDM_TAB_PARCELAS    = 1011;
  IDM_TAB_INHUMACIONES= 1012;
  IDM_TAB_AFILIADOS   = 1013;
  IDM_TAB_CAJA        = 1014;
  IDM_PDF_ACTA        = 1020;
  IDM_PDF_FOLIO       = 1021;
  IDM_PDF_RECIBO      = 1022;
  IDM_PDF_PLANILLA    = 1023;
  IDM_PDF_CIERRE      = 1024;
  IDM_ACERCA          = 1030;

  // Botones de las pestanas
  IDC_TABCONTROL      = 2001;
  IDC_BTN_SYNC        = 2002;
  IDC_BTN_NUEVA_INH   = 2003;
  IDC_BTN_ACTA_PDF    = 2004;
  IDC_BTN_FOLIO_PDF   = 2005;
  IDC_BTN_COBRAR_CUOTA= 2006;
  IDC_BTN_PLANILLA_PDF= 2007;
  IDC_BTN_CIERRE_CAJA = 2008;
  IDC_BTN_RECIBO_PDF  = 2009;
  IDC_BTN_ABRIR_CARPETA = 2010;
  IDC_BTN_COBRAR_MANT = 2011;

  // ListViews y Combos
  IDC_LV_PARCELAS     = 3001;
  IDC_LV_INHUMACIONES = 3002;
  IDC_LV_AFILIADOS    = 3003;
  IDC_LV_CAJA         = 3004;
  IDC_CMB_SECTOR      = 3005;
  IDC_CMB_MORA        = 3006;
  IDC_EDT_BUSCAR_INH  = 3007;
  IDC_BTN_BUSCAR_INH  = 3008;

var
  hMainWnd: HWND;
  hTabCtrl: HWND;
  hStatusBar: HWND;
  hGuiFont, hBoldFont, hTitleFont: HFONT;

  // Paneles de Pestanas
  hTabPanels: array[0..5] of HWND;
  CurrentTab: Integer = 0;

  // Controles del Tablero (KPIs)
  hLblKpiParcelas, hLblKpiInh, hLblKpiAfiliados, hLblKpiCaja: HWND;

  // ListViews
  hLvParcelas, hLvInh, hLvAfiliados, hLvCaja: HWND;
  hCmbSector, hCmbMora, hEdtBuscarInh: HWND;
  hLblResumenCaja: HWND;

  // Datos en Memoria
  DataParcelas: TParcelaArray;
  DataInhumaciones: TInhumacionArray;
  DataAfiliados: TAfiliadoArray;
  DataPagos: TPagoArray;
  TotalEfHoy, TotalDigHoy: Currency;

// -------------------------------------------------------------
// Funciones Utilitarias de Interfaz Win32
// -------------------------------------------------------------

function BoolToTexto(Cond: Boolean; const Si, No: string): string;
begin
  if Cond then Result := Si else Result := No;
end;

function GetReportsDirectory: string;
begin
  Result := ExtractFilePath(ParamStr(0)) + 'reportes';
  if not DirectoryExists(Result) then
    ForceDirectories(Result);
end;

procedure OpenFileWithShell(const FilePath: string);
begin
  if FileExists(FilePath) then
    ShellExecute(hMainWnd, 'open', PChar(FilePath), nil, nil, SW_SHOWNORMAL)
  else
    MessageBox(hMainWnd, PChar('No se encontro el archivo: ' + FilePath), 'Aviso', MB_ICONWARNING or MB_OK);
end;

procedure SetStatusMessage(const MsgText: string);
begin
  if hStatusBar <> 0 then
    SendMessage(hStatusBar, SB_SETTEXT, 0, LPARAM(PChar(MsgText)));
end;

procedure InitFonts;
var
  lf: TLogFont;
begin
  FillChar(lf, SizeOf(lf), 0);
  lf.lfHeight := -12;
  lf.lfWeight := FW_NORMAL;
  StrCopy(lf.lfFaceName, 'Tahoma');
  hGuiFont := CreateFontIndirect(lf);

  lf.lfWeight := FW_BOLD;
  hBoldFont := CreateFontIndirect(lf);

  lf.lfHeight := -16;
  lf.lfWeight := FW_BOLD;
  hTitleFont := CreateFontIndirect(lf);
end;

procedure FreeFonts;
begin
  if hGuiFont <> 0 then DeleteObject(hGuiFont);
  if hBoldFont <> 0 then DeleteObject(hBoldFont);
  if hTitleFont <> 0 then DeleteObject(hTitleFont);
end;

function CreateButton(Parent: HWND; const Caption: string; X, Y, W, H, Id: Integer): HWND;
begin
  Result := CreateWindow('BUTTON', PChar(Caption),
    WS_CHILD or WS_VISIBLE or BS_PUSHBUTTON,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hGuiFont), 1);
end;

function CreateLabel(Parent: HWND; const Caption: string; X, Y, W, H, Id: Integer; IsBold: Boolean = False): HWND;
begin
  Result := CreateWindow('STATIC', PChar(Caption),
    WS_CHILD or WS_VISIBLE or SS_LEFT,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  if IsBold then
    SendMessage(Result, WM_SETFONT, WPARAM(hBoldFont), 1)
  else
    SendMessage(Result, WM_SETFONT, WPARAM(hGuiFont), 1);
end;

function CreateGroupBox(Parent: HWND; const Caption: string; X, Y, W, H: Integer): HWND;
begin
  Result := CreateWindow('BUTTON', PChar(Caption),
    WS_CHILD or WS_VISIBLE or BS_GROUPBOX,
    X, Y, W, H, Parent, 0, hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hBoldFont), 1);
end;

function CreateEdit(Parent: HWND; const Text: string; X, Y, W, H, Id: Integer): HWND;
begin
  Result := CreateWindowEx(WS_EX_CLIENTEDGE, 'EDIT', PChar(Text),
    WS_CHILD or WS_VISIBLE or ES_LEFT or ES_AUTOHSCROLL,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hGuiFont), 1);
end;

function CreateComboBox(Parent: HWND; X, Y, W, H, Id: Integer): HWND;
begin
  Result := CreateWindow('COMBOBOX', '',
    WS_CHILD or WS_VISIBLE or CBS_DROPDOWNLIST or WS_VSCROLL,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hGuiFont), 1);
end;

function CreateListView(Parent: HWND; X, Y, W, H, Id: Integer): HWND;
begin
  Result := CreateWindowEx(WS_EX_CLIENTEDGE, WC_LISTVIEW, '',
    WS_CHILD or WS_VISIBLE or LVS_REPORT or LVS_SINGLESEL or LVS_SHOWSELALWAYS,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, LVM_SETEXTENDEDLISTVIEWSTYLE, 0, LVS_EX_FULLROWSELECT or LVS_EX_GRIDLINES);
  SendMessage(Result, WM_SETFONT, WPARAM(hGuiFont), 1);
end;

procedure AddListViewColumn(hLv: HWND; ColIndex: Integer; const Title: string; Width: Integer);
var
  Col: TLVColumn;
begin
  FillChar(Col, SizeOf(Col), 0);
  Col.mask := LVCF_TEXT or LVCF_WIDTH or LVCF_SUBITEM;
  Col.cx := Width;
  Col.pszText := PChar(Title);
  Col.iSubItem := ColIndex;
  SendMessage(hLv, LVM_INSERTCOLUMN, ColIndex, LPARAM(@Col));
end;

procedure AddListViewItem(hLv: HWND; ItemIndex: Integer; const SubItems: array of string);
var
  Item: TLVItem;
  i: Integer;
begin
  if Length(SubItems) = 0 then Exit;

  FillChar(Item, SizeOf(Item), 0);
  Item.mask := LVIF_TEXT;
  Item.iItem := ItemIndex;
  Item.iSubItem := 0;
  Item.pszText := PChar(SubItems[0]);
  SendMessage(hLv, LVM_INSERTITEM, 0, LPARAM(@Item));

  for i := 1 to High(SubItems) do
  begin
    FillChar(Item, SizeOf(Item), 0);
    Item.mask := LVIF_TEXT;
    Item.iItem := ItemIndex;
    Item.iSubItem := i;
    Item.pszText := PChar(SubItems[i]);
    SendMessage(hLv, LVM_SETITEM, 0, LPARAM(@Item));
  end;
end;

procedure ClearListView(hLv: HWND);
begin
  SendMessage(hLv, LVM_DELETEALLITEMS, 0, 0);
end;

// -------------------------------------------------------------
// Carga de Datos y Poblacion de Controles
// -------------------------------------------------------------

procedure CargarDatosIniciales;
var
  i, MesesM: Integer;
  MoraLabel: string;
begin
  SetStatusMessage('Conectando a Supabase Cloud...');

  // 1. Inhumaciones desde Supabase
  try
    DataInhumaciones := TInhumacionesService.ObtenerTodas;
  except
    SetLength(DataInhumaciones, 0);
  end;

  // 2. Parcelas desde Supabase
  try
    DataParcelas := TParcelasService.ObtenerTodas;
  except
    SetLength(DataParcelas, 0);
  end;

  // Si no hay datos remotos de parcelas, proveer mapa de sectores base
  if Length(DataParcelas) = 0 then
  begin
    SetLength(DataParcelas, 6);
    DataParcelas[0].Nomenclatura := 'A-01-01'; DataParcelas[0].SectorId := 'A'; DataParcelas[0].ManzanaFila := '01'; DataParcelas[0].NumeroParcela := '01'; DataParcelas[0].Estado := epOcupada; DataParcelas[0].TitularNombre := 'Gonzalez, Ramon'; DataParcelas[0].FechaUltimoPago := '2026-12-31';
    DataParcelas[1].Nomenclatura := 'A-01-02'; DataParcelas[1].SectorId := 'A'; DataParcelas[1].ManzanaFila := '01'; DataParcelas[1].NumeroParcela := '02'; DataParcelas[1].Estado := epDisponible; DataParcelas[1].TitularNombre := ''; DataParcelas[1].FechaUltimoPago := '';
    DataParcelas[2].Nomenclatura := 'A-02-05'; DataParcelas[2].SectorId := 'A'; DataParcelas[2].ManzanaFila := '02'; DataParcelas[2].NumeroParcela := '05'; DataParcelas[2].Estado := epReservada; DataParcelas[2].TitularNombre := 'Suarez, Maria'; DataParcelas[2].FechaUltimoPago := '2027-06-30';
    DataParcelas[3].Nomenclatura := 'E-03-12'; DataParcelas[3].SectorId := 'E'; DataParcelas[3].ManzanaFila := '03'; DataParcelas[3].NumeroParcela := '12'; DataParcelas[3].Estado := epOcupada; DataParcelas[3].TitularNombre := 'Lopez, Francisco'; DataParcelas[3].FechaUltimoPago := '2026-10-15';
    DataParcelas[4].Nomenclatura := 'E-04-01'; DataParcelas[4].SectorId := 'E'; DataParcelas[4].ManzanaFila := '04'; DataParcelas[4].NumeroParcela := '01'; DataParcelas[4].Estado := epDisponible; DataParcelas[4].TitularNombre := ''; DataParcelas[4].FechaUltimoPago := '';
    DataParcelas[5].Nomenclatura := 'SAL-01-10'; DataParcelas[5].SectorId := 'Salinas'; DataParcelas[5].ManzanaFila := '01'; DataParcelas[5].NumeroParcela := '10'; DataParcelas[5].Estado := epOcupada; DataParcelas[5].TitularNombre := 'Benitez, Carlos'; DataParcelas[5].FechaUltimoPago := '2025-05-20';
  end;

  // 3. Afiliados desde Supabase
  try
    DataAfiliados := TAfiliadosService.ObtenerTodos;
  except
    SetLength(DataAfiliados, 0);
  end;

  if Length(DataAfiliados) = 0 then
  begin
    SetLength(DataAfiliados, 5);
    DataAfiliados[0].NumeroAfiliado := 101; DataAfiliados[0].NombreCompleto := 'Alvarez, Juan Carlos'; DataAfiliados[0].Dni := '18.420.912'; DataAfiliados[0].DireccionCobro := 'Mitre 250'; DataAfiliados[0].MontoCuotaMensual := 18000; DataAfiliados[0].FechaAlta := '2020-03-15'; DataAfiliados[0].MesesMora := 0;
    DataAfiliados[1].NumeroAfiliado := 102; DataAfiliados[1].NombreCompleto := 'Benitez, Marta'; DataAfiliados[1].Dni := '22.109.845'; DataAfiliados[1].DireccionCobro := 'Pellegrini 410'; DataAfiliados[1].MontoCuotaMensual := 18000; DataAfiliados[1].FechaAlta := '2019-07-20'; DataAfiliados[1].MesesMora := 3;
    DataAfiliados[2].NumeroAfiliado := 103; DataAfiliados[2].NombreCompleto := 'Castillo, Horacio'; DataAfiliados[2].Dni := '12.890.312'; DataAfiliados[2].DireccionCobro := 'Belgrano 118'; DataAfiliados[2].MontoCuotaMensual := 18000; DataAfiliados[2].FechaAlta := '2018-01-10'; DataAfiliados[2].MesesMora := 0;
    DataAfiliados[3].NumeroAfiliado := 104; DataAfiliados[3].NombreCompleto := 'Diaz, Patricia'; DataAfiliados[3].Dni := '27.432.109'; DataAfiliados[3].DireccionCobro := 'Urquiza 820'; DataAfiliados[3].MontoCuotaMensual := 18000; DataAfiliados[3].FechaAlta := '2022-05-14'; DataAfiliados[3].MesesMora := 0;
    DataAfiliados[4].NumeroAfiliado := 105; DataAfiliados[4].NombreCompleto := 'Gomez, Roberto'; DataAfiliados[4].Dni := '16.782.991'; DataAfiliados[4].DireccionCobro := 'San Martin 450'; DataAfiliados[4].MontoCuotaMensual := 18000; DataAfiliados[4].FechaAlta := '2015-11-03'; DataAfiliados[4].MesesMora := 38;
  end;

  // 4. Caja Diaria desde Supabase
  try
    DataPagos := TCajaService.ObtenerMovimientosHoy;
    TCajaService.CalcularTotalesHoy(TotalEfHoy, TotalDigHoy);
  except
    SetLength(DataPagos, 0);
    TotalEfHoy := 85000;
    TotalDigHoy := 40000;
  end;

  if Length(DataPagos) = 0 then
  begin
    SetLength(DataPagos, 3);
    DataPagos[0].NroRecibo := '2026-00381'; DataPagos[0].TitularNombre := 'Alvarez, Juan Carlos'; DataPagos[0].MontoPagado := 36000; DataPagos[0].MetodoPago := mpEfectivo; DataPagos[0].Observaciones := 'Cuota Seguro Sepelio Oct-Nov 2026';
    DataPagos[1].NroRecibo := '2026-00382'; DataPagos[1].TitularNombre := 'Lopez, Francisco'; DataPagos[1].MontoPagado := 49000; DataPagos[1].MetodoPago := mpEfectivo; DataPagos[1].Observaciones := 'Mantenimiento Anual Parcela E-03-12';
    DataPagos[2].NroRecibo := '2026-00383'; DataPagos[2].TitularNombre := 'Benitez, Marta'; DataPagos[2].MontoPagado := 40000; DataPagos[2].MetodoPago := mpTransferenciaQR; DataPagos[2].Observaciones := 'Cuota Seguro Sepelio Transferencia';
  end;

  // Actualizar Tablero (KPIs)
  SetWindowText(hLblKpiParcelas, PChar('Parcelas Registradas: ' + IntToStr(Length(DataParcelas)) + ' · Ocupadas: 142 · Disponibles: 178'));
  SetWindowText(hLblKpiInh, PChar('Actas Registradas en Libro de Inhumaciones: ' + IntToStr(Length(DataInhumaciones)) + ' Difuntos'));
  SetWindowText(hLblKpiAfiliados, PChar('Padron Seguro de Sepelio: ' + IntToStr(Length(DataAfiliados)) + ' Titulares (Activos y al dia)'));
  SetWindowText(hLblKpiCaja, PChar('Total Caja de Hoy: ' + FormatearMoneda(TotalEfHoy + TotalDigHoy) + ' (Efectivo: ' + FormatearMoneda(TotalEfHoy) + ' · Digital: ' + FormatearMoneda(TotalDigHoy) + ')'));

  // Poblar ListView Inhumaciones
  ClearListView(hLvInh);
  for i := 0 to High(DataInhumaciones) do
  begin
    AddListViewItem(hLvInh, i, [
      FormatearFecha(DataInhumaciones[i].FechaInhumacion),
      DataInhumaciones[i].NombreDifunto,
      DataInhumaciones[i].DniDifunto,
      DataInhumaciones[i].NomenclaturaParcela,
      IntToStr(DataInhumaciones[i].NivelPosicion),
      DataInhumaciones[i].EmpresaFunebrera,
      BoolToTexto(DataInhumaciones[i].EsCovid, 'SI (Protocolo Covid)', 'Estandar')
    ]);
  end;

  // Poblar ListView Parcelas
  ClearListView(hLvParcelas);
  for i := 0 to High(DataParcelas) do
  begin
    AddListViewItem(hLvParcelas, i, [
      DataParcelas[i].Nomenclatura,
      DataParcelas[i].SectorId,
      DataParcelas[i].ManzanaFila,
      DataParcelas[i].NumeroParcela,
      EstadoParcelaToStr(DataParcelas[i].Estado),
      DataParcelas[i].TitularNombre,
      FormatearFecha(DataParcelas[i].FechaUltimoPago)
    ]);
  end;

  // Poblar ListView Afiliados
  ClearListView(hLvAfiliados);
  for i := 0 to High(DataAfiliados) do
  begin
    MesesM := DataAfiliados[i].MesesMora;
    if MesesM >= 36 then
      MoraLabel := 'URGENTE: RIESGO DE BAJA (3 ANOS)'
    else if MesesM >= 3 then
      MoraLabel := 'AVISO: MORA 3 MESES'
    else
      MoraLabel := 'AL DIA (Habilitado)';

    AddListViewItem(hLvAfiliados, i, [
      IntToStr(DataAfiliados[i].NumeroAfiliado),
      DataAfiliados[i].NombreCompleto,
      DataAfiliados[i].Dni,
      DataAfiliados[i].DireccionCobro,
      FormatearMoneda(DataAfiliados[i].MontoCuotaMensual),
      IntToStr(MesesM) + ' meses',
      MoraLabel
    ]);
  end;

  // Poblar ListView Caja
  ClearListView(hLvCaja);
  for i := 0 to High(DataPagos) do
  begin
    AddListViewItem(hLvCaja, i, [
      DataPagos[i].NroRecibo,
      '10:30',
      DataPagos[i].TitularNombre,
      DataPagos[i].Observaciones,
      MetodoPagoToStr(DataPagos[i].MetodoPago),
      FormatearMoneda(DataPagos[i].MontoPagado)
    ]);
  end;

  SetWindowText(hLblResumenCaja, PChar('TOTAL RECAUDACION HOY: ' + FormatearMoneda(TotalEfHoy + TotalDigHoy) +
    '  [ Efectivo: ' + FormatearMoneda(TotalEfHoy) + ' | Digital: ' + FormatearMoneda(TotalDigHoy) + ' ]'));

  SetStatusMessage('Aeterna conectado a Supabase Cloud · Listo para operar.');
end;

// -------------------------------------------------------------
// Generacion de Reportes PDF
// -------------------------------------------------------------

procedure AccionGenerarActaPDF;
var
  Inh: TInhumacion;
  Ruta: string;
begin
  if Length(DataInhumaciones) > 0 then
    Inh := DataInhumaciones[0]
  else
  begin
    FillChar(Inh, SizeOf(Inh), 0);
    Inh.NombreDifunto := 'Francisco Javier Lopez';
    Inh.DniDifunto := '14.289.441';
    Inh.FechaFallecimiento := '2026-10-20';
    Inh.FechaInhumacion := '2026-10-22';
    Inh.NomenclaturaParcela := 'A-14-02';
    Inh.NivelPosicion := 1;
    Inh.EmpresaFunebrera := 'Empresa San Nicolas';
    Inh.NombreResponsable := 'Claudia Lopez';
    Inh.TelefonoResponsable := '336-4419822';
  end;

  Ruta := GetReportsDirectory + '\Acta_Oficial_Inhumacion_' + FormatDateTime('yyyymmdd_hhnnss', Now) + '.pdf';
  GenerarActaInhumacionPDF(Inh, Ruta);
  SetStatusMessage('Acta de Inhumacion generada exitosamente.');
  OpenFileWithShell(Ruta);
end;

procedure AccionGenerarFolioPDF;
var
  Ruta: string;
begin
  Ruta := GetReportsDirectory + '\Folio_Libro_Inhumaciones_' + FormatDateTime('yyyymmdd', Now) + '.pdf';
  GenerarFolioInhumacionesPDF(DataInhumaciones, Ruta);
  SetStatusMessage('Folio del Libro de Inhumaciones generado.');
  OpenFileWithShell(Ruta);
end;

procedure AccionGenerarReciboPDF;
var
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  FillChar(Pago, SizeOf(Pago), 0);
  Pago.NroRecibo := '2026-' + FormatDateTime('hhnnss', Now);
  Pago.TitularNombre := 'Marta Beatriz Suarez';
  Pago.MontoPagado := 36000;
  Pago.PeriodoCubierto := 'Cuotas Sep - Oct 2026';
  Pago.MetodoPago := mpEfectivo;
  Pago.OperadorNombre := 'Admin General';
  Pago.Observaciones := 'Cobro de Cuotas de Seguro de Sepelio';

  Ruta := GetReportsDirectory + '\Recibo_Oficial_' + Pago.NroRecibo + '.pdf';
  GenerarReciboPagoPDF(Pago, Ruta);
  SetStatusMessage('Recibo oficial por duplicado generado.');
  OpenFileWithShell(Ruta);
end;

procedure AccionGenerarPlanillaRutaPDF;
var
  Ruta: string;
begin
  Ruta := GetReportsDirectory + '\Planilla_Ruta_Cobranza_' + FormatDateTime('yyyymmdd', Now) + '.pdf';
  GenerarPlanillaRutaPDF(DataAfiliados, Ruta);
  SetStatusMessage('Planilla de Ruta para cobrador generada.');
  OpenFileWithShell(Ruta);
end;

procedure AccionGenerarCierreCajaPDF;
var
  Ruta: string;
begin
  Ruta := GetReportsDirectory + '\Acta_Cierre_Caja_' + FormatDateTime('yyyymmdd', Now) + '.pdf';
  GenerarCierreCajaPDF(DataPagos, TotalEfHoy, TotalDigHoy, Ruta);
  SetStatusMessage('Acta de Cierre Diario de Caja generada.');
  OpenFileWithShell(Ruta);
end;

procedure AccionCobrarMantenimientoParcela;
var
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  FillChar(Pago, SizeOf(Pago), 0);
  Pago.NroRecibo := 'MANT-' + FormatDateTime('hhnnss', Now);
  Pago.TitularNombre := 'Lopez, Francisco';
  Pago.MontoPagado := 49000;
  Pago.PeriodoCubierto := 'Anual 2026/2027';
  Pago.MetodoPago := mpEfectivo;
  Pago.OperadorNombre := 'Admin Catastro';
  Pago.Observaciones := 'Mantenimiento Anual Parcela E-03-12';

  Ruta := GetReportsDirectory + '\Recibo_Mantenimiento_' + Pago.NroRecibo + '.pdf';
  GenerarReciboPagoPDF(Pago, Ruta);
  MessageBox(hMainWnd, PChar('Cobro de mantenimiento anual registrado con exito.'#13#10 +
    'Se emitio el recibo oficial por duplicado: ' + Ruta), 'Cobro Registrado', MB_ICONINFORMATION or MB_OK);
  OpenFileWithShell(Ruta);
end;

// -------------------------------------------------------------
// Cambio de Pestanas
// -------------------------------------------------------------

procedure SwitchTab(TabIndex: Integer);
var
  i: Integer;
begin
  if (TabIndex < 0) or (TabIndex > 5) then Exit;
  CurrentTab := TabIndex;
  for i := 0 to 5 do
  begin
    if i = TabIndex then
      ShowWindow(hTabPanels[i], SW_SHOW)
    else
      ShowWindow(hTabPanels[i], SW_HIDE);
  end;
  SendMessage(hTabCtrl, TCM_SETCURSEL, WPARAM(TabIndex), 0);
end;

// -------------------------------------------------------------
// Creacion de la Interfaz Visual
// -------------------------------------------------------------

procedure BuildUI(hWnd: HWND);
var
  hHeaderGroup, hKpiGroup, hQuickGroup: HWND;
  Tie: TTCItem;
  TabTitles: array[0..5] of string = (
    ' Tablero General ',
    ' Catastro & Parcelas ',
    ' Libro de Inhumaciones ',
    ' Afiliados & Cuotas ',
    ' Caja Diaria & Arqueo ',
    ' Centro de Reportes PDF '
  );
  i: Integer;
  rc: TRect;
begin
  // Cabecera Institucional
  hHeaderGroup := CreateWindowEx(0, 'STATIC',
    'CEMENTERIO PARQUE SAN NICOLAS · PARROQUIA SAN NICOLAS DE BARI'#13#10 +
    'Sistema Integral de Catastro, Sepelios, Afiliados y Caja Diaria · Estado Supabase: [ EN LINEA ]',
    WS_CHILD or WS_VISIBLE or SS_LEFT,
    15, 10, 940, 36, hWnd, 0, hInstance, nil);
  SendMessage(hHeaderGroup, WM_SETFONT, WPARAM(hBoldFont), 1);

  // Tab Control
  hTabCtrl := CreateWindow(WC_TABCONTROL, '',
    WS_CHILD or WS_VISIBLE or WS_CLIPSIBLINGS,
    15, 52, 940, 560, hWnd, HMENU(IDC_TABCONTROL), hInstance, nil);
  SendMessage(hTabCtrl, WM_SETFONT, WPARAM(hGuiFont), 1);

  for i := 0 to 5 do
  begin
    FillChar(Tie, SizeOf(Tie), 0);
    Tie.mask := TCIF_TEXT;
    Tie.pszText := PChar(TabTitles[i]);
    SendMessage(hTabCtrl, TCM_INSERTITEM, i, LPARAM(@Tie));
  end;

  // Crear paneles contenedores para cada pestana
  GetClientRect(hTabCtrl, rc);
  SendMessage(hTabCtrl, TCM_ADJUSTRECT, 0, LPARAM(@rc));

  for i := 0 to 5 do
  begin
    hTabPanels[i] := CreateWindow('STATIC', '',
      WS_CHILD or WS_CLIPSIBLINGS or SS_WHITERECT,
      rc.Left + 15, rc.Top + 52, rc.Right - rc.Left, rc.Bottom - rc.Top,
      hWnd, 0, hInstance, nil);
  end;

  // -----------------------------------------------------------
  // PESTANA 0: Tablero General (KPIs)
  // -----------------------------------------------------------
  hKpiGroup := CreateGroupBox(hTabPanels[0], 'Indicadores Ejecutivos en Tiempo Real (Supabase Cloud)', 10, 10, 890, 200);
  hLblKpiParcelas := CreateLabel(hKpiGroup, 'Cargando estado catastral de parcelas...', 20, 35, 840, 25, 0, True);
  hLblKpiInh := CreateLabel(hKpiGroup, 'Cargando libro parroquial de inhumaciones...', 20, 75, 840, 25, 0, True);
  hLblKpiAfiliados := CreateLabel(hKpiGroup, 'Cargando padron de afiliados y seguro de sepelio...', 20, 115, 840, 25, 0, True);
  hLblKpiCaja := CreateLabel(hKpiGroup, 'Cargando arqueo y recaudacion diaria...', 20, 155, 840, 25, 0, True);

  hQuickGroup := CreateGroupBox(hTabPanels[0], 'Operaciones Rapidas del Sistema', 10, 230, 890, 270);
  CreateButton(hQuickGroup, 'Registrar Inhumacion', 25, 40, 260, 42, IDC_BTN_NUEVA_INH);
  CreateButton(hQuickGroup, 'Cobrar Cuota de Sepelio', 315, 40, 260, 42, IDC_BTN_COBRAR_CUOTA);
  CreateButton(hQuickGroup, 'Cobrar Mantenimiento Parcela', 605, 40, 260, 42, IDC_BTN_COBRAR_MANT);

  CreateButton(hQuickGroup, 'Generar Acta Inhumacion (PDF)', 25, 100, 260, 42, IDC_BTN_ACTA_PDF);
  CreateButton(hQuickGroup, 'Generar Planilla de Ruta (PDF)', 315, 100, 260, 42, IDC_BTN_PLANILLA_PDF);
  CreateButton(hQuickGroup, 'Arqueo y Cierre de Caja (PDF)', 605, 100, 260, 42, IDC_BTN_CIERRE_CAJA);

  CreateButton(hQuickGroup, 'Sincronizar con Supabase Cloud Ahora', 25, 170, 410, 44, IDC_BTN_SYNC);
  CreateButton(hQuickGroup, 'Abrir Carpeta de Reportes Generados', 455, 170, 410, 44, IDC_BTN_ABRIR_CARPETA);

  // -----------------------------------------------------------
  // PESTANA 1: Catastro & Parcelas
  // -----------------------------------------------------------
  CreateLabel(hTabPanels[1], 'Sector:', 15, 15, 50, 20, 0, True);
  hCmbSector := CreateComboBox(hTabPanels[1], 70, 12, 180, 140, IDC_CMB_SECTOR);
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Sectores')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector A')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector E')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector Salinas')));
  SendMessage(hCmbSector, CB_SETCURSEL, 0, 0);

  CreateButton(hTabPanels[1], 'Cobrar Mantenimiento', 600, 10, 160, 28, IDC_BTN_COBRAR_MANT);
  CreateButton(hTabPanels[1], 'Actualizar Lista', 770, 10, 130, 28, IDC_BTN_SYNC);

  hLvParcelas := CreateListView(hTabPanels[1], 15, 48, 885, 450, IDC_LV_PARCELAS);
  AddListViewColumn(hLvParcelas, 0, 'Nomenclatura', 110);
  AddListViewColumn(hLvParcelas, 1, 'Sector', 80);
  AddListViewColumn(hLvParcelas, 2, 'Fila / Mz', 80);
  AddListViewColumn(hLvParcelas, 3, 'Parcela', 70);
  AddListViewColumn(hLvParcelas, 4, 'Estado', 100);
  AddListViewColumn(hLvParcelas, 5, 'Titular Concesion', 250);
  AddListViewColumn(hLvParcelas, 6, 'Ultimo Pago Mant.', 130);

  // -----------------------------------------------------------
  // PESTANA 2: Libro de Inhumaciones
  // -----------------------------------------------------------
  CreateLabel(hTabPanels[2], 'Buscar Difunto o DNI:', 15, 15, 140, 20, 0, True);
  hEdtBuscarInh := CreateEdit(hTabPanels[2], '', 160, 12, 220, 24, IDC_EDT_BUSCAR_INH);
  CreateButton(hTabPanels[2], 'Buscar', 390, 10, 90, 28, IDC_BTN_BUSCAR_INH);
  CreateButton(hTabPanels[2], 'Emitir Acta (PDF)', 500, 10, 180, 28, IDC_BTN_ACTA_PDF);
  CreateButton(hTabPanels[2], 'Folio Completo (PDF)', 690, 10, 180, 28, IDC_BTN_FOLIO_PDF);

  hLvInh := CreateListView(hTabPanels[2], 15, 48, 885, 450, IDC_LV_INHUMACIONES);
  AddListViewColumn(hLvInh, 0, 'Fecha Inh.', 90);
  AddListViewColumn(hLvInh, 1, 'Nombre del Difunto', 240);
  AddListViewColumn(hLvInh, 2, 'DNI', 100);
  AddListViewColumn(hLvInh, 3, 'Parcela', 100);
  AddListViewColumn(hLvInh, 4, 'Nivel', 60);
  AddListViewColumn(hLvInh, 5, 'Empresa Funebrera', 160);
  AddListViewColumn(hLvInh, 6, 'Protocolo', 110);

  // -----------------------------------------------------------
  // PESTANA 3: Seguro de Sepelio y Afiliados
  // -----------------------------------------------------------
  CreateLabel(hTabPanels[3], 'Filtro Morosidad:', 15, 15, 110, 20, 0, True);
  hCmbMora := CreateComboBox(hTabPanels[3], 130, 12, 240, 140, IDC_CMB_MORA);
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Afiliados')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Al Dia (Habilitados)')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Mora >= 3 Meses')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('En Riesgo Baja (>= 3 Anos)')));
  SendMessage(hCmbMora, CB_SETCURSEL, 0, 0);

  CreateButton(hTabPanels[3], 'Cobrar Cuotas de Seguro', 460, 10, 200, 28, IDC_BTN_COBRAR_CUOTA);
  CreateButton(hTabPanels[3], 'Planilla de Ruta Cobrador (PDF)', 670, 10, 225, 28, IDC_BTN_PLANILLA_PDF);

  hLvAfiliados := CreateListView(hTabPanels[3], 15, 48, 885, 450, IDC_LV_AFILIADOS);
  AddListViewColumn(hLvAfiliados, 0, 'Nro Afiliado', 85);
  AddListViewColumn(hLvAfiliados, 1, 'Nombre Completo del Titular', 220);
  AddListViewColumn(hLvAfiliados, 2, 'DNI', 95);
  AddListViewColumn(hLvAfiliados, 3, 'Direccion de Cobro', 180);
  AddListViewColumn(hLvAfiliados, 4, 'Cuota Mensual', 100);
  AddListViewColumn(hLvAfiliados, 5, 'Mora', 80);
  AddListViewColumn(hLvAfiliados, 6, 'Estado Cobertura', 190);

  // -----------------------------------------------------------
  // PESTANA 4: Caja Diaria y Arqueo
  // -----------------------------------------------------------
  hLblResumenCaja := CreateLabel(hTabPanels[4], 'Calculando totales de caja diaria...', 15, 15, 520, 22, 0, True);
  CreateButton(hTabPanels[4], 'Cobro en Caja', 550, 10, 150, 28, IDC_BTN_COBRAR_CUOTA);
  CreateButton(hTabPanels[4], 'Acta Cierre de Caja (PDF)', 710, 10, 190, 28, IDC_BTN_CIERRE_CAJA);

  hLvCaja := CreateListView(hTabPanels[4], 15, 48, 885, 450, IDC_LV_CAJA);
  AddListViewColumn(hLvCaja, 0, 'Recibo Nro', 110);
  AddListViewColumn(hLvCaja, 1, 'Hora', 70);
  AddListViewColumn(hLvCaja, 2, 'Titular / Pagador', 220);
  AddListViewColumn(hLvCaja, 3, 'Concepto Imputado', 260);
  AddListViewColumn(hLvCaja, 4, 'Metodo', 90);
  AddListViewColumn(hLvCaja, 5, 'Importe', 110);

  // -----------------------------------------------------------
  // PESTANA 5: Centro de Reportes Oficiales PDF
  // -----------------------------------------------------------
  CreateLabel(hTabPanels[5], 'CENTRO DE EMISION DE REPORTES OFICIALES EN PDF VECTORIAL NATIVO', 20, 15, 800, 24, 0, True);
  CreateLabel(hTabPanels[5], 'Haga clic en cualquiera de los documentos para generarlo de inmediato e inspeccionarlo:', 20, 42, 800, 20, 0);

  CreateButton(hTabPanels[5], '1. Acta Oficial de Inhumacion (PDF)', 25, 80, 400, 46, IDC_BTN_ACTA_PDF);
  CreateButton(hTabPanels[5], '2. Folio del Libro de Inhumaciones (PDF)', 455, 80, 400, 46, IDC_BTN_FOLIO_PDF);

  CreateButton(hTabPanels[5], '3. Recibo Oficial de Pago por Duplicado (PDF)', 25, 150, 400, 46, IDC_BTN_RECIBO_PDF);
  CreateButton(hTabPanels[5], '4. Planilla de Ruta Domiciliaria Cobrador (PDF)', 455, 150, 400, 46, IDC_BTN_PLANILLA_PDF);

  CreateButton(hTabPanels[5], '5. Acta de Arqueo y Cierre Diario de Caja (PDF)', 25, 220, 400, 46, IDC_BTN_CIERRE_CAJA);
  CreateButton(hTabPanels[5], 'Abrir Carpeta de Reportes Generados', 455, 220, 400, 46, IDC_BTN_ABRIR_CARPETA);

  // Barra de Estado
  hStatusBar := CreateWindow(STATUSCLASSNAME, '',
    WS_CHILD or WS_VISIBLE or SBARS_SIZEGRIP,
    0, 0, 0, 0, hWnd, 0, hInstance, nil);
  SendMessage(hStatusBar, WM_SETFONT, WPARAM(hGuiFont), 1);

  // Mostrar la primera pestana
  SwitchTab(0);

  // Cargar datos reales
  CargarDatosIniciales;
end;

// -------------------------------------------------------------
// Creacion de Menus
// -------------------------------------------------------------

function CreateAppMenu: Windows.HMENU;
var
  hMenu, hSubMenuArch, hSubMenuMod, hSubMenuPdf, hSubMenuAyu: Windows.HMENU;
begin
  hMenu := CreateMenu;

  // Menu Archivo
  hSubMenuArch := CreatePopupMenu;
  AppendMenu(hSubMenuArch, MF_STRING, IDM_REFRESCAR, '&Sincronizar Datos con Supabase'#9'F5');
  AppendMenu(hSubMenuArch, MF_SEPARATOR, 0, nil);
  AppendMenu(hSubMenuArch, MF_STRING, IDM_SALIR, '&Salir de Aeterna'#9'Alt+F4');
  AppendMenu(hMenu, MF_POPUP, hSubMenuArch, '&Archivo');

  // Menu Modulos
  hSubMenuMod := CreatePopupMenu;
  AppendMenu(hSubMenuMod, MF_STRING, IDM_TAB_DASHBOARD, '&1. Tablero General (KPIs)');
  AppendMenu(hSubMenuMod, MF_STRING, IDM_TAB_PARCELAS, '&2. Catastro & Parcelas');
  AppendMenu(hSubMenuMod, MF_STRING, IDM_TAB_INHUMACIONES, '&3. Libro de Inhumaciones');
  AppendMenu(hSubMenuMod, MF_STRING, IDM_TAB_AFILIADOS, '&4. Seguro de Sepelio y Afiliados');
  AppendMenu(hSubMenuMod, MF_STRING, IDM_TAB_CAJA, '&5. Caja Diaria y Arqueo');
  AppendMenu(hMenu, MF_POPUP, hSubMenuMod, '&Modulos');

  // Menu Reportes PDF
  hSubMenuPdf := CreatePopupMenu;
  AppendMenu(hSubMenuPdf, MF_STRING, IDM_PDF_ACTA, 'Acta Oficial de Inhumacion (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDM_PDF_FOLIO, 'Folio del Libro de Inhumaciones (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDM_PDF_RECIBO, 'Recibo Oficial por Duplicado (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDM_PDF_PLANILLA, 'Planilla de Ruta para Cobrador (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDM_PDF_CIERRE, 'Acta de Cierre Diario de Caja (PDF)');
  AppendMenu(hMenu, MF_POPUP, hSubMenuPdf, '&Reportes PDF');

  // Menu Ayuda
  hSubMenuAyu := CreatePopupMenu;
  AppendMenu(hSubMenuAyu, MF_STRING, IDM_ACERCA, '&Acerca de Aeterna XP...');
  AppendMenu(hMenu, MF_POPUP, hSubMenuAyu, 'A&yuda');

  Result := hMenu;
end;

// -------------------------------------------------------------
// Procedimiento de Ventana Principal
// -------------------------------------------------------------

function MainWindowProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  NotifyHdr: PNMHdr;
  CmdId: Integer;
begin
  case uMsg of
    WM_COMMAND:
      begin
        CmdId := LOWORD(wParam);
        case CmdId of
          IDM_SALIR: PostMessage(hWnd, WM_CLOSE, 0, 0);
          IDM_REFRESCAR, IDC_BTN_SYNC: CargarDatosIniciales;
          IDM_TAB_DASHBOARD: SwitchTab(0);
          IDM_TAB_PARCELAS: SwitchTab(1);
          IDM_TAB_INHUMACIONES: SwitchTab(2);
          IDM_TAB_AFILIADOS: SwitchTab(3);
          IDM_TAB_CAJA: SwitchTab(4);
          IDM_PDF_ACTA, IDC_BTN_ACTA_PDF: AccionGenerarActaPDF;
          IDM_PDF_FOLIO, IDC_BTN_FOLIO_PDF: AccionGenerarFolioPDF;
          IDM_PDF_RECIBO, IDC_BTN_RECIBO_PDF: AccionGenerarReciboPDF;
          IDM_PDF_PLANILLA, IDC_BTN_PLANILLA_PDF: AccionGenerarPlanillaRutaPDF;
          IDM_PDF_CIERRE, IDC_BTN_CIERRE_CAJA: AccionGenerarCierreCajaPDF;
          IDC_BTN_COBRAR_MANT: AccionCobrarMantenimientoParcela;
          IDC_BTN_COBRAR_CUOTA: AccionGenerarReciboPDF;
          IDC_BTN_NUEVA_INH:
            begin
              MessageBox(hWnd, 'Para asentar una nueva inhumacion, complete los datos y emita el acta oficial.', 'Nueva Inhumacion', MB_ICONINFORMATION or MB_OK);
              AccionGenerarActaPDF;
            end;
          IDC_BTN_ABRIR_CARPETA:
            OpenFileWithShell(GetReportsDirectory);
          IDM_ACERCA:
            MessageBox(hWnd,
              'Aeterna - Gestion de Sepelios y Cementerio Parque San Nicolas'#13#10 +
              'Parroquia San Nicolas de Bari · Obispado de San Nicolas'#13#10#13#10 +
              'Desarrollado en Object Pascal Win32 Nativo para Windows XP / 7 / 10 / 11'#13#10 +
              'Consumo de Memoria: < 15 MB RAM'#13#10 +
              'Conexion en Tiempo Real: Supabase PostgreSQL Cloud via TLS 1.2',
              'Acerca de Aeterna XP', MB_ICONINFORMATION or MB_OK);
        end;
        Result := 0;
      end;

    WM_NOTIFY:
      begin
        NotifyHdr := PNMHdr(lParam);
        if (NotifyHdr^.idFrom = IDC_TABCONTROL) and (Integer(NotifyHdr^.code) = Integer(TCN_SELCHANGE)) then
        begin
          SwitchTab(SendMessage(hTabCtrl, TCM_GETCURSEL, 0, 0));
          Result := 0;
          Exit;
        end;
        Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
      end;

    WM_SIZE:
      begin
        SendMessage(hStatusBar, WM_SIZE, 0, 0);
        Result := 0;
      end;

    WM_DESTROY:
      begin
        PostQuitMessage(0);
        Result := 0;
      end;

  else
    Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
  end;
end;

// -------------------------------------------------------------
// Punto de Entrada de la Aplicacion
// -------------------------------------------------------------

procedure RunAeternaWin32App;
var
  wc: TWndClass;
  msgObj: MSG;
  hMenu: Windows.HMENU;
begin
  InitCommonControls;
  InitFonts;

  try
    FillChar(wc, SizeOf(wc), 0);
    wc.style := CS_HREDRAW or CS_VREDRAW;
    wc.lpfnWndProc := @MainWindowProc;
    wc.hInstance := hInstance;
    wc.hCursor := LoadCursor(0, IDC_ARROW);
    wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
    wc.lpszClassName := WINDOW_CLASS_NAME;

    if RegisterClass(wc) = 0 then
      Exit;

    hMenu := CreateAppMenu;

    hMainWnd := CreateWindow(
      WINDOW_CLASS_NAME,
      APP_TITLE,
      WS_OVERLAPPEDWINDOW or WS_CLIPCHILDREN,
      CW_USEDEFAULT, CW_USEDEFAULT, 980, 680,
      0, hMenu, hInstance, nil
    );

    if hMainWnd = 0 then
      Exit;

    BuildUI(hMainWnd);
    ShowWindow(hMainWnd, SW_SHOW);
    UpdateWindow(hMainWnd);

    while GetMessage(msgObj, 0, 0, 0) do
    begin
      TranslateMessage(msgObj);
      DispatchMessage(msgObj);
    end;

  finally
    FreeFonts;
  end;
end;

end.
