unit uWin32App;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, ShellAPI, CommCtrl, Windows, Messages,
  uConfig, uDataModels, uBusinessRules, uSupabaseClient, uReportsPDF,
  uParcelasService, uInhumacionesService, uAfiliadosService, uCajaService,
  uWin32Dialogs;

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
  IDM_FULLSCREEN      = 1003;
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

  // Nuevas Acciones CRUD
  IDC_BTN_EDIT_INH    = 2020;
  IDC_BTN_DEL_INH     = 2021;
  IDC_BTN_NUEVA_PARC  = 2022;
  IDC_BTN_EDIT_PARC   = 2023;
  IDC_BTN_DEL_PARC    = 2024;
  IDC_BTN_NUEVO_AFIL  = 2025;
  IDC_BTN_EDIT_AFIL   = 2026;
  IDC_BTN_DEL_AFIL    = 2027;
  IDC_BTN_NUEVO_COBRO = 2028;
  IDC_BTN_DEL_COBRO   = 2029;

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
  hAppIcon: HICON;

  // Estado Pantalla Completa
  IsFullScreen: Boolean = False;
  PrevPlacement: WINDOWPLACEMENT;

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

  // Contenedor de Acciones Rapidas en Dashboard
  hGrpAcciones: HWND;
  hBtnDashNuevaInh, hBtnDashCobrarCuota, hBtnDashCobrarMant, hBtnDashNuevoCobro: HWND;
  hBtnDashArqueo, hBtnDashSync, hBtnDashAbrirCarpeta: HWND;
  hLblRecentTitle: HWND;

  // ListViews
  hLvParcelas, hLvInh, hLvAfiliados, hLvCaja, hLvRecentInh: HWND;
  hCmbSector, hCmbEstadoParc, hCmbMora, hEdtBuscarInh: HWND;
  hLblResumenCaja: HWND;

  // Controles Modulo 1 (Catastro)
  hLblSector, hLblEstadoParc: HWND;
  hBtnNuevaParc, hBtnEditParc, hBtnCobrarMantParc, hBtnDelParc, hBtnSyncParc: HWND;

  // Controles Modulo 2 (Inhumaciones)
  hLblBuscarInh: HWND;
  hBtnBuscarInh, hBtnNuevaInh, hBtnEditInh, hBtnDelInh, hBtnActaPdf, hBtnFolioPdf, hBtnSyncInh: HWND;

  // Controles Modulo 3 (Afiliados)
  hLblFiltroMora: HWND;
  hBtnNuevoAfil, hBtnEditAfil, hBtnCobrarAfil, hBtnDelAfil, hBtnPlanillaPdf, hBtnSyncAfil: HWND;

  // Controles Modulo 4 (Caja)
  hBtnNuevoCobroCaja, hBtnDelCobroCaja, hBtnCierreCaja, hBtnSyncCaja: HWND;

  // Controles Modulo 5 (Reportes)
  hLblRepTitle, hLblRepSub: HWND;
  hBtnRepActa, hBtnRepFolio, hBtnRepRecibo, hBtnRepPlanilla, hBtnRepCierre, hBtnRepCarpeta: HWND;

  // Datos en Memoria
  DataParcelas: TParcelaArray;
  DataInhumaciones: TInhumacionArray;
  DataAfiliados: TAfiliadoArray;
  DataPagos: TPagoArray;
  TotalEfHoy, TotalDigHoy: Currency;

// -------------------------------------------------------------
// Registro y Cambio de Modulos
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

  InvalidateRect(hMainWnd, nil, True);
end;

// -------------------------------------------------------------
// Utilitarios de Interfaz Win32
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
  hHeaderBrush := CreateSolidBrush(RGB(26, 43, 76));    // Azul Marino Institucional
  hNavBrush    := CreateSolidBrush(RGB(15, 23, 42));    // Azul Noche Oscuro
  hBgBrush     := CreateSolidBrush(RGB(241, 245, 249)); // Gris Claro Limpio

  // Pinceles para Tarjetas KPI
  hCardBlueBrush   := CreateSolidBrush(RGB(30, 58, 138)); // Azul Zafiro
  hCardPurpleBrush := CreateSolidBrush(RGB(88, 28, 135)); // Purpura
  hCardGreenBrush  := CreateSolidBrush(RGB(6, 95, 70));   // Esmeralda
  hCardRedBrush    := CreateSolidBrush(RGB(153, 27, 27)); // Carmesi Alerta
  hCardTealBrush   := CreateSolidBrush(RGB(19, 78, 74));  // Turquesa Oscuro

  // Fuentes del Sistema
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

function GetSelectedListViewIndex(hLv: HWND): Integer;
begin
  Result := SendMessage(hLv, LVM_GETNEXTITEM, -1, LVNI_SELECTED);
end;

// -------------------------------------------------------------
// -------------------------------------------------------------
// Filtrado y Poblado de ListViews
// -------------------------------------------------------------

function EstadoParcelaToDisplay(AEstado: TEstadoParcela): string;
begin
  case AEstado of
    epDisponible: Result := 'Disponible';
    epOcupada:    Result := 'Ocupada';
    epReservada:  Result := 'Reservada';
    epEnMora:     Result := 'En Mora';
    epBaja:       Result := 'Baja';
    epStandby:    Result := 'Standby';
  else
    Result := 'Disponible';
  end;
end;

procedure FiltrarYMostrarParcelas;
var
  i, OutIdx, SecIdx, EstIdx: Integer;
  PasaSec, PasaEst: Boolean;
begin
  ClearListView(hLvParcelas);
  SecIdx := SendMessage(hCmbSector, CB_GETCURSEL, 0, 0);
  EstIdx := SendMessage(hCmbEstadoParc, CB_GETCURSEL, 0, 0);

  OutIdx := 0;
  for i := 0 to High(DataParcelas) do
  begin
    PasaSec := True;
    if SecIdx = 1 then PasaSec := SameText(DataParcelas[i].SectorId, 'A')
    else if SecIdx = 2 then PasaSec := SameText(DataParcelas[i].SectorId, 'B')
    else if SecIdx = 3 then PasaSec := SameText(DataParcelas[i].SectorId, 'E')
    else if SecIdx = 4 then PasaSec := (SameText(DataParcelas[i].SectorId, 'SALINAS') or SameText(DataParcelas[i].SectorId, 'Salinas'));

    PasaEst := True;
    if EstIdx = 1 then PasaEst := (DataParcelas[i].Estado = epDisponible)
    else if EstIdx = 2 then PasaEst := (DataParcelas[i].Estado = epOcupada)
    else if EstIdx = 3 then PasaEst := (DataParcelas[i].Estado = epEnMora)
    else if EstIdx = 4 then PasaEst := (DataParcelas[i].Estado = epReservada)
    else if EstIdx = 5 then PasaEst := (DataParcelas[i].Estado = epBaja);

    if PasaSec and PasaEst then
    begin
      AddListViewItem(hLvParcelas, OutIdx, [
        DataParcelas[i].Nomenclatura,
        BoolToTexto(DataParcelas[i].SectorId <> '', DataParcelas[i].SectorId, '-'),
        DataParcelas[i].ManzanaFila,
        DataParcelas[i].NumeroParcela,
        EstadoParcelaToDisplay(DataParcelas[i].Estado),
        BoolToTexto(DataParcelas[i].TitularNombre <> '', DataParcelas[i].TitularNombre, '(Sin Titular Asignado)'),
        FormatearFecha(DataParcelas[i].FechaAdquisicion),
        FormatearMoneda(DataParcelas[i].SaldoMantenimiento)
      ]);
      Inc(OutIdx);
    end;
  end;
end;

procedure FiltrarYMostrarAfiliados;
var
  i, OutIdx, MoraIdx, MesesM: Integer;
  PasaMora: Boolean;
  MoraLabel: string;
begin
  ClearListView(hLvAfiliados);
  MoraIdx := SendMessage(hCmbMora, CB_GETCURSEL, 0, 0);

  OutIdx := 0;
  for i := 0 to High(DataAfiliados) do
  begin
    MesesM := DataAfiliados[i].MesesMora;
    PasaMora := True;
    if MoraIdx = 1 then PasaMora := (DataAfiliados[i].Estado = eaActivo) and (MesesM < 3)
    else if MoraIdx = 2 then PasaMora := (MesesM >= 3) and (MesesM < 36) and (DataAfiliados[i].Estado <> eaBaja)
    else if MoraIdx = 3 then PasaMora := (MesesM >= 36) or (DataAfiliados[i].Estado = eaBaja);

    if PasaMora then
    begin
      if DataAfiliados[i].Estado = eaBaja then
        MoraLabel := 'BAJA DEFINITIVA'
      else if MesesM >= 36 then
        MoraLabel := 'URGENTE: RIESGO DE BAJA (3 ANOS)'
      else if MesesM >= 3 then
        MoraLabel := 'AVISO: MORA 3 MESES'
      else
        MoraLabel := 'AL DIA (Habilitado)';

      AddListViewItem(hLvAfiliados, OutIdx, [
        IntToStr(DataAfiliados[i].NumeroAfiliado),
        DataAfiliados[i].NombreCompleto,
        BoolToTexto(DataAfiliados[i].Dni <> '', DataAfiliados[i].Dni, 'S/D'),
        DataAfiliados[i].DireccionCobro,
        FormatearMoneda(DataAfiliados[i].MontoCuotaMensual),
        IntToStr(MesesM) + ' meses',
        MoraLabel
      ]);
      Inc(OutIdx);
    end;
  end;
end;

procedure FiltrarYMostrarInhumaciones(const FiltroTexto: string);
var
  i, OutIdx: Integer;
  FiltroUpper, NomUpper, DniUpper, ParcUpper: string;
  Pasa: Boolean;
begin
  ClearListView(hLvInh);
  FiltroUpper := UpperCase(Trim(FiltroTexto));

  OutIdx := 0;
  for i := 0 to High(DataInhumaciones) do
  begin
    Pasa := True;
    if FiltroUpper <> '' then
    begin
      NomUpper := UpperCase(DataInhumaciones[i].NombreDifunto);
      DniUpper := UpperCase(DataInhumaciones[i].DniDifunto);
      ParcUpper := UpperCase(DataInhumaciones[i].NomenclaturaParcela);
      Pasa := (Pos(FiltroUpper, NomUpper) > 0) or (Pos(FiltroUpper, DniUpper) > 0) or (Pos(FiltroUpper, ParcUpper) > 0);
    end;

    if Pasa then
    begin
      AddListViewItem(hLvInh, OutIdx, [
        FormatearFecha(DataInhumaciones[i].FechaInhumacion),
        DataInhumaciones[i].NombreDifunto,
        DataInhumaciones[i].DniDifunto,
        DataInhumaciones[i].NomenclaturaParcela,
        IntToStr(DataInhumaciones[i].NivelPosicion),
        DataInhumaciones[i].EmpresaFunebrera,
        BoolToTexto(DataInhumaciones[i].EsCovid, 'COVID-19', 'Estandar')
      ]);
      Inc(OutIdx);
    end;
  end;
end;

// -------------------------------------------------------------
// Carga de Datos y Actualizacion de Pantalla
// -------------------------------------------------------------

procedure CargarDatosIniciales;
var
  i: Integer;
  CountOcupadas, CountLibres: Integer;
  CountActivos, CountMora, CountBaja: Integer;
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

  // 3. Afiliados desde Supabase
  try
    DataAfiliados := TAfiliadosService.ObtenerTodos;
  except
    SetLength(DataAfiliados, 0);
  end;

  // 4. Caja Diaria desde Supabase
  try
    DataPagos := TCajaService.ObtenerMovimientosHoy;
    TCajaService.CalcularTotalesHoy(TotalEfHoy, TotalDigHoy);
  except
    SetLength(DataPagos, 0);
    TotalEfHoy := 0;
    TotalDigHoy := 0;
  end;

  // Actualizar Tarjetas KPI con calculo real
  CountOcupadas := 0;
  CountLibres := 0;
  for i := 0 to High(DataParcelas) do
  begin
    if DataParcelas[i].Estado = epOcupada then
      Inc(CountOcupadas)
    else if DataParcelas[i].Estado = epDisponible then
      Inc(CountLibres);
  end;

  CountActivos := 0;
  CountMora := 0;
  CountBaja := 0;
  for i := 0 to High(DataAfiliados) do
  begin
    if DataAfiliados[i].Estado = eaActivo then
      Inc(CountActivos)
    else if DataAfiliados[i].Estado = eaEnMora then
      Inc(CountMora)
    else if DataAfiliados[i].Estado = eaBaja then
      Inc(CountBaja);
  end;

  SetWindowText(hCard1Val, PChar(IntToStr(CountOcupadas) + ' / ' + IntToStr(Length(DataParcelas))));
  SetWindowText(hCard1Sub, PChar(IntToStr(CountOcupadas) + ' Ocupadas - ' + IntToStr(CountLibres) + ' Libres'));

  SetWindowText(hCard2Val, PChar(IntToStr(Length(DataInhumaciones)) + ' Actas'));
  SetWindowText(hCard2Sub, 'Difuntos Registrados');

  SetWindowText(hCard3Val, PChar(IntToStr(CountActivos) + ' Activos'));
  SetWindowText(hCard3Sub, PChar(IntToStr(Length(DataAfiliados)) + ' Titulares en Padron'));

  SetWindowText(hCard4Val, PChar(IntToStr(CountMora) + ' Mora / ' + IntToStr(CountBaja) + ' Baja'));
  SetWindowText(hCard4Sub, 'Cobranza y Seguro');

  SetWindowText(hCard5Val, PChar(FormatearMoneda(TotalEfHoy + TotalDigHoy)));
  SetWindowText(hCard5Sub, PChar('Ef: ' + FormatearMoneda(TotalEfHoy) + ' - Dig: ' + FormatearMoneda(TotalDigHoy)));

  // Poblar Actividad Reciente en Dashboard
  ClearListView(hLvRecentInh);
  for i := 0 to High(DataInhumaciones) do
  begin
    if i >= 12 then Break;
    AddListViewItem(hLvRecentInh, i, [
      FormatearFecha(DataInhumaciones[i].FechaInhumacion),
      DataInhumaciones[i].NombreDifunto,
      DataInhumaciones[i].DniDifunto,
      DataInhumaciones[i].NomenclaturaParcela,
      DataInhumaciones[i].EmpresaFunebrera
    ]);
  end;

  // Poblar Listados Filtrados
  FiltrarYMostrarInhumaciones('');
  FiltrarYMostrarParcelas;
  FiltrarYMostrarAfiliados;

  // Poblar ListView Caja
  ClearListView(hLvCaja);
  for i := 0 to High(DataPagos) do
  begin
    AddListViewItem(hLvCaja, i, [
      DataPagos[i].NroRecibo,
      FormatearFecha(DataPagos[i].FechaPago),
      DataPagos[i].TitularNombre,
      DataPagos[i].Observaciones,
      MetodoPagoToStr(DataPagos[i].MetodoPago),
      FormatearMoneda(DataPagos[i].MontoPagado)
    ]);
  end;

  SetWindowText(hLblResumenCaja, PChar('TOTAL RECAUDADO HOY: ' + FormatearMoneda(TotalEfHoy + TotalDigHoy) +
    '   [ Efectivo en Caja: ' + FormatearMoneda(TotalEfHoy) + '  |  Transferencias / QR: ' + FormatearMoneda(TotalDigHoy) + ' ]'));

  SetStatusMessage('Aeterna conectado a Supabase Cloud - ' + IntToStr(Length(DataInhumaciones)) + ' actas, ' + IntToStr(Length(DataParcelas)) + ' parcelas, ' + IntToStr(Length(DataAfiliados)) + ' afiliados.');
end;

// -------------------------------------------------------------
// Operaciones CRUD: INHUMACIONES
// -------------------------------------------------------------

procedure AccionNuevaInhumacion;
var
  Inh: TInhumacion;
  Ruta: string;
begin
  FillChar(Inh, SizeOf(Inh), 0);
  Inh.FechaInhumacion := FormatDateTime('yyyy-mm-dd', Now);
  Inh.NivelPosicion := 1;
  Inh.EmpresaFunebrera := 'Servicios Sociales Chamical - Mat. Fun. 104';

  if ShowDlgInhumacion(hMainWnd, False, Inh) then
  begin
    SetStatusMessage('Guardando nueva inhumacion en Supabase Cloud...');
    if TInhumacionesService.CrearInhumacion(Inh) then
    begin
      MessageBox(hMainWnd, PChar('Acta de Inhumacion guardada exitosamente en Supabase Cloud.'#13#10 +
        'Difunto: ' + Inh.NombreDifunto + #13#10 +
        'Parcela: ' + Inh.NomenclaturaParcela), 'Inhumacion Registrada', MB_ICONINFORMATION or MB_OK);

      // Emitir Acta Oficial en PDF
      Ruta := GetReportsDirectory + '\Acta_Inhumacion_' + FormatDateTime('yyyymmdd_hhnnss', Now) + '.pdf';
      GenerarActaInhumacionPDF(Inh, Ruta);
      OpenFileWithShell(Ruta);

      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al asentar la inhumacion en Supabase. Verifique la conexion a Internet.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionModificarInhumacion;
var
  Idx: Integer;
  Inh: TInhumacion;
begin
  Idx := GetSelectedListViewIndex(hLvInh);
  if (Idx < 0) or (Idx > High(DataInhumaciones)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un acta de inhumacion del listado para modificar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Inh := DataInhumaciones[Idx];
  if ShowDlgInhumacion(hMainWnd, True, Inh) then
  begin
    SetStatusMessage('Actualizando acta de inhumacion en Supabase...');
    if TInhumacionesService.ActualizarInhumacion(Inh.Id, Inh) then
    begin
      MessageBox(hMainWnd, 'Acta de inhumacion actualizada correctamente.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al actualizar en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionEliminarInhumacion;
var
  Idx: Integer;
  Inh: TInhumacion;
begin
  Idx := GetSelectedListViewIndex(hLvInh);
  if (Idx < 0) or (Idx > High(DataInhumaciones)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un acta de inhumacion para eliminar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Inh := DataInhumaciones[Idx];
  if MessageBox(hMainWnd,
    PChar('Esta seguro de eliminar definitivamente el acta de inhumacion de:'#13#10#13#10 +
      'Difunto: ' + Inh.NombreDifunto + #13#10 +
      'DNI: ' + Inh.DniDifunto + #13#10 +
      'Parcela: ' + Inh.NomenclaturaParcela + #13#10#13#10 +
      'Esta operacion borrara el registro en Supabase Cloud.'),
    'Confirmar Eliminacion', MB_ICONQUESTION or MB_YESNO) = IDYES then
  begin
    SetStatusMessage('Eliminando acta de inhumacion de Supabase...');
    if TInhumacionesService.EliminarInhumacion(Inh.Id) then
    begin
      MessageBox(hMainWnd, 'Acta eliminada exitosamente.', 'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al eliminar el registro en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

// -------------------------------------------------------------
// Operaciones CRUD: PARCELAS
// -------------------------------------------------------------

procedure AccionNuevaParcela;
var
  Parc: TParcela;
begin
  FillChar(Parc, SizeOf(Parc), 0);
  Parc.SectorId := 'A';
  Parc.CapacidadTotal := 3;
  Parc.Estado := epDisponible;

  if ShowDlgParcela(hMainWnd, False, Parc) then
  begin
    SetStatusMessage('Guardando nueva parcela en Supabase...');
    if TParcelasService.CrearParcela(Parc) then
    begin
      MessageBox(hMainWnd, 'Parcela creada exitosamente en Supabase Cloud.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al crear la parcela en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionModificarParcela;
var
  Idx: Integer;
  Parc: TParcela;
begin
  Idx := GetSelectedListViewIndex(hLvParcelas);
  if (Idx < 0) or (Idx > High(DataParcelas)) then
  begin
    MessageBox(hMainWnd, 'Seleccione una parcela del listado para modificar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Parc := DataParcelas[Idx];
  if ShowDlgParcela(hMainWnd, True, Parc) then
  begin
    SetStatusMessage('Actualizando parcela en Supabase...');
    if TParcelasService.ActualizarParcela(Parc.Id, Parc) then
    begin
      MessageBox(hMainWnd, 'Datos de la parcela actualizados exitosamente.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al actualizar la parcela en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionEliminarParcela;
var
  Idx: Integer;
  Parc: TParcela;
begin
  Idx := GetSelectedListViewIndex(hLvParcelas);
  if (Idx < 0) or (Idx > High(DataParcelas)) then
  begin
    MessageBox(hMainWnd, 'Seleccione una parcela del listado para eliminar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Parc := DataParcelas[Idx];
  if MessageBox(hMainWnd,
    PChar('Esta seguro de eliminar la Parcela ' + Parc.Nomenclatura + ' de Supabase Cloud?'#13#10#13#10 +
      'Sector: ' + Parc.SectorId + ' - Fila: ' + Parc.ManzanaFila + ' - Nro: ' + Parc.NumeroParcela),
    'Confirmar Eliminacion', MB_ICONQUESTION or MB_YESNO) = IDYES then
  begin
    SetStatusMessage('Eliminando parcela de Supabase...');
    if TParcelasService.EliminarParcela(Parc.Id) then
    begin
      MessageBox(hMainWnd, 'Parcela eliminada exitosamente.', 'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al eliminar la parcela.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionCobrarMantenimientoParcela;
var
  Idx: Integer;
  Nomenclatura, Titular, Periodo, Recibo: string;
  Monto: Currency;
  Metodo: TMetodoPago;
  Pago: TPagoMantenimiento;
  Ruta: string;
  ParcId: string;
begin
  Idx := GetSelectedListViewIndex(hLvParcelas);
  if (Idx >= 0) and (Idx <= High(DataParcelas)) then
  begin
    Nomenclatura := DataParcelas[Idx].Nomenclatura;
    Titular := DataParcelas[Idx].TitularNombre;
    ParcId := DataParcelas[Idx].Id;
  end
  else
  begin
    Nomenclatura := 'A-01-01';
    Titular := 'Titular Concesion';
    ParcId := '';
  end;

  Monto := 49000;
  Metodo := mpEfectivo;
  Periodo := 'Anual 2026/2027';
  Recibo := 'MANT-' + FormatDateTime('hhnnss', Now);

  if ShowDlgCobroMantenimiento(hMainWnd, Nomenclatura, Titular, Monto, Metodo, Periodo, Recibo) then
  begin
    SetStatusMessage('Registrando cobro de mantenimiento en Supabase...');
    TCajaService.RegistrarPago(Recibo, ParcId, '', Titular, 'Mantenimiento Parcela ' + Nomenclatura, Monto, Metodo, 'Admin Catastro', Periodo);

    // Emitir Recibo Oficial en PDF
    FillChar(Pago, SizeOf(Pago), 0);
    Pago.NroRecibo := Recibo;
    Pago.TitularNombre := Titular;
    Pago.MontoPagado := Monto;
    Pago.PeriodoCubierto := Periodo;
    Pago.MetodoPago := Metodo;
    Pago.OperadorNombre := 'Admin General';
    Pago.Observaciones := 'Mantenimiento Parcela ' + Nomenclatura;

    Ruta := GetReportsDirectory + '\Recibo_Mantenimiento_' + Pago.NroRecibo + '.pdf';
    GenerarReciboPagoPDF(Pago, Ruta);

    MessageBox(hMainWnd, PChar('Cobro de mantenimiento registrado exitosamente.'#13#10 +
      'Se genero el recibo oficial por duplicado: ' + Ruta), 'Cobro Registrado', MB_ICONINFORMATION or MB_OK);
    OpenFileWithShell(Ruta);

    CargarDatosIniciales;
  end;
end;

// -------------------------------------------------------------
// Operaciones CRUD: AFILIADOS
// -------------------------------------------------------------

procedure AccionNuevoAfiliado;
var
  Afil: TAfiliadoSeguro;
begin
  FillChar(Afil, SizeOf(Afil), 0);
  Afil.NumeroAfiliado := Length(DataAfiliados) + 101;
  Afil.MontoCuotaMensual := 18000;
  Afil.ZonaCobro := 'Zona Centro';
  Afil.CobradorAsignado := 'Cobrador 1';
  Afil.Estado := eaActivo;

  if ShowDlgAfiliado(hMainWnd, False, Afil) then
  begin
    SetStatusMessage('Guardando nuevo afiliado en Supabase...');
    if TAfiliadosService.CrearAfiliado(Afil) then
    begin
      MessageBox(hMainWnd, 'Afiliado registrado exitosamente en Supabase Cloud.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al registrar afiliado en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionModificarAfiliado;
var
  Idx: Integer;
  Afil: TAfiliadoSeguro;
begin
  Idx := GetSelectedListViewIndex(hLvAfiliados);
  if (Idx < 0) or (Idx > High(DataAfiliados)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un afiliado del listado para modificar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Afil := DataAfiliados[Idx];
  if ShowDlgAfiliado(hMainWnd, True, Afil) then
  begin
    SetStatusMessage('Actualizando datos de afiliado en Supabase...');
    if TAfiliadosService.ActualizarAfiliado(Afil.Id, Afil) then
    begin
      MessageBox(hMainWnd, 'Datos de afiliado actualizados correctamente.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al actualizar afiliado en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionEliminarAfiliado;
var
  Idx: Integer;
  Afil: TAfiliadoSeguro;
begin
  Idx := GetSelectedListViewIndex(hLvAfiliados);
  if (Idx < 0) or (Idx > High(DataAfiliados)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un afiliado para dar de baja o eliminar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Afil := DataAfiliados[Idx];
  if MessageBox(hMainWnd,
    PChar('Esta seguro de eliminar al Afiliado Nro ' + IntToStr(Afil.NumeroAfiliado) + '?'#13#10#13#10 +
      'Titular: ' + Afil.NombreCompleto + #13#10 +
      'DNI: ' + Afil.Dni + #13#10#13#10 +
      'Esta operacion borrara el registro en Supabase Cloud.'),
    'Confirmar Eliminacion', MB_ICONQUESTION or MB_YESNO) = IDYES then
  begin
    SetStatusMessage('Eliminando afiliado de Supabase...');
    if TAfiliadosService.EliminarAfiliado(Afil.Id) then
    begin
      MessageBox(hMainWnd, 'Afiliado eliminado exitosamente.', 'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al eliminar el afiliado.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

procedure AccionCobrarCuotaSeguro;
var
  Idx: Integer;
  Titular, Concepto, Recibo: string;
  Monto: Currency;
  Metodo: TMetodoPago;
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  Idx := GetSelectedListViewIndex(hLvAfiliados);
  if (Idx >= 0) and (Idx <= High(DataAfiliados)) then
  begin
    Titular := DataAfiliados[Idx].NombreCompleto;
    Concepto := 'Cuota Seguro Sepelio Afiliado Nro ' + IntToStr(DataAfiliados[Idx].NumeroAfiliado);
    Monto := DataAfiliados[Idx].MontoCuotaMensual;
  end
  else
  begin
    Titular := 'Afiliado Seguro';
    Concepto := 'Cuota Seguro Sepelio';
    Monto := 18000;
  end;

  Recibo := 'SEG-' + FormatDateTime('hhnnss', Now);
  Metodo := mpEfectivo;

  if ShowDlgCobroCaja(hMainWnd, Titular, Concepto, Monto, Metodo, Recibo) then
  begin
    SetStatusMessage('Registrando cobro de cuota en Supabase...');
    TCajaService.RegistrarPago(Recibo, '', '', Titular, Concepto, Monto, Metodo, 'Cobrador General', FormatDateTime('yyyy-mm', Now));

    // Emitir Recibo Oficial en PDF
    FillChar(Pago, SizeOf(Pago), 0);
    Pago.NroRecibo := Recibo;
    Pago.TitularNombre := Titular;
    Pago.MontoPagado := Monto;
    Pago.PeriodoCubierto := 'Mes ' + FormatDateTime('mm/yyyy', Now);
    Pago.MetodoPago := Metodo;
    Pago.OperadorNombre := 'Cobrador General';
    Pago.Observaciones := Concepto;

    Ruta := GetReportsDirectory + '\Recibo_Cuota_' + Pago.NroRecibo + '.pdf';
    GenerarReciboPagoPDF(Pago, Ruta);

    MessageBox(hMainWnd, PChar('Cobro de cuota asentado exitosamente.'#13#10 +
      'Se emitio el recibo oficial por duplicado: ' + Ruta), 'Cobro Registrado', MB_ICONINFORMATION or MB_OK);
    OpenFileWithShell(Ruta);

    CargarDatosIniciales;
  end;
end;

// -------------------------------------------------------------
// Operaciones CRUD: CAJA DIARIA
// -------------------------------------------------------------

procedure AccionNuevoCobroCaja;
var
  Titular, Concepto, Recibo: string;
  Monto: Currency;
  Metodo: TMetodoPago;
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  Titular := '';
  Concepto := 'Cobro General de Servicios';
  Monto := 18000;
  Metodo := mpEfectivo;
  Recibo := 'REC-' + FormatDateTime('hhnnss', Now);

  if ShowDlgCobroCaja(hMainWnd, Titular, Concepto, Monto, Metodo, Recibo) then
  begin
    SetStatusMessage('Registrando ingreso en caja...');
    TCajaService.RegistrarPago(Recibo, '', '', Titular, Concepto, Monto, Metodo, 'Caja Central', FormatDateTime('yyyy-mm-dd', Now));

    // Emitir Recibo Oficial en PDF
    FillChar(Pago, SizeOf(Pago), 0);
    Pago.NroRecibo := Recibo;
    Pago.TitularNombre := Titular;
    Pago.MontoPagado := Monto;
    Pago.PeriodoCubierto := 'Dia ' + FormatDateTime('dd/mm/yyyy', Now);
    Pago.MetodoPago := Metodo;
    Pago.OperadorNombre := 'Caja Central';
    Pago.Observaciones := Concepto;

    Ruta := GetReportsDirectory + '\Recibo_Caja_' + Pago.NroRecibo + '.pdf';
    GenerarReciboPagoPDF(Pago, Ruta);

    MessageBox(hMainWnd, PChar('Cobro registrado exitosamente en Caja Diaria.'#13#10 +
      'Se emitio el recibo oficial por duplicado: ' + Ruta), 'Ingreso Registrado', MB_ICONINFORMATION or MB_OK);
    OpenFileWithShell(Ruta);

    CargarDatosIniciales;
  end;
end;

procedure AccionEliminarCobroCaja;
var
  Idx: Integer;
  Pago: TPagoMantenimiento;
begin
  Idx := GetSelectedListViewIndex(hLvCaja);
  if (Idx < 0) or (Idx > High(DataPagos)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un movimiento de caja del listado para anular.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Pago := DataPagos[Idx];
  if MessageBox(hMainWnd,
    PChar('Esta seguro de anular el cobro con Recibo Nro ' + Pago.NroRecibo + '?'#13#10#13#10 +
      'Titular: ' + Pago.TitularNombre + #13#10 +
      'Importe: ' + FormatearMoneda(Pago.MontoPagado) + #13#10#13#10 +
      'Esta operacion descontara el monto de la caja en Supabase Cloud.'),
    'Confirmar Anulacion', MB_ICONQUESTION or MB_YESNO) = IDYES then
  begin
    SetStatusMessage('Anulando movimiento de caja en Supabase...');
    if TCajaService.EliminarPago(Pago.Id) then
    begin
      MessageBox(hMainWnd, 'Movimiento anulado exitosamente.', 'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
      MessageBox(hMainWnd, 'Error al anular el movimiento en Supabase.', 'Error', MB_ICONERROR or MB_OK);
  end;
end;

// -------------------------------------------------------------
// Reportes PDF
// -------------------------------------------------------------

procedure AccionGenerarActaPDF;
var
  Idx: Integer;
  Inh: TInhumacion;
  Ruta: string;
begin
  Idx := GetSelectedListViewIndex(hLvInh);
  if (Idx >= 0) and (Idx <= High(DataInhumaciones)) then
    Inh := DataInhumaciones[Idx]
  else if Length(DataInhumaciones) > 0 then
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
  SetStatusMessage('Acta de Inhumacion generada exitosamente: ' + Inh.NombreDifunto);
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
  Idx: Integer;
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  Idx := GetSelectedListViewIndex(hLvCaja);
  if (Idx >= 0) and (Idx <= High(DataPagos)) then
    Pago := DataPagos[Idx]
  else if Length(DataPagos) > 0 then
    Pago := DataPagos[0]
  else
  begin
    FillChar(Pago, SizeOf(Pago), 0);
    Pago.NroRecibo := 'REC-' + FormatDateTime('hhnnss', Now);
    Pago.TitularNombre := 'Marta Beatriz Suarez';
    Pago.MontoPagado := 36000;
    Pago.PeriodoCubierto := 'Periodo Vigente 2026';
    Pago.MetodoPago := mpEfectivo;
    Pago.OperadorNombre := 'Administracion General';
    Pago.Observaciones := 'Cobro de Mantenimiento de Parcela';
  end;

  Ruta := GetReportsDirectory + '\Recibo_Oficial_' + Pago.NroRecibo + '.pdf';
  GenerarReciboPagoPDF(Pago, Ruta);
  SetStatusMessage('Recibo oficial por duplicado generado: ' + Pago.NroRecibo);
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

// -------------------------------------------------------------
// Pantalla Completa (Full Screen F11)
// -------------------------------------------------------------

procedure ToggleFullScreen(hWnd: HWND);
var
  dwStyle: DWORD;
  rcScreen: RECT;
begin
  IsFullScreen := not IsFullScreen;
  if IsFullScreen then
  begin
    GetWindowPlacement(hWnd, @PrevPlacement);
    dwStyle := GetWindowLong(hWnd, GWL_STYLE);
    SetWindowLong(hWnd, GWL_STYLE, dwStyle and not (WS_CAPTION or WS_THICKFRAME));
    rcScreen.Left := 0;
    rcScreen.Top := 0;
    rcScreen.Right := GetSystemMetrics(SM_CXSCREEN);
    rcScreen.Bottom := GetSystemMetrics(SM_CYSCREEN);
    SetWindowPos(hWnd, HWND_TOP, rcScreen.Left, rcScreen.Top, rcScreen.Right, rcScreen.Bottom,
      SWP_NOZORDER or SWP_FRAMECHANGED);
    SetStatusMessage('Modo Pantalla Completa activado. Presione F11 para restaurar.');
  end
  else
  begin
    dwStyle := GetWindowLong(hWnd, GWL_STYLE);
    SetWindowLong(hWnd, GWL_STYLE, dwStyle or WS_CAPTION or WS_THICKFRAME);
    SetWindowPlacement(hWnd, @PrevPlacement);
    SetWindowPos(hWnd, 0, 0, 0, 0, 0,
      SWP_NOMOVE or SWP_NOSIZE or SWP_NOZORDER or SWP_FRAMECHANGED);
    SetStatusMessage('Modo Ventana restaurado.');
  end;
end;

// -------------------------------------------------------------
// Disposicion Dinamica Responsiva (WM_SIZE)
// -------------------------------------------------------------

procedure UpdateLayout(cxClient, cyClient: Integer);
var
  btnW, cardW, i, x, w: Integer;
  innerW, qW: Integer;
begin
  if cxClient < 600 then cxClient := 600;
  if cyClient < 400 then cyClient := 400;

  // 1. Cabecera Banner Superior
  MoveWindow(hHeaderBanner, 0, 0, cxClient, 34, True);
  MoveWindow(hHeaderSub, 0, 34, cxClient - 320, 24, True);
  MoveWindow(hHeaderStatus, cxClient - 320, 34, 320, 24, True);

  // 2. Botones de Navegacion (Espaciados uniformemente)
  btnW := (cxClient - 20) div 6;
  for i := 0 to 5 do
    MoveWindow(NavButtons[i], 10 + i * btnW, 64, btnW - 4, 36, True);

  // ===========================================================
  // Modulo 0: Tablero General
  // ===========================================================
  cardW := (cxClient - 30) div 5;
  // Card 1
  x := 15; w := cardW - 8;
  MoveWindow(hCard1, x, 110, w, 24, True);
  MoveWindow(hCard1Val, x, 134, w, 30, True);
  MoveWindow(hCard1Sub, x, 164, w, 22, True);
  // Card 2
  x := 15 + cardW;
  MoveWindow(hCard2, x, 110, w, 24, True);
  MoveWindow(hCard2Val, x, 134, w, 30, True);
  MoveWindow(hCard2Sub, x, 164, w, 22, True);
  // Card 3
  x := 15 + cardW * 2;
  MoveWindow(hCard3, x, 110, w, 24, True);
  MoveWindow(hCard3Val, x, 134, w, 30, True);
  MoveWindow(hCard3Sub, x, 164, w, 22, True);
  // Card 4
  x := 15 + cardW * 3;
  MoveWindow(hCard4, x, 110, w, 24, True);
  MoveWindow(hCard4Val, x, 134, w, 30, True);
  MoveWindow(hCard4Sub, x, 164, w, 22, True);
  // Card 5
  x := 15 + cardW * 4;
  MoveWindow(hCard5, x, 110, w, 24, True);
  MoveWindow(hCard5Val, x, 134, w, 30, True);
  MoveWindow(hCard5Sub, x, 164, w, 22, True);

  // GroupBox de Operaciones Rapidas
  MoveWindow(hGrpAcciones, 15, 195, cxClient - 30, 115, True);
  innerW := (cxClient - 60);
  qW := innerW div 4;
  MoveWindow(hBtnDashNuevaInh,    25, 220, qW - 8, 34, True);
  MoveWindow(hBtnDashCobrarCuota, 25 + qW, 220, qW - 8, 34, True);
  MoveWindow(hBtnDashCobrarMant,  25 + qW * 2, 220, qW - 8, 34, True);
  MoveWindow(hBtnDashNuevoCobro,  25 + qW * 3, 220, qW - 8, 34, True);

  qW := innerW div 3;
  MoveWindow(hBtnDashArqueo,       25, 262, qW - 8, 34, True);
  MoveWindow(hBtnDashSync,         25 + qW, 262, qW - 8, 34, True);
  MoveWindow(hBtnDashAbrirCarpeta, 25 + qW * 2, 262, qW - 8, 34, True);

  // Listado de Actividad Reciente
  MoveWindow(hLblRecentTitle, 15, 320, cxClient - 30, 20, True);
  MoveWindow(hLvRecentInh, 15, 345, cxClient - 30, cyClient - 375, True);

  // ===========================================================
  // Modulo 1: Catastro y Parcelas
  // ===========================================================
  MoveWindow(hLvParcelas, 15, 150, cxClient - 30, cyClient - 180, True);

  // ===========================================================
  // Modulo 2: Inhumaciones
  // ===========================================================
  MoveWindow(hLvInh, 15, 150, cxClient - 30, cyClient - 180, True);

  // ===========================================================
  // Modulo 3: Afiliados
  // ===========================================================
  MoveWindow(hLvAfiliados, 15, 150, cxClient - 30, cyClient - 180, True);

  // ===========================================================
  // Modulo 4: Caja Diaria
  // ===========================================================
  MoveWindow(hLblResumenCaja, 15, 110, cxClient - 520, 32, True);
  MoveWindow(hBtnNuevoCobroCaja, cxClient - 500, 110, 130, 32, True);
  MoveWindow(hBtnDelCobroCaja,   cxClient - 365, 110, 130, 32, True);
  MoveWindow(hBtnCierreCaja,     cxClient - 230, 110, 140, 32, True);
  MoveWindow(hBtnSyncCaja,       cxClient - 85,  110, 70,  32, True);
  MoveWindow(hLvCaja, 15, 150, cxClient - 30, cyClient - 180, True);

  // ===========================================================
  // Modulo 5: Reportes PDF
  // ===========================================================
  qW := (cxClient - 60) div 2;
  MoveWindow(hBtnRepActa,     20, 185, qW, 46, True);
  MoveWindow(hBtnRepFolio,    30 + qW, 185, qW, 46, True);
  MoveWindow(hBtnRepRecibo,   20, 250, qW, 46, True);
  MoveWindow(hBtnRepPlanilla, 30 + qW, 250, qW, 46, True);
  MoveWindow(hBtnRepCierre,   20, 315, qW, 46, True);
  MoveWindow(hBtnRepCarpeta,  30 + qW, 315, qW, 46, True);

  SendMessage(hStatusBar, WM_SIZE, 0, 0);
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

  // 1. BANNER INSTITUCIONAL SUPERIOR (Texto Limpio sin caracteres corruptos)
  hHeaderBanner := CreateLabel(hWnd, '  CEMENTERIO PARQUE SAN NICOLAS - PARROQUIA SAN NICOLAS DE BARI', 0, 0, 1024, 34, hTitleFont);
  hHeaderSub    := CreateLabel(hWnd, '   Obispado de San Nicolas de los Arroyos - Sistema Integrado de Administracion General', 0, 34, 750, 24, hHeaderSubFont);
  hHeaderStatus := CreateLabel(hWnd, '* SUPABASE CLOUD: EN LINEA (TLS 1.2)  ', 750, 34, 274, 24, hBoldFont);

  // 2. BARRA DE NAVEGACION DE MODULOS
  NavButtons[0] := CreateButton(hWnd, '[1] Tablero General',    10,  64, 160, 36, IDC_NAV_DASHBOARD);
  NavButtons[1] := CreateButton(hWnd, '[2] Catastro y Parcelas',175, 64, 160, 36, IDC_NAV_PARCELAS);
  NavButtons[2] := CreateButton(hWnd, '[3] Libro Inhumaciones', 340, 64, 165, 36, IDC_NAV_INHUMACIONES);
  NavButtons[3] := CreateButton(hWnd, '[4] Afiliados Seguro',   510, 64, 160, 36, IDC_NAV_AFILIADOS);
  NavButtons[4] := CreateButton(hWnd, '[5] Caja Diaria',        675, 64, 160, 36, IDC_NAV_CAJA);
  NavButtons[5] := CreateButton(hWnd, '[6] Reportes PDF',       840, 64, 165, 36, IDC_NAV_REPORTES);

  // ===========================================================
  // MODULO 0: TABLERO GENERAL (DASHBOARD)
  // ===========================================================
  hCard1    := CreateLabel(hWnd, '  CATASTRO PARCELAS',  15, 110, 190, 24, hCardTitleFont);
  hCard1Val := CreateLabel(hWnd, '  142 / 320',          15, 134, 190, 30, hCardBigFont);
  hCard1Sub := CreateLabel(hWnd, '  Ocupadas - Libres',  15, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard1); AddControlToModule(0, hCard1Val); AddControlToModule(0, hCard1Sub);

  hCard2    := CreateLabel(hWnd, '  INHUMACIONES',       215, 110, 190, 24, hCardTitleFont);
  hCard2Val := CreateLabel(hWnd, '  203 Actas',          215, 134, 190, 30, hCardBigFont);
  hCard2Sub := CreateLabel(hWnd, '  Libro Sincronizado', 215, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard2); AddControlToModule(0, hCard2Val); AddControlToModule(0, hCard2Sub);

  hCard3    := CreateLabel(hWnd, '  AFILIADOS AL DIA',   415, 110, 190, 24, hCardTitleFont);
  hCard3Val := CreateLabel(hWnd, '  32 Titulares',       415, 134, 190, 30, hCardBigFont);
  hCard3Sub := CreateLabel(hWnd, '  Cobertura Activa',   415, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard3); AddControlToModule(0, hCard3Val); AddControlToModule(0, hCard3Sub);

  hCard4    := CreateLabel(hWnd, '  MOROSIDAD SEGURO',   615, 110, 190, 24, hCardTitleFont);
  hCard4Val := CreateLabel(hWnd, '  9 Mora / 4 Baja',    615, 134, 190, 30, hCardBigFont);
  hCard4Sub := CreateLabel(hWnd, '  Aviso 3m / Baja 3a', 615, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard4); AddControlToModule(0, hCard4Val); AddControlToModule(0, hCard4Sub);

  hCard5    := CreateLabel(hWnd, '  RECAUDACION HOY',    815, 110, 190, 24, hCardTitleFont);
  hCard5Val := CreateLabel(hWnd, '  $ 125,000.00',       815, 134, 190, 30, hCardBigFont);
  hCard5Sub := CreateLabel(hWnd, '  Efectivo - Digital', 815, 164, 190, 22, hGuiFont);
  AddControlToModule(0, hCard5); AddControlToModule(0, hCard5Val); AddControlToModule(0, hCard5Sub);

  // Contenedor de Operaciones Rapidas
  hGrpAcciones := CreateGroupBox(hWnd, ' Operaciones Rapidas del Sistema ', 15, 195, 990, 115);
  AddControlToModule(0, hGrpAcciones);

  hBtnDashNuevaInh := CreateButton(hWnd, '+ Nueva Inhumacion', 25, 220, 235, 34, IDC_BTN_NUEVA_INH);
  AddControlToModule(0, hBtnDashNuevaInh);
  hBtnDashCobrarCuota := CreateButton(hWnd, '$ Cobrar Cuota Seguro', 270, 220, 235, 34, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(0, hBtnDashCobrarCuota);
  hBtnDashCobrarMant := CreateButton(hWnd, '$ Cobrar Mantenimiento', 515, 220, 235, 34, IDC_BTN_COBRAR_MANT);
  AddControlToModule(0, hBtnDashCobrarMant);
  hBtnDashNuevoCobro := CreateButton(hWnd, '+ Cobro en Caja', 760, 220, 235, 34, IDC_BTN_NUEVO_COBRO);
  AddControlToModule(0, hBtnDashNuevoCobro);

  hBtnDashArqueo := CreateButton(hWnd, 'Arqueo / Cierre Caja', 25, 262, 310, 34, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(0, hBtnDashArqueo);
  hBtnDashSync := CreateButton(hWnd, 'Sincronizar Supabase Ahora', 345, 262, 325, 34, IDC_BTN_SYNC);
  AddControlToModule(0, hBtnDashSync);
  hBtnDashAbrirCarpeta := CreateButton(hWnd, 'Abrir Carpeta de Reportes PDF', 680, 262, 315, 34, IDC_BTN_ABRIR_CARPETA);
  AddControlToModule(0, hBtnDashAbrirCarpeta);

  // Listado de Actividad Reciente
  hLblRecentTitle := CreateLabel(hWnd, 'ULTIMAS INHUMACIONES Y MOVIMIENTOS ASENTADOS EN EL SISTEMA:', 15, 320, 700, 20, hBoldFont);
  AddControlToModule(0, hLblRecentTitle);

  hLvRecentInh := CreateListView(hWnd, 15, 345, 990, 265, IDC_LV_RECENT_INH);
  AddListViewColumn(hLvRecentInh, 0, 'Fecha Inhumacion', 130);
  AddListViewColumn(hLvRecentInh, 1, 'Nombre Completo del Difunto', 320);
  AddListViewColumn(hLvRecentInh, 2, 'DNI', 120);
  AddListViewColumn(hLvRecentInh, 3, 'Parcela Asignada', 140);
  AddListViewColumn(hLvRecentInh, 4, 'Empresa Funebrera Responsable', 250);
  AddControlToModule(0, hLvRecentInh);

  // ===========================================================
  // MODULO 1: CATASTRO Y PARCELAS (CRUD COMPLETO)
  // ===========================================================
  hLblSector := CreateLabel(hWnd, 'Sector:', 15, 115, 50, 22, hBoldFont);
  AddControlToModule(1, hLblSector);
  hCmbSector := CreateComboBox(hWnd, 70, 112, 130, 140, IDC_CMB_SECTOR);
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Sectores')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector A')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector B')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector E')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector Salinas')));
  SendMessage(hCmbSector, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbSector);

  hLblEstadoParc := CreateLabel(hWnd, 'Estado:', 210, 115, 50, 22, hBoldFont);
  AddControlToModule(1, hLblEstadoParc);
  hCmbEstadoParc := CreateComboBox(hWnd, 265, 112, 130, 140, IDC_CMB_ESTADO_PARC);
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Estados')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Disponible')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Ocupada')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('En Mora')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Reservada')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Baja')));
  SendMessage(hCmbEstadoParc, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbEstadoParc);

  hBtnNuevaParc := CreateButton(hWnd, '+ Nueva Parcela', 410, 110, 120, 30, IDC_BTN_NUEVA_PARC);
  AddControlToModule(1, hBtnNuevaParc);
  hBtnEditParc := CreateButton(hWnd, '* Modificar', 535, 110, 95, 30, IDC_BTN_EDIT_PARC);
  AddControlToModule(1, hBtnEditParc);
  hBtnCobrarMantParc := CreateButton(hWnd, '$ Cobrar Mantenimiento', 635, 110, 175, 30, IDC_BTN_COBRAR_MANT);
  AddControlToModule(1, hBtnCobrarMantParc);
  hBtnDelParc := CreateButton(hWnd, '- Eliminar', 815, 110, 85, 30, IDC_BTN_DEL_PARC);
  AddControlToModule(1, hBtnDelParc);
  hBtnSyncParc := CreateButton(hWnd, 'Recargar', 905, 110, 85, 30, IDC_BTN_SYNC);
  AddControlToModule(1, hBtnSyncParc);

  hLvParcelas := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_PARCELAS);
  AddListViewColumn(hLvParcelas, 0, 'Nomenclatura', 120);
  AddListViewColumn(hLvParcelas, 1, 'Sector', 90);
  AddListViewColumn(hLvParcelas, 2, 'Fila / Mz', 90);
  AddListViewColumn(hLvParcelas, 3, 'Parcela Nro', 90);
  AddListViewColumn(hLvParcelas, 4, 'Estado Parcela', 110);
  AddListViewColumn(hLvParcelas, 5, 'Titular de Concesion', 260);
  AddListViewColumn(hLvParcelas, 6, 'Ultimo Pago', 120);
  AddListViewColumn(hLvParcelas, 7, 'Saldo', 100);
  AddControlToModule(1, hLvParcelas);

  // ===========================================================
  // MODULO 2: LIBRO PARROQUIAL DE INHUMACIONES (CRUD COMPLETO)
  // ===========================================================
  hLblBuscarInh := CreateLabel(hWnd, 'Buscar Difunto / DNI:', 15, 115, 140, 22, hBoldFont);
  AddControlToModule(2, hLblBuscarInh);
  hEdtBuscarInh := CreateEdit(hWnd, '', 160, 112, 160, 24, IDC_EDT_BUSCAR_INH);
  AddControlToModule(2, hEdtBuscarInh);

  hBtnBuscarInh := CreateButton(hWnd, 'Buscar', 325, 110, 70, 30, IDC_BTN_BUSCAR_INH);
  AddControlToModule(2, hBtnBuscarInh);
  hBtnNuevaInh := CreateButton(hWnd, '+ Nueva Inhumacion', 400, 110, 150, 30, IDC_BTN_NUEVA_INH);
  AddControlToModule(2, hBtnNuevaInh);
  hBtnEditInh := CreateButton(hWnd, '* Modificar', 555, 110, 95, 30, IDC_BTN_EDIT_INH);
  AddControlToModule(2, hBtnEditInh);
  hBtnDelInh := CreateButton(hWnd, '- Eliminar', 655, 110, 85, 30, IDC_BTN_DEL_INH);
  AddControlToModule(2, hBtnDelInh);
  hBtnActaPdf := CreateButton(hWnd, 'Emitir Acta (PDF)', 745, 110, 130, 30, IDC_BTN_ACTA_PDF);
  AddControlToModule(2, hBtnActaPdf);
  hBtnFolioPdf := CreateButton(hWnd, 'Folio (PDF)', 880, 110, 100, 30, IDC_BTN_FOLIO_PDF);
  AddControlToModule(2, hBtnFolioPdf);

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
  // MODULO 3: SEGURO DE SEPELIO Y AFILIADOS (CRUD COMPLETO)
  // ===========================================================
  hLblFiltroMora := CreateLabel(hWnd, 'Filtro Cobranza:', 15, 115, 105, 22, hBoldFont);
  AddControlToModule(3, hLblFiltroMora);
  hCmbMora := CreateComboBox(hWnd, 125, 112, 190, 140, IDC_CMB_MORA);
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Afiliados')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Al Dia (Habilitados)')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Aviso: Mora >= 3 Meses')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Urgente: Riesgo Baja (>= 3 Anos)')));
  SendMessage(hCmbMora, CB_SETCURSEL, 0, 0);
  AddControlToModule(3, hCmbMora);

  hBtnNuevoAfil := CreateButton(hWnd, '+ Nuevo Afiliado', 320, 110, 125, 30, IDC_BTN_NUEVO_AFIL);
  AddControlToModule(3, hBtnNuevoAfil);
  hBtnEditAfil := CreateButton(hWnd, '* Modificar', 450, 110, 95, 30, IDC_BTN_EDIT_AFIL);
  AddControlToModule(3, hBtnEditAfil);
  hBtnCobrarAfil := CreateButton(hWnd, '$ Cobrar Cuota', 550, 110, 120, 30, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(3, hBtnCobrarAfil);
  hBtnDelAfil := CreateButton(hWnd, '- Eliminar / Baja', 675, 110, 125, 30, IDC_BTN_DEL_AFIL);
  AddControlToModule(3, hBtnDelAfil);
  hBtnPlanillaPdf := CreateButton(hWnd, 'Planilla Cobrador (PDF)', 805, 110, 175, 30, IDC_BTN_PLANILLA_PDF);
  AddControlToModule(3, hBtnPlanillaPdf);

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
  // MODULO 4: CAJA DIARIA Y ARQUEO (CRUD COMPLETO)
  // ===========================================================
  hLblResumenCaja := CreateLabel(hWnd, '  TOTAL RECAUDADO HOY: $ 0.00   [ Efectivo: $ 0.00 | Digital: $ 0.00 ]', 15, 110, 500, 32, hBoldFont);
  AddControlToModule(4, hLblResumenCaja);

  hBtnNuevoCobroCaja := CreateButton(hWnd, '+ Cobro en Caja', 525, 110, 130, 32, IDC_BTN_NUEVO_COBRO);
  AddControlToModule(4, hBtnNuevoCobroCaja);
  hBtnDelCobroCaja   := CreateButton(hWnd, '- Anular Cobro', 660, 110, 120, 32, IDC_BTN_DEL_COBRO);
  AddControlToModule(4, hBtnDelCobroCaja);
  hBtnCierreCaja     := CreateButton(hWnd, 'Acta Cierre (PDF)', 785, 110, 135, 32, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(4, hBtnCierreCaja);
  hBtnSyncCaja       := CreateButton(hWnd, 'Recargar', 925, 110, 70, 32, IDC_BTN_SYNC);
  AddControlToModule(4, hBtnSyncCaja);

  hLvCaja := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_CAJA);
  AddListViewColumn(hLvCaja, 0, 'Recibo Nro', 120);
  AddListViewColumn(hLvCaja, 1, 'Fecha / Hora', 130);
  AddListViewColumn(hLvCaja, 2, 'Titular / Pagador', 240);
  AddListViewColumn(hLvCaja, 3, 'Concepto Imputado', 260);
  AddListViewColumn(hLvCaja, 4, 'Metodo de Pago', 110);
  AddListViewColumn(hLvCaja, 5, 'Importe', 120);
  AddControlToModule(4, hLvCaja);

  // ===========================================================
  // MODULO 5: CENTRO DE REPORTES OFICIALES PDF
  // ===========================================================
  hLblRepTitle := CreateLabel(hWnd, 'CENTRO DE EMISION DE REPORTES OFICIALES VECTORIALES EN PDF NATIVO', 20, 115, 800, 24, hTitleFont);
  AddControlToModule(5, hLblRepTitle);
  hLblRepSub := CreateLabel(hWnd, 'Haga clic en cualquiera de los botones para emitir el documento oficial e inspeccionarlo de inmediato:', 20, 145, 850, 20, hGuiFont);
  AddControlToModule(5, hLblRepSub);

  hBtnRepActa := CreateButton(hWnd, '1. Generar Acta Oficial de Inhumacion (PDF)', 30, 185, 450, 46, IDC_BTN_ACTA_PDF);
  AddControlToModule(5, hBtnRepActa);
  hBtnRepFolio := CreateButton(hWnd, '2. Generar Folio del Libro de Inhumaciones (PDF)', 510, 185, 450, 46, IDC_BTN_FOLIO_PDF);
  AddControlToModule(5, hBtnRepFolio);

  hBtnRepRecibo := CreateButton(hWnd, '3. Generar Recibo Oficial de Pago por Duplicado (PDF)', 30, 250, 450, 46, IDC_BTN_RECIBO_PDF);
  AddControlToModule(5, hBtnRepRecibo);
  hBtnRepPlanilla := CreateButton(hWnd, '4. Generar Planilla de Ruta Domiciliaria Cobrador (PDF)', 510, 250, 450, 46, IDC_BTN_PLANILLA_PDF);
  AddControlToModule(5, hBtnRepPlanilla);

  hBtnRepCierre := CreateButton(hWnd, '5. Generar Acta de Arqueo y Cierre Diario de Caja (PDF)', 30, 315, 450, 46, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(5, hBtnRepCierre);
  hBtnRepCarpeta := CreateButton(hWnd, '6. Abrir Carpeta de Reportes Generados', 510, 315, 450, 46, IDC_BTN_ABRIR_CARPETA);
  AddControlToModule(5, hBtnRepCarpeta);

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
  hMenu, hSubMenuArch, hSubMenuVer, hSubMenuMod, hSubMenuPdf, hSubMenuAyu: Windows.HMENU;
begin
  hMenu := CreateMenu;

  // Menu Archivo
  hSubMenuArch := CreatePopupMenu;
  AppendMenu(hSubMenuArch, MF_STRING, IDM_REFRESCAR, '&Sincronizar Datos con Supabase'#9'F5');
  AppendMenu(hSubMenuArch, MF_SEPARATOR, 0, nil);
  AppendMenu(hSubMenuArch, MF_STRING, IDM_SALIR, '&Salir de Aeterna'#9'Alt+F4');
  AppendMenu(hMenu, MF_POPUP, hSubMenuArch, '&Archivo');

  // Menu Ver (Pantalla Completa F11)
  hSubMenuVer := CreatePopupMenu;
  AppendMenu(hSubMenuVer, MF_STRING, IDM_FULLSCREEN, '&Pantalla Completa'#9'F11');
  AppendMenu(hMenu, MF_POPUP, hSubMenuVer, '&Ver');

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
  SearchBuf: string;
  Len: Integer;
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

    WM_KEYDOWN:
      begin
        if wParam = VK_F11 then
        begin
          ToggleFullScreen(hWindow);
          Result := 0;
          Exit;
        end
        else if wParam = VK_F5 then
        begin
          CargarDatosIniciales;
          Result := 0;
          Exit;
        end;
      end;

    WM_COMMAND:
      begin
        CmdId := LOWORD(wParam);

        // Notificaciones de Seleccion de ComboBox
        if HIWORD(wParam) = CBN_SELCHANGE then
        begin
          if (CmdId = IDC_CMB_SECTOR) or (CmdId = IDC_CMB_ESTADO_PARC) then
            FiltrarYMostrarParcelas
          else if CmdId = IDC_CMB_MORA then
            FiltrarYMostrarAfiliados;
          Result := 0;
          Exit;
        end;

        // Busqueda en tiempo real al tipear en el cuadro de busqueda
        if (HIWORD(wParam) = EN_CHANGE) and (CmdId = IDC_EDT_BUSCAR_INH) then
        begin
          SetLength(SearchBuf, 256);
          Len := GetWindowText(hEdtBuscarInh, PChar(SearchBuf), 255);
          SetLength(SearchBuf, Len);
          FiltrarYMostrarInhumaciones(SearchBuf);
          Result := 0;
          Exit;
        end;

        case CmdId of
          IDM_SALIR: PostMessage(hWindow, WM_CLOSE, 0, 0);
          IDM_REFRESCAR, IDC_BTN_SYNC: CargarDatosIniciales;
          IDM_FULLSCREEN: ToggleFullScreen(hWindow);

          // Cambio de Modulos
          IDC_NAV_DASHBOARD:    SwitchModule(0);
          IDC_NAV_PARCELAS:     SwitchModule(1);
          IDC_NAV_INHUMACIONES: SwitchModule(2);
          IDC_NAV_AFILIADOS:    SwitchModule(3);
          IDC_NAV_CAJA:         SwitchModule(4);
          IDC_NAV_REPORTES:     SwitchModule(5);

          // CRUD Inhumaciones
          IDC_BTN_NUEVA_INH:    AccionNuevaInhumacion;
          IDC_BTN_EDIT_INH:     AccionModificarInhumacion;
          IDC_BTN_DEL_INH:      AccionEliminarInhumacion;
          IDC_BTN_ACTA_PDF:     AccionGenerarActaPDF;
          IDC_BTN_FOLIO_PDF:    AccionGenerarFolioPDF;
          IDC_BTN_BUSCAR_INH:
            begin
              SetLength(SearchBuf, 256);
              Len := GetWindowText(hEdtBuscarInh, PChar(SearchBuf), 255);
              SetLength(SearchBuf, Len);
              FiltrarYMostrarInhumaciones(SearchBuf);
              SetStatusMessage('Busqueda aplicada: ' + SearchBuf);
            end;

          // CRUD Parcelas
          IDC_BTN_NUEVA_PARC:   AccionNuevaParcela;
          IDC_BTN_EDIT_PARC:    AccionModificarParcela;
          IDC_BTN_DEL_PARC:     AccionEliminarParcela;
          IDC_BTN_COBRAR_MANT:  AccionCobrarMantenimientoParcela;

          // CRUD Afiliados
          IDC_BTN_NUEVO_AFIL:   AccionNuevoAfiliado;
          IDC_BTN_EDIT_AFIL:    AccionModificarAfiliado;
          IDC_BTN_DEL_AFIL:     AccionEliminarAfiliado;
          IDC_BTN_COBRAR_CUOTA: AccionCobrarCuotaSeguro;
          IDC_BTN_PLANILLA_PDF: AccionGenerarPlanillaRutaPDF;

          // CRUD Caja
          IDC_BTN_NUEVO_COBRO:  AccionNuevoCobroCaja;
          IDC_BTN_DEL_COBRO:    AccionEliminarCobroCaja;
          IDC_BTN_CIERRE_CAJA:  AccionGenerarCierreCajaPDF;
          IDC_BTN_RECIBO_PDF:   AccionGenerarReciboPDF;

          IDC_BTN_ABRIR_CARPETA:
            OpenFileWithShell(GetReportsDirectory);

          IDM_ACERCA:
            MessageBox(hWindow,
              'Aeterna - Gestion de Sepelios y Cementerio Parque San Nicolas'#13#10 +
              'Parroquia San Nicolas de Bari - Obispado de San Nicolas'#13#10#13#10 +
              'Desarrollado en Object Pascal Win32 Nativo para Windows XP / 7 / 10 / 11'#13#10 +
              'Consumo de Memoria: < 15 MB RAM'#13#10 +
              'Conexion en Tiempo Real: Supabase PostgreSQL Cloud via TLS 1.2'#13#10 +
              'CRUD Integral y Generacion Vectorial de Documentos PDF Oficiales',
              'Acerca de Aeterna XP', MB_ICONINFORMATION or MB_OK);
        end;
        Result := 0;
      end;

    WM_SIZE:
      begin
        UpdateLayout(LOWORD(lParam), HIWORD(lParam));
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
  ExeDir: string;
begin
  InitCommonControls;
  InitFontsAndBrushes;

  ExeDir := ExtractFilePath(ParamStr(0));

  // Cargar Icono Oficial desde Recurso o Archivo
  hAppIcon := LoadIcon(hInstance, 'MAINICON');
  if hAppIcon = 0 then
    hAppIcon := LoadImage(0, PChar(ExeDir + 'aeterna.ico'), IMAGE_ICON, 32, 32, LR_LOADFROMFILE);
  if hAppIcon = 0 then
    hAppIcon := LoadIcon(0, IDI_APPLICATION);

  try
    FillChar(wc, SizeOf(wc), 0);
    wc.style := CS_HREDRAW or CS_VREDRAW;
    wc.lpfnWndProc := @MainWindowProc;
    wc.hInstance := hInstance;
    wc.hIcon := hAppIcon;
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
      CW_USEDEFAULT, CW_USEDEFAULT, 1040, 700,
      0, hMenu, hInstance, nil
    );

    if hMainWnd = 0 then
      Exit;

    // Asignar Icono a la Barra de Titulo y Taskbar
    SendMessage(hMainWnd, WM_SETICON, ICON_BIG, LPARAM(hAppIcon));
    SendMessage(hMainWnd, WM_SETICON, ICON_SMALL, LPARAM(hAppIcon));

    BuildUI(hMainWnd);
    ShowWindow(hMainWnd, SW_SHOW);
    UpdateWindow(hMainWnd);

    while GetMessage(msgObj, 0, 0, 0) do
    begin
      // Soporte para F11 y atajos de teclado
      if (msgObj.message = WM_KEYDOWN) and (msgObj.wParam = VK_F11) then
      begin
        ToggleFullScreen(hMainWnd);
        Continue;
      end;

      TranslateMessage(msgObj);
      DispatchMessage(msgObj);
    end;

  finally
    FreeFontsAndBrushes;
    if (hAppIcon <> 0) and (hAppIcon <> LoadIcon(0, IDI_APPLICATION)) then
      DestroyIcon(hAppIcon);
  end;
end;

end.
