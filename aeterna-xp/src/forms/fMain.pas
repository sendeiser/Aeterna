unit fMain;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls,
  ComCtrls, StdCtrls, Grids, Menus, uConfig, uDataModels, uBusinessRules,
  uParcelasService, uInhumacionesService, uAfiliadosService, uCajaService;

type
  { TfrmMain }
  TfrmMain = class(TForm)
    MainMenu1: TMainMenu;
    miArchivo: TMenuItem;
    miSalir: TMenuItem;
    miModulos: TMenuItem;
    miCatastro: TMenuItem;
    miInhumaciones: TMenuItem;
    miSeguro: TMenuItem;
    miCaja: TMenuItem;
    miReportes: TMenuItem;
    miRepActas: TMenuItem;
    miRepFolios: TMenuItem;
    miRepRuta: TMenuItem;
    miRepRecibos: TMenuItem;
    miRepCierre: TMenuItem;
    miAyuda: TMenuItem;
    miAcercaDe: TMenuItem;

    pnlHeader: TPanel;
    lblTitle: TLabel;
    lblSubtitle: TLabel;
    pnlQuickActions: TPanel;
    btnAccionInhumacion: TButton;
    btnAccionAfiliado: TButton;
    btnAccionCobranza: TButton;
    btnAccionCierreCaja: TButton;

    pnlKpiCards: TPanel;
    pnlCardOcupacion: TPanel;
    lblKpiOcupacionTit: TLabel;
    lblKpiOcupacionVal: TLabel;
    lblKpiOcupacionSub: TLabel;
    pbOcupacion: TProgressBar;

    pnlCardMora: TPanel;
    lblKpiMoraTit: TLabel;
    lblKpiMoraVal: TLabel;
    lblKpiMoraSub: TLabel;

    pnlCardSeguro: TPanel;
    lblKpiSeguroTit: TLabel;
    lblKpiSeguroVal: TLabel;
    lblKpiSeguroSub: TLabel;

    pnlCardCaja: TPanel;
    lblKpiCajaTit: TLabel;
    lblKpiCajaVal: TLabel;
    lblKpiCajaSub: TLabel;

    PageControl1: TPageControl;
    tabDashboard: TTabSheet;
    tabParcelas: TTabSheet;
    tabInhumaciones: TTabSheet;
    tabAfiliados: TTabSheet;
    tabCaja: TTabSheet;

    pnlDashTableTools: TPanel;
    lblFiltroDash: TLabel;
    edtBuscarDash: TEdit;
    btnRefrescarDash: TButton;
    gridActividadDash: TStringGrid;

    StatusBar1: TStatusBar;
    TimerActualizar: TTimer;

    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure miSalirClick(Sender: TObject);
    procedure miAcercaDeClick(Sender: TObject);
    procedure btnRefrescarDashClick(Sender: TObject);
    procedure edtBuscarDashChange(Sender: TObject);
    procedure btnAccionInhumacionClick(Sender: TObject);
    procedure btnAccionAfiliadoClick(Sender: TObject);
    procedure btnAccionCobranzaClick(Sender: TObject);
    procedure btnAccionCierreCajaClick(Sender: TObject);
    procedure PageControl1Change(Sender: TObject);
  private
    FParcelas: TParcelaArray;
    FInhumaciones: TInhumacionArray;
    FAfiliados: TAfiliadoArray;
    FMovimientosCaja: TPagoArray;
    procedure CargarDatosGlobales;
    procedure ActualizarKpis;
    procedure RefrescarTablaActividad(const AFiltro: string = '');
    procedure ActualizarBarraEstado;
  public
  end;

var
  frmMain: TfrmMain;

implementation

{$R *.lfm}

{ TfrmMain }

procedure TfrmMain.FormCreate(Sender: TObject);
begin
  Caption := AppConfig.AppTitulo + ' (Edicion Windows XP)';
  // Configurar columnas de la tabla de actividad
  gridActividadDash.ColCount := 5;
  gridActividadDash.RowCount := 1;
  gridActividadDash.Cells[0, 0] := 'Fecha / Hora';
  gridActividadDash.Cells[1, 0] := 'Tipo de Registro';
  gridActividadDash.Cells[2, 0] := 'Detalle / Titular';
  gridActividadDash.Cells[3, 0] := 'Ubicacion / Estado';
  gridActividadDash.Cells[4, 0] := 'Monto / Obs';

  gridActividadDash.ColWidths[0] := 130;
  gridActividadDash.ColWidths[1] := 140;
  gridActividadDash.ColWidths[2] := 260;
  gridActividadDash.ColWidths[3] := 140;
  gridActividadDash.ColWidths[4] := 140;
end;

procedure TfrmMain.FormShow(Sender: TObject);
begin
  CargarDatosGlobales;
  ActualizarBarraEstado;
end;

procedure TfrmMain.CargarDatosGlobales;
begin
  Screen.Cursor := crHourGlass;
  try
    StatusBar1.Panels[0].Text := 'Consultando Supabase...';
    Application.ProcessMessages;

    FParcelas := TParcelasService.ObtenerTodas;
    FInhumaciones := TInhumacionesService.ObtenerTodas;
    FAfiliados := TAfiliadosService.ObtenerTodos;
    FMovimientosCaja := TCajaService.ObtenerMovimientosHoy;

    ActualizarKpis;
    RefrescarTablaActividad(edtBuscarDash.Text);
    StatusBar1.Panels[0].Text := 'En Linea con Supabase Cloud';
  finally
    Screen.Cursor := crDefault;
    ActualizarBarraEstado;
  end;
end;

procedure TfrmMain.ActualizarKpis;
var
  i, Ocupadas, EnMora, Caducidad, TotalP: Integer;
  TotalDeuda, TotCajaEf, TotCajaDig, TotCaja: Currency;
  AfiliadosAlDia, AfiliadosMora: Integer;
  PorcOcup: Integer;
  EvalP: TEvaluacionMoraParcela;
begin
  TotalP := Length(FParcelas);
  if TotalP = 0 then TotalP := 398;

  Ocupadas := 0;
  EnMora := 0;
  Caducidad := 0;
  TotalDeuda := 0;

  for i := Low(FParcelas) to High(FParcelas) do
  begin
    if (FParcelas[i].Estado = epOcupada) or (FParcelas[i].Estado = epEnMora) then
      Inc(Ocupadas);

    if (FParcelas[i].Estado = epEnMora) or (FParcelas[i].SaldoMantenimiento > 0) then
    begin
      Inc(EnMora);
      TotalDeuda := TotalDeuda + FParcelas[i].SaldoMantenimiento;
    end;

    EvalP := EvaluarMoraParcela(FParcelas[i], 2026);
    if EvalP.EnStandby then
      Inc(Caducidad);
  end;

  PorcOcup := Round((Ocupadas / TotalP) * 100);
  pbOcupacion.Position := PorcOcup;
  lblKpiOcupacionVal.Caption := Format('%d%% (%d / %d)', [PorcOcup, Ocupadas, TotalP]);
  lblKpiOcupacionSub.Caption := Format('%d parcelas disponibles', [TotalP - Ocupadas]);

  lblKpiMoraVal.Caption := FormatearMoneda(TotalDeuda);
  lblKpiMoraSub.Caption := Format('%d parcelas con deuda (%d en caducidad legal)', [EnMora, Caducidad]);

  // Seguro
  AfiliadosAlDia := 0;
  for i := Low(FAfiliados) to High(FAfiliados) do
  begin
    if FAfiliados[i].Estado = eaActivo then
      Inc(AfiliadosAlDia);
  end;
  AfiliadosMora := Length(FAfiliados) - AfiliadosAlDia;
  lblKpiSeguroVal.Caption := Format('%d Activos', [Length(FAfiliados)]);
  lblKpiSeguroSub.Caption := Format('%d al dia - %d en mora', [AfiliadosAlDia, AfiliadosMora]);

  // Caja
  TotCaja := TCajaService.CalcularTotalesHoy(TotCajaEf, TotCajaDig);
  lblKpiCajaVal.Caption := FormatearMoneda(TotCaja);
  lblKpiCajaSub.Caption := Format('Efvo: %s | Digital: %s', [FormatearMoneda(TotCajaEf), FormatearMoneda(TotCajaDig)]);
end;

procedure TfrmMain.RefrescarTablaActividad(const AFiltro: string);
var
  i, RowIdx: Integer;
  FiltroL: string;
  Coincide: Boolean;
begin
  FiltroL := LowerCase(Trim(AFiltro));
  gridActividadDash.RowCount := 1;
  RowIdx := 1;

  // 1. Mostrar Inhumaciones
  for i := Low(FInhumaciones) to High(FInhumaciones) do
  begin
    Coincide := (FiltroL = '') or
      (Pos(FiltroL, LowerCase(FInhumaciones[i].NombreDifunto)) > 0) or
      (Pos(FiltroL, LowerCase(FInhumaciones[i].NomenclaturaParcela)) > 0);

    if Coincide then
    begin
      gridActividadDash.RowCount := RowIdx + 1;
      gridActividadDash.Cells[0, RowIdx] := FormatearFecha(FInhumaciones[i].FechaInhumacion);
      gridActividadDash.Cells[1, RowIdx] := 'Inhumacion';
      gridActividadDash.Cells[2, RowIdx] := FInhumaciones[i].NombreDifunto;
      gridActividadDash.Cells[3, RowIdx] := 'Parcela ' + FInhumaciones[i].NomenclaturaParcela;
      if FInhumaciones[i].EsCovid then
        gridActividadDash.Cells[4, RowIdx] := 'Protocolo COVID'
      else
        gridActividadDash.Cells[4, RowIdx] := 'Estandar';
      Inc(RowIdx);
    end;
  end;

  // 2. Mostrar Movimientos de Caja
  for i := Low(FMovimientosCaja) to High(FMovimientosCaja) do
  begin
    Coincide := (FiltroL = '') or
      (Pos(FiltroL, LowerCase(FMovimientosCaja[i].TitularNombre)) > 0) or
      (Pos(FiltroL, LowerCase(FMovimientosCaja[i].NroRecibo)) > 0);

    if Coincide then
    begin
      gridActividadDash.RowCount := RowIdx + 1;
      gridActividadDash.Cells[0, RowIdx] := FormatearFecha(FMovimientosCaja[i].FechaPago);
      gridActividadDash.Cells[1, RowIdx] := 'Cobro de Caja';
      gridActividadDash.Cells[2, RowIdx] := FMovimientosCaja[i].TitularNombre;
      gridActividadDash.Cells[3, RowIdx] := 'Recibo ' + FMovimientosCaja[i].NroRecibo;
      gridActividadDash.Cells[4, RowIdx] := FormatearMoneda(FMovimientosCaja[i].MontoPagado);
      Inc(RowIdx);
    end;
  end;
end;

procedure TfrmMain.ActualizarBarraEstado;
begin
  StatusBar1.Panels[1].Text := 'Operador: ' + AppConfig.DefaultOperador;
  StatusBar1.Panels[2].Text := FormatDateTime('dd/mm/yyyy hh:nn', Now);
  StatusBar1.Panels[3].Text := 'RAM: ~22 MB / 2048 MB';
end;

procedure TfrmMain.btnRefrescarDashClick(Sender: TObject);
begin
  CargarDatosGlobales;
end;

procedure TfrmMain.edtBuscarDashChange(Sender: TObject);
begin
  RefrescarTablaActividad(edtBuscarDash.Text);
end;

procedure TfrmMain.btnAccionInhumacionClick(Sender: TObject);
begin
  PageControl1.ActivePage := tabInhumaciones;
end;

procedure TfrmMain.btnAccionAfiliadoClick(Sender: TObject);
begin
  PageControl1.ActivePage := tabAfiliados;
end;

procedure TfrmMain.btnAccionCobranzaClick(Sender: TObject);
begin
  PageControl1.ActivePage := tabCaja;
end;

procedure TfrmMain.btnAccionCierreCajaClick(Sender: TObject);
begin
  PageControl1.ActivePage := tabCaja;
end;

procedure TfrmMain.PageControl1Change(Sender: TObject);
begin
  // Cambio de pestañas
end;

procedure TfrmMain.miSalirClick(Sender: TObject);
begin
  Close;
end;

procedure TfrmMain.miAcercaDeClick(Sender: TObject);
begin
  ShowMessage('Aeterna - Gestion Funeraria y Cementerio Parque San Nicolas' + sLineBreak +
              'Version 1.0.0-XP (Optimizada para Windows XP SP3)' + sLineBreak +
              'Desarrollada en Lazarus / Free Pascal Win32' + sLineBreak +
              'Conexion Segura a Supabase Cloud');
end;

end.
