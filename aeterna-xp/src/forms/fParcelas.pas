unit fParcelas;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls,
  StdCtrls, Grids, uDataModels, uBusinessRules, uParcelasService;

type
  { TfrmParcelas }
  TfrmParcelas = class(TForm)
    pnlTop: TPanel;
    lblSector: TLabel;
    cbSector: TComboBox;
    lblEstado: TLabel;
    cbEstado: TComboBox;
    lblBuscar: TLabel;
    edtBuscar: TEdit;
    btnRefrescar: TButton;
    btnVerFicha: TButton;
    lblContador: TLabel;

    gridParcelas: TStringGrid;

    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure btnRefrescarClick(Sender: TObject);
    procedure cbSectorChange(Sender: TObject);
    procedure cbEstadoChange(Sender: TObject);
    procedure edtBuscarChange(Sender: TObject);
    procedure btnVerFichaClick(Sender: TObject);
    procedure gridParcelasDblClick(Sender: TObject);
    procedure gridParcelasDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
  private
    FParcelas: TParcelaArray;
    FParcelasFiltradas: TParcelaArray;
    procedure CargarParcelas;
    procedure AplicarFiltros;
  public
  end;

var
  frmParcelas: TfrmParcelas;

implementation

uses
  fDetalleParcela;

{$R *.lfm}

{ TfrmParcelas }

procedure TfrmParcelas.FormCreate(Sender: TObject);
begin
  gridParcelas.ColCount := 7;
  gridParcelas.RowCount := 1;
  gridParcelas.Cells[0, 0] := 'Nomenclatura';
  gridParcelas.Cells[1, 0] := 'Sector';
  gridParcelas.Cells[2, 0] := 'Titular';
  gridParcelas.Cells[3, 0] := 'Estado';
  gridParcelas.Cells[4, 0] := 'Espacios';
  gridParcelas.Cells[5, 0] := 'Deuda Mant.';
  gridParcelas.Cells[6, 0] := 'Ultimo Pago / Cuota';

  gridParcelas.ColWidths[0] := 110;
  gridParcelas.ColWidths[1] := 80;
  gridParcelas.ColWidths[2] := 250;
  gridParcelas.ColWidths[3] := 110;
  gridParcelas.ColWidths[4] := 90;
  gridParcelas.ColWidths[5] := 120;
  gridParcelas.ColWidths[6] := 160;
end;

procedure TfrmParcelas.FormShow(Sender: TObject);
begin
  if Length(FParcelas) = 0 then
    CargarParcelas;
end;

procedure TfrmParcelas.CargarParcelas;
begin
  Screen.Cursor := crHourGlass;
  try
    FParcelas := TParcelasService.ObtenerTodas;
    AplicarFiltros;
  finally
    Screen.Cursor := crDefault;
  end;
end;

procedure TfrmParcelas.AplicarFiltros;
var
  i, RowIdx, TotalP: Integer;
  SecFiltro, EstFiltro, Q: string;
  CoincideSec, CoincideEst, CoincideQ: Boolean;
  EvalP: TEvaluacionMoraParcela;
begin
  SecFiltro := cbSector.Text;
  EstFiltro := cbEstado.Text;
  Q := LowerCase(Trim(edtBuscar.Text));

  TotalP := Length(FParcelas);
  SetLength(FParcelasFiltradas, TotalP);
  RowIdx := 0;

  for i := 0 to TotalP - 1 do
  begin
    // Filtro Sector
    if (SecFiltro = 'Todos los Sectores') or (SecFiltro = '') then
      CoincideSec := True
    else
      CoincideSec := SameText(FParcelas[i].SectorId, SecFiltro);

    // Filtro Estado
    EvalP := EvaluarMoraParcela(FParcelas[i], 2026);
    if (EstFiltro = 'Todos los Estados') or (EstFiltro = '') then
      CoincideEst := True
    else if EstFiltro = 'Disponibles' then
      CoincideEst := (FParcelas[i].Estado = epDisponible)
    else if EstFiltro = 'Ocupadas' then
      CoincideEst := (FParcelas[i].Estado = epOcupada)
    else if EstFiltro = 'En Mora' then
      CoincideEst := (FParcelas[i].Estado = epEnMora) or (FParcelas[i].SaldoMantenimiento > 0)
    else if EstFiltro = 'Caducidad (>3 a)' then
      CoincideEst := EvalP.EnStandby
    else
      CoincideEst := True;

    // Filtro Texto
    if Q = '' then
      CoincideQ := True
    else
      CoincideQ := (Pos(Q, LowerCase(FParcelas[i].Nomenclatura)) > 0) or
                   (Pos(Q, LowerCase(FParcelas[i].TitularNombre)) > 0) or
                   (Pos(Q, LowerCase(FParcelas[i].TitularDni)) > 0);

    if CoincideSec and CoincideEst and CoincideQ then
    begin
      FParcelasFiltradas[RowIdx] := FParcelas[i];
      Inc(RowIdx);
    end;
  end;

  SetLength(FParcelasFiltradas, RowIdx);
  gridParcelas.RowCount := RowIdx + 1;

  for i := 0 to RowIdx - 1 do
  begin
    gridParcelas.Cells[0, i + 1] := FParcelasFiltradas[i].Nomenclatura;
    gridParcelas.Cells[1, i + 1] := FParcelasFiltradas[i].SectorId;
    if FParcelasFiltradas[i].TitularNombre <> '' then
      gridParcelas.Cells[2, i + 1] := FParcelasFiltradas[i].TitularNombre
    else
      gridParcelas.Cells[2, i + 1] := '(Sin Titular Asignado)';

    gridParcelas.Cells[3, i + 1] := EstadoParcelaToStr(FParcelasFiltradas[i].Estado);
    gridParcelas.Cells[4, i + 1] := Format('%d / %d', [FParcelasFiltradas[i].EspaciosOcupados, FParcelasFiltradas[i].CapacidadTotal]);
    gridParcelas.Cells[5, i + 1] := FormatearMoneda(FParcelasFiltradas[i].SaldoMantenimiento);
    if FParcelasFiltradas[i].UltimaCuotaPagada <> '' then
      gridParcelas.Cells[6, i + 1] := FParcelasFiltradas[i].UltimaCuotaPagada
    else
      gridParcelas.Cells[6, i + 1] := FormatearFecha(FParcelasFiltradas[i].FechaUltimoPago);
  end;

  lblContador.Caption := Format('Mostrando %d de %d parcelas', [RowIdx, TotalP]);
end;

procedure TfrmParcelas.gridParcelasDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
var
  Texto: string;
begin
  if (aRow > 0) and (aCol = 3) and (aRow <= Length(FParcelasFiltradas)) then
  begin
    Texto := gridParcelas.Cells[aCol, aRow];
    if Texto = 'disponible' then
      gridParcelas.Canvas.Brush.Color := $E8F8F0
    else if Texto = 'ocupada' then
      gridParcelas.Canvas.Brush.Color := $FCE8E6
    else if (Texto = 'en_mora') or (Texto = 'standby') then
      gridParcelas.Canvas.Brush.Color := $FDF3E7;

    gridParcelas.Canvas.FillRect(aRect);
    gridParcelas.Canvas.Font.Color := clBlack;
    gridParcelas.Canvas.TextOut(aRect.Left + 4, aRect.Top + 2, Texto);
  end;
end;

procedure TfrmParcelas.btnRefrescarClick(Sender: TObject);
begin
  CargarParcelas;
end;

procedure TfrmParcelas.cbSectorChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmParcelas.cbEstadoChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmParcelas.edtBuscarChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmParcelas.btnVerFichaClick(Sender: TObject);
var
  SelIdx: Integer;
begin
  SelIdx := gridParcelas.Row - 1;
  if (SelIdx >= 0) and (SelIdx < Length(FParcelasFiltradas)) then
  begin
    frmDetalleParcela := TfrmDetalleParcela.Create(Self);
    try
      frmDetalleParcela.CargarParcela(FParcelasFiltradas[SelIdx]);
      if frmDetalleParcela.ShowModal = mrOk then
        CargarParcelas;
    finally
      frmDetalleParcela.Free;
    end;
  end;
end;

procedure TfrmParcelas.gridParcelasDblClick(Sender: TObject);
begin
  btnVerFichaClick(Sender);
end;

end.
