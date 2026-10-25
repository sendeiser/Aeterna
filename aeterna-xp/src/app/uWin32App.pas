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
  APP_TITLE = 'Aeterna - Gestion de Sepelios y Cementerio Parque San Nicolas';
  WINDOW_CLASS_NAME = 'AeternaWin32AppClass';

  // Navigation Button IDs
  IDC_NAV_DASHBOARD   = 1100;
  IDC_NAV_PARCELAS    = 1101;
  IDC_NAV_INHUMACIONES= 1102;
  IDC_NAV_AFILIADOS   = 1103;
  IDC_NAV_CAJA        = 1104;
  IDC_NAV_REPORTES    = 1105;

  // Command IDs para Menus y Botones
  IDM_SALIR           = 1001;
  IDM_REFRESCAR       = 1002;
  IDM_ACERCA          = 1030;

  // Botones de Accion
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
  IDC_BTN_BUSCAR_INH  = 2012;
  IDC_BTN_FILTRAR_PARC= 2013;

  // Controles de Datos
  IDC_LV_PARCELAS     = 3001;
  IDC_LV_INHUMACIONES = 3002;
  IDC_LV_AFILIADOS    = 3003;
  IDC_LV_CAJA         = 3004;
  IDC_LV_RECENT_INH   = 3005;
  IDC_CMB_SECTOR      = 3006;
  IDC_CMB_ESTADO_PARC = 3007;
  IDC_CMB_MORA        = 3008;
  IDC_EDT_BUSCAR_INH  = 3009;

var
  hMainWnd: HWND;
  hStatusBar: HWND;

  // Fuentes estilizadas
  hGuiFont, hBoldFont, hTitleFont, hCardBigFont, hCardTitleFont, hHeaderSubFont: HFONT;

  // Pinceles de Color
  hHeaderBrush, hNavBrush, hBgBrush: HBRUSH;
  hCardBlueBrush, hCardPurpleBrush, hCardGreenBrush, hCardRedBrush, hCardTealBrush: HBRUSH;

  // Pestaña Activa (0..5)
  CurrentModule: Integer = 0;
  NavButtons: array[0..5] of HWND;
  ModuleControls: array[0..5] of array of HWND;

  // Controles de Cabecera
  hHeaderBanner, hHeaderSub, hHeaderStatus: HWND;

  // Controles de Tarjetas KPI
  hCard1, hCard1Val, hCard1Sub: HWND;
  hCard2, hCard2Val, hCard2Sub: HWND;
  hCard3, hCard3Val, hCard3Sub: HWND;
  hCard4, hCard4Val, hCard4Sub: HWND;
  hCard5, hCard5Val, hCard5Sub: HWND;

  // ListViews
  hLvParcelas, hLvInh, hLvAfiliados, hLvCaja, hLvRecentInh: HWND;
  hCmbSector, hCmbEstadoParc, hCmbMora, hEdtBuscarInh: HWND;
  hLblResumenCaja: HWND;

  // Datos en Memoria
  DataParcelas: TParcelaArray;
  DataInhumaciones: TInhumacionArray;
  DataAfiliados: TAfiliadoArray;
  DataPagos: TPagoArray;
  TotalEfHoy, TotalDigHoy: Currency;

// -------------------------------------------------------------
// Registro de Controles por Modulo
// -------------------------------------------------------------

procedure AddControlToModule(ModIdx: Integer; hCtrl: HWND);
var
  Len: Integer;
begin
  if hCtrl = 0 then Exit;
  Len := Length(ModuleControls[ModIdx]);
  SetLength(ModuleControls[ModIdx], Len + 1);
  ModuleControls[ModIdx][Len] := hCtrl;
end;

procedure SwitchModule(ModIdx: Integer);
var
  m, i: Integer;
begin
  if (ModIdx < 0) or (ModIdx > 5) then Exit;
  CurrentModule := ModIdx;

  for m := 0 to 5 do
  begin
    for i := 0 to High(ModuleControls[m]) do
    begin
      if m = ModIdx then
        ShowWindow(ModuleControls[m][i], SW_SHOW)
      else
        ShowWindow(ModuleControls[m][i], SW_HIDE);
    end;
  end;

  // Forzar redibujado de la ventana y actualizar barra de estado
  InvalidateRect(hMainWnd, nil, True);
end;

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

procedure InitFontsAndBrushes;
var
  lf: TLogFont;
begin
  // Pinceles Institucionales
  hHeaderBrush := CreateSolidBrush(RGB(26, 43, 76));    // Azul Institucional Marino
  hNavBrush    := CreateSolidBrush(RGB(15, 23, 42));    // Azul Noche Oscuro
  hBgBrush     := CreateSolidBrush(RGB(241, 245, 249)); // Gris Claro Limpio

  // Pinceles para Tarjetas KPI
  hCardBlueBrush   := CreateSolidBrush(RGB(30, 58, 138)); // Azul Zafiro
  hCardPurpleBrush := CreateSolidBrush(RGB(88, 28, 135)); // Purpura
  hCardGreenBrush  := CreateSolidBrush(RGB(6, 95, 70));   // Esmeralda
  hCardRedBrush    := CreateSolidBrush(RGB(153, 27, 27)); // Carmesi Alerta
  hCardTealBrush   := CreateSolidBrush(RGB(19, 78, 74));  // Turquesa Oscuro

  // Fuentes
  FillChar(lf, SizeOf(lf), 0);
  lf.lfHeight := -12;
  lf.lfWeight := FW_NORMAL;
  StrCopy(lf.lfFaceName, 'Tahoma');
  hGuiFont := CreateFontIndirect(lf);

  lf.lfWeight := FW_BOLD;
  hBoldFont := CreateFontIndirect(lf);

  lf.lfHeight := -11;
  lf.lfWeight := FW_BOLD;
  hCardTitleFont := CreateFontIndirect(lf);

  lf.lfHeight := -10;
  lf.lfWeight := FW_NORMAL;
  hHeaderSubFont := CreateFontIndirect(lf);

  lf.lfHeight := -18;
  lf.lfWeight := FW_BOLD;
  hCardBigFont := CreateFontIndirect(lf);

  lf.lfHeight := -15;
  lf.lfWeight := FW_BOLD;
  hTitleFont := CreateFontIndirect(lf);
end;

procedure FreeFontsAndBrushes;
begin
  if hGuiFont <> 0 then DeleteObject(hGuiFont);
  if hBoldFont <> 0 then DeleteObject(hBoldFont);
  if hTitleFont <> 0 then DeleteObject(hTitleFont);
  if hCardBigFont <> 0 then DeleteObject(hCardBigFont);
  if hCardTitleFont <> 0 then DeleteObject(hCardTitleFont);
  if hHeaderSubFont <> 0 then DeleteObject(hHeaderSubFont);

  if hHeaderBrush <> 0 then DeleteObject(hHeaderBrush);
  if hNavBrush <> 0 then DeleteObject(hNavBrush);
  if hBgBrush <> 0 then DeleteObject(hBgBrush);

  if hCardBlueBrush <> 0 then DeleteObject(hCardBlueBrush);
  if hCardPurpleBrush <> 0 then DeleteObject(hCardPurpleBrush);
  if hCardGreenBrush <> 0 then DeleteObject(hCardGreenBrush);
  if hCardRedBrush <> 0 then DeleteObject(hCardRedBrush);
  if hCardTealBrush <> 0 then DeleteObject(hCardTealBrush);
end;

function CreateButton(Parent: HWND; const Caption: string; X, Y, W, H, Id: Integer): HWND;
begin
  Result := CreateWindow('BUTTON', PChar(Caption),
    WS_CHILD or WS_VISIBLE or BS_PUSHBUTTON,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hBoldFont), 1);
end;

function CreateLabel(Parent: HWND; const Caption: string; X, Y, W, H: Integer; FontToUse: HFONT): HWND;
begin
  Result := CreateWindow('STATIC', PChar(Caption),
    WS_CHILD or WS_VISIBLE or SS_LEFT,
    X, Y, W, H, Parent, 0, hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(FontToUse), 1);
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
  SetStatusMessage('Sincronizando con Supabase Cloud en tiempo real...');

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

  // Actualizar Tarjetas KPI
  SetWindowText(hCard1Val, '142 / 320');
  SetWindowText(hCard1Sub, 'Ocupadas · 178 Disponibles');

  SetWindowText(hCard2Val, PChar(IntToStr(Length(DataInhumaciones)) + ' Actas'));
  SetWindowText(hCard2Sub, 'Difuntos Registrados');

  SetWindowText(hCard3Val, '32 Titulares');
  SetWindowText(hCard3Sub, 'Cobertura Activa al Dia');

  SetWindowText(hCard4Val, '9 Mora / 4 Baja');
  SetWindowText(hCard4Sub, 'Aviso 3m / Urgente 3a');

  SetWindowText(hCard5Val, PChar(FormatearMoneda(TotalEfHoy + TotalDigHoy)));
  SetWindowText(hCard5Sub, PChar('Ef: ' + FormatearMoneda(TotalEfHoy) + ' · Dig: ' + FormatearMoneda(TotalDigHoy)));

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
      BoolToTexto(DataInhumaciones[i].EsCovid, 'COVID-19', 'Estandar')
    ]);
  end;

  // Poblar Actividad Reciente en Dashboard
  ClearListView(hLvRecentInh);
  for i := 0 to High(DataInhumaciones) do
  begin
    if i >= 10 then Break;
    AddListViewItem(hLvRecentInh, i, [
      FormatearFecha(DataInhumaciones[i].FechaInhumacion),
      DataInhumaciones[i].NombreDifunto,
      DataInhumaciones[i].DniDifunto,
      DataInhumaciones[i].NomenclaturaParcela,
      DataInhumaciones[i].EmpresaFunebrera
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

  SetWindowText(hLblResumenCaja, PChar('TOTAL RECAUDADO HOY: ' + FormatearMoneda(TotalEfHoy + TotalDigHoy) +
    '   [ Efectivo en Caja: ' + FormatearMoneda(TotalEfHoy) + '  |  Transferencias / QR: ' + FormatearMoneda(TotalDigHoy) + ' ]'));

  SetStatusMessage('Aeterna conectado a Supabase Cloud · ' + IntToStr(Length(DataInhumaciones)) + ' actas cargadas.');
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
// Creacion de la Interfaz Visual
// -------------------------------------------------------------

procedure BuildUI(hWnd: HWND);
var
  hCtrl: HWND;
  i: Integer;
begin
  for i := 0 to 5 do
    SetLength(ModuleControls[i], 0);

  // 1. BANNER INSTITUCIONAL SUPERIOR (Fondo Azul Marino)
  hHeaderBanner := CreateLabel(hWnd, '  CEMENTERIO PARQUE SAN NICOLAS · PARROQUIA SAN NICOLAS DE BARI', 0, 0, 1024, 34, hTitleFont);
  hHeaderSub    := CreateLabel(hWnd, '   Obispado de San Nicolas de los Arroyos · Sistema Integrado de Administracion General', 0, 34, 750, 24, hHeaderSubFont);
  hHeaderStatus := CreateLabel(hWnd, '● SUPABASE CLOUD: EN LINEA (TLS 1.2)  ', 750, 34, 274, 24, hBoldFont);

  // 2. BARRA DE NAVEGACION DE MODULOS (Botones Destacados)
  NavButtons[0] := CreateButton(hWnd, '📊 1. Tablero',     10,  64, 160, 36, IDC_NAV_DASHBOARD);
  NavButtons[1] := CreateButton(hWnd, '🗺️ 2. Catastro',    175, 64, 160, 36, IDC_NAV_PARCELAS);
  NavButtons[2] := CreateButton(hWnd, '🪦 3. Inhumaciones', 340, 64, 165, 36, IDC_NAV_INHUMACIONES);
  NavButtons[3] := CreateButton(hWnd, '🛡️ 4. Afiliados',    510, 64, 160, 36, IDC_NAV_AFILIADOS);
  NavButtons[4] := CreateButton(hWnd, '💰 5. Caja Diaria',  675, 64, 160, 36, IDC_NAV_CAJA);
  NavButtons[5] := CreateButton(hWnd, '📄 6. Reportes PDF', 840, 64, 165, 36, IDC_NAV_REPORTES);

  // ===========================================================
  // MODULO 0: TABLERO GENERAL (DASHBOARD)
  // ===========================================================
  // Tarjetas KPI con colores institucionales
  hCard1    := CreateLabel(hWnd, '  🗺️ CATASTRO PARCELAS', 15, 110, 190, 24, hCardTitleFont);
  hCard1Val := CreateLabel(hWnd, '  142 / 320',            15, 134, 190, 30, hCardBigFont);
  hCard1Sub := CreateLabel(hWnd, '  Ocupadas · 178 Libres', 15, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard1); AddControlToModule(0, hCard1Val); AddControlToModule(0, hCard1Sub);

  hCard2    := CreateLabel(hWnd, '  🪦 INHUMACIONES',      215, 110, 190, 24, hCardTitleFont);
  hCard2Val := CreateLabel(hWnd, '  203 Actas',            215, 134, 190, 30, hCardBigFont);
  hCard2Sub := CreateLabel(hWnd, '  Libro Sincronizado',   215, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard2); AddControlToModule(0, hCard2Val); AddControlToModule(0, hCard2Sub);

  hCard3    := CreateLabel(hWnd, '  🛡️ AFILIADOS AL DIA',   415, 110, 190, 24, hCardTitleFont);
  hCard3Val := CreateLabel(hWnd, '  32 Titulares',         415, 134, 190, 30, hCardBigFont);
  hCard3Sub := CreateLabel(hWnd, '  Cobertura Activa',     415, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard3); AddControlToModule(0, hCard3Val); AddControlToModule(0, hCard3Sub);

  hCard4    := CreateLabel(hWnd, '  ⚠️ MOROSIDAD SEGURO',  615, 110, 190, 24, hCardTitleFont);
  hCard4Val := CreateLabel(hWnd, '  9 Mora / 4 Baja',      615, 134, 190, 30, hCardBigFont);
  hCard4Sub := CreateLabel(hWnd, '  Aviso 3m / Urgente 3a',615, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard4); AddControlToModule(0, hCard4Val); AddControlToModule(0, hCard4Sub);

  hCard5    := CreateLabel(hWnd, '  💰 RECAUDACION HOY',   815, 110, 190, 24, hCardTitleFont);
  hCard5Val := CreateLabel(hWnd, '  $ 125,000.00',         815, 134, 190, 30, hCardBigFont);
  hCard5Sub := CreateLabel(hWnd, '  Ef: $85k · Dig: $40k', 815, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard5); AddControlToModule(0, hCard5Val); AddControlToModule(0, hCard5Sub);

  // Acciones Rapidas
  hCtrl := CreateGroupBox(hWnd, ' Operaciones Rapidas del Sistema ', 15, 195, 990, 110);
  AddControlToModule(0, hCtrl);

  hCtrl := CreateButton(hWnd, '🪦 Nueva Inhumacion',       30, 222, 225, 34, IDC_BTN_NUEVA_INH);
  AddControlToModule(0, hCtrl);
  hCtrl := CreateButton(hWnd, '🛡️ Cobrar Cuota Seguro',    270, 222, 225, 34, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(0, hCtrl);
  hCtrl := CreateButton(hWnd, '🗺️ Cobrar Mantenimiento',   510, 222, 235, 34, IDC_BTN_COBRAR_MANT);
  AddControlToModule(0, hCtrl);
  hCtrl := CreateButton(hWnd, '🔒 Arqueo / Cierre Caja',   760, 222, 225, 34, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(0, hCtrl);

  hCtrl := CreateButton(hWnd, '🔄 Sincronizar Supabase Ahora', 30, 262, 465, 32, IDC_BTN_SYNC);
  AddControlToModule(0, hCtrl);
  hCtrl := CreateButton(hWnd, '📂 Abrir Carpeta de Reportes PDF', 510, 262, 475, 32, IDC_BTN_ABRIR_CARPETA);
  AddControlToModule(0, hCtrl);

  // Listado de Actividad Reciente en Dashboard
  hCtrl := CreateLabel(hWnd, 'ULTIMAS INHUMACIONES Y MOVIMIENTOS ASENTADOS EN EL SISTEMA:', 15, 315, 600, 20, hBoldFont);
  AddControlToModule(0, hCtrl);

  hLvRecentInh := CreateListView(hWnd, 15, 340, 990, 270, IDC_LV_RECENT_INH);
  AddListViewColumn(hLvRecentInh, 0, 'Fecha Inhumacion', 130);
  AddListViewColumn(hLvRecentInh, 1, 'Nombre Completo del Difunto', 320);
  AddListViewColumn(hLvRecentInh, 2, 'DNI', 120);
  AddListViewColumn(hLvRecentInh, 3, 'Parcela Asignada', 140);
  AddListViewColumn(hLvRecentInh, 4, 'Empresa Funebrera Responsable', 250);
  AddControlToModule(0, hLvRecentInh);

  // ===========================================================
  // MODULO 1: CATASTRO Y PARCELAS
  // ===========================================================
  hCtrl := CreateLabel(hWnd, 'Sector:', 15, 115, 50, 22, hBoldFont);
  AddControlToModule(1, hCtrl);
  hCmbSector := CreateComboBox(hWnd, 70, 112, 170, 140, IDC_CMB_SECTOR);
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Sectores')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector A')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector E')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector Salinas')));
  SendMessage(hCmbSector, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbSector);

  hCtrl := CreateLabel(hWnd, 'Estado:', 255, 115, 55, 22, hBoldFont);
  AddControlToModule(1, hCtrl);
  hCmbEstadoParc := CreateComboBox(hWnd, 315, 112, 160, 140, IDC_CMB_ESTADO_PARC);
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Estados')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Disponible')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Ocupada')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Reservada')));
  SendMessage(hCmbEstadoParc, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbEstadoParc);

  hCtrl := CreateButton(hWnd, '💰 Cobrar Mantenimiento ($49.000)', 500, 110, 260, 30, IDC_BTN_COBRAR_MANT);
  AddControlToModule(1, hCtrl);
  hCtrl := CreateButton(hWnd, '🔄 Recargar Parcelas', 775, 110, 230, 30, IDC_BTN_SYNC);
  AddControlToModule(1, hCtrl);

  hLvParcelas := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_PARCELAS);
  AddListViewColumn(hLvParcelas, 0, 'Nomenclatura', 120);
  AddListViewColumn(hLvParcelas, 1, 'Sector', 90);
  AddListViewColumn(hLvParcelas, 2, 'Fila / Mz', 90);
  AddListViewColumn(hLvParcelas, 3, 'Parcela Nro', 90);
  AddListViewColumn(hLvParcelas, 4, 'Estado Parcela', 120);
  AddListViewColumn(hLvParcelas, 5, 'Titular de Concesion', 300);
  AddListViewColumn(hLvParcelas, 6, 'Ultimo Pago Registrado', 150);
  AddControlToModule(1, hLvParcelas);

  // ===========================================================
  // MODULO 2: LIBRO PARROQUIAL DE INHUMACIONES
  // ===========================================================
  hCtrl := CreateLabel(hWnd, 'Buscar Difunto o DNI:', 15, 115, 150, 22, hBoldFont);
  AddControlToModule(2, hCtrl);
  hEdtBuscarInh := CreateEdit(hWnd, '', 170, 112, 220, 24, IDC_EDT_BUSCAR_INH);
  AddControlToModule(2, hEdtBuscarInh);

  hCtrl := CreateButton(hWnd, '🔍 Buscar', 400, 110, 90, 30, IDC_BTN_BUSCAR_INH);
  AddControlToModule(2, hCtrl);
  hCtrl := CreateButton(hWnd, '🪦 Nueva Inhumacion', 505, 110, 170, 30, IDC_BTN_NUEVA_INH);
  AddControlToModule(2, hCtrl);
  hCtrl := CreateButton(hWnd, '📄 Emitir Acta (PDF)', 685, 110, 160, 30, IDC_BTN_ACTA_PDF);
  AddControlToModule(2, hCtrl);
  hCtrl := CreateButton(hWnd, '📄 Folio Completo (PDF)', 855, 110, 150, 30, IDC_BTN_FOLIO_PDF);
  AddControlToModule(2, hCtrl);

  hLvInh := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_INHUMACIONES);
  AddListViewColumn(hLvInh, 0, 'Fecha Inh.', 100);
  AddListViewColumn(hLvInh, 1, 'Nombre Completo del Difunto', 260);
  AddListViewColumn(hLvInh, 2, 'DNI', 110);
  AddListViewColumn(hLvInh, 3, 'Parcela', 110);
  AddListViewColumn(hLvInh, 4, 'Nivel', 65);
  AddListViewColumn(hLvInh, 5, 'Empresa Funebrera', 180);
  AddListViewColumn(hLvInh, 6, 'Protocolo Sanitario', 130);
  AddControlToModule(2, hLvInh);

  // ===========================================================
  // MODULO 3: SEGURO DE SEPELIO Y AFILIADOS
  // ===========================================================
  hCtrl := CreateLabel(hWnd, 'Filtro Cobranza:', 15, 115, 115, 22, hBoldFont);
  AddControlToModule(3, hCtrl);
  hCmbMora := CreateComboBox(hWnd, 135, 112, 260, 140, IDC_CMB_MORA);
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Afiliados')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Al Dia (Habilitados)')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Aviso: Mora >= 3 Meses')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Urgente: Riesgo Baja (>= 3 Anos)')));
  SendMessage(hCmbMora, CB_SETCURSEL, 0, 0);
  AddControlToModule(3, hCmbMora);

  hCtrl := CreateButton(hWnd, '💰 Cobrar Cuotas de Seguro', 420, 110, 230, 30, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(3, hCtrl);
  hCtrl := CreateButton(hWnd, '📄 Planilla de Ruta Cobrador (PDF)', 665, 110, 250, 30, IDC_BTN_PLANILLA_PDF);
  AddControlToModule(3, hCtrl);
  hCtrl := CreateButton(hWnd, '🔄 Recargar', 925, 110, 80, 30, IDC_BTN_SYNC);
  AddControlToModule(3, hCtrl);

  hLvAfiliados := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_AFILIADOS);
  AddListViewColumn(hLvAfiliados, 0, 'Nro Afiliado', 95);
  AddListViewColumn(hLvAfiliados, 1, 'Nombre Completo del Titular', 240);
  AddListViewColumn(hLvAfiliados, 2, 'DNI', 105);
  AddListViewColumn(hLvAfiliados, 3, 'Direccion de Cobro', 190);
  AddListViewColumn(hLvAfiliados, 4, 'Cuota Mensual', 110);
  AddListViewColumn(hLvAfiliados, 5, 'Mora', 85);
  AddListViewColumn(hLvAfiliados, 6, 'Estado Cobertura', 190);
  AddControlToModule(3, hLvAfiliados);

  // ===========================================================
  // MODULO 4: CAJA DIARIA Y ARQUEO
  // ===========================================================
  hLblResumenCaja := CreateLabel(hWnd, '  TOTAL RECAUDADO HOY: $ 125,000.00   [ Efectivo: $ 85,000.00 | Digital: $ 40,000.00 ]', 15, 110, 660, 30, hBoldFont);
  AddControlToModule(4, hLblResumenCaja);

  hCtrl := CreateButton(hWnd, '💰 Cobro en Caja', 690, 110, 140, 30, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(4, hCtrl);
  hCtrl := CreateButton(hWnd, '🔒 Acta Cierre Caja (PDF)', 840, 110, 165, 30, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(4, hCtrl);

  hLvCaja := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_CAJA);
  AddListViewColumn(hLvCaja, 0, 'Recibo Nro', 120);
  AddListViewColumn(hLvCaja, 1, 'Hora', 80);
  AddListViewColumn(hLvCaja, 2, 'Titular / Pagador', 240);
  AddListViewColumn(hLvCaja, 3, 'Concepto Imputado', 280);
  AddListViewColumn(hLvCaja, 4, 'Metodo de Pago', 110);
  AddListViewColumn(hLvCaja, 5, 'Importe', 130);
  AddControlToModule(4, hLvCaja);

  // ===========================================================
  // MODULO 5: CENTRO DE REPORTES OFICIALES PDF
  // ===========================================================
  hCtrl := CreateLabel(hWnd, 'CENTRO DE EMISION DE REPORTES OFICIALES VECTORIALES EN PDF NATIVO', 20, 115, 800, 24, hTitleFont);
  AddControlToModule(5, hCtrl);
  hCtrl := CreateLabel(hWnd, 'Haga clic en cualquiera de los botones para emitir el documento oficial e inspeccionarlo de inmediato:', 20, 145, 850, 20, hGuiFont);
  AddControlToModule(5, hCtrl);

  hCtrl := CreateButton(hWnd, '📄 1. Generar Acta Oficial de Inhumacion (PDF)', 30, 185, 450, 46, IDC_BTN_ACTA_PDF);
  AddControlToModule(5, hCtrl);
  hCtrl := CreateButton(hWnd, '📄 2. Generar Folio del Libro de Inhumaciones (PDF)', 510, 185, 450, 46, IDC_BTN_FOLIO_PDF);
  AddControlToModule(5, hCtrl);

  hCtrl := CreateButton(hWnd, '📄 3. Generar Recibo Oficial de Pago por Duplicado (PDF)', 30, 255, 450, 46, IDC_BTN_RECIBO_PDF);
  AddControlToModule(5, hCtrl);
  hCtrl := CreateButton(hWnd, '📄 4. Generar Planilla de Ruta Domiciliaria Cobrador (PDF)', 510, 255, 450, 46, IDC_BTN_PLANILLA_PDF);
  AddControlToModule(5, hCtrl);

  hCtrl := CreateButton(hWnd, '📄 5. Generar Acta de Arqueo y Cierre Diario de Caja (PDF)', 30, 325, 450, 46, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(5, hCtrl);
  hCtrl := CreateButton(hWnd, '📂 Abrir Carpeta de Reportes Generados', 510, 325, 450, 46, IDC_BTN_ABRIR_CARPETA);
  AddControlToModule(5, hCtrl);

  // Barra de Estado
  hStatusBar := CreateWindow(STATUSCLASSNAME, '',
    WS_CHILD or WS_VISIBLE or SBARS_SIZEGRIP,
    0, 0, 0, 0, hWnd, 0, hInstance, nil);
  SendMessage(hStatusBar, WM_SETFONT, WPARAM(hGuiFont), 1);

  // Mostrar el primer modulo (Tablero General)
  SwitchModule(0);

  // Cargar datos reales desde Supabase
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
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_DASHBOARD, '&1. Tablero General (KPIs)');
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_PARCELAS, '&2. Catastro & Parcelas');
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_INHUMACIONES, '&3. Libro de Inhumaciones');
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_AFILIADOS, '&4. Seguro de Sepelio y Afiliados');
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_CAJA, '&5. Caja Diaria y Arqueo');
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_REPORTES, '&6. Centro de Reportes PDF');
  AppendMenu(hMenu, MF_POPUP, hSubMenuMod, '&Modulos');

  // Menu Reportes PDF
  hSubMenuPdf := CreatePopupMenu;
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_ACTA_PDF, 'Acta Oficial de Inhumacion (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_FOLIO_PDF, 'Folio del Libro de Inhumaciones (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_RECIBO_PDF, 'Recibo Oficial por Duplicado (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_PLANILLA_PDF, 'Planilla de Ruta para Cobrador (PDF)');
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_CIERRE_CAJA, 'Acta de Cierre Diario de Caja (PDF)');
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

function MainWindowProc(hWindow: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  CmdId: Integer;
  hCtrl: HWND;
begin
  case uMsg of
    WM_CTLCOLORSTATIC:
      begin
        hCtrl := HWND(lParam);

        // Banner Institucional Superior
        if (hCtrl = hHeaderBanner) or (hCtrl = hHeaderSub) or (hCtrl = hHeaderStatus) then
        begin
          if hCtrl = hHeaderBanner then
            SetTextColor(HDC(wParam), RGB(245, 197, 24)) // Dorado
          else if hCtrl = hHeaderStatus then
            SetTextColor(HDC(wParam), RGB(16, 185, 129)) // Verde Esmeralda
          else
            SetTextColor(HDC(wParam), RGB(255, 255, 255)); // Blanco

          SetBkColor(HDC(wParam), RGB(26, 43, 76)); // Azul Marino
          Result := LRESULT(hHeaderBrush);
          Exit;
        end;

        // Tarjeta KPI 1: Parcelas (Azul Zafiro)
        if (hCtrl = hCard1) or (hCtrl = hCard1Val) or (hCtrl = hCard1Sub) then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(30, 58, 138));
          Result := LRESULT(hCardBlueBrush);
          Exit;
        end;

        // Tarjeta KPI 2: Inhumaciones (Purpura)
        if (hCtrl = hCard2) or (hCtrl = hCard2Val) or (hCtrl = hCard2Sub) then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(88, 28, 135));
          Result := LRESULT(hCardPurpleBrush);
          Exit;
        end;

        // Tarjeta KPI 3: Afiliados al Dia (Verde Bosque)
        if (hCtrl = hCard3) or (hCtrl = hCard3Val) or (hCtrl = hCard3Sub) then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(6, 95, 70));
          Result := LRESULT(hCardGreenBrush);
          Exit;
        end;

        // Tarjeta KPI 4: Morosidad (Carmesi Alerta)
        if (hCtrl = hCard4) or (hCtrl = hCard4Val) or (hCtrl = hCard4Sub) then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(153, 27, 27));
          Result := LRESULT(hCardRedBrush);
          Exit;
        end;

        // Tarjeta KPI 5: Recaudacion Hoy (Turquesa / Teal)
        if (hCtrl = hCard5) or (hCtrl = hCard5Val) or (hCtrl = hCard5Sub) then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(19, 78, 74));
          Result := LRESULT(hCardTealBrush);
          Exit;
        end;

        // Banner Resumen de Caja Diaria
        if hCtrl = hLblResumenCaja then
        begin
          SetTextColor(HDC(wParam), RGB(255, 255, 255));
          SetBkColor(HDC(wParam), RGB(19, 78, 74));
          Result := LRESULT(hCardTealBrush);
          Exit;
        end;

        // Fondo por defecto para labels y fondos de controles
        SetTextColor(HDC(wParam), RGB(15, 23, 42));
        SetBkColor(HDC(wParam), RGB(241, 245, 249));
        Result := LRESULT(hBgBrush);
      end;

    WM_COMMAND:
      begin
        CmdId := LOWORD(wParam);
        case CmdId of
          IDM_SALIR: PostMessage(hWindow, WM_CLOSE, 0, 0);
          IDM_REFRESCAR, IDC_BTN_SYNC: CargarDatosIniciales;

          // Cambio de Modulos
          IDC_NAV_DASHBOARD:    SwitchModule(0);
          IDC_NAV_PARCELAS:     SwitchModule(1);
          IDC_NAV_INHUMACIONES: SwitchModule(2);
          IDC_NAV_AFILIADOS:    SwitchModule(3);
          IDC_NAV_CAJA:         SwitchModule(4);
          IDC_NAV_REPORTES:     SwitchModule(5);

          // Reportes y Cobros
          IDC_BTN_ACTA_PDF:     AccionGenerarActaPDF;
          IDC_BTN_FOLIO_PDF:    AccionGenerarFolioPDF;
          IDC_BTN_RECIBO_PDF:   AccionGenerarReciboPDF;
          IDC_BTN_PLANILLA_PDF: AccionGenerarPlanillaRutaPDF;
          IDC_BTN_CIERRE_CAJA:  AccionGenerarCierreCajaPDF;
          IDC_BTN_COBRAR_MANT:  AccionCobrarMantenimientoParcela;
          IDC_BTN_COBRAR_CUOTA: AccionGenerarReciboPDF;
          IDC_BTN_NUEVA_INH:
            begin
              MessageBox(hWindow, 'Para asentar una nueva inhumacion, complete los datos del difunto y emita el acta oficial correspondiente.', 'Nueva Inhumacion', MB_ICONINFORMATION or MB_OK);
              AccionGenerarActaPDF;
            end;
          IDC_BTN_ABRIR_CARPETA:
            OpenFileWithShell(GetReportsDirectory);
          IDC_BTN_BUSCAR_INH:
            SetStatusMessage('Busqueda en libro de inhumaciones realizada.');

          IDM_ACERCA:
            MessageBox(hWindow,
              'Aeterna - Gestion de Sepelios y Cementerio Parque San Nicolas'#13#10 +
              'Parroquia San Nicolas de Bari · Obispado de San Nicolas'#13#10#13#10 +
              'Desarrollado en Object Pascal Win32 Nativo para Windows XP / 7 / 10 / 11'#13#10 +
              'Consumo de Memoria: < 15 MB RAM'#13#10 +
              'Conexion en Tiempo Real: Supabase PostgreSQL Cloud via TLS 1.2',
              'Acerca de Aeterna XP', MB_ICONINFORMATION or MB_OK);
        end;
        Result := 0;
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
    Result := DefWindowProc(hWindow, uMsg, wParam, lParam);
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
  InitFontsAndBrushes;

  try
    FillChar(wc, SizeOf(wc), 0);
    wc.style := CS_HREDRAW or CS_VREDRAW;
    wc.lpfnWndProc := @MainWindowProc;
    wc.hInstance := hInstance;
    wc.hCursor := LoadCursor(0, IDC_ARROW);
    wc.hbrBackground := hBgBrush;
    wc.lpszClassName := WINDOW_CLASS_NAME;

    if RegisterClass(wc) = 0 then
      Exit;

    hMenu := CreateAppMenu;

    hMainWnd := CreateWindow(
      WINDOW_CLASS_NAME,
      APP_TITLE,
      WS_OVERLAPPEDWINDOW or WS_CLIPCHILDREN,
      CW_USEDEFAULT, CW_USEDEFAULT, 1035, 680,
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
    FreeFontsAndBrushes;
  end;
end;

end.
