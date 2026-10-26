unit uWin32Dialogs;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, CommCtrl, Windows, Messages,
  uDataModels, uBusinessRules;

function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion): Boolean; overload;
function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion; const ParcelasRef: TParcelaArray): Boolean; overload;
function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion; const ParcelasRef: TParcelaArray; const InhumacionesRef: TInhumacionArray): Boolean; overload;
function ShowDlgParcela(ParentWnd: HWND; IsEdit: Boolean; var Parc: TParcela): Boolean; overload;
function ShowDlgParcela(ParentWnd: HWND; IsEdit: Boolean; var Parc: TParcela; const InhumacionesRef: TInhumacionArray): Boolean; overload;
function ShowDlgAfiliado(ParentWnd: HWND; IsEdit: Boolean; var Afil: TAfiliadoSeguro): Boolean;
function ShowDlgCobroCaja(ParentWnd: HWND; var Titular, Concepto: string; var Monto: Currency; var Metodo: TMetodoPago; var Recibo: string): Boolean;
function ShowDlgCobroMantenimiento(ParentWnd: HWND; const Nomenclatura, TitularDef: string; var Monto: Currency; var Metodo: TMetodoPago; var Periodo, Recibo: string): Boolean;
function ShowDlgCobroCuotaMes(ParentWnd: HWND; const Afiliado: TAfiliadoSeguro; var MesSeleccionado, AnioSeleccionado: Integer; var Monto: Currency; var Metodo: TMetodoPago; var Recibo: string): Boolean;
function ShowDlgCuotaMasiva(ParentWnd: HWND; var NuevoMonto: Currency; var SoloActivos: Boolean): Boolean;
function ShowDlgEgresoCaja(ParentWnd: HWND; var Concepto, Categoria, Comprobante: string; var Monto: Currency; var Metodo: TMetodoPago): Boolean;

implementation

var
  hDlgFont, hDlgBoldFont: HFONT;

procedure EnsureDlgFonts;
var
  lf: TLogFont;
begin
  if hDlgFont = 0 then
  begin
    FillChar(lf, SizeOf(lf), 0);
    lf.lfHeight := -12;
    lf.lfWeight := FW_NORMAL;
    StrCopy(lf.lfFaceName, 'Tahoma');
    hDlgFont := CreateFontIndirect(lf);

    lf.lfWeight := FW_BOLD;
    hDlgBoldFont := CreateFontIndirect(lf);
  end;
end;

function BoolToTexto(Cond: Boolean; const Si, No: string): string;
begin
  if Cond then Result := Si else Result := No;
end;

function CreateDlgLabel(hParent: HWND; const Caption: string; X, Y, W, H: Integer): HWND;
begin
  EnsureDlgFonts;
  Result := CreateWindow('STATIC', PChar(Caption),
    WS_CHILD or WS_VISIBLE or SS_LEFT,
    X, Y, W, H, hParent, 0, hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hDlgBoldFont), 1);
end;

function CreateDlgEdit(hParent: HWND; const Text: string; X, Y, W, H, Id: Integer): HWND;
begin
  EnsureDlgFonts;
  Result := CreateWindowEx(WS_EX_CLIENTEDGE, 'EDIT', PChar(Text),
    WS_CHILD or WS_VISIBLE or ES_LEFT or ES_AUTOHSCROLL,
    X, Y, W, H, hParent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hDlgFont), 1);
end;

function CreateDlgCombo(hParent: HWND; X, Y, W, H, Id: Integer): HWND;
begin
  EnsureDlgFonts;
  Result := CreateWindow('COMBOBOX', '',
    WS_CHILD or WS_VISIBLE or CBS_DROPDOWNLIST or WS_VSCROLL,
    X, Y, W, H, hParent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hDlgFont), 1);
end;

function CreateDlgEditableCombo(hParent: HWND; X, Y, W, H, Id: Integer): HWND;
begin
  EnsureDlgFonts;
  Result := CreateWindow('COMBOBOX', '',
    WS_CHILD or WS_VISIBLE or CBS_DROPDOWN or WS_VSCROLL or CBS_AUTOHSCROLL,
    X, Y, W, H, hParent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hDlgFont), 1);
end;

function CreateDlgButton(hParent: HWND; const Caption: string; X, Y, W, H, Id: Integer; IsDefault: Boolean = False): HWND;
var
  dwStyle: DWORD;
begin
  EnsureDlgFonts;
  dwStyle := WS_CHILD or WS_VISIBLE or BS_PUSHBUTTON;
  if IsDefault then
    dwStyle := dwStyle or BS_DEFPUSHBUTTON;
  Result := CreateWindow('BUTTON', PChar(Caption), dwStyle,
    X, Y, W, H, hParent, HMENU(Id), hInstance, nil);
  SendMessage(Result, WM_SETFONT, WPARAM(hDlgBoldFont), 1);
end;

function GetEditText(hEdt: HWND): string;
var
  Len: Integer;
  Buf: array[0..1023] of Char;
begin
  Len := GetWindowText(hEdt, Buf, SizeOf(Buf));
  if Len > 0 then
    Result := Trim(string(Buf))
  else
    Result := '';
end;

function RunModalLoop(hDlg, hParent: HWND): Boolean;
var
  msg: TMsg;
begin
  Result := False;
  EnableWindow(hParent, False);
  ShowWindow(hDlg, SW_SHOW);
  UpdateWindow(hDlg);

  while IsWindow(hDlg) and GetMessage(msg, 0, 0, 0) do
  begin
    if not IsDialogMessage(hDlg, msg) then
    begin
      TranslateMessage(msg);
      DispatchMessage(msg);
    end;
  end;

  EnableWindow(hParent, True);
  SetForegroundWindow(hParent);
  SetFocus(hParent);
end;

function CenterWindow(hWnd, hParent: HWND): Boolean;
var
  rc, rcParent: RECT;
  X, Y, W, H: Integer;
begin
  GetWindowRect(hWnd, rc);
  W := rc.Right - rc.Left;
  H := rc.Bottom - rc.Top;
  if (hParent <> 0) and GetWindowRect(hParent, rcParent) then
  begin
    X := rcParent.Left + ((rcParent.Right - rcParent.Left) - W) div 2;
    Y := rcParent.Top + ((rcParent.Bottom - rcParent.Top) - H) div 2;
  end
  else
  begin
    X := (GetSystemMetrics(SM_CXSCREEN) - W) div 2;
    Y := (GetSystemMetrics(SM_CYSCREEN) - H) div 2;
  end;
  Result := SetWindowPos(hWnd, 0, X, Y, 0, 0, SWP_NOSIZE or SWP_NOZORDER);
end;

// ============================================================================
// DIALOGO 1: INHUMACIONES (CREAR / EDITAR)
// ============================================================================

type
  PInhDlgData = ^TInhDlgData;
  TInhDlgData = record
    InhPtr: ^TInhumacion;
    Confirmed: Boolean;
    EdtNombre, EdtDni, EdtParcela, CmbNivel, EdtFecha, EdtEmpresa, EdtResp, EdtTel, CmbCovid, EdtObs: HWND;
    LblInfoNivel: HWND;
    InhumacionesPtr: ^TInhumacionArray;
  end;

procedure ActualizarNivelesFosaDlg(pData: PInhDlgData);
var
  rawNom, cleanNom, inhClean, infoStr: string;
  pDash, k, curLvl, firstFree: Integer;
  OcupadoPor: array[1..3] of string;
  hasOccupied, isFull: Boolean;
begin
  if (pData = nil) or (pData^.CmbNivel = 0) then Exit;

  rawNom := GetEditText(pData^.EdtParcela);
  pDash := Pos(' - ', rawNom);
  if pDash > 0 then
    rawNom := Copy(rawNom, 1, pDash - 1);
  cleanNom := UpperCase(StringReplace(StringReplace(Trim(rawNom), ' ', '', [rfReplaceAll]), '-', '', [rfReplaceAll]));

  OcupadoPor[1] := '';
  OcupadoPor[2] := '';
  OcupadoPor[3] := '';

  if (cleanNom <> '') and (pData^.InhumacionesPtr <> nil) then
  begin
    for k := 0 to High(pData^.InhumacionesPtr^) do
    begin
      // Ignorar el propio registro si se está editando
      if (pData^.InhPtr^.Id <> '') and (pData^.InhumacionesPtr^[k].Id = pData^.InhPtr^.Id) then
        Continue;

      inhClean := UpperCase(StringReplace(StringReplace(Trim(pData^.InhumacionesPtr^[k].NomenclaturaParcela), ' ', '', [rfReplaceAll]), '-', '', [rfReplaceAll]));
      if (inhClean <> '') and (inhClean = cleanNom) then
      begin
        curLvl := pData^.InhumacionesPtr^[k].NivelPosicion;
        if curLvl in [1..3] then
          OcupadoPor[curLvl] := pData^.InhumacionesPtr^[k].NombreDifunto;
      end;
    end;
  end;

  // Repoblar CmbNivel con estado de cada nivel (Nivel 1 Fondo, Nivel 2 Medio, Nivel 3 Superior)
  SendMessage(pData^.CmbNivel, CB_RESETCONTENT, 0, 0);

  if OcupadoPor[1] <> '' then
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('1 - Nivel 1 [OCUPADO: ' + OcupadoPor[1] + ']')))
  else
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('1 - Nivel 1 [DISPONIBLE - Fondo de fosa]')));

  if OcupadoPor[2] <> '' then
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('2 - Nivel 2 [OCUPADO: ' + OcupadoPor[2] + ']')))
  else
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('2 - Nivel 2 [DISPONIBLE - Nivel medio]')));

  if OcupadoPor[3] <> '' then
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('3 - Nivel 3 [OCUPADO: ' + OcupadoPor[3] + ']')))
  else
    SendMessage(pData^.CmbNivel, CB_ADDSTRING, 0, LPARAM(PChar('3 - Nivel 3 [DISPONIBLE - Superficie]')));

  // Encontrar el primer nivel libre (1..3)
  firstFree := 0;
  if OcupadoPor[1] = '' then firstFree := 1
  else if OcupadoPor[2] = '' then firstFree := 2
  else if OcupadoPor[3] = '' then firstFree := 3;

  if (pData^.InhPtr^.NivelPosicion in [1..3]) and (pData^.InhPtr^.Id <> '') then
    SendMessage(pData^.CmbNivel, CB_SETCURSEL, pData^.InhPtr^.NivelPosicion - 1, 0)
  else if firstFree > 0 then
    SendMessage(pData^.CmbNivel, CB_SETCURSEL, firstFree - 1, 0)
  else
    SendMessage(pData^.CmbNivel, CB_SETCURSEL, 0, 0);

  // Armar texto informativo para la etiqueta de fosa
  hasOccupied := (OcupadoPor[1] <> '') or (OcupadoPor[2] <> '') or (OcupadoPor[3] <> '');
  isFull := (OcupadoPor[1] <> '') and (OcupadoPor[2] <> '') and (OcupadoPor[3] <> '');

  if cleanNom = '' then
    infoStr := 'Seleccione una parcela para ver los niveles de la fosa.'
  else if isFull then
    infoStr := 'ALERTA: Fosa completa (3/3 niveles ocupados). Solo reasignar en caso de reduccion.'
  else if hasOccupied then
  begin
    infoStr := 'Niveles ocupados: ';
    if OcupadoPor[1] <> '' then infoStr := infoStr + '[N1: ' + OcupadoPor[1] + '] ';
    if OcupadoPor[2] <> '' then infoStr := infoStr + '[N2: ' + OcupadoPor[2] + '] ';
    if OcupadoPor[3] <> '' then infoStr := infoStr + '[N3: ' + OcupadoPor[3] + '] ';
    if firstFree > 0 then
      infoStr := infoStr + '-> Asignando Nivel ' + IntToStr(firstFree) + ' libre';
  end
  else
    infoStr := 'Fosa completamente disponible (Niveles 1, 2 y 3 libres).';

  if pData^.LblInfoNivel <> 0 then
    SetWindowText(pData^.LblInfoNivel, PChar(infoStr));
end;

function InhDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PInhDlgData;
  rawNom: string;
  pDash: Integer;
begin
  pData := PInhDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_CREATE:
      Exit(0);

    WM_COMMAND:
      begin
        // Al cambiar de parcela en el ComboBox, recalcular niveles ocupados en tiempo real
        if (LOWORD(wParam) = 103) and ((HIWORD(wParam) = CBN_SELCHANGE) or (HIWORD(wParam) = CBN_EDITCHANGE)) then
        begin
          if pData <> nil then
            ActualizarNivelesFosaDlg(pData);
          Exit(0);
        end;

        case LOWORD(wParam) of
          1: // Guardar (IDOK)
            begin
              if pData <> nil then
              begin
                pData^.InhPtr^.NombreDifunto := GetEditText(pData^.EdtNombre);
                pData^.InhPtr^.DniDifunto := GetEditText(pData^.EdtDni);

                rawNom := GetEditText(pData^.EdtParcela);
                pDash := Pos(' - ', rawNom);
                if pDash > 0 then
                  pData^.InhPtr^.NomenclaturaParcela := Trim(Copy(rawNom, 1, pDash - 1))
                else
                  pData^.InhPtr^.NomenclaturaParcela := Trim(rawNom);

                pData^.InhPtr^.NivelPosicion := SendMessage(pData^.CmbNivel, CB_GETCURSEL, 0, 0) + 1;
                pData^.InhPtr^.FechaInhumacion := GetEditText(pData^.EdtFecha);
                pData^.InhPtr^.EmpresaFunebrera := GetEditText(pData^.EdtEmpresa);
                pData^.InhPtr^.NombreResponsable := GetEditText(pData^.EdtResp);
                pData^.InhPtr^.TelefonoResponsable := GetEditText(pData^.EdtTel);
                pData^.InhPtr^.EsCovid := (SendMessage(pData^.CmbCovid, CB_GETCURSEL, 0, 0) = 1);
                pData^.InhPtr^.Observaciones := GetEditText(pData^.EdtObs);

                if pData^.InhPtr^.NombreDifunto = '' then
                begin
                  MessageBox(hWnd, 'Por favor ingrese el Nombre Completo del Difunto.', 'Campo Requerido', MB_ICONWARNING or MB_OK);
                  SetFocus(pData^.EdtNombre);
                  Exit(0);
                end;

                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;

          2: // Cancelar (IDCANCEL)
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;

    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion; const ParcelasRef: TParcelaArray; const InhumacionesRef: TInhumacionArray): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TInhDlgData;
  Title: string;
  i: Integer;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @InhDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaInhDlgClass';
  RegisterClass(wc);

  if IsEdit then
    Title := 'Modificar Acta de Inhumacion - Supabase Cloud'
  else
    Title := 'Nueva Inhumacion - Libro Parroquial Oficial';

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaInhDlgClass', PChar(Title),
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 600, 510, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  DlgData.InhPtr := @Inh;
  DlgData.InhumacionesPtr := @InhumacionesRef;
  DlgData.Confirmed := False;

  // Controles
  CreateDlgLabel(hDlg, 'Nombre Completo Difunto (*):', 20, 15, 200, 18);
  DlgData.EdtNombre := CreateDlgEdit(hDlg, Inh.NombreDifunto, 20, 35, 540, 24, 101);

  CreateDlgLabel(hDlg, 'DNI Difunto:', 20, 68, 110, 18);
  DlgData.EdtDni := CreateDlgEdit(hDlg, Inh.DniDifunto, 20, 88, 110, 24, 102);

  CreateDlgLabel(hDlg, 'Buscar / Elegir Parcela (*):', 140, 68, 190, 18);
  DlgData.EdtParcela := CreateDlgEditableCombo(hDlg, 140, 88, 190, 220, 103);
  for i := 0 to High(ParcelasRef) do
  begin
    SendMessage(DlgData.EdtParcela, CB_ADDSTRING, 0, LPARAM(PChar(ParcelasRef[i].Nomenclatura + ' - ' + ParcelasRef[i].TitularNombre)));
  end;
  if Inh.NomenclaturaParcela <> '' then
    SetWindowText(DlgData.EdtParcela, PChar(Inh.NomenclaturaParcela));

  CreateDlgLabel(hDlg, 'Nivel / Posicion en Fosa:', 340, 68, 220, 18);
  DlgData.CmbNivel := CreateDlgCombo(hDlg, 340, 88, 220, 140, 104);

  // Etiqueta de Inspeccion de Niveles en Fosa
  DlgData.LblInfoNivel := CreateDlgLabel(hDlg, 'Inspeccionando fosa subterranea...', 20, 118, 540, 18);

  CreateDlgLabel(hDlg, 'Fecha Inhumacion (YYYY-MM-DD):', 20, 142, 260, 18);
  if Inh.FechaInhumacion = '' then
    Inh.FechaInhumacion := FormatDateTime('yyyy-mm-dd', Now);
  DlgData.EdtFecha := CreateDlgEdit(hDlg, Inh.FechaInhumacion, 20, 162, 260, 24, 105);

  CreateDlgLabel(hDlg, 'Empresa Funebrera Responsable:', 300, 142, 260, 18);
  if Inh.EmpresaFunebrera = '' then
    Inh.EmpresaFunebrera := 'Servicios Sociales Chamical - Mat. Fun. 104';
  DlgData.EdtEmpresa := CreateDlgEdit(hDlg, Inh.EmpresaFunebrera, 300, 162, 260, 24, 106);

  CreateDlgLabel(hDlg, 'Nombre Familiar Responsable:', 20, 194, 260, 18);
  DlgData.EdtResp := CreateDlgEdit(hDlg, Inh.NombreResponsable, 20, 214, 260, 24, 107);

  CreateDlgLabel(hDlg, 'Telefono Contacto:', 300, 194, 260, 18);
  DlgData.EdtTel := CreateDlgEdit(hDlg, Inh.TelefonoResponsable, 300, 214, 260, 24, 108);

  CreateDlgLabel(hDlg, 'Protocolo Sanitario COVID-19:', 20, 246, 260, 18);
  DlgData.CmbCovid := CreateDlgCombo(hDlg, 20, 266, 260, 80, 109);
  SendMessage(DlgData.CmbCovid, CB_ADDSTRING, 0, LPARAM(PChar('No (Sepelio Estandar)')));
  SendMessage(DlgData.CmbCovid, CB_ADDSTRING, 0, LPARAM(PChar('Si (Protocolo Sanitario)')));
  if Inh.EsCovid then
    SendMessage(DlgData.CmbCovid, CB_SETCURSEL, 1, 0)
  else
    SendMessage(DlgData.CmbCovid, CB_SETCURSEL, 0, 0);

  CreateDlgLabel(hDlg, 'Observaciones / Causa:', 20, 298, 540, 18);
  DlgData.EdtObs := CreateDlgEdit(hDlg, Inh.Observaciones, 20, 318, 540, 24, 110);

  // Botones
  CreateDlgButton(hDlg, 'Guardar en Supabase', 280, 410, 170, 36, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 460, 410, 100, 36, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));

  // Inicializar estado de niveles para la parcela elegida
  ActualizarNivelesFosaDlg(@DlgData);

  SetFocus(DlgData.EdtNombre);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion; const ParcelasRef: TParcelaArray): Boolean;
var
  DummyInh: TInhumacionArray;
begin
  SetLength(DummyInh, 0);
  Result := ShowDlgInhumacion(ParentWnd, IsEdit, Inh, ParcelasRef, DummyInh);
end;

function ShowDlgInhumacion(ParentWnd: HWND; IsEdit: Boolean; var Inh: TInhumacion): Boolean;
var
  DummyParc: TParcelaArray;
  DummyInh: TInhumacionArray;
begin
  SetLength(DummyParc, 0);
  SetLength(DummyInh, 0);
  Result := ShowDlgInhumacion(ParentWnd, IsEdit, Inh, DummyParc, DummyInh);
end;

// ============================================================================
// DIALOGO 2: PARCELAS (CREAR / EDITAR)
// ============================================================================

type
  PParcDlgData = ^TParcDlgData;
  TParcDlgData = record
    ParcPtr: ^TParcela;
    Confirmed: Boolean;
    EdtNomenclatura, CmbSector, EdtFila, EdtNumero, CmbEstado, EdtTitular, EdtSaldo, EdtNotas: HWND;
    EdtNivelesFosa: HWND;
  end;

function InspeccionarNivelesFosaStr(const NomParc: string; Capacidad: Integer; const InhumacionesRef: TInhumacionArray): string;
var
  TargetNorm, InhNorm, Linea, DifNom, DniStr, FechaStr, EmpStr: string;
  lvl, k, TotalCap, OcupadosCount: Integer;
  Encontrado: Boolean;
begin
  Result := '';
  TargetNorm := UpperCase(Trim(NomParc));
  TargetNorm := StringReplace(TargetNorm, ' ', '', [rfReplaceAll]);
  TargetNorm := StringReplace(TargetNorm, '-', '', [rfReplaceAll]);

  TotalCap := Capacidad;
  if TotalCap <= 0 then TotalCap := 3;

  OcupadosCount := 0;

  for lvl := 1 to TotalCap do
  begin
    Encontrado := False;
    if TargetNorm <> '' then
    begin
      for k := 0 to High(InhumacionesRef) do
      begin
        InhNorm := UpperCase(Trim(InhumacionesRef[k].NomenclaturaParcela));
        InhNorm := StringReplace(InhNorm, ' ', '', [rfReplaceAll]);
        InhNorm := StringReplace(InhNorm, '-', '', [rfReplaceAll]);

        if (InhNorm = TargetNorm) and (InhumacionesRef[k].NivelPosicion = lvl) then
        begin
          Encontrado := True;
          Inc(OcupadosCount);
          DifNom := Trim(InhumacionesRef[k].NombreDifunto);
          if DifNom = '' then DifNom := 'Difunto sin nombre asentado';

          DniStr := Trim(InhumacionesRef[k].DniDifunto);
          if DniStr <> '' then DniStr := ' [DNI: ' + DniStr + ']' else DniStr := '';

          FechaStr := Trim(InhumacionesRef[k].FechaInhumacion);
          if FechaStr <> '' then FechaStr := ' - Inhumado: ' + FechaStr else FechaStr := '';

          EmpStr := Trim(InhumacionesRef[k].EmpresaFunebrera);
          if EmpStr <> '' then EmpStr := ' (' + EmpStr + ')' else EmpStr := '';

          Linea := Format('NIVEL %d: [OCUPADO] %s%s%s%s', [lvl, DifNom, DniStr, FechaStr, EmpStr]);
          Break;
        end;
      end;
    end;

    if not Encontrado then
      Linea := Format('NIVEL %d: [DISPONIBLE] Espacio libre en fosa', [lvl]);

    if Result <> '' then
      Result := Result + #13#10;
    Result := Result + Linea;
  end;

  if OcupadosCount = 0 then
    Result := 'ESTADO DE LA FOSA: TOTALMENTE LIBRE (0 de ' + IntToStr(TotalCap) + ' niveles ocupados)'#13#10#13#10 + Result
  else
    Result := Format('ESTADO DE LA FOSA: %d de %d niveles ocupados'#13#10#13#10 + Result, [OcupadosCount, TotalCap]);
end;

function ParcDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PParcDlgData;
  Idx: Integer;
begin
  pData := PParcDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Guardar
            begin
              if pData <> nil then
              begin
                pData^.ParcPtr^.Nomenclatura := GetEditText(pData^.EdtNomenclatura);
                Idx := SendMessage(pData^.CmbSector, CB_GETCURSEL, 0, 0);
                case Idx of
                  0: pData^.ParcPtr^.SectorId := 'A';
                  1: pData^.ParcPtr^.SectorId := 'E';
                  2: pData^.ParcPtr^.SectorId := 'SALINAS';
                else
                  pData^.ParcPtr^.SectorId := 'A';
                end;

                pData^.ParcPtr^.ManzanaFila := GetEditText(pData^.EdtFila);
                pData^.ParcPtr^.NumeroParcela := GetEditText(pData^.EdtNumero);

                Idx := SendMessage(pData^.CmbEstado, CB_GETCURSEL, 0, 0);
                case Idx of
                  0: pData^.ParcPtr^.Estado := epDisponible;
                  1: pData^.ParcPtr^.Estado := epOcupada;
                  2: pData^.ParcPtr^.Estado := epReservada;
                  3: pData^.ParcPtr^.Estado := epEnMora;
                  4: pData^.ParcPtr^.Estado := epBaja;
                  5: pData^.ParcPtr^.Estado := epStandby;
                else
                  pData^.ParcPtr^.Estado := epDisponible;
                end;

                pData^.ParcPtr^.TitularNombre := GetEditText(pData^.EdtTitular);
                pData^.ParcPtr^.SaldoMantenimiento := StrToCurrDef(GetEditText(pData^.EdtSaldo), 0);
                pData^.ParcPtr^.Notas := GetEditText(pData^.EdtNotas);

                if pData^.ParcPtr^.Nomenclatura = '' then
                begin
                  MessageBox(hWnd, 'Por favor ingrese la Parcela (ej. A-25-96).', 'Campo Requerido', MB_ICONWARNING or MB_OK);
                  SetFocus(pData^.EdtNomenclatura);
                  Exit(0);
                end;

                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;

          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;

    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgParcela(ParentWnd: HWND; IsEdit: Boolean; var Parc: TParcela; const InhumacionesRef: TInhumacionArray): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TParcDlgData;
  Title, NivelesFosaStr: string;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @ParcDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaParcDlgClass';
  RegisterClass(wc);

  if IsEdit then
    Title := 'Modificar Parcela / Titular - Supabase Cloud'
  else
    Title := 'Nueva Parcela - Cementerio Parque';

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaParcDlgClass', PChar(Title),
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 530, 560, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  DlgData.ParcPtr := @Parc;
  DlgData.Confirmed := False;

  CreateDlgLabel(hDlg, 'Parcela (ej. A-25-96) (*):', 20, 15, 220, 18);
  DlgData.EdtNomenclatura := CreateDlgEdit(hDlg, Parc.Nomenclatura, 20, 35, 220, 24, 201);

  CreateDlgLabel(hDlg, 'Sector:', 260, 15, 230, 18);
  DlgData.CmbSector := CreateDlgCombo(hDlg, 260, 35, 230, 120, 202);
  SendMessage(DlgData.CmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector A')));
  SendMessage(DlgData.CmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector E')));
  SendMessage(DlgData.CmbSector, CB_ADDSTRING, 0, LPARAM(PChar('Sector Salinas')));
  if SameText(Parc.SectorId, 'E') then
    SendMessage(DlgData.CmbSector, CB_SETCURSEL, 1, 0)
  else if SameText(Parc.SectorId, 'SALINAS') or SameText(Parc.SectorId, 'Salinas') then
    SendMessage(DlgData.CmbSector, CB_SETCURSEL, 2, 0)
  else
    SendMessage(DlgData.CmbSector, CB_SETCURSEL, 0, 0);

  CreateDlgLabel(hDlg, 'Fila / Manzana:', 20, 70, 130, 18);
  DlgData.EdtFila := CreateDlgEdit(hDlg, Parc.ManzanaFila, 20, 90, 130, 24, 203);

  CreateDlgLabel(hDlg, 'Numero Parcela:', 170, 70, 130, 18);
  DlgData.EdtNumero := CreateDlgEdit(hDlg, Parc.NumeroParcela, 170, 90, 130, 24, 204);

  CreateDlgLabel(hDlg, 'Estado Parcela:', 320, 70, 170, 18);
  DlgData.CmbEstado := CreateDlgCombo(hDlg, 320, 90, 170, 120, 205);
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Disponible')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Ocupada')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Reservada')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('En Mora')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Baja')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Stand-by')));
  case Parc.Estado of
    epOcupada: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 1, 0);
    epReservada: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 2, 0);
    epEnMora: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 3, 0);
    epBaja: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 4, 0);
    epStandby: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 5, 0);
  else
    SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 0, 0);
  end;

  CreateDlgLabel(hDlg, 'Titular Concesion (Nombre Completo):', 20, 125, 470, 18);
  DlgData.EdtTitular := CreateDlgEdit(hDlg, Parc.TitularNombre, 20, 145, 470, 24, 206);

  CreateDlgLabel(hDlg, 'Saldo Mantenimiento ($):', 20, 180, 220, 18);
  DlgData.EdtSaldo := CreateDlgEdit(hDlg, CurrToStr(Parc.SaldoMantenimiento), 20, 200, 220, 24, 207);

  CreateDlgLabel(hDlg, 'Notas / Observaciones:', 20, 235, 470, 18);
  DlgData.EdtNotas := CreateDlgEdit(hDlg, Parc.Notas, 20, 255, 470, 24, 208);

  // Seccion: Ocupacion Subterranea de la Fosa (Niveles y Difuntos)
  CreateDlgLabel(hDlg, 'Ocupacion Subterranea de la Fosa (Niveles y Difuntos):', 20, 290, 470, 18);
  NivelesFosaStr := InspeccionarNivelesFosaStr(Parc.Nomenclatura, Parc.CapacidadTotal, InhumacionesRef);
  DlgData.EdtNivelesFosa := CreateWindowEx(WS_EX_CLIENTEDGE, 'EDIT', PChar(NivelesFosaStr),
    WS_CHILD or WS_VISIBLE or WS_VSCROLL or ES_MULTILINE or ES_READONLY or ES_AUTOVSCROLL,
    20, 310, 470, 135, hDlg, HMENU(209), hInstance, nil);
  SendMessage(DlgData.EdtNivelesFosa, WM_SETFONT, WPARAM(hDlgFont), 1);

  // Botones
  CreateDlgButton(hDlg, 'Guardar en Supabase', 230, 465, 150, 36, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 390, 465, 100, 36, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.EdtNomenclatura);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

function ShowDlgParcela(ParentWnd: HWND; IsEdit: Boolean; var Parc: TParcela): Boolean;
var
  DummyInh: TInhumacionArray;
begin
  SetLength(DummyInh, 0);
  Result := ShowDlgParcela(ParentWnd, IsEdit, Parc, DummyInh);
end;

// ============================================================================
// DIALOGO 3: AFILIADOS (CREAR / EDITAR)
// ============================================================================

type
  PAfilDlgData = ^TAfilDlgData;
  TAfilDlgData = record
    AfilPtr: ^TAfiliadoSeguro;
    Confirmed: Boolean;
    EdtNro, EdtNombre, EdtDni, EdtDireccion, EdtZona, EdtCuota, EdtCobrador, CmbEstado: HWND;
  end;

function AfilDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PAfilDlgData;
  Idx: Integer;
begin
  pData := PAfilDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Guardar
            begin
              if pData <> nil then
              begin
                pData^.AfilPtr^.NumeroAfiliado := StrToIntDef(GetEditText(pData^.EdtNro), 101);
                pData^.AfilPtr^.NombreCompleto := GetEditText(pData^.EdtNombre);
                pData^.AfilPtr^.Dni := GetEditText(pData^.EdtDni);
                pData^.AfilPtr^.DireccionCobro := GetEditText(pData^.EdtDireccion);
                pData^.AfilPtr^.ZonaCobro := GetEditText(pData^.EdtZona);
                pData^.AfilPtr^.MontoCuotaMensual := StrToCurrDef(GetEditText(pData^.EdtCuota), 18000);
                pData^.AfilPtr^.CobradorAsignado := GetEditText(pData^.EdtCobrador);

                Idx := SendMessage(pData^.CmbEstado, CB_GETCURSEL, 0, 0);
                case Idx of
                  0: pData^.AfilPtr^.Estado := eaActivo;
                  1: pData^.AfilPtr^.Estado := eaEnMora;
                  2: pData^.AfilPtr^.Estado := eaSuspendido;
                  3: pData^.AfilPtr^.Estado := eaBaja;
                else
                  pData^.AfilPtr^.Estado := eaActivo;
                end;

                if pData^.AfilPtr^.NombreCompleto = '' then
                begin
                  MessageBox(hWnd, 'Por favor ingrese el Nombre Completo del Titular.', 'Campo Requerido', MB_ICONWARNING or MB_OK);
                  SetFocus(pData^.EdtNombre);
                  Exit(0);
                end;

                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;

          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;

    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgAfiliado(ParentWnd: HWND; IsEdit: Boolean; var Afil: TAfiliadoSeguro): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TAfilDlgData;
  Title: string;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @AfilDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaAfilDlgClass';
  RegisterClass(wc);

  if IsEdit then
    Title := 'Modificar Afiliado al Seguro - Supabase Cloud'
  else
    Title := 'Nuevo Afiliado - Seguro Parroquial de Sepelio';

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaAfilDlgClass', PChar(Title),
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 480, 430, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  DlgData.AfilPtr := @Afil;
  DlgData.Confirmed := False;

  CreateDlgLabel(hDlg, 'Nro Afiliado:', 20, 15, 120, 18);
  if Afil.NumeroAfiliado = 0 then Afil.NumeroAfiliado := 101;
  DlgData.EdtNro := CreateDlgEdit(hDlg, IntToStr(Afil.NumeroAfiliado), 20, 35, 120, 24, 301);

  CreateDlgLabel(hDlg, 'Nombre Completo Titular (*):', 160, 15, 280, 18);
  DlgData.EdtNombre := CreateDlgEdit(hDlg, Afil.NombreCompleto, 160, 35, 280, 24, 302);

  CreateDlgLabel(hDlg, 'DNI:', 20, 70, 140, 18);
  DlgData.EdtDni := CreateDlgEdit(hDlg, Afil.Dni, 20, 90, 140, 24, 303);

  CreateDlgLabel(hDlg, 'Direccion de Cobro:', 180, 70, 260, 18);
  DlgData.EdtDireccion := CreateDlgEdit(hDlg, Afil.DireccionCobro, 180, 90, 260, 24, 304);

  CreateDlgLabel(hDlg, 'Zona / Ruta de Cobranza:', 20, 125, 200, 18);
  if Afil.ZonaCobro = '' then Afil.ZonaCobro := 'Zona Centro';
  DlgData.EdtZona := CreateDlgEdit(hDlg, Afil.ZonaCobro, 20, 145, 200, 24, 305);

  CreateDlgLabel(hDlg, 'Cuota Mensual ($):', 240, 125, 200, 18);
  if Afil.MontoCuotaMensual = 0 then Afil.MontoCuotaMensual := 18000;
  DlgData.EdtCuota := CreateDlgEdit(hDlg, CurrToStr(Afil.MontoCuotaMensual), 240, 145, 200, 24, 306);

  CreateDlgLabel(hDlg, 'Cobrador Asignado:', 20, 180, 200, 18);
  if Afil.CobradorAsignado = '' then Afil.CobradorAsignado := 'Cobrador 1';
  DlgData.EdtCobrador := CreateDlgEdit(hDlg, Afil.CobradorAsignado, 20, 200, 200, 24, 307);

  CreateDlgLabel(hDlg, 'Estado Cobertura:', 240, 180, 200, 18);
  DlgData.CmbEstado := CreateDlgCombo(hDlg, 240, 200, 200, 120, 308);
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Activo (Habilitado)')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('En Mora (Aviso)')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Suspendido')));
  SendMessage(DlgData.CmbEstado, CB_ADDSTRING, 0, LPARAM(PChar('Baja (Sin Cobertura)')));
  case Afil.Estado of
    eaEnMora: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 1, 0);
    eaSuspendido: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 2, 0);
    eaBaja: SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 3, 0);
  else
    SendMessage(DlgData.CmbEstado, CB_SETCURSEL, 0, 0);
  end;

  // Botones
  CreateDlgButton(hDlg, 'Guardar en Supabase', 200, 330, 150, 36, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 360, 330, 80, 36, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.EdtNombre);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

// ============================================================================
// DIALOGO 4: COBRO EN CAJA DIARIA
// ============================================================================

type
  PCajaDlgData = ^TCajaDlgData;
  TCajaDlgData = record
    TitularPtr, ConceptoPtr, ReciboPtr: ^string;
    MontoPtr: ^Currency;
    MetodoPtr: ^TMetodoPago;
    Confirmed: Boolean;
    EdtRecibo, EdtTitular, EdtConcepto, EdtMonto, CmbMetodo: HWND;
  end;

function CajaDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PCajaDlgData;
begin
  pData := PCajaDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Guardar
            begin
              if pData <> nil then
              begin
                pData^.ReciboPtr^ := GetEditText(pData^.EdtRecibo);
                pData^.TitularPtr^ := GetEditText(pData^.EdtTitular);
                pData^.ConceptoPtr^ := GetEditText(pData^.EdtConcepto);
                pData^.MontoPtr^ := StrToCurrDef(GetEditText(pData^.EdtMonto), 0);

                if SendMessage(pData^.CmbMetodo, CB_GETCURSEL, 0, 0) = 1 then
                  pData^.MetodoPtr^ := mpTransferenciaQR
                else
                  pData^.MetodoPtr^ := mpEfectivo;

                if pData^.TitularPtr^ = '' then
                begin
                  MessageBox(hWnd, 'Por favor ingrese el nombre del Titular o Pagador.', 'Campo Requerido', MB_ICONWARNING or MB_OK);
                  SetFocus(pData^.EdtTitular);
                  Exit(0);
                end;

                if pData^.MontoPtr^ <= 0 then
                begin
                  MessageBox(hWnd, 'Por favor ingrese un importe valido mayor a cero.', 'Importe Invalido', MB_ICONWARNING or MB_OK);
                  SetFocus(pData^.EdtMonto);
                  Exit(0);
                end;

                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;

          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;

    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgCobroCaja(ParentWnd: HWND; var Titular, Concepto: string; var Monto: Currency; var Metodo: TMetodoPago; var Recibo: string): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TCajaDlgData;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @CajaDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaCajaDlgClass';
  RegisterClass(wc);

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaCajaDlgClass', 'Registrar Cobro en Caja - Supabase Cloud',
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 480, 360, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  if Recibo = '' then
    Recibo := 'REC-' + FormatDateTime('hhnnss', Now);
  if Monto = 0 then
    Monto := 18000;

  DlgData.TitularPtr := @Titular;
  DlgData.ConceptoPtr := @Concepto;
  DlgData.ReciboPtr := @Recibo;
  DlgData.MontoPtr := @Monto;
  DlgData.MetodoPtr := @Metodo;
  DlgData.Confirmed := False;

  CreateDlgLabel(hDlg, 'Recibo Nro:', 20, 15, 140, 18);
  DlgData.EdtRecibo := CreateDlgEdit(hDlg, Recibo, 20, 35, 140, 24, 401);

  CreateDlgLabel(hDlg, 'Titular / Pagador (*):', 180, 15, 260, 18);
  DlgData.EdtTitular := CreateDlgEdit(hDlg, Titular, 180, 35, 260, 24, 402);

  CreateDlgLabel(hDlg, 'Concepto Imputado (*):', 20, 70, 420, 18);
  if Concepto = '' then Concepto := 'Cuota Seguro Sepelio Octubre 2026';
  DlgData.EdtConcepto := CreateDlgEdit(hDlg, Concepto, 20, 90, 420, 24, 403);

  CreateDlgLabel(hDlg, 'Importe Cobrado ($) (*):', 20, 125, 200, 18);
  DlgData.EdtMonto := CreateDlgEdit(hDlg, CurrToStr(Monto), 20, 145, 200, 24, 404);

  CreateDlgLabel(hDlg, 'Metodo de Cobro:', 240, 125, 200, 18);
  DlgData.CmbMetodo := CreateDlgCombo(hDlg, 240, 145, 200, 100, 405);
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Efectivo en Caja')));
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Transferencia Bancaria / QR')));
  if Metodo = mpTransferenciaQR then
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 1, 0)
  else
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 0, 0);

  // Botones
  CreateDlgButton(hDlg, 'Asentar Cobro y Emitir Recibo', 150, 260, 200, 36, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 360, 260, 80, 36, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.EdtTitular);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

// ============================================================================
// DIALOGO 5: COBRO MANTENIMIENTO PARCELA
// ============================================================================

function ShowDlgCobroMantenimiento(ParentWnd: HWND; const Nomenclatura, TitularDef: string; var Monto: Currency; var Metodo: TMetodoPago; var Periodo, Recibo: string): Boolean;
var
  Concep: string;
  Tit: string;
begin
  if Recibo = '' then
    Recibo := 'MANT-' + FormatDateTime('hhnnss', Now);
  if Periodo = '' then
    Periodo := 'Anual 2026/2027';
  if Monto = 0 then
    Monto := 49000;

  Tit := TitularDef;
  Concep := 'Mantenimiento Parcela ' + Nomenclatura + ' (' + Periodo + ')';

  Result := ShowDlgCobroCaja(ParentWnd, Tit, Concep, Monto, Metodo, Recibo);
end;

// ============================================================================
// DIALOGO 6: COBRO DE CUOTA MENSUAL (SEGURO DE SEPELIO)
// ============================================================================

type
  TCuotaMesDlgData = record
    MesPtr: PInteger;
    AnioPtr: PInteger;
    MontoPtr: PCurrency;
    MetodoPtr: ^TMetodoPago;
    ReciboPtr: PString;
    Confirmed: Boolean;
    CmbMes: HWND;
    EdtAnio: HWND;
    EdtMonto: HWND;
    CmbMetodo: HWND;
    EdtRecibo: HWND;
  end;
  PCuotaMesDlgData = ^TCuotaMesDlgData;

function CuotaMesDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PCuotaMesDlgData;
  CurSel: Integer;
begin
  pData := PCuotaMesDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Asentar Pago
            begin
              if pData <> nil then
              begin
                CurSel := SendMessage(pData^.CmbMes, CB_GETCURSEL, 0, 0);
                if CurSel < 0 then CurSel := 0;
                pData^.MesPtr^ := CurSel + 1;
                pData^.AnioPtr^ := StrToIntDef(GetEditText(pData^.EdtAnio), 2026);
                pData^.MontoPtr^ := StrToCurrDef(GetEditText(pData^.EdtMonto), 18000);
                if SendMessage(pData^.CmbMetodo, CB_GETCURSEL, 0, 0) = 1 then
                  pData^.MetodoPtr^ := mpTransferenciaQR
                else
                  pData^.MetodoPtr^ := mpEfectivo;
                pData^.ReciboPtr^ := Trim(GetEditText(pData^.EdtRecibo));
                if pData^.ReciboPtr^ = '' then
                  pData^.ReciboPtr^ := 'REC-2026-' + FormatDateTime('hhnnss', Now);
                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;
          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;
    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgCobroCuotaMes(ParentWnd: HWND; const Afiliado: TAfiliadoSeguro; var MesSeleccionado, AnioSeleccionado: Integer; var Monto: Currency; var Metodo: TMetodoPago; var Recibo: string): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TCuotaMesDlgData;
  m, k, FirstUnpaid: Integer;
  EstaPagada: Boolean;
  ItemTxt, HeaderTxt: string;
  MesesNombres: array[1..12] of string = (
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  );
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @CuotaMesDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaCuotaMesDlgClass';
  RegisterClass(wc);

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaCuotaMesDlgClass', 'Cobro de Cuota Mensual - Seguro de Sepelio',
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 520, 420, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  if Recibo = '' then
    Recibo := 'REC-2026-' + FormatDateTime('hhnnss', Now);
  if Monto = 0 then
    Monto := Afiliado.MontoCuotaMensual;
  if Monto = 0 then
    Monto := 18000;
  if AnioSeleccionado = 0 then
    AnioSeleccionado := 2026;

  DlgData.MesPtr := @MesSeleccionado;
  DlgData.AnioPtr := @AnioSeleccionado;
  DlgData.MontoPtr := @Monto;
  DlgData.MetodoPtr := @Metodo;
  DlgData.ReciboPtr := @Recibo;
  DlgData.Confirmed := False;

  // Encabezado institucional del afiliado
  CreateDlgLabel(hDlg, 'TITULAR DE AFILIACION:', 20, 15, 200, 16);
  HeaderTxt := Afiliado.NombreCompleto + ' (Afiliado N° ' + IntToStr(Afiliado.NumeroAfiliado) + ')';
  CreateDlgLabel(hDlg, HeaderTxt, 20, 32, 460, 20);
  CreateDlgLabel(hDlg, 'DNI: ' + BoolToTexto(Afiliado.Dni <> '', Afiliado.Dni, 'S/D') + '   -   Zona: ' + Afiliado.ZonaCobro + '   -   Dir: ' + Afiliado.DireccionCobro, 20, 54, 460, 16);

  // Selector de Mes y Año
  CreateDlgLabel(hDlg, 'Mes a Cobrar (*):', 20, 85, 320, 18);
  DlgData.CmbMes := CreateDlgCombo(hDlg, 20, 105, 330, 220, 501);

  FirstUnpaid := -1;
  for m := 1 to 12 do
  begin
    EstaPagada := False;
    for k := 0 to High(Afiliado.CuotasPagadas) do
      if Afiliado.CuotasPagadas[k] = m then
      begin
        EstaPagada := True;
        Break;
      end;

    if EstaPagada then
      ItemTxt := Format('%d. %s (Mes %d) - [PAGADA]', [m, MesesNombres[m], m])
    else
    begin
      ItemTxt := Format('%d. %s (Mes %d) - [PENDIENTE DE PAGO]', [m, MesesNombres[m], m]);
      if FirstUnpaid = -1 then
        FirstUnpaid := m - 1;
    end;
    SendMessage(DlgData.CmbMes, CB_ADDSTRING, 0, LPARAM(PChar(ItemTxt)));
  end;

  if FirstUnpaid < 0 then FirstUnpaid := 0;
  SendMessage(DlgData.CmbMes, CB_SETCURSEL, FirstUnpaid, 0);

  CreateDlgLabel(hDlg, 'Año:', 370, 85, 110, 18);
  DlgData.EdtAnio := CreateDlgEdit(hDlg, IntToStr(AnioSeleccionado), 370, 105, 110, 24, 502);

  // Importe y Metodo de Cobro
  CreateDlgLabel(hDlg, 'Importe Cuota Mensual ($) (*):', 20, 145, 220, 18);
  DlgData.EdtMonto := CreateDlgEdit(hDlg, CurrToStr(Monto), 20, 165, 210, 24, 503);

  CreateDlgLabel(hDlg, 'Metodo de Cobro (*):', 250, 145, 230, 18);
  DlgData.CmbMetodo := CreateDlgCombo(hDlg, 250, 165, 230, 100, 504);
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Efectivo en Caja')));
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Transferencia Bancaria / QR')));
  if Metodo = mpTransferenciaQR then
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 1, 0)
  else
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 0, 0);

  // Recibo Oficial
  CreateDlgLabel(hDlg, 'Nro de Recibo Oficial (*):', 20, 205, 460, 18);
  DlgData.EdtRecibo := CreateDlgEdit(hDlg, Recibo, 20, 225, 460, 24, 505);

  // Botones de Accion
  CreateDlgButton(hDlg, 'Asentar Pago de Cuota y Emitir Recibo', 130, 310, 250, 38, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 395, 310, 85, 38, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.CmbMes);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

type
  TCuotaMasivaDlgData = record
    MontoPtr: PCurrency;
    SoloActivosPtr: PBoolean;
    EdtMonto: HWND;
    ChkSoloActivos: HWND;
    Confirmed: Boolean;
  end;
  PCuotaMasivaDlgData = ^TCuotaMasivaDlgData;

function CuotaMasivaDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PCuotaMasivaDlgData;
begin
  pData := PCuotaMasivaDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Aceptar
            begin
              if pData <> nil then
              begin
                pData^.MontoPtr^ := StrToCurrDef(GetEditText(pData^.EdtMonto), 18000);
                pData^.SoloActivosPtr^ := SendMessage(pData^.ChkSoloActivos, BM_GETCHECK, 0, 0) = BST_CHECKED;
                if pData^.MontoPtr^ <= 0 then
                begin
                  MessageBox(hWnd, 'Por favor ingrese un monto de cuota mayor a $0.', 'Monto Invalido', MB_ICONWARNING or MB_OK);
                  Exit(0);
                end;
                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;
          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;
    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgCuotaMasiva(ParentWnd: HWND; var NuevoMonto: Currency; var SoloActivos: Boolean): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TCuotaMasivaDlgData;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @CuotaMasivaDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaCuotaMasivaDlgClass';
  RegisterClass(wc);

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaCuotaMasivaDlgClass', 'Actualización Masiva de Cuota - Seguro de Sepelio',
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 440, 240, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  if NuevoMonto <= 0 then NuevoMonto := 18000;

  DlgData.MontoPtr := @NuevoMonto;
  DlgData.SoloActivosPtr := @SoloActivos;
  DlgData.Confirmed := False;

  CreateDlgLabel(hDlg, 'Se modificará el valor de la cuota mensual a todos los afiliados:', 20, 15, 390, 18);
  CreateDlgLabel(hDlg, 'Nuevo Monto Mensual ($):', 20, 48, 200, 18);
  DlgData.EdtMonto := CreateDlgEdit(hDlg, CurrToStr(NuevoMonto), 20, 70, 180, 24, 601);

  DlgData.ChkSoloActivos := CreateWindow('BUTTON', 'Aplicar solo a afiliados activos (no bajas)',
    WS_CHILD or WS_VISIBLE or BS_AUTOCHECKBOX,
    20, 110, 380, 20, hDlg, HMENU(602), hInstance, nil);
  SendMessage(DlgData.ChkSoloActivos, WM_SETFONT, WPARAM(hDlgFont), 1);
  if SoloActivos then
    SendMessage(DlgData.ChkSoloActivos, BM_SETCHECK, BST_CHECKED, 0);

  CreateDlgButton(hDlg, 'Actualizar Todos', 180, 155, 140, 32, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 330, 155, 80, 32, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.EdtMonto);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

type
  PEgresoDlgData = ^TEgresoDlgData;
  TEgresoDlgData = record
    ConceptoPtr, CategoriaPtr, ComprobantePtr: ^string;
    MontoPtr: ^Currency;
    MetodoPtr: ^TMetodoPago;
    EdtConcepto: HWND;
    CmbCategoria: HWND;
    EdtComprobante: HWND;
    EdtMonto: HWND;
    CmbMetodo: HWND;
    Confirmed: Boolean;
  end;

function EgresoDlgProc(hWnd: HWND; uMsg: UINT; wParam: WPARAM; lParam: LPARAM): LRESULT; stdcall;
var
  pData: PEgresoDlgData;
  CurSel: Integer;
begin
  pData := PEgresoDlgData(GetWindowLongPtr(hWnd, GWLP_USERDATA));
  case uMsg of
    WM_COMMAND:
      begin
        case LOWORD(wParam) of
          1: // Guardar
            begin
              if pData <> nil then
              begin
                pData^.ConceptoPtr^ := Trim(GetEditText(pData^.EdtConcepto));
                if pData^.ConceptoPtr^ = '' then
                begin
                  MessageBox(hWnd, 'Por favor ingrese el concepto del egreso.', 'Dato Requerido', MB_ICONWARNING or MB_OK);
                  Exit(0);
                end;

                pData^.MontoPtr^ := StrToCurrDef(GetEditText(pData^.EdtMonto), 0);
                if pData^.MontoPtr^ <= 0 then
                begin
                  MessageBox(hWnd, 'Por favor ingrese un monto valido mayor a $0.', 'Monto Invalido', MB_ICONWARNING or MB_OK);
                  Exit(0);
                end;

                CurSel := SendMessage(pData^.CmbCategoria, CB_GETCURSEL, 0, 0);
                case CurSel of
                  0: pData^.CategoriaPtr^ := 'Mantenimiento Parque';
                  1: pData^.CategoriaPtr^ := 'Combustible / Nafta';
                  2: pData^.CategoriaPtr^ := 'Servicios de Sepelio';
                  3: pData^.CategoriaPtr^ := 'Sueldos / Jornales';
                  4: pData^.CategoriaPtr^ := 'Materiales e Insumos';
                  5: pData^.CategoriaPtr^ := 'Servicios Publicos';
                else
                  pData^.CategoriaPtr^ := 'Otros Gastos Operativos';
                end;

                pData^.ComprobantePtr^ := Trim(GetEditText(pData^.EdtComprobante));
                if pData^.ComprobantePtr^ = '' then
                  pData^.ComprobantePtr^ := 'EGR-' + FormatDateTime('hhnnss', Now);

                if SendMessage(pData^.CmbMetodo, CB_GETCURSEL, 0, 0) = 1 then
                  pData^.MetodoPtr^ := mpTransferenciaQR
                else
                  pData^.MetodoPtr^ := mpEfectivo;

                pData^.Confirmed := True;
              end;
              DestroyWindow(hWnd);
              Exit(0);
            end;
          2: // Cancelar
            begin
              if pData <> nil then pData^.Confirmed := False;
              DestroyWindow(hWnd);
              Exit(0);
            end;
        end;
      end;
    WM_CLOSE:
      begin
        if pData <> nil then pData^.Confirmed := False;
        DestroyWindow(hWnd);
        Exit(0);
      end;
  end;
  Result := DefWindowProc(hWnd, uMsg, wParam, lParam);
end;

function ShowDlgEgresoCaja(ParentWnd: HWND; var Concepto, Categoria, Comprobante: string; var Monto: Currency; var Metodo: TMetodoPago): Boolean;
var
  wc: TWndClass;
  hDlg: HWND;
  DlgData: TEgresoDlgData;
begin
  EnsureDlgFonts;
  FillChar(wc, SizeOf(wc), 0);
  wc.style := CS_HREDRAW or CS_VREDRAW;
  wc.lpfnWndProc := @EgresoDlgProc;
  wc.hInstance := hInstance;
  wc.hCursor := LoadCursor(0, IDC_ARROW);
  wc.hbrBackground := HBRUSH(COLOR_BTNFACE + 1);
  wc.lpszClassName := 'AeternaEgresoDlgClass';
  RegisterClass(wc);

  hDlg := CreateWindowEx(WS_EX_DLGMODALFRAME, 'AeternaEgresoDlgClass', 'Registrar Egreso / Gasto de Caja',
    WS_POPUP or WS_CAPTION or WS_SYSMENU or WS_VISIBLE,
    0, 0, 480, 360, ParentWnd, 0, hInstance, nil);

  CenterWindow(hDlg, ParentWnd);

  if Concepto = '' then Concepto := '';
  if Categoria = '' then Categoria := 'Mantenimiento Parque';
  if Comprobante = '' then Comprobante := 'EGR-' + FormatDateTime('hhnnss', Now);
  if Monto <= 0 then Monto := 10000;

  DlgData.ConceptoPtr := @Concepto;
  DlgData.CategoriaPtr := @Categoria;
  DlgData.ComprobantePtr := @Comprobante;
  DlgData.MontoPtr := @Monto;
  DlgData.MetodoPtr := @Metodo;
  DlgData.Confirmed := False;

  CreateDlgLabel(hDlg, 'Concepto / Motivo del Egreso (*):', 20, 15, 300, 18);
  DlgData.EdtConcepto := CreateDlgEdit(hDlg, Concepto, 20, 35, 420, 24, 701);

  CreateDlgLabel(hDlg, 'Categoria del Gasto (*):', 20, 70, 200, 18);
  DlgData.CmbCategoria := CreateDlgCombo(hDlg, 20, 90, 200, 150, 702);
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Mantenimiento Parque')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Combustible / Nafta')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Servicios de Sepelio')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Sueldos / Jornales')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Materiales e Insumos')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Servicios Publicos')));
  SendMessage(DlgData.CmbCategoria, CB_ADDSTRING, 0, LPARAM(PChar('Otros Gastos Operativos')));
  SendMessage(DlgData.CmbCategoria, CB_SETCURSEL, 0, 0);

  CreateDlgLabel(hDlg, 'Via de Egreso (*):', 240, 70, 200, 18);
  DlgData.CmbMetodo := CreateDlgCombo(hDlg, 240, 90, 200, 100, 703);
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Efectivo de Caja')));
  SendMessage(DlgData.CmbMetodo, CB_ADDSTRING, 0, LPARAM(PChar('Transferencia Bancaria')));
  if Metodo = mpTransferenciaQR then
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 1, 0)
  else
    SendMessage(DlgData.CmbMetodo, CB_SETCURSEL, 0, 0);

  CreateDlgLabel(hDlg, 'Importe del Egreso ($) (*):', 20, 130, 200, 18);
  DlgData.EdtMonto := CreateDlgEdit(hDlg, CurrToStr(Monto), 20, 150, 200, 24, 704);

  CreateDlgLabel(hDlg, 'Nro Comprobante / Factura:', 240, 130, 200, 18);
  DlgData.EdtComprobante := CreateDlgEdit(hDlg, Comprobante, 240, 150, 200, 24, 705);

  CreateDlgLabel(hDlg, 'El egreso se descontara del arqueo de caja y del balance mensual.', 20, 195, 420, 18);

  CreateDlgButton(hDlg, 'Registrar Egreso', 200, 255, 140, 35, 1, True);
  CreateDlgButton(hDlg, 'Cancelar', 350, 255, 90, 35, 2);

  SetWindowLongPtr(hDlg, GWLP_USERDATA, LONG_PTR(@DlgData));
  SetFocus(DlgData.EdtConcepto);

  RunModalLoop(hDlg, ParentWnd);
  Result := DlgData.Confirmed;
end;

end.
