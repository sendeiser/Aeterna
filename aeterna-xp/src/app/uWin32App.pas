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
  IDC_BTN_PADRON_PARC_PDF = 2030;
  IDC_BTN_FILTRAR_AFIL    = 2031;
  IDC_BTN_CUOTA_MASIVA    = 2032;
  IDC_BTN_NUEVO_EGRESO    = 2033;
  IDC_EDT_FECHA_DESDE_PARC = 2034;
  IDC_EDT_FECHA_HASTA_PARC = 2035;
  IDC_BTN_FILTRAR_FECHA_PARC = 2036;
  IDC_EDT_FECHA_DESDE_INH  = 2037;
  IDC_EDT_FECHA_HASTA_INH  = 2038;
  IDC_BTN_FILTRAR_FECHA_INH = 2039;
  IDC_EDT_FECHA_DESDE_AFIL = 2040;
  IDC_BTN_FILTRAR_FECHA_AFIL = 2041;
  IDC_EDT_FECHA_CAJA       = 2042;
  IDC_BTN_FILTRAR_FECHA_CAJA = 2043;

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
  IDC_CMB_SALDO_PARC  = 3010;
  IDC_EDT_BUSCAR_PARC = 3011;
  IDC_EDT_BUSCAR_AFIL = 3012;

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
  hCmbSector, hCmbEstadoParc: HWND;
  hLblResumenCaja: HWND;

  // Controles Modulo 1 (Parcelas)
  hLblFiltrosParc, hLblSector, hLblEstadoParc, hLblSaldoParc, hCmbSaldoParc: HWND;
  hLblBuscarParc, hEdtBuscarParc, hBtnBuscarParc: HWND;
  hBtnNuevaParc, hBtnEditParc, hBtnCobrarMantParc, hBtnRepPadronParc, hBtnDelParc, hBtnSyncParc: HWND;
  hLblFechaDesdeParc, hEdtFechaDesdeParc, hLblFechaHastaParc, hEdtFechaHastaParc, hBtnFiltrarFechaParc: HWND;

  // Controles Modulo 2 (Inhumaciones)
  hLblBuscarInh, hEdtBuscarInh: HWND;
  hBtnBuscarInh, hBtnNuevaInh, hBtnEditInh, hBtnDelInh, hBtnActaPdf, hBtnFolioPdf, hBtnSyncInh: HWND;
  hLblFechaDesdeInh, hEdtFechaDesdeInh, hLblFechaHastaInh, hEdtFechaHastaInh, hBtnFiltrarFechaInh: HWND;

  // Controles Modulo 3 (Afiliados)
  hLblFiltroMora, hCmbMora: HWND;
  hLblBuscarAfil, hEdtBuscarAfil, hBtnBuscarAfil: HWND;
  hBtnNuevoAfil, hBtnEditAfil, hBtnCobrarAfil, hBtnDelAfil, hBtnPlanillaPdf, hBtnCuotaMasivaAfil, hBtnSyncAfil: HWND;
  hLblFechaDesdeAfil, hEdtFechaDesdeAfil, hBtnFiltrarFechaAfil: HWND;

  // Controles Modulo 4 (Caja)
  hBtnNuevoCobroCaja, hBtnNuevoEgresoCaja, hBtnDelCobroCaja, hBtnCierreCaja, hBtnSyncCaja: HWND;
  hLblFechaCaja, hEdtFechaCaja: HWND;

  // Controles Modulo 5 (Reportes)
  hLblRepTitle, hLblRepSub: HWND;
  hBtnRepActa, hBtnRepFolio, hBtnRepRecibo, hBtnRepPlanilla, hBtnRepCierre, hBtnRepCarpeta, hBtnRepPadronParcMod5: HWND;

  // Estado de Ordenamiento de Columnas
  SortColParcelas: Integer = 0;   // 0: Titular, 1: Difuntos, 2: Parcela, 3: Sector, 4: Fila, 5: Nro, 6: Estado, 7: Fecha/Reg, 8: Ultimo Pago, 9: Saldo
  SortAscParcelas: Boolean = True;

  SortColInh: Integer = 0;        // 0: Fecha/Hora Inh, 1: Difunto, 2: DNI, 3: Parcela, 4: Nivel, 5: Empresa, 6: Protocolo
  SortAscInh: Boolean = False;

  SortColAfil: Integer = 0;       // 0: Titular, 1: Nro, 2: DNI, 3: Fecha Alta/Hora, 4: Direccion, 5: Cuota, 6: Mora, 7: Cobertura, 8: Meses
  SortAscAfil: Boolean = True;

  SortColCaja: Integer = 1;       // 0: Recibo Nro, 1: Fecha/Hora, 2: Titular, 3: Concepto, 4: Metodo, 5: Importe
  SortAscCaja: Boolean = False;

const
  ColNamesParcelas: array[0..9] of string = (
    'Titular (Condicion)', 'Difuntos en Fosa (Fallecidos)', 'Parcela', 'Sector', 'Fila / Mz', 'Nro Parcela',
    'Estado Parcela', 'Fecha / Registro', 'Ultimo Pago', 'Saldo'
  );
  ColNamesInh: array[0..6] of string = (
    'Fecha / Hora Inh.', 'Nombre Completo del Difunto', 'DNI', 'Parcela',
    'Nivel', 'Empresa Funebrera', 'Protocolo Sanitario'
  );
  ColNamesAfil: array[0..8] of string = (
    'Nombre Completo del Titular', 'Nro Afiliado', 'DNI', 'Fecha Alta / Hora', 'Direccion de Cobro',
    'Cuota', 'Mora', 'Estado Cobertura', 'Meses Pagados 2026'
  );
  ColNamesCaja: array[0..5] of string = (
    'Recibo Nro', 'Fecha / Hora', 'Titular / Pagador',
    'Concepto Imputado', 'Metodo de Pago', 'Importe'
  );

type
  PNMITEMACTIVATE_REC = ^TNMITEMACTIVATE_REC;
  TNMITEMACTIVATE_REC = record
    hdr: TNMHDR;
    iItem: Integer;
    iSubItem: Integer;
    uNewState: UINT;
    uOldState: UINT;
    uChanged: UINT;
    ptAction: TPoint;
    lParam: LPARAM;
    uKeyFlags: UINT;
  end;

var
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
    WS_CHILD or WS_VISIBLE or WS_TABSTOP or LVS_REPORT or LVS_SINGLESEL or LVS_SHOWSELALWAYS,
    X, Y, W, H, Parent, HMENU(Id), hInstance, nil);
  SendMessage(Result, LVM_SETEXTENDEDLISTVIEWSTYLE,
    LVS_EX_FULLROWSELECT or LVS_EX_GRIDLINES or LVS_EX_DOUBLEBUFFER,
    LVS_EX_FULLROWSELECT or LVS_EX_GRIDLINES or LVS_EX_DOUBLEBUFFER);
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

procedure AddListViewItemWithParam(hLv: HWND; ItemIndex: Integer; DataIndex: Integer; const SubItems: array of string);
var
  Item: TLVItem;
  i: Integer;
begin
  if Length(SubItems) = 0 then Exit;

  FillChar(Item, SizeOf(Item), 0);
  Item.mask := LVIF_TEXT or LVIF_PARAM;
  Item.iItem := ItemIndex;
  Item.iSubItem := 0;
  Item.pszText := PChar(SubItems[0]);
  Item.lParam := LPARAM(DataIndex);
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

function GetListViewItemData(hLv: HWND; ItemIdx: Integer): Integer;
var
  Item: TLVItem;
begin
  Result := -1;
  if (hLv = 0) or (ItemIdx < 0) then Exit;
  FillChar(Item, SizeOf(Item), 0);
  Item.mask := LVIF_PARAM;
  Item.iItem := ItemIdx;
  Item.iSubItem := 0;
  if SendMessage(hLv, LVM_GETITEM, 0, LPARAM(@Item)) <> 0 then
    Result := Item.lParam
  else
    Result := ItemIdx;
end;

function GetSelectedListViewIndex(hLv: HWND): Integer;
begin
  Result := SendMessage(hLv, LVM_GETNEXTITEM, -1, LVNI_SELECTED);
end;

function GetSelectedListViewDataIndex(hLv: HWND): Integer;
var
  ItemIdx: Integer;
begin
  ItemIdx := SendMessage(hLv, LVM_GETNEXTITEM, -1, LVNI_SELECTED);
  Result := GetListViewItemData(hLv, ItemIdx);
end;

procedure SetListViewSelectedIndex(hLv: HWND; ItemIdx: Integer);
var
  Item: TLVItem;
begin
  if (hLv = 0) or (ItemIdx < 0) then Exit;
  // Deseleccionar todo primero
  FillChar(Item, SizeOf(Item), 0);
  Item.mask := LVIF_STATE;
  Item.state := 0;
  Item.stateMask := LVIS_SELECTED;
  SendMessage(hLv, LVM_SETITEMSTATE, -1, LPARAM(@Item));

  // Seleccionar y enfocar el item especificado
  FillChar(Item, SizeOf(Item), 0);
  Item.mask := LVIF_STATE;
  Item.iItem := ItemIdx;
  Item.state := LVIS_SELECTED or LVIS_FOCUSED;
  Item.stateMask := LVIS_SELECTED or LVIS_FOCUSED;
  SendMessage(hLv, LVM_SETITEMSTATE, ItemIdx, LPARAM(@Item));
  SendMessage(hLv, LVM_ENSUREVISIBLE, ItemIdx, 0);
end;

function GetWndText(hCtrl: HWND): string;
var
  Len: Integer;
begin
  Result := '';
  if hCtrl = 0 then Exit;
  Len := GetWindowTextLength(hCtrl);
  if Len <= 0 then Exit;
  SetLength(Result, Len + 1);
  Len := GetWindowText(hCtrl, PChar(Result), Len + 1);
  SetLength(Result, Len);
end;

procedure SetListViewColumnText(hLv: HWND; ColIndex: Integer; const NewText: string);
var
  Col: TLVColumn;
begin
  FillChar(Col, SizeOf(Col), 0);
  Col.mask := LVCF_TEXT;
  Col.pszText := PChar(NewText);
  SendMessage(hLv, LVM_SETCOLUMN, ColIndex, LPARAM(@Col));
end;

procedure UpdateListViewHeaderIndicators(hLv: HWND; const ColNames: array of string; ActiveCol: Integer; Asc: Boolean);
var
  c: Integer;
  colText, ind: string;
begin
  for c := 0 to High(ColNames) do
  begin
    if c = ActiveCol then
    begin
      if (ColNames[c] = 'Saldo') or (ColNames[c] = 'Importe') or (ColNames[c] = 'Cuota') or (ColNames[c] = 'Mora') then
      begin
        if Asc then ind := ' [Menor]' else ind := ' [Mayor]';
      end
      else if (ColNames[c] = 'Fecha Inh.') or (ColNames[c] = 'Fecha / Hora') or (ColNames[c] = 'Ultimo Pago') then
      begin
        if Asc then ind := ' [Antiguos]' else ind := ' [Recientes]';
      end
      else
      begin
        if Asc then ind := ' [A-Z]' else ind := ' [Z-A]';
      end;
      colText := ColNames[c] + ind;
    end
    else
      colText := ColNames[c];

    SetListViewColumnText(hLv, c, colText);
  end;
end;

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

function NormalizarNomenclatura(const S: string): string;
begin
  Result := UpperCase(Trim(S));
  Result := StringReplace(Result, ' ', '', [rfReplaceAll]);
  Result := StringReplace(Result, '-', '', [rfReplaceAll]);
end;

function ObtenerDifuntosDeParcela(const Nom: string): string;
var
  k: Integer;
  TargetNorm, InhNorm, NivelStr, NombreStr: string;
begin
  Result := '';
  TargetNorm := NormalizarNomenclatura(Nom);
  if TargetNorm = '' then Exit;

  for k := 0 to High(DataInhumaciones) do
  begin
    InhNorm := NormalizarNomenclatura(DataInhumaciones[k].NomenclaturaParcela);
    if (InhNorm <> '') and (InhNorm = TargetNorm) then
    begin
      NombreStr := Trim(DataInhumaciones[k].NombreDifunto);
      if NombreStr = '' then NombreStr := 'Difunto sin nombre';
      if DataInhumaciones[k].NivelPosicion > 0 then
        NivelStr := '[N' + IntToStr(DataInhumaciones[k].NivelPosicion) + '] '
      else
        NivelStr := '';

      if Result <> '' then
        Result := Result + ' / ';
      Result := Result + NivelStr + NombreStr;
    end;
  end;

  if Result = '' then
    Result := 'Sin difuntos (Libre)';
end;

function ParcelaTieneInhumados(const Nom: string): Boolean;
var
  k: Integer;
  NomTrim, InhTrim: string;
begin
  Result := False;
  NomTrim := NormalizarNomenclatura(Nom);
  if NomTrim = '' then Exit;
  for k := 0 to High(DataInhumaciones) do
  begin
    InhTrim := NormalizarNomenclatura(DataInhumaciones[k].NomenclaturaParcela);
    if InhTrim = NomTrim then
    begin
      Result := True;
      Exit;
    end;
  end;
end;

function EstadoParcelaToDisplayEx(AEstado: TEstadoParcela; const Nom: string): string;
begin
  if (AEstado = epBaja) or (AEstado = epStandby) then
  begin
    if ParcelaTieneInhumados(Nom) then
    begin
      if AEstado = epStandby then Result := 'Stand-by (c/ Inh)'
      else Result := 'Baja (c/ Inh)';
    end
    else
    begin
      if AEstado = epStandby then Result := 'Stand-by (Libre)'
      else Result := 'Baja: Libre';
    end;
  end
  else
    Result := EstadoParcelaToDisplay(AEstado);
end;

function CompareNaturalNomenclatura(const S1, S2: string): Integer;
var
  Sec1, Sec2, Fila1, Fila2, Nro1, Nro2: string;
  p1, p2, nFila1, nFila2, nNro1, nNro2: Integer;
begin
  p1 := Pos('-', S1);
  p2 := Pos('-', S2);
  if (p1 > 0) and (p2 > 0) then
  begin
    Sec1 := Copy(S1, 1, p1 - 1);
    Sec2 := Copy(S2, 1, p2 - 1);
    if CompareText(Sec1, Sec2) <> 0 then
    begin
      Result := CompareText(Sec1, Sec2);
      Exit;
    end;

    Fila1 := Copy(S1, p1 + 1, Length(S1));
    p1 := Pos('-', Fila1);
    if p1 > 0 then
    begin
      Nro1 := Copy(Fila1, p1 + 1, Length(Fila1));
      Fila1 := Copy(Fila1, 1, p1 - 1);
    end
    else
      Nro1 := '';

    Fila2 := Copy(S2, p2 + 1, Length(S2));
    p2 := Pos('-', Fila2);
    if p2 > 0 then
    begin
      Nro2 := Copy(Fila2, p2 + 1, Length(Fila2));
      Fila2 := Copy(Fila2, 1, p2 - 1);
    end
    else
      Nro2 := '';

    nFila1 := StrToIntDef(Fila1, -1);
    nFila2 := StrToIntDef(Fila2, -1);
    if (nFila1 <> -1) and (nFila2 <> -1) and (nFila1 <> nFila2) then
    begin
      Result := nFila1 - nFila2;
      Exit;
    end;

    nNro1 := StrToIntDef(Nro1, -1);
    nNro2 := StrToIntDef(Nro2, -1);
    if (nNro1 <> -1) and (nNro2 <> -1) and (nNro1 <> nNro2) then
    begin
      Result := nNro1 - nNro2;
      Exit;
    end;
  end;
  Result := CompareText(S1, S2);
end;

// =============================================================
// Rutinas de Comparacion y Ordenamiento: PARCELAS
// =============================================================

function CompareParcelasByCol(Idx1, Idx2: Integer; Col: Integer; Asc: Boolean): Integer;
var
  cmp, n1, n2: Integer;
  diffCurr: Currency;
  s1, s2: string;
begin
  case Col of
    0: cmp := CompareText(DataParcelas[Idx1].TitularNombre, DataParcelas[Idx2].TitularNombre);
    1:
      begin
        s1 := ObtenerDifuntosDeParcela(DataParcelas[Idx1].Nomenclatura);
        s2 := ObtenerDifuntosDeParcela(DataParcelas[Idx2].Nomenclatura);
        cmp := CompareText(s1, s2);
      end;
    2: cmp := CompareNaturalNomenclatura(DataParcelas[Idx1].Nomenclatura, DataParcelas[Idx2].Nomenclatura);
    3: cmp := CompareText(DataParcelas[Idx1].SectorId, DataParcelas[Idx2].SectorId);
    4:
      begin
        n1 := StrToIntDef(DataParcelas[Idx1].ManzanaFila, 0);
        n2 := StrToIntDef(DataParcelas[Idx2].ManzanaFila, 0);
        if n1 <> n2 then cmp := n1 - n2
        else cmp := CompareText(DataParcelas[Idx1].ManzanaFila, DataParcelas[Idx2].ManzanaFila);
      end;
    5:
      begin
        n1 := StrToIntDef(DataParcelas[Idx1].NumeroParcela, 0);
        n2 := StrToIntDef(DataParcelas[Idx2].NumeroParcela, 0);
        if n1 <> n2 then cmp := n1 - n2
        else cmp := CompareText(DataParcelas[Idx1].NumeroParcela, DataParcelas[Idx2].NumeroParcela);
      end;
    6: cmp := CompareText(EstadoParcelaToDisplay(DataParcelas[Idx1].Estado), EstadoParcelaToDisplay(DataParcelas[Idx2].Estado));
    7:
      begin
        cmp := CompareText(DataParcelas[Idx1].CreatedAt, DataParcelas[Idx2].CreatedAt);
        if cmp = 0 then cmp := CompareText(DataParcelas[Idx1].FechaAdquisicion, DataParcelas[Idx2].FechaAdquisicion);
      end;
    8: cmp := CompareText(DataParcelas[Idx1].FechaUltimoPago, DataParcelas[Idx2].FechaUltimoPago);
    9:
      begin
        diffCurr := DataParcelas[Idx1].SaldoMantenimiento - DataParcelas[Idx2].SaldoMantenimiento;
        if diffCurr > 0 then cmp := 1
        else if diffCurr < 0 then cmp := -1
        else cmp := 0;
      end;
  else
    cmp := 0;
  end;

  if not Asc then Result := -cmp
  else Result := cmp;
end;

procedure SortParcelaIndices(var Arr: array of Integer; L, R: Integer; Col: Integer; Asc: Boolean);
var
  i, j, pivot, tmp: Integer;
begin
  if L >= R then Exit;
  i := L;
  j := R;
  pivot := Arr[(L + R) div 2];
  while i <= j do
  begin
    while CompareParcelasByCol(Arr[i], pivot, Col, Asc) < 0 do Inc(i);
    while CompareParcelasByCol(Arr[j], pivot, Col, Asc) > 0 do Dec(j);
    if i <= j then
    begin
      tmp := Arr[i];
      Arr[i] := Arr[j];
      Arr[j] := tmp;
      Inc(i);
      Dec(j);
    end;
  end;
  if L < j then SortParcelaIndices(Arr, L, j, Col, Asc);
  if i < R then SortParcelaIndices(Arr, i, R, Col, Asc);
end;

// =============================================================
// Rutinas de Comparacion y Ordenamiento: INHUMACIONES
// =============================================================

function CompareInhByCol(Idx1, Idx2: Integer; Col: Integer; Asc: Boolean): Integer;
var
  cmp: Integer;
begin
  case Col of
    0: cmp := CompareText(DataInhumaciones[Idx1].FechaInhumacion, DataInhumaciones[Idx2].FechaInhumacion);
    1: cmp := CompareText(DataInhumaciones[Idx1].NombreDifunto, DataInhumaciones[Idx2].NombreDifunto);
    2: cmp := CompareText(DataInhumaciones[Idx1].DniDifunto, DataInhumaciones[Idx2].DniDifunto);
    3: cmp := CompareNaturalNomenclatura(DataInhumaciones[Idx1].NomenclaturaParcela, DataInhumaciones[Idx2].NomenclaturaParcela);
    4: cmp := DataInhumaciones[Idx1].NivelPosicion - DataInhumaciones[Idx2].NivelPosicion;
    5: cmp := CompareText(DataInhumaciones[Idx1].EmpresaFunebrera, DataInhumaciones[Idx2].EmpresaFunebrera);
    6: cmp := CompareText(BoolToTexto(DataInhumaciones[Idx1].EsCovid, 'COVID-19', 'Estandar'),
                          BoolToTexto(DataInhumaciones[Idx2].EsCovid, 'COVID-19', 'Estandar'));
  else
    cmp := 0;
  end;

  if not Asc then Result := -cmp
  else Result := cmp;
end;

procedure SortInhIndices(var Arr: array of Integer; L, R: Integer; Col: Integer; Asc: Boolean);
var
  i, j, pivot, tmp: Integer;
begin
  if L >= R then Exit;
  i := L;
  j := R;
  pivot := Arr[(L + R) div 2];
  while i <= j do
  begin
    while CompareInhByCol(Arr[i], pivot, Col, Asc) < 0 do Inc(i);
    while CompareInhByCol(Arr[j], pivot, Col, Asc) > 0 do Dec(j);
    if i <= j then
    begin
      tmp := Arr[i];
      Arr[i] := Arr[j];
      Arr[j] := tmp;
      Inc(i);
      Dec(j);
    end;
  end;
  if L < j then SortInhIndices(Arr, L, j, Col, Asc);
  if i < R then SortInhIndices(Arr, i, R, Col, Asc);
end;

// =============================================================
// Rutinas de Comparacion y Ordenamiento: AFILIADOS
// =============================================================

function CompareAfilByCol(Idx1, Idx2: Integer; Col: Integer; Asc: Boolean): Integer;
var
  cmp: Integer;
  diffCurr: Currency;
begin
  case Col of
    0: cmp := CompareText(DataAfiliados[Idx1].NombreCompleto, DataAfiliados[Idx2].NombreCompleto);
    1: cmp := DataAfiliados[Idx1].NumeroAfiliado - DataAfiliados[Idx2].NumeroAfiliado;
    2: cmp := CompareText(DataAfiliados[Idx1].Dni, DataAfiliados[Idx2].Dni);
    3:
      begin
        cmp := CompareText(DataAfiliados[Idx1].CreatedAt, DataAfiliados[Idx2].CreatedAt);
        if cmp = 0 then cmp := CompareText(DataAfiliados[Idx1].FechaAlta, DataAfiliados[Idx2].FechaAlta);
      end;
    4: cmp := CompareText(DataAfiliados[Idx1].DireccionCobro, DataAfiliados[Idx2].DireccionCobro);
    5:
      begin
        diffCurr := DataAfiliados[Idx1].MontoCuotaMensual - DataAfiliados[Idx2].MontoCuotaMensual;
        if diffCurr > 0 then cmp := 1
        else if diffCurr < 0 then cmp := -1
        else cmp := 0;
      end;
    6: cmp := DataAfiliados[Idx1].MesesMora - DataAfiliados[Idx2].MesesMora;
    7: cmp := Ord(DataAfiliados[Idx1].Estado) - Ord(DataAfiliados[Idx2].Estado);
    8: cmp := Length(DataAfiliados[Idx1].CuotasPagadas) - Length(DataAfiliados[Idx2].CuotasPagadas);
  else
    cmp := 0;
  end;

  if not Asc then Result := -cmp
  else Result := cmp;
end;

procedure SortAfilIndices(var Arr: array of Integer; L, R: Integer; Col: Integer; Asc: Boolean);
var
  i, j, pivot, tmp: Integer;
begin
  if L >= R then Exit;
  i := L;
  j := R;
  pivot := Arr[(L + R) div 2];
  while i <= j do
  begin
    while CompareAfilByCol(Arr[i], pivot, Col, Asc) < 0 do Inc(i);
    while CompareAfilByCol(Arr[j], pivot, Col, Asc) > 0 do Dec(j);
    if i <= j then
    begin
      tmp := Arr[i];
      Arr[i] := Arr[j];
      Arr[j] := tmp;
      Inc(i);
      Dec(j);
    end;
  end;
  if L < j then SortAfilIndices(Arr, L, j, Col, Asc);
  if i < R then SortAfilIndices(Arr, i, R, Col, Asc);
end;

// =============================================================
// Rutinas de Comparacion y Ordenamiento: CAJA
// =============================================================

function CompareCajaByCol(Idx1, Idx2: Integer; Col: Integer; Asc: Boolean): Integer;
var
  cmp: Integer;
  diffCurr: Currency;
begin
  case Col of
    0: cmp := CompareText(DataPagos[Idx1].NroRecibo, DataPagos[Idx2].NroRecibo);
    1: cmp := CompareText(DataPagos[Idx1].FechaPago, DataPagos[Idx2].FechaPago);
    2: cmp := CompareText(DataPagos[Idx1].TitularNombre, DataPagos[Idx2].TitularNombre);
    3: cmp := CompareText(DataPagos[Idx1].Observaciones, DataPagos[Idx2].Observaciones);
    4: cmp := CompareText(MetodoPagoToStr(DataPagos[Idx1].MetodoPago), MetodoPagoToStr(DataPagos[Idx2].MetodoPago));
    5:
      begin
        diffCurr := DataPagos[Idx1].MontoPagado - DataPagos[Idx2].MontoPagado;
        if diffCurr > 0 then cmp := 1
        else if diffCurr < 0 then cmp := -1
        else cmp := 0;
      end;
  else
    cmp := 0;
  end;

  if not Asc then Result := -cmp
  else Result := cmp;
end;

procedure SortCajaIndices(var Arr: array of Integer; L, R: Integer; Col: Integer; Asc: Boolean);
var
  i, j, pivot, tmp: Integer;
begin
  if L >= R then Exit;
  i := L;
  j := R;
  pivot := Arr[(L + R) div 2];
  while i <= j do
  begin
    while CompareCajaByCol(Arr[i], pivot, Col, Asc) < 0 do Inc(i);
    while CompareCajaByCol(Arr[j], pivot, Col, Asc) > 0 do Dec(j);
    if i <= j then
    begin
      tmp := Arr[i];
      Arr[i] := Arr[j];
      Arr[j] := tmp;
      Inc(i);
      Dec(j);
    end;
  end;
  if L < j then SortCajaIndices(Arr, L, j, Col, Asc);
  if i < R then SortCajaIndices(Arr, i, R, Col, Asc);
end;

// =============================================================
// Filtrado y Poblado de ListViews
// =============================================================

procedure FiltrarYMostrarParcelas;
var
  i, count, SecIdx, EstIdx, SaldoIdx: Integer;
  PasaSec, PasaEst, PasaSaldo, PasaText, PasaFecha: Boolean;
  Indices: array of Integer;
  SearchText, NomU, TitU, FilaU, NroU, DifU, FechaDesde, FechaHasta, FechaRegComp, FechaRegStr, TitularStr, DifuntosStr: string;
begin
  ClearListView(hLvParcelas);
  SecIdx := SendMessage(hCmbSector, CB_GETCURSEL, 0, 0);
  EstIdx := SendMessage(hCmbEstadoParc, CB_GETCURSEL, 0, 0);
  SaldoIdx := SendMessage(hCmbSaldoParc, CB_GETCURSEL, 0, 0);
  SearchText := UpperCase(Trim(GetWndText(hEdtBuscarParc)));
  FechaDesde := Trim(GetWndText(hEdtFechaDesdeParc));
  FechaHasta := Trim(GetWndText(hEdtFechaHastaParc));

  SetLength(Indices, Length(DataParcelas));
  count := 0;
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
    else if EstIdx = 5 then PasaEst := (DataParcelas[i].Estado = epBaja) or (DataParcelas[i].Estado = epStandby)
    else if EstIdx = 6 then // Baja Libre (sin difuntos)
      PasaEst := ((DataParcelas[i].Estado = epBaja) or (DataParcelas[i].Estado = epStandby)) and not ParcelaTieneInhumados(DataParcelas[i].Nomenclatura)
    else if EstIdx = 7 then // Baja con Inhumados
      PasaEst := ((DataParcelas[i].Estado = epBaja) or (DataParcelas[i].Estado = epStandby)) and ParcelaTieneInhumados(DataParcelas[i].Nomenclatura);

    PasaSaldo := True;
    if SaldoIdx = 1 then PasaSaldo := (DataParcelas[i].SaldoMantenimiento > 0)
    else if SaldoIdx = 2 then PasaSaldo := (DataParcelas[i].SaldoMantenimiento <= 0)
    else if SaldoIdx = 3 then PasaSaldo := (DataParcelas[i].SaldoMantenimiento >= 100000)
    else if SaldoIdx = 4 then PasaSaldo := (DataParcelas[i].SaldoMantenimiento >= 300000);

    PasaText := True;
    if SearchText <> '' then
    begin
      NomU := UpperCase(DataParcelas[i].Nomenclatura);
      TitU := UpperCase(DataParcelas[i].TitularNombre);
      FilaU := UpperCase(DataParcelas[i].ManzanaFila);
      NroU := UpperCase(DataParcelas[i].NumeroParcela);
      DifU := UpperCase(ObtenerDifuntosDeParcela(DataParcelas[i].Nomenclatura));
      PasaText := (Pos(SearchText, NomU) > 0) or (Pos(SearchText, TitU) > 0) or
                  (Pos(SearchText, FilaU) > 0) or (Pos(SearchText, NroU) > 0) or
                  (Pos(SearchText, DifU) > 0);
    end;

    PasaFecha := True;
    if (FechaDesde <> '') or (FechaHasta <> '') then
    begin
      FechaRegComp := '';
      if DataParcelas[i].CreatedAt <> '' then
        FechaRegComp := Copy(DataParcelas[i].CreatedAt, 1, 10)
      else if DataParcelas[i].FechaAdquisicion <> '' then
        FechaRegComp := Copy(DataParcelas[i].FechaAdquisicion, 1, 10);

      if FechaRegComp <> '' then
      begin
        if (FechaDesde <> '') and (FechaRegComp < FechaDesde) then PasaFecha := False;
        if (FechaHasta <> '') and (FechaRegComp > FechaHasta) then PasaFecha := False;
      end;
    end;

    if PasaSec and PasaEst and PasaSaldo and PasaText and PasaFecha then
    begin
      Indices[count] := i;
      Inc(count);
    end;
  end;
  SetLength(Indices, count);

  if count > 1 then
    SortParcelaIndices(Indices, 0, count - 1, SortColParcelas, SortAscParcelas);

  for i := 0 to count - 1 do
  begin
    FechaRegStr := '';
    if DataParcelas[Indices[i]].CreatedAt <> '' then
      FechaRegStr := FormatearFechaHora(DataParcelas[Indices[i]].CreatedAt)
    else if DataParcelas[Indices[i]].FechaAdquisicion <> '' then
      FechaRegStr := FormatearFecha(DataParcelas[Indices[i]].FechaAdquisicion)
    else
      FechaRegStr := '-';

    if Trim(DataParcelas[Indices[i]].TitularNombre) <> '' then
    begin
      if SameText(Trim(DataParcelas[Indices[i]].TitularEstadoVital), 'fallecido') then
        TitularStr := DataParcelas[Indices[i]].TitularNombre + ' [FALLECIDO]'
      else
        TitularStr := DataParcelas[Indices[i]].TitularNombre + ' [VIVO]';
    end
    else
      TitularStr := '(Sin Titular Asignado)';

    DifuntosStr := ObtenerDifuntosDeParcela(DataParcelas[Indices[i]].Nomenclatura);

    AddListViewItemWithParam(hLvParcelas, i, Indices[i], [
      TitularStr,
      DifuntosStr,
      DataParcelas[Indices[i]].Nomenclatura,
      BoolToTexto(DataParcelas[Indices[i]].SectorId <> '', DataParcelas[Indices[i]].SectorId, '-'),
      DataParcelas[Indices[i]].ManzanaFila,
      DataParcelas[Indices[i]].NumeroParcela,
      EstadoParcelaToDisplayEx(DataParcelas[Indices[i]].Estado, DataParcelas[Indices[i]].Nomenclatura),
      FechaRegStr,
      FormatearFecha(DataParcelas[Indices[i]].FechaUltimoPago),
      FormatearMoneda(DataParcelas[Indices[i]].SaldoMantenimiento)
    ]);
  end;

  UpdateListViewHeaderIndicators(hLvParcelas, ColNamesParcelas, SortColParcelas, SortAscParcelas);
  SetStatusMessage(Format('Parcelas: %d registros mostrados (ordenado por %s)', [count, ColNamesParcelas[SortColParcelas]]));
end;

procedure FiltrarYMostrarAfiliados;
var
  i, k, mNum, count, MoraIdx, MesesM: Integer;
  PasaMora, PasaText, PasaFecha: Boolean;
  Indices: array of Integer;
  SearchText, NomU, DniU, DirU, MoraLabel, PagadosStr, FechaDesde, FechaAfilComp, FechaAltaStr: string;
  MesesAbrev: array[1..12] of string = ('Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic');
begin
  ClearListView(hLvAfiliados);
  MoraIdx := SendMessage(hCmbMora, CB_GETCURSEL, 0, 0);
  SearchText := UpperCase(Trim(GetWndText(hEdtBuscarAfil)));
  FechaDesde := Trim(GetWndText(hEdtFechaDesdeAfil));

  SetLength(Indices, Length(DataAfiliados));
  count := 0;
  for i := 0 to High(DataAfiliados) do
  begin
    MesesM := DataAfiliados[i].MesesMora;
    PasaMora := True;
    if MoraIdx = 1 then PasaMora := (DataAfiliados[i].Estado = eaActivo) and (MesesM < 3)
    else if MoraIdx = 2 then PasaMora := (MesesM >= 3) and (MesesM < 36) and (DataAfiliados[i].Estado <> eaBaja)
    else if MoraIdx = 3 then PasaMora := (MesesM >= 36) or (DataAfiliados[i].Estado = eaBaja);

    PasaText := True;
    if SearchText <> '' then
    begin
      NomU := UpperCase(DataAfiliados[i].NombreCompleto);
      DniU := UpperCase(DataAfiliados[i].Dni);
      DirU := UpperCase(DataAfiliados[i].DireccionCobro);
      PasaText := (Pos(SearchText, NomU) > 0) or (Pos(SearchText, DniU) > 0) or
                  (Pos(SearchText, DirU) > 0) or (Pos(SearchText, IntToStr(DataAfiliados[i].NumeroAfiliado)) > 0);
    end;

    PasaFecha := True;
    if FechaDesde <> '' then
    begin
      FechaAfilComp := Copy(DataAfiliados[i].FechaAlta, 1, 10);
      if FechaAfilComp = '' then
        FechaAfilComp := Copy(DataAfiliados[i].CreatedAt, 1, 10);
      if (FechaAfilComp <> '') and (FechaAfilComp < FechaDesde) then
        PasaFecha := False;
    end;

    if PasaMora and PasaText and PasaFecha then
    begin
      Indices[count] := i;
      Inc(count);
    end;
  end;
  SetLength(Indices, count);

  if count > 1 then
    SortAfilIndices(Indices, 0, count - 1, SortColAfil, SortAscAfil);

  for i := 0 to count - 1 do
  begin
    MesesM := DataAfiliados[Indices[i]].MesesMora;
    if DataAfiliados[Indices[i]].Estado = eaBaja then
      MoraLabel := 'BAJA DEFINITIVA'
    else if MesesM >= 36 then
      MoraLabel := 'URGENTE: RIESGO DE BAJA (3 ANOS)'
    else if MesesM >= 3 then
      MoraLabel := 'AVISO: MORA 3 MESES'
    else
      MoraLabel := 'AL DIA (Habilitado)';

    PagadosStr := '';
    for k := 0 to High(DataAfiliados[Indices[i]].CuotasPagadas) do
    begin
      mNum := DataAfiliados[Indices[i]].CuotasPagadas[k];
      if (mNum >= 1) and (mNum <= 12) then
      begin
        if PagadosStr <> '' then PagadosStr := PagadosStr + ', ';
        PagadosStr := PagadosStr + MesesAbrev[mNum];
      end;
    end;
    if PagadosStr = '' then PagadosStr := 'Ninguno';

    FechaAltaStr := '';
    if DataAfiliados[Indices[i]].CreatedAt <> '' then
      FechaAltaStr := FormatearFechaHora(DataAfiliados[Indices[i]].CreatedAt)
    else if DataAfiliados[Indices[i]].FechaAlta <> '' then
      FechaAltaStr := FormatearFecha(DataAfiliados[Indices[i]].FechaAlta)
    else
      FechaAltaStr := '-';

    AddListViewItemWithParam(hLvAfiliados, i, Indices[i], [
      DataAfiliados[Indices[i]].NombreCompleto,
      IntToStr(DataAfiliados[Indices[i]].NumeroAfiliado),
      BoolToTexto(DataAfiliados[Indices[i]].Dni <> '', DataAfiliados[Indices[i]].Dni, 'S/D'),
      FechaAltaStr,
      DataAfiliados[Indices[i]].DireccionCobro,
      FormatearMoneda(DataAfiliados[Indices[i]].MontoCuotaMensual),
      IntToStr(MesesM) + ' meses',
      MoraLabel,
      PagadosStr
    ]);
  end;

  UpdateListViewHeaderIndicators(hLvAfiliados, ColNamesAfil, SortColAfil, SortAscAfil);
  SetStatusMessage(Format('Afiliados: %d registros mostrados (ordenado por %s)', [count, ColNamesAfil[SortColAfil]]));
end;

procedure FiltrarYMostrarInhumaciones(const FiltroTexto: string);
var
  i, count: Integer;
  FiltroUpper, NomUpper, DniUpper, ParcUpper, EmpUpper, FechaDesde, FechaHasta, FechaInhComp, FechaHoraInhStr: string;
  Pasa, PasaFecha: Boolean;
  Indices: array of Integer;
begin
  ClearListView(hLvInh);
  FiltroUpper := UpperCase(Trim(FiltroTexto));
  FechaDesde := Trim(GetWndText(hEdtFechaDesdeInh));
  FechaHasta := Trim(GetWndText(hEdtFechaHastaInh));

  SetLength(Indices, Length(DataInhumaciones));
  count := 0;
  for i := 0 to High(DataInhumaciones) do
  begin
    Pasa := True;
    if FiltroUpper <> '' then
    begin
      NomUpper := UpperCase(DataInhumaciones[i].NombreDifunto);
      DniUpper := UpperCase(DataInhumaciones[i].DniDifunto);
      ParcUpper := UpperCase(DataInhumaciones[i].NomenclaturaParcela);
      EmpUpper := UpperCase(DataInhumaciones[i].EmpresaFunebrera);
      Pasa := (Pos(FiltroUpper, NomUpper) > 0) or (Pos(FiltroUpper, DniUpper) > 0) or
              (Pos(FiltroUpper, ParcUpper) > 0) or (Pos(FiltroUpper, EmpUpper) > 0);
    end;

    PasaFecha := True;
    if (FechaDesde <> '') or (FechaHasta <> '') then
    begin
      FechaInhComp := Copy(DataInhumaciones[i].FechaInhumacion, 1, 10);
      if FechaInhComp = '' then
        FechaInhComp := Copy(DataInhumaciones[i].CreatedAt, 1, 10);

      if FechaInhComp <> '' then
      begin
        if (FechaDesde <> '') and (FechaInhComp < FechaDesde) then PasaFecha := False;
        if (FechaHasta <> '') and (FechaInhComp > FechaHasta) then PasaFecha := False;
      end;
    end;

    if Pasa and PasaFecha then
    begin
      Indices[count] := i;
      Inc(count);
    end;
  end;
  SetLength(Indices, count);

  if count > 1 then
    SortInhIndices(Indices, 0, count - 1, SortColInh, SortAscInh);

  for i := 0 to count - 1 do
  begin
    FechaHoraInhStr := '';
    if DataInhumaciones[Indices[i]].CreatedAt <> '' then
      FechaHoraInhStr := FormatearFechaHora(DataInhumaciones[Indices[i]].CreatedAt)
    else if DataInhumaciones[Indices[i]].FechaInhumacion <> '' then
      FechaHoraInhStr := FormatearFechaHora(DataInhumaciones[Indices[i]].FechaInhumacion)
    else
      FechaHoraInhStr := '-';

    AddListViewItemWithParam(hLvInh, i, Indices[i], [
      FechaHoraInhStr,
      DataInhumaciones[Indices[i]].NombreDifunto,
      DataInhumaciones[Indices[i]].DniDifunto,
      DataInhumaciones[Indices[i]].NomenclaturaParcela,
      IntToStr(DataInhumaciones[Indices[i]].NivelPosicion),
      DataInhumaciones[Indices[i]].EmpresaFunebrera,
      BoolToTexto(DataInhumaciones[Indices[i]].EsCovid, 'COVID-19', 'Estandar')
    ]);
  end;

  UpdateListViewHeaderIndicators(hLvInh, ColNamesInh, SortColInh, SortAscInh);
  SetStatusMessage(Format('Inhumaciones: %d actas mostradas (ordenado por %s)', [count, ColNamesInh[SortColInh]]));
end;

procedure FiltrarYMostrarCaja;
var
  i, count: Integer;
  Indices: array of Integer;
  TotalIngresos, TotalEgresos, BalanceNeto: Currency;
  MontoStr, FechaFiltro, FechaPagoComp: string;
  PasaFecha: Boolean;
begin
  ClearListView(hLvCaja);
  FechaFiltro := Trim(GetWndText(hEdtFechaCaja));

  count := 0;
  SetLength(Indices, Length(DataPagos));
  TotalIngresos := 0;
  TotalEgresos := 0;

  for i := 0 to High(DataPagos) do
  begin
    PasaFecha := True;
    if FechaFiltro <> '' then
    begin
      FechaPagoComp := Copy(DataPagos[i].FechaPago, 1, 10);
      if Pos(FechaFiltro, FechaPagoComp) = 0 then
        PasaFecha := False;
    end;

    if PasaFecha then
    begin
      Indices[count] := i;
      Inc(count);
      if DataPagos[i].TipoMovimiento = tmcEgreso then
        TotalEgresos := TotalEgresos + DataPagos[i].MontoPagado
      else
        TotalIngresos := TotalIngresos + DataPagos[i].MontoPagado;
    end;
  end;
  SetLength(Indices, count);

  BalanceNeto := TotalIngresos - TotalEgresos;
  if hLblResumenCaja <> 0 then
    SetWindowText(hLblResumenCaja, PChar(Format('  INGRESOS: %s  |  EGRESOS: %s  |  BALANCE: %s', [
      FormatearMoneda(TotalIngresos),
      FormatearMoneda(TotalEgresos),
      FormatearMoneda(BalanceNeto)
    ])));

  if count > 1 then
    SortCajaIndices(Indices, 0, count - 1, SortColCaja, SortAscCaja);

  for i := 0 to count - 1 do
  begin
    if DataPagos[Indices[i]].TipoMovimiento = tmcEgreso then
      MontoStr := '-' + FormatearMoneda(DataPagos[Indices[i]].MontoPagado)
    else
      MontoStr := '+' + FormatearMoneda(DataPagos[Indices[i]].MontoPagado);

    AddListViewItemWithParam(hLvCaja, i, Indices[i], [
      DataPagos[Indices[i]].NroRecibo,
      FormatearFechaHora(DataPagos[Indices[i]].FechaPago),
      DataPagos[Indices[i]].TitularNombre,
      DataPagos[Indices[i]].Observaciones,
      MetodoPagoToStr(DataPagos[Indices[i]].MetodoPago),
      MontoStr
    ]);
  end;

  UpdateListViewHeaderIndicators(hLvCaja, ColNamesCaja, SortColCaja, SortAscCaja);
end;

procedure HandleColumnClick(hLv: HWND; ColIndex: Integer);
begin
  if hLv = hLvParcelas then
  begin
    if SortColParcelas = ColIndex then
      SortAscParcelas := not SortAscParcelas
    else
    begin
      SortColParcelas := ColIndex;
      if ColIndex = 9 then SortAscParcelas := False
      else SortAscParcelas := True;
    end;
    FiltrarYMostrarParcelas;
  end
  else if hLv = hLvInh then
  begin
    if SortColInh = ColIndex then
      SortAscInh := not SortAscInh
    else
    begin
      SortColInh := ColIndex;
      if ColIndex = 0 then SortAscInh := False
      else SortAscInh := True;
    end;
    FiltrarYMostrarInhumaciones(GetWndText(hEdtBuscarInh));
  end
  else if hLv = hLvAfiliados then
  begin
    if SortColAfil = ColIndex then
      SortAscAfil := not SortAscAfil
    else
    begin
      SortColAfil := ColIndex;
      if (ColIndex = 5) or (ColIndex = 6) then SortAscAfil := False
      else SortAscAfil := True;
    end;
    FiltrarYMostrarAfiliados;
  end
  else if hLv = hLvCaja then
  begin
    if SortColCaja = ColIndex then
      SortAscCaja := not SortAscCaja
    else
    begin
      SortColCaja := ColIndex;
      if (ColIndex = 1) or (ColIndex = 5) then SortAscCaja := False
      else SortAscCaja := True;
    end;
    FiltrarYMostrarCaja;
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
  // Poblar Actividad Reciente en Dashboard
  ClearListView(hLvRecentInh);
  for i := 0 to High(DataInhumaciones) do
  begin
    if i >= 12 then Break;
    AddListViewItemWithParam(hLvRecentInh, i, i, [
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
  FiltrarYMostrarCaja;

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

  if ShowDlgInhumacion(hMainWnd, False, Inh, DataParcelas, DataInhumaciones) then
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al asentar la inhumacion en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al asentar la inhumacion en Supabase. Verifique la conexion a Internet.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionModificarInhumacion(ExplicitDataIdx: Integer = -1);
var
  Idx: Integer;
  Inh: TInhumacion;
begin
  if ExplicitDataIdx >= 0 then
    Idx := ExplicitDataIdx
  else
    Idx := GetSelectedListViewDataIndex(hLvInh);

  if (Idx < 0) or (Idx > High(DataInhumaciones)) then
  begin
    MessageBox(hMainWnd, 'Seleccione un acta de inhumacion del listado para modificar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Inh := DataInhumaciones[Idx];
  if ShowDlgInhumacion(hMainWnd, True, Inh, DataParcelas, DataInhumaciones) then
  begin
    SetStatusMessage('Actualizando acta de inhumacion en Supabase...');
    if TInhumacionesService.ActualizarInhumacion(Inh.Id, Inh) then
    begin
      MessageBox(hMainWnd, 'Acta de inhumacion actualizada correctamente.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al actualizar en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al actualizar en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionEliminarInhumacion;
var
  Idx: Integer;
  Inh: TInhumacion;
begin
  Idx := GetSelectedListViewDataIndex(hLvInh);
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al eliminar el registro en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al eliminar el registro en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al crear la parcela en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al crear la parcela en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionModificarParcela(ExplicitDataIdx: Integer = -1);
var
  Idx: Integer;
  Parc: TParcela;
begin
  if ExplicitDataIdx >= 0 then
    Idx := ExplicitDataIdx
  else
    Idx := GetSelectedListViewDataIndex(hLvParcelas);

  if (Idx < 0) or (Idx > High(DataParcelas)) then
  begin
    MessageBox(hMainWnd, 'Seleccione una parcela del listado para modificar.', 'Aviso', MB_ICONINFORMATION or MB_OK);
    Exit;
  end;

  Parc := DataParcelas[Idx];
  if ShowDlgParcela(hMainWnd, True, Parc) then
  begin
    SetStatusMessage('Actualizando parcela en Supabase...');
    if TParcelasService.ActualizarParcela(Parc.Id, Parc, DataParcelas[Idx].Nomenclatura) then
    begin
      MessageBox(hMainWnd, 'Datos de la parcela actualizados exitosamente.', 'Exito', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al actualizar la parcela en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al actualizar la parcela en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionEliminarParcela;
var
  Idx: Integer;
  Parc: TParcela;
begin
  Idx := GetSelectedListViewDataIndex(hLvParcelas);
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al eliminar la parcela en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al eliminar la parcela.', 'Error', MB_ICONERROR or MB_OK);
    end;
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
  Idx := GetSelectedListViewDataIndex(hLvParcelas);
  if (Idx >= 0) and (Idx <= High(DataParcelas)) then
  begin
    Nomenclatura := DataParcelas[Idx].Nomenclatura;
    Titular := DataParcelas[Idx].TitularNombre;
    ParcId := DataParcelas[Idx].Id;
    if DataParcelas[Idx].SaldoMantenimiento > 0 then
      Monto := DataParcelas[Idx].SaldoMantenimiento
    else
      Monto := 49000;
  end
  else
  begin
    Nomenclatura := 'A-01-01';
    Titular := 'Titular Concesion';
    ParcId := '';
    Monto := 49000;
  end;

  Metodo := mpEfectivo;
  Periodo := 'Anual 2026/2027';
  Recibo := 'REC-' + Nomenclatura + '-' + FormatDateTime('hhnnss', Now);

  if ShowDlgCobroMantenimiento(hMainWnd, Nomenclatura, Titular, Monto, Metodo, Periodo, Recibo) then
  begin
    SetStatusMessage('Registrando cobro de mantenimiento en Supabase...');
    TCajaService.RegistrarPago(Recibo, ParcId, '', Titular, 'Mantenimiento Parcela ' + Nomenclatura, Monto, Metodo, 'Admin Catastro', Periodo);

    // Descontar saldo y si queda en 0 y estaba en mora pasar a ocupada
    if (Idx >= 0) and (Idx <= High(DataParcelas)) then
    begin
      DataParcelas[Idx].SaldoMantenimiento := DataParcelas[Idx].SaldoMantenimiento - Monto;
      if DataParcelas[Idx].SaldoMantenimiento < 0 then
        DataParcelas[Idx].SaldoMantenimiento := 0;
      if (DataParcelas[Idx].SaldoMantenimiento <= 0) and ((DataParcelas[Idx].Estado = epEnMora) or (DataParcelas[Idx].Estado = epStandby)) then
        DataParcelas[Idx].Estado := epOcupada;
      TParcelasService.ActualizarParcela(ParcId, DataParcelas[Idx]);
    end;

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
      'Se actualizo el saldo de la parcela y se genero el recibo oficial: ' + Ruta), 'Cobro Registrado', MB_ICONINFORMATION or MB_OK);
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al registrar afiliado en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al registrar afiliado en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionModificarAfiliado(ExplicitDataIdx: Integer = -1);
var
  Idx: Integer;
  Afil: TAfiliadoSeguro;
begin
  if ExplicitDataIdx >= 0 then
    Idx := ExplicitDataIdx
  else
    Idx := GetSelectedListViewDataIndex(hLvAfiliados);

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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al actualizar afiliado en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al actualizar afiliado en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionEliminarAfiliado;
var
  Idx: Integer;
  Afil: TAfiliadoSeguro;
begin
  Idx := GetSelectedListViewDataIndex(hLvAfiliados);
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
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al eliminar el afiliado en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al eliminar el afiliado.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionCobrarCuotaSeguro;
var
  Idx, Mes, Anio: Integer;
  Afi: TAfiliadoSeguro;
  Monto: Currency;
  Metodo: TMetodoPago;
  Recibo, Concepto, MesNombre, Ruta: string;
  Pago: TPagoMantenimiento;
  MesesNombres: array[1..12] of string = (
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  );
begin
  Idx := GetSelectedListViewDataIndex(hLvAfiliados);
  if (Idx >= 0) and (Idx <= High(DataAfiliados)) then
    Afi := DataAfiliados[Idx]
  else if Length(DataAfiliados) > 0 then
    Afi := DataAfiliados[0]
  else
  begin
    MessageBox(hMainWnd, 'No hay afiliados cargados para realizar cobros.', 'Atencion', MB_ICONWARNING or MB_OK);
    Exit;
  end;

  Mes := 1;
  Anio := 2026;
  Monto := Afi.MontoCuotaMensual;
  if Monto = 0 then Monto := 18000;
  Metodo := mpEfectivo;
  Recibo := 'REC-2026-' + FormatDateTime('hhnnss', Now);

  if ShowDlgCobroCuotaMes(hMainWnd, Afi, Mes, Anio, Monto, Metodo, Recibo) then
  begin
    MesNombre := MesesNombres[Mes];
    Concepto := 'Plan Seguro Integral - ' + MesNombre + ' ' + IntToStr(Anio) + ' (#' + IntToStr(Afi.NumeroAfiliado) + ')';
    SetStatusMessage('Registrando pago de cuota ' + MesNombre + ' ' + IntToStr(Anio) + ' en Supabase Cloud...');

    // 1. Asentar en cuotas_seguro de Supabase (mismo sistema que el sistema web)
    if not TAfiliadosService.RegistrarPagoCuota(Afi.Id, Anio, Mes, Monto, Metodo, Recibo) then
    begin
      MessageBox(hMainWnd, 'Aviso: No se pudo actualizar cuotas_seguro en Supabase. Verifique conexion.', 'Aviso', MB_ICONWARNING or MB_OK);
    end;

    // 2. Registrar en pagos_recibos (Caja)
    TCajaService.RegistrarPago(Recibo, '', Afi.Id, Afi.NombreCompleto, Concepto, Monto, Metodo, 'Cobrador General', Format('%.4d-%.2d', [Anio, Mes]));

    // 3. Emitir Recibo Oficial en PDF
    FillChar(Pago, SizeOf(Pago), 0);
    Pago.NroRecibo := Recibo;
    Pago.TitularNombre := Afi.NombreCompleto;
    Pago.MontoPagado := Monto;
    Pago.PeriodoCubierto := MesNombre + ' ' + IntToStr(Anio);
    Pago.MetodoPago := Metodo;
    Pago.OperadorNombre := 'Cobrador General';
    Pago.Observaciones := Concepto;

    Ruta := GetReportsDirectory + '\Recibo_Cuota_' + Pago.NroRecibo + '.pdf';
    GenerarReciboPagoPDF(Pago, Ruta);

    MessageBox(hMainWnd, PChar('Cobro de cuota mensual asentado exitosamente.'#13#10 +
      'Afiliado: ' + Afi.NombreCompleto + ' (#' + IntToStr(Afi.NumeroAfiliado) + ')'#13#10 +
      'Periodo: ' + MesNombre + ' ' + IntToStr(Anio) + ' - Importe: ' + FormatearMoneda(Monto) + #13#10 +
      'Se emitio el recibo oficial por duplicado: ' + Ruta), 'Cobro Registrado', MB_ICONINFORMATION or MB_OK);
    OpenFileWithShell(Ruta);

    CargarDatosIniciales;
  end;
end;

procedure AccionActualizarCuotaMasiva;
var
  NuevoMonto: Currency;
  SoloActivos: Boolean;
  i, Cantidad: Integer;
begin
  NuevoMonto := 18000;
  if Length(DataAfiliados) > 0 then
    NuevoMonto := DataAfiliados[0].MontoCuotaMensual;
  SoloActivos := True;

  if ShowDlgCuotaMasiva(hMainWnd, NuevoMonto, SoloActivos) then
  begin
    SetStatusMessage('Actualizando cuota masiva en Supabase...');
    if TAfiliadosService.ActualizarCuotaMasiva(NuevoMonto, SoloActivos) then
    begin
      Cantidad := 0;
      for i := 0 to High(DataAfiliados) do
      begin
        if (not SoloActivos) or (DataAfiliados[i].Estado <> eaBaja) then
        begin
          DataAfiliados[i].MontoCuotaMensual := NuevoMonto;
          Inc(Cantidad);
        end;
      end;
      MessageBox(hMainWnd,
        PChar('Cuota actualizada exitosamente.'#13#10#13#10 +
          'Nuevo valor: $' + CurrToStr(NuevoMonto) + #13#10 +
          'Afiliados actualizados: ' + IntToStr(Cantidad)),
        'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      FiltrarYMostrarAfiliados;
    end
    else
      MessageBox(hMainWnd, 'Error al actualizar cuota masiva en Supabase.', 'Error', MB_ICONERROR or MB_OK);
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

procedure AccionNuevoEgresoCaja;
var
  Concepto, Categoria, Comprobante: string;
  Monto: Currency;
  Metodo: TMetodoPago;
begin
  Concepto := '';
  Categoria := 'Mantenimiento Parque';
  Comprobante := 'EGR-' + FormatDateTime('hhnnss', Now);
  Monto := 10000;
  Metodo := mpEfectivo;

  if ShowDlgEgresoCaja(hMainWnd, Concepto, Categoria, Comprobante, Monto, Metodo) then
  begin
    SetStatusMessage('Registrando egreso operativo en Supabase...');
    if TCajaService.RegistrarEgreso(Comprobante, Concepto, Categoria, Monto, Metodo, 'Caja Central') then
    begin
      MessageBox(hMainWnd,
        PChar('Egreso operativo registrado exitosamente.'#13#10#13#10 +
          'Concepto: ' + Concepto + #13#10 +
          'Categoria: ' + Categoria + #13#10 +
          'Importe: ' + FormatearMoneda(Monto) + #13#10 +
          'Comprobante: ' + Comprobante),
        'Egreso Asentado', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al registrar el egreso en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al registrar el egreso en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
  end;
end;

procedure AccionEliminarCobroCaja;
var
  Idx: Integer;
  Pago: TPagoMantenimiento;
  IdToDelete: string;
begin
  Idx := GetSelectedListViewDataIndex(hLvCaja);
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
    IdToDelete := Pago.Id;
    if IdToDelete = '' then
      IdToDelete := Pago.NroRecibo;
    if TCajaService.EliminarPago(IdToDelete) then
    begin
      MessageBox(hMainWnd, 'Movimiento anulado exitosamente.', 'Operacion Completada', MB_ICONINFORMATION or MB_OK);
      CargarDatosIniciales;
    end
    else
    begin
      if Supabase.LastErrorMessage <> '' then
        MessageBox(hMainWnd, PChar('Error al anular el movimiento en Supabase:'#13#10 + Supabase.LastErrorMessage), 'Error', MB_ICONERROR or MB_OK)
      else
        MessageBox(hMainWnd, 'Error al anular el movimiento en Supabase.', 'Error', MB_ICONERROR or MB_OK);
    end;
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
  Idx := GetSelectedListViewDataIndex(hLvInh);
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

procedure AccionGenerarReciboPDF(ExplicitDataIdx: Integer = -1);
var
  Idx: Integer;
  Pago: TPagoMantenimiento;
  Ruta: string;
begin
  if ExplicitDataIdx >= 0 then
    Idx := ExplicitDataIdx
  else
    Idx := GetSelectedListViewDataIndex(hLvCaja);

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

procedure AccionGenerarPadronParcelasPDF;
var
  Ruta: string;
begin
  Ruta := GetReportsDirectory + '\Padron_General_Parcelas_' + FormatDateTime('yyyymmdd_hhnnss', Now) + '.pdf';
  GenerarListadoParcelasPDF(DataParcelas, Ruta);
  SetStatusMessage('Padron General de Parcelas emitido: ' + Ruta);
  MessageBox(hMainWnd, PChar('Padron Oficial de Parcelas generado exitosamente.'#13#10 +
    'Total Parcelas en padron: ' + IntToStr(Length(DataParcelas)) + #13#10 +
    'Archivo guardado en: ' + Ruta), 'Reporte Generado', MB_ICONINFORMATION or MB_OK);
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
  // Modulo 1: Parcelas
  // ===========================================================
  MoveWindow(hLvParcelas, 15, 175, cxClient - 30, cyClient - 205, True);

  // ===========================================================
  // Modulo 2: Inhumaciones
  // ===========================================================
  MoveWindow(hLvInh, 15, 175, cxClient - 30, cyClient - 205, True);

  // ===========================================================
  // Modulo 3: Afiliados
  // ===========================================================
  MoveWindow(hLvAfiliados, 15, 175, cxClient - 30, cyClient - 205, True);

  // ===========================================================
  // Modulo 4: Caja Diaria
  // ===========================================================
  MoveWindow(hLblResumenCaja,     15,             110, cxClient - 605, 32, True);
  MoveWindow(hBtnNuevoCobroCaja,  cxClient - 582, 110, 120,            32, True);
  MoveWindow(hBtnNuevoEgresoCaja, cxClient - 454, 110, 125,            32, True);
  MoveWindow(hBtnDelCobroCaja,    cxClient - 321, 110, 85,             32, True);
  MoveWindow(hBtnCierreCaja,      cxClient - 228, 110, 130,            32, True);
  MoveWindow(hBtnSyncCaja,        cxClient - 90,  110, 75,             32, True);
  MoveWindow(hLvCaja,             15,             150, cxClient - 30,  cyClient - 180, True);

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
  NavButtons[1] := CreateButton(hWnd, '[2] Parcelas',           175, 64, 160, 36, IDC_NAV_PARCELAS);
  NavButtons[2] := CreateButton(hWnd, '[3] Libro Inhumaciones', 340, 64, 165, 36, IDC_NAV_INHUMACIONES);
  NavButtons[3] := CreateButton(hWnd, '[4] Afiliados Seguro',   510, 64, 160, 36, IDC_NAV_AFILIADOS);
  NavButtons[4] := CreateButton(hWnd, '[5] Caja Diaria',        675, 64, 160, 36, IDC_NAV_CAJA);
  NavButtons[5] := CreateButton(hWnd, '[6] Reportes PDF',       840, 64, 165, 36, IDC_NAV_REPORTES);

  // ===========================================================
  // MODULO 0: TABLERO GENERAL (DASHBOARD)
  // ===========================================================
  hCard1    := CreateLabel(hWnd, '  PARCELAS',           15, 110, 190, 24, hCardTitleFont);
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
  // MODULO 1: PARCELAS (CRUD COMPLETO Y FILTROS POR COLUMNA)
  // ===========================================================
  hLblFiltrosParc := CreateLabel(hWnd, 'Sector:', 15, 110, 50, 22, hBoldFont);
  AddControlToModule(1, hLblFiltrosParc);
  hCmbSector := CreateComboBox(hWnd, 68, 107, 105, 140, IDC_CMB_SECTOR);
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Sectores')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector A')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector B')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector E')));
  SendMessage(hCmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector Salinas')));
  SendMessage(hCmbSector, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbSector);

  hLblEstadoParc := CreateLabel(hWnd, 'Estado:', 178, 110, 48, 22, hBoldFont);
  AddControlToModule(1, hLblEstadoParc);
  hCmbEstadoParc := CreateComboBox(hWnd, 228, 107, 160, 180, IDC_CMB_ESTADO_PARC);
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Estados')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Disponible')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Ocupada')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('En Mora')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Reservada')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Baja (General)')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Baja: Libre (Sin Inh.)')));
  SendMessage(hCmbEstadoParc, CB_ADDSTRING, 0, LPARAM(PChar('Baja: Con Inhumados')));
  SendMessage(hCmbEstadoParc, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbEstadoParc);

  hLblSaldoParc := CreateLabel(hWnd, 'Saldo:', 394, 110, 42, 22, hBoldFont);
  AddControlToModule(1, hLblSaldoParc);
  hCmbSaldoParc := CreateComboBox(hWnd, 438, 107, 140, 140, IDC_CMB_SALDO_PARC);
  SendMessage(hCmbSaldoParc, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Saldos')));
  SendMessage(hCmbSaldoParc, CB_ADDSTRING, 0, LPARAM(PChar('Solo con Deuda (> $0)')));
  SendMessage(hCmbSaldoParc, CB_ADDSTRING, 0, LPARAM(PChar('Sin Deuda ($0)')));
  SendMessage(hCmbSaldoParc, CB_ADDSTRING, 0, LPARAM(PChar('Deuda >= $100.000')));
  SendMessage(hCmbSaldoParc, CB_ADDSTRING, 0, LPARAM(PChar('Deuda >= $300.000')));
  SendMessage(hCmbSaldoParc, CB_SETCURSEL, 0, 0);
  AddControlToModule(1, hCmbSaldoParc);

  hLblBuscarParc := CreateLabel(hWnd, 'Buscar Parcela:', 584, 110, 130, 22, hBoldFont);
  AddControlToModule(1, hLblBuscarParc);
  hEdtBuscarParc := CreateEdit(hWnd, '', 718, 107, 170, 24, IDC_EDT_BUSCAR_PARC);
  AddControlToModule(1, hEdtBuscarParc);
  hBtnBuscarParc := CreateButton(hWnd, 'Filtrar', 892, 106, 72, 26, IDC_BTN_FILTRAR_PARC);
  AddControlToModule(1, hBtnBuscarParc);

  // Fila 2: Botones de Accion y Filtros de Fecha
  hBtnNuevaParc := CreateButton(hWnd, '+ Nueva Parcela', 15, 140, 120, 28, IDC_BTN_NUEVA_PARC);
  AddControlToModule(1, hBtnNuevaParc);
  hBtnEditParc := CreateButton(hWnd, '* Modificar', 140, 140, 90, 28, IDC_BTN_EDIT_PARC);
  AddControlToModule(1, hBtnEditParc);
  hBtnCobrarMantParc := CreateButton(hWnd, '$ Cobrar Mant.', 235, 140, 110, 28, IDC_BTN_COBRAR_MANT);
  AddControlToModule(1, hBtnCobrarMantParc);
  hBtnRepPadronParc := CreateButton(hWnd, 'Padron (PDF)', 350, 140, 105, 28, IDC_BTN_PADRON_PARC_PDF);
  AddControlToModule(1, hBtnRepPadronParc);
  hBtnDelParc := CreateButton(hWnd, '- Eliminar', 460, 140, 85, 28, IDC_BTN_DEL_PARC);
  AddControlToModule(1, hBtnDelParc);
  hBtnSyncParc := CreateButton(hWnd, 'Recargar', 550, 140, 75, 28, IDC_BTN_SYNC);
  AddControlToModule(1, hBtnSyncParc);

  hLblFechaDesdeParc := CreateLabel(hWnd, 'Desde:', 635, 144, 45, 22, hBoldFont);
  AddControlToModule(1, hLblFechaDesdeParc);
  hEdtFechaDesdeParc := CreateEdit(hWnd, '', 682, 141, 80, 24, IDC_EDT_FECHA_DESDE_PARC);
  AddControlToModule(1, hEdtFechaDesdeParc);
  hLblFechaHastaParc := CreateLabel(hWnd, 'Hasta:', 768, 144, 45, 22, hBoldFont);
  AddControlToModule(1, hLblFechaHastaParc);
  hEdtFechaHastaParc := CreateEdit(hWnd, '', 815, 141, 80, 24, IDC_EDT_FECHA_HASTA_PARC);
  AddControlToModule(1, hEdtFechaHastaParc);
  hBtnFiltrarFechaParc := CreateButton(hWnd, 'Filtrar Fecha', 902, 140, 100, 26, IDC_BTN_FILTRAR_FECHA_PARC);
  AddControlToModule(1, hBtnFiltrarFechaParc);

  hLvParcelas := CreateListView(hWnd, 15, 175, 990, 435, IDC_LV_PARCELAS);
  AddListViewColumn(hLvParcelas, 0, 'Titular (Condicion)', 190);
  AddListViewColumn(hLvParcelas, 1, 'Difuntos en Fosa (Fallecidos)', 240);
  AddListViewColumn(hLvParcelas, 2, 'Parcela', 95);
  AddListViewColumn(hLvParcelas, 3, 'Sector', 60);
  AddListViewColumn(hLvParcelas, 4, 'Fila / Mz', 65);
  AddListViewColumn(hLvParcelas, 5, 'Nro Parcela', 75);
  AddListViewColumn(hLvParcelas, 6, 'Estado Parcela', 100);
  AddListViewColumn(hLvParcelas, 7, 'Fecha / Registro', 110);
  AddListViewColumn(hLvParcelas, 8, 'Ultimo Pago', 95);
  AddListViewColumn(hLvParcelas, 9, 'Saldo', 100);
  AddControlToModule(1, hLvParcelas);

  // ===========================================================
  // MODULO 2: LIBRO PARROQUIAL DE INHUMACIONES (CRUD COMPLETO)
  // ===========================================================
  hLblBuscarInh := CreateLabel(hWnd, 'Buscar Difunto / DNI / Parcela:', 15, 110, 205, 22, hBoldFont);
  AddControlToModule(2, hLblBuscarInh);
  hEdtBuscarInh := CreateEdit(hWnd, '', 225, 107, 180, 24, IDC_EDT_BUSCAR_INH);
  AddControlToModule(2, hEdtBuscarInh);
  hBtnBuscarInh := CreateButton(hWnd, 'Buscar', 410, 106, 75, 26, IDC_BTN_BUSCAR_INH);
  AddControlToModule(2, hBtnBuscarInh);

  hLblFechaDesdeInh := CreateLabel(hWnd, 'Desde:', 500, 110, 48, 22, hBoldFont);
  AddControlToModule(2, hLblFechaDesdeInh);
  hEdtFechaDesdeInh := CreateEdit(hWnd, '', 550, 107, 85, 24, IDC_EDT_FECHA_DESDE_INH);
  AddControlToModule(2, hEdtFechaDesdeInh);
  hLblFechaHastaInh := CreateLabel(hWnd, 'Hasta:', 645, 110, 48, 22, hBoldFont);
  AddControlToModule(2, hLblFechaHastaInh);
  hEdtFechaHastaInh := CreateEdit(hWnd, '', 695, 107, 85, 24, IDC_EDT_FECHA_HASTA_INH);
  AddControlToModule(2, hEdtFechaHastaInh);
  hBtnFiltrarFechaInh := CreateButton(hWnd, 'Filtrar Fechas', 788, 106, 95, 26, IDC_BTN_FILTRAR_FECHA_INH);
  AddControlToModule(2, hBtnFiltrarFechaInh);

  // Fila 2: Acciones
  hBtnNuevaInh := CreateButton(hWnd, '+ Nueva Inhumacion', 15, 140, 150, 28, IDC_BTN_NUEVA_INH);
  AddControlToModule(2, hBtnNuevaInh);
  hBtnEditInh := CreateButton(hWnd, '* Modificar', 170, 140, 100, 28, IDC_BTN_EDIT_INH);
  AddControlToModule(2, hBtnEditInh);
  hBtnActaPdf := CreateButton(hWnd, 'Emitir Acta (PDF)', 275, 140, 130, 28, IDC_BTN_ACTA_PDF);
  AddControlToModule(2, hBtnActaPdf);
  hBtnFolioPdf := CreateButton(hWnd, 'Folio (PDF)', 410, 140, 100, 28, IDC_BTN_FOLIO_PDF);
  AddControlToModule(2, hBtnFolioPdf);
  hBtnDelInh := CreateButton(hWnd, '- Eliminar', 515, 140, 95, 28, IDC_BTN_DEL_INH);
  AddControlToModule(2, hBtnDelInh);
  hBtnSyncInh := CreateButton(hWnd, 'Recargar', 615, 140, 85, 28, IDC_BTN_SYNC);
  AddControlToModule(2, hBtnSyncInh);

  hLvInh := CreateListView(hWnd, 15, 175, 990, 435, IDC_LV_INHUMACIONES);
  AddListViewColumn(hLvInh, 0, 'Fecha y Hora Inh.', 130);
  AddListViewColumn(hLvInh, 1, 'Nombre Completo del Difunto', 250);
  AddListViewColumn(hLvInh, 2, 'DNI', 100);
  AddListViewColumn(hLvInh, 3, 'Parcela', 100);
  AddListViewColumn(hLvInh, 4, 'Nivel', 60);
  AddListViewColumn(hLvInh, 5, 'Empresa Funebrera', 180);
  AddListViewColumn(hLvInh, 6, 'Protocolo Sanitario', 130);
  AddControlToModule(2, hLvInh);

  // ===========================================================
  // MODULO 3: SEGURO DE SEPELIO Y AFILIADOS (CRUD COMPLETO)
  // ===========================================================
  hLblFiltroMora := CreateLabel(hWnd, 'Filtro Cobranza:', 15, 110, 105, 22, hBoldFont);
  AddControlToModule(3, hLblFiltroMora);
  hCmbMora := CreateComboBox(hWnd, 125, 107, 200, 140, IDC_CMB_MORA);
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Todos los Afiliados')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Al Dia (Habilitados)')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Aviso: Mora >= 3 Meses')));
  SendMessage(hCmbMora, CB_ADDSTRING, 0, LPARAM(PChar('Urgente: Riesgo Baja (>= 3 Anos)')));
  SendMessage(hCmbMora, CB_SETCURSEL, 0, 0);
  AddControlToModule(3, hCmbMora);

  hLblBuscarAfil := CreateLabel(hWnd, 'Buscar:', 335, 110, 50, 22, hBoldFont);
  AddControlToModule(3, hLblBuscarAfil);
  hEdtBuscarAfil := CreateEdit(hWnd, '', 390, 107, 160, 24, IDC_EDT_BUSCAR_AFIL);
  AddControlToModule(3, hEdtBuscarAfil);
  hBtnBuscarAfil := CreateButton(hWnd, 'Filtrar', 555, 106, 65, 26, IDC_BTN_FILTRAR_AFIL);
  AddControlToModule(3, hBtnBuscarAfil);

  hLblFechaDesdeAfil := CreateLabel(hWnd, 'Alta Desde:', 630, 110, 80, 22, hBoldFont);
  AddControlToModule(3, hLblFechaDesdeAfil);
  hEdtFechaDesdeAfil := CreateEdit(hWnd, '', 715, 107, 85, 24, IDC_EDT_FECHA_DESDE_AFIL);
  AddControlToModule(3, hEdtFechaDesdeAfil);
  hBtnFiltrarFechaAfil := CreateButton(hWnd, 'Filtrar Fecha', 805, 106, 95, 26, IDC_BTN_FILTRAR_FECHA_AFIL);
  AddControlToModule(3, hBtnFiltrarFechaAfil);

  // Fila 2: Botones de Accion
  hBtnNuevoAfil := CreateButton(hWnd, '+ Nuevo Afiliado', 15, 140, 130, 28, IDC_BTN_NUEVO_AFIL);
  AddControlToModule(3, hBtnNuevoAfil);
  hBtnEditAfil := CreateButton(hWnd, '* Modificar', 150, 140, 100, 28, IDC_BTN_EDIT_AFIL);
  AddControlToModule(3, hBtnEditAfil);
  hBtnCobrarAfil := CreateButton(hWnd, '$ Cobrar Cuota', 255, 140, 125, 28, IDC_BTN_COBRAR_CUOTA);
  AddControlToModule(3, hBtnCobrarAfil);
  hBtnPlanillaPdf := CreateButton(hWnd, 'Planilla Cobrador (PDF)', 385, 140, 160, 28, IDC_BTN_PLANILLA_PDF);
  AddControlToModule(3, hBtnPlanillaPdf);
  hBtnCuotaMasivaAfil := CreateButton(hWnd, '$ Cuota Masiva', 550, 140, 120, 28, IDC_BTN_CUOTA_MASIVA);
  AddControlToModule(3, hBtnCuotaMasivaAfil);
  hBtnDelAfil := CreateButton(hWnd, '- Eliminar / Baja', 675, 140, 125, 28, IDC_BTN_DEL_AFIL);
  AddControlToModule(3, hBtnDelAfil);
  hBtnSyncAfil := CreateButton(hWnd, 'Recargar', 805, 140, 85, 28, IDC_BTN_SYNC);
  AddControlToModule(3, hBtnSyncAfil);

  hLvAfiliados := CreateListView(hWnd, 15, 175, 990, 435, IDC_LV_AFILIADOS);
  AddListViewColumn(hLvAfiliados, 0, 'Nombre Completo del Titular', 200);
  AddListViewColumn(hLvAfiliados, 1, 'Nro Afiliado', 80);
  AddListViewColumn(hLvAfiliados, 2, 'DNI', 90);
  AddListViewColumn(hLvAfiliados, 3, 'Fecha de Alta / Hora', 125);
  AddListViewColumn(hLvAfiliados, 4, 'Direccion de Cobro', 140);
  AddListViewColumn(hLvAfiliados, 5, 'Cuota', 80);
  AddListViewColumn(hLvAfiliados, 6, 'Mora', 60);
  AddListViewColumn(hLvAfiliados, 7, 'Estado Cobertura', 120);
  AddListViewColumn(hLvAfiliados, 8, 'Meses Pagados 2026', 150);
  AddControlToModule(3, hLvAfiliados);

  // ===========================================================
  // MODULO 4: CAJA DIARIA Y ARQUEO (CRUD COMPLETO)
  // ===========================================================
  hLblResumenCaja := CreateLabel(hWnd, '  INGRESOS: $ 0.00  |  EGRESOS: $ 0.00  |  BALANCE: $ 0.00', 15, 110, 360, 32, hBoldFont);
  AddControlToModule(4, hLblResumenCaja);

  hLblFechaCaja := CreateLabel(hWnd, 'Fecha/Hora:', 380, 115, 75, 22, hBoldFont);
  AddControlToModule(4, hLblFechaCaja);
  hEdtFechaCaja := CreateEdit(hWnd, '', 458, 112, 90, 24, IDC_EDT_FECHA_CAJA);
  AddControlToModule(4, hEdtFechaCaja);

  hBtnNuevoCobroCaja := CreateButton(hWnd, '+ Cobro', 555, 110, 85, 30, IDC_BTN_NUEVO_COBRO);
  AddControlToModule(4, hBtnNuevoCobroCaja);
  hBtnNuevoEgresoCaja := CreateButton(hWnd, '- Registrar Egreso', 645, 110, 110, 30, IDC_BTN_NUEVO_EGRESO);
  AddControlToModule(4, hBtnNuevoEgresoCaja);
  hBtnDelCobroCaja   := CreateButton(hWnd, 'Anular', 760, 110, 65, 30, IDC_BTN_DEL_COBRO);
  AddControlToModule(4, hBtnDelCobroCaja);
  hBtnCierreCaja     := CreateButton(hWnd, 'Acta Cierre (PDF)', 830, 110, 115, 30, IDC_BTN_CIERRE_CAJA);
  AddControlToModule(4, hBtnCierreCaja);
  hBtnSyncCaja       := CreateButton(hWnd, 'Recargar', 950, 110, 60, 30, IDC_BTN_SYNC);
  AddControlToModule(4, hBtnSyncCaja);

  hLvCaja := CreateListView(hWnd, 15, 150, 990, 460, IDC_LV_CAJA);
  AddListViewColumn(hLvCaja, 0, 'Recibo Nro', 110);
  AddListViewColumn(hLvCaja, 1, 'Fecha / Hora', 140);
  AddListViewColumn(hLvCaja, 2, 'Titular / Pagador', 230);
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

  hBtnRepPadronParcMod5 := CreateButton(hWnd, '7. Generar Padron General de Parcelas Completo (PDF)', 30, 380, 450, 46, IDC_BTN_PADRON_PARC_PDF);
  AddControlToModule(5, hBtnRepPadronParcMod5);

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
  AppendMenu(hSubMenuMod, MF_STRING, IDC_NAV_PARCELAS, '&2. Parcelas');
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
  AppendMenu(hSubMenuPdf, MF_STRING, IDC_BTN_PADRON_PARC_PDF, 'Padron General de &Parcelas (PDF)');
  AppendMenu(hMenu, MF_POPUP, hSubMenuPdf, '&Reportes PDF');

  // Menu Ayuda
  hSubMenuAyu := CreatePopupMenu;
  AppendMenu(hSubMenuAyu, MF_STRING, IDM_ACERCA, '&Acerca de Aeterna XP...');
  AppendMenu(hMenu, MF_POPUP, hSubMenuAyu, 'A&yuda');

  Result := hMenu;
end;

// -------------------------------------------------------------
// Manejador de Doble Clic en Registros de Tablas (Modificacion Directa)
// -------------------------------------------------------------

procedure HandleListViewDoubleClick(hLv: HWND);
var
  Idx: Integer;
begin
  if hLv = 0 then Exit;
  Idx := GetSelectedListViewDataIndex(hLv);
  if Idx < 0 then Exit;

  if hLv = hLvParcelas then
  begin
    if (Idx >= 0) and (Idx <= High(DataParcelas)) then
      AccionModificarParcela(Idx);
  end
  else if hLv = hLvInh then
  begin
    if (Idx >= 0) and (Idx <= High(DataInhumaciones)) then
      AccionModificarInhumacion(Idx);
  end
  else if hLv = hLvAfiliados then
  begin
    if (Idx >= 0) and (Idx <= High(DataAfiliados)) then
      AccionModificarAfiliado(Idx);
  end
  else if hLv = hLvRecentInh then
  begin
    if (Idx >= 0) and (Idx <= High(DataInhumaciones)) then
    begin
      SwitchModule(2); // Cambiar al modulo de Inhumaciones
      AccionModificarInhumacion(Idx);
    end;
  end
  else if hLv = hLvCaja then
  begin
    if (Idx >= 0) and (Idx <= High(DataPagos)) then
      AccionGenerarReciboPDF(Idx);
  end;
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
  pnm: PNMHDR;
  pnmv: PNMListView;
  pnmia: PNMITEMACTIVATE_REC;
begin
  case uMsg of
    WM_NOTIFY:
      begin
        pnm := PNMHDR(lParam);
        if pnm <> nil then
        begin
          if Integer(pnm^.code) = LVN_COLUMNCLICK then
          begin
            pnmv := PNMListView(lParam);
            HandleColumnClick(pnm^.hwndFrom, pnmv^.iSubItem);
            Result := 0;
            Exit;
          end
          else if Integer(pnm^.code) = NM_CLICK then
          begin
            pnmia := PNMITEMACTIVATE_REC(lParam);
            if (pnmia <> nil) and (pnmia^.iItem >= 0) then
              SetListViewSelectedIndex(pnm^.hwndFrom, pnmia^.iItem);
            Result := 0;
            Exit;
          end
          else if (Integer(pnm^.code) = NM_DBLCLK) or (Integer(pnm^.code) = NM_RETURN) then
          begin
            pnmia := PNMITEMACTIVATE_REC(lParam);
            if (pnmia <> nil) and (pnmia^.iItem >= 0) then
              SetListViewSelectedIndex(pnm^.hwndFrom, pnmia^.iItem);
            HandleListViewDoubleClick(pnm^.hwndFrom);
            Result := 0;
            Exit;
          end;
        end;
        Result := 0;
        Exit;
      end;

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
          if (CmdId = IDC_CMB_SECTOR) or (CmdId = IDC_CMB_ESTADO_PARC) or (CmdId = IDC_CMB_SALDO_PARC) then
            FiltrarYMostrarParcelas
          else if CmdId = IDC_CMB_MORA then
            FiltrarYMostrarAfiliados;
          Result := 0;
          Exit;
        end;

        // Busqueda en tiempo real al tipear en cuadros de busqueda
        if HIWORD(wParam) = EN_CHANGE then
        begin
          if (CmdId = IDC_EDT_BUSCAR_PARC) or (CmdId = IDC_EDT_FECHA_DESDE_PARC) or (CmdId = IDC_EDT_FECHA_HASTA_PARC) then
          begin
            FiltrarYMostrarParcelas;
            Result := 0;
            Exit;
          end
          else if (CmdId = IDC_EDT_BUSCAR_AFIL) or (CmdId = IDC_EDT_FECHA_DESDE_AFIL) then
          begin
            FiltrarYMostrarAfiliados;
            Result := 0;
            Exit;
          end
          else if (CmdId = IDC_EDT_BUSCAR_INH) or (CmdId = IDC_EDT_FECHA_DESDE_INH) or (CmdId = IDC_EDT_FECHA_HASTA_INH) then
          begin
            FiltrarYMostrarInhumaciones(GetWndText(hEdtBuscarInh));
            Result := 0;
            Exit;
          end
          else if CmdId = IDC_EDT_FECHA_CAJA then
          begin
            FiltrarYMostrarCaja;
            Result := 0;
            Exit;
          end;
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
              SearchBuf := GetWndText(hEdtBuscarInh);
              FiltrarYMostrarInhumaciones(SearchBuf);
              SetStatusMessage('Busqueda aplicada: ' + SearchBuf);
            end;
          IDC_BTN_FILTRAR_FECHA_INH:
            begin
              SearchBuf := GetWndText(hEdtBuscarInh);
              FiltrarYMostrarInhumaciones(SearchBuf);
              SetStatusMessage('Filtro por fechas aplicado a inhumaciones');
            end;

          // CRUD Parcelas
          IDC_BTN_NUEVA_PARC:   AccionNuevaParcela;
          IDC_BTN_EDIT_PARC:    AccionModificarParcela;
          IDC_BTN_DEL_PARC:     AccionEliminarParcela;
          IDC_BTN_COBRAR_MANT:  AccionCobrarMantenimientoParcela;
          IDC_BTN_PADRON_PARC_PDF: AccionGenerarPadronParcelasPDF;
          IDC_BTN_FILTRAR_PARC: FiltrarYMostrarParcelas;
          IDC_BTN_FILTRAR_FECHA_PARC: FiltrarYMostrarParcelas;

          // CRUD Afiliados
          IDC_BTN_NUEVO_AFIL:   AccionNuevoAfiliado;
          IDC_BTN_EDIT_AFIL:    AccionModificarAfiliado;
          IDC_BTN_DEL_AFIL:     AccionEliminarAfiliado;
          IDC_BTN_COBRAR_CUOTA: AccionCobrarCuotaSeguro;
          IDC_BTN_CUOTA_MASIVA: AccionActualizarCuotaMasiva;
          IDC_BTN_PLANILLA_PDF: AccionGenerarPlanillaRutaPDF;
          IDC_BTN_FILTRAR_AFIL: FiltrarYMostrarAfiliados;
          IDC_BTN_FILTRAR_FECHA_AFIL: FiltrarYMostrarAfiliados;

          // CRUD Caja
          IDC_BTN_NUEVO_COBRO:  AccionNuevoCobroCaja;
          IDC_BTN_NUEVO_EGRESO: AccionNuevoEgresoCaja;
          IDC_BTN_DEL_COBRO:    AccionEliminarCobroCaja;
          IDC_BTN_CIERRE_CAJA:  AccionGenerarCierreCajaPDF;
          IDC_BTN_RECIBO_PDF:   AccionGenerarReciboPDF;
          IDC_BTN_FILTRAR_FECHA_CAJA: FiltrarYMostrarCaja;

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
