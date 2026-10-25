unit fInhumaciones;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls,
  StdCtrls, Grids, uDataModels, uBusinessRules, uInhumacionesService;

type
  { TfrmInhumaciones }
  TfrmInhumaciones = class(TForm)
    pnlTop: TPanel;
    lblFiltroProtocolo: TLabel;
    cbProtocolo: TComboBox;
    lblBuscar: TLabel;
    edtBuscar: TEdit;
    btnRefrescar: TButton;
    btnNuevaInhumacion: TButton;
    btnImprimirActa: TButton;
    lblTotal: TLabel;

    gridInhumaciones: TStringGrid;

    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure btnRefrescarClick(Sender: TObject);
    procedure cbProtocoloChange(Sender: TObject);
    procedure edtBuscarChange(Sender: TObject);
    procedure btnNuevaInhumacionClick(Sender: TObject);
    procedure btnImprimirActaClick(Sender: TObject);
    procedure gridInhumacionesDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
  private
    FInhumaciones: TInhumacionArray;
    FInhumacionesFiltradas: TInhumacionArray;
    procedure CargarInhumaciones;
    procedure AplicarFiltros;
  public
  end;

var
  frmInhumaciones: TfrmInhumaciones;

implementation

uses
  fNuevaInhumacion, uReportsPDF;

{$R *.lfm}

{ TfrmInhumaciones }

procedure TfrmInhumaciones.FormCreate(Sender: TObject);
begin
  gridInhumaciones.ColCount := 7;
  gridInhumaciones.RowCount := 1;
  gridInhumaciones.Cells[0, 0] := 'Fecha Inhumacion';
  gridInhumaciones.Cells[1, 0] := 'Nombre del Difunto';
  gridInhumaciones.Cells[2, 0] := 'DNI';
  gridInhumaciones.Cells[3, 0] := 'Parcela';
  gridInhumaciones.Cells[4, 0] := 'Nivel';
  gridInhumaciones.Cells[5, 0] := 'Protocolo';
  gridInhumaciones.Cells[6, 0] := 'Empresa / Responsable';

  gridInhumaciones.ColWidths[0] := 115;
  gridInhumaciones.ColWidths[1] := 240;
  gridInhumaciones.ColWidths[2] := 95;
  gridInhumaciones.ColWidths[3] := 105;
  gridInhumaciones.ColWidths[4] := 60;
  gridInhumaciones.ColWidths[5] := 110;
  gridInhumaciones.ColWidths[6] := 195;
end;

procedure TfrmInhumaciones.FormShow(Sender: TObject);
begin
  if Length(FInhumaciones) = 0 then
    CargarInhumaciones;
end;

procedure TfrmInhumaciones.CargarInhumaciones;
begin
  Screen.Cursor := crHourGlass;
  try
    FInhumaciones := TInhumacionesService.ObtenerTodas;
    AplicarFiltros;
  finally
    Screen.Cursor := crDefault;
  end;
end;

procedure TfrmInhumaciones.AplicarFiltros;
var
  i, RowIdx, TotalI: Integer;
  ProtFiltro, Q: string;
  CoincideProt, CoincideQ: Boolean;
begin
  ProtFiltro := cbProtocolo.Text;
  Q := LowerCase(Trim(edtBuscar.Text));

  TotalI := Length(FInhumaciones);
  SetLength(FInhumacionesFiltradas, TotalI);
  RowIdx := 0;

  for i := 0 to TotalI - 1 do
  begin
    // Filtro Protocolo
    if (ProtFiltro = 'Todos los Protocolos') or (ProtFiltro = '') then
      CoincideProt := True
    else if ProtFiltro = 'COVID-19' then
      CoincideProt := FInhumaciones[i].EsCovid
    else if ProtFiltro = 'Estandar' then
      CoincideProt := not FInhumaciones[i].EsCovid
    else
      CoincideProt := True;

    // Filtro Busqueda
    if Q = '' then
      CoincideQ := True
    else
      CoincideQ := (Pos(Q, LowerCase(FInhumaciones[i].NombreDifunto)) > 0) or
                   (Pos(Q, LowerCase(FInhumaciones[i].DniDifunto)) > 0) or
                   (Pos(Q, LowerCase(FInhumaciones[i].NomenclaturaParcela)) > 0);

    if CoincideProt and CoincideQ then
    begin
      FInhumacionesFiltradas[RowIdx] := FInhumaciones[i];
      Inc(RowIdx);
    end;
  end;

  SetLength(FInhumacionesFiltradas, RowIdx);
  gridInhumaciones.RowCount := RowIdx + 1;

  for i := 0 to RowIdx - 1 do
  begin
    gridInhumaciones.Cells[0, i + 1] := FormatearFecha(FInhumacionesFiltradas[i].FechaInhumacion);
    gridInhumaciones.Cells[1, i + 1] := FInhumacionesFiltradas[i].NombreDifunto;
    gridInhumaciones.Cells[2, i + 1] := FInhumacionesFiltradas[i].DniDifunto;
    gridInhumaciones.Cells[3, i + 1] := FInhumacionesFiltradas[i].NomenclaturaParcela;
    gridInhumaciones.Cells[4, i + 1] := IntToStr(FInhumacionesFiltradas[i].NivelPosicion);
    if FInhumacionesFiltradas[i].EsCovid then
      gridInhumaciones.Cells[5, i + 1] := 'COVID-19'
    else
      gridInhumaciones.Cells[5, i + 1] := 'Estandar';
    gridInhumaciones.Cells[6, i + 1] := FInhumacionesFiltradas[i].EmpresaFunebrera;
  end;

  lblTotal.Caption := Format('Total: %d actas', [RowIdx]);
end;

procedure TfrmInhumaciones.gridInhumacionesDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
var
  Texto: string;
begin
  if (aRow > 0) and (aCol = 5) and (aRow <= Length(FInhumacionesFiltradas)) then
  begin
    Texto := gridInhumaciones.Cells[aCol, aRow];
    if Texto = 'COVID-19' then
    begin
      gridInhumaciones.Canvas.Brush.Color := $FCE8E6;
      gridInhumaciones.Canvas.FillRect(aRect);
      gridInhumaciones.Canvas.Font.Color := clMaroon;
      gridInhumaciones.Canvas.TextOut(aRect.Left + 4, aRect.Top + 2, Texto);
    end;
  end;
end;

procedure TfrmInhumaciones.btnRefrescarClick(Sender: TObject);
begin
  CargarInhumaciones;
end;

procedure TfrmInhumaciones.cbProtocoloChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmInhumaciones.edtBuscarChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmInhumaciones.btnNuevaInhumacionClick(Sender: TObject);
begin
  frmNuevaInhumacion := TfrmNuevaInhumacion.Create(Self);
  try
    if frmNuevaInhumacion.ShowModal = mrOk then
      CargarInhumaciones;
  finally
    frmNuevaInhumacion.Free;
  end;
end;

procedure TfrmInhumaciones.btnImprimirActaClick(Sender: TObject);
var
  SelIdx: Integer;
  RutaPdf: string;
begin
  SelIdx := gridInhumaciones.Row - 1;
  if (SelIdx >= 0) and (SelIdx < Length(FInhumacionesFiltradas)) then
  begin
    RutaPdf := ExtractFilePath(ParamStr(0)) + 'Acta_' + FInhumacionesFiltradas[SelIdx].NomenclaturaParcela + '.pdf';
    GenerarActaInhumacionPDF(FInhumacionesFiltradas[SelIdx], RutaPdf);
    ShowMessage('Acta generada exitosamente en:' + sLineBreak + RutaPdf);
  end
  else
    ShowMessage('Seleccione una inhumacion de la lista para imprimir el acta.');
end;

end.
