unit fAfiliados;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls,
  StdCtrls, Grids, uDataModels, uBusinessRules, uAfiliadosService;

type
  { TfrmAfiliados }
  TfrmAfiliados = class(TForm)
    pnlTop: TPanel;
    lblFiltroEstado: TLabel;
    cbFiltroEstado: TComboBox;
    lblBuscar: TLabel;
    edtBuscar: TEdit;
    btnRefrescar: TButton;
    btnCobrarCuota: TButton;
    btnPlanillaRuta: TButton;
    lblContador: TLabel;

    gridAfiliados: TStringGrid;

    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure btnRefrescarClick(Sender: TObject);
    procedure cbFiltroEstadoChange(Sender: TObject);
    procedure edtBuscarChange(Sender: TObject);
    procedure btnCobrarCuotaClick(Sender: TObject);
    procedure btnPlanillaRutaClick(Sender: TObject);
    procedure gridAfiliadosDblClick(Sender: TObject);
    procedure gridAfiliadosDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
  private
    FAfiliados: TAfiliadoArray;
    FAfiliadosFiltrados: TAfiliadoArray;
    procedure CargarAfiliados;
    procedure AplicarFiltros;
    function EsMesPagado(const AAfi: TAfiliadoSeguro; Mes: Integer): Boolean;
  public
  end;

var
  frmAfiliados: TfrmAfiliados;

implementation

uses
  fCobranzaCuota, uReportsPDF;

{$R *.lfm}

{ TfrmAfiliados }

procedure TfrmAfiliados.FormCreate(Sender: TObject);
var
  m: Integer;
const
  MesesNombres: array[1..12] of string = (
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  );
begin
  gridAfiliados.ColCount := 18;
  gridAfiliados.RowCount := 1;
  gridAfiliados.Cells[0, 0] := 'Nro';
  gridAfiliados.Cells[1, 0] := 'Titular';
  gridAfiliados.Cells[2, 0] := 'DNI';
  gridAfiliados.Cells[3, 0] := 'Direccion / Zona';
  gridAfiliados.Cells[4, 0] := 'Cuota';
  gridAfiliados.Cells[5, 0] := 'Estado';

  gridAfiliados.ColWidths[0] := 50;
  gridAfiliados.ColWidths[1] := 200;
  gridAfiliados.ColWidths[2] := 85;
  gridAfiliados.ColWidths[3] := 170;
  gridAfiliados.ColWidths[4] := 75;
  gridAfiliados.ColWidths[5] := 70;

  for m := 1 to 12 do
  begin
    gridAfiliados.Cells[5 + m, 0] := MesesNombres[m];
    gridAfiliados.ColWidths[5 + m] := 38;
  end;
end;

procedure TfrmAfiliados.FormShow(Sender: TObject);
begin
  if Length(FAfiliados) = 0 then
    CargarAfiliados;
end;

procedure TfrmAfiliados.CargarAfiliados;
begin
  Screen.Cursor := crHourGlass;
  try
    FAfiliados := TAfiliadosService.ObtenerTodos;
    AplicarFiltros;
  finally
    Screen.Cursor := crDefault;
  end;
end;

function TfrmAfiliados.EsMesPagado(const AAfi: TAfiliadoSeguro; Mes: Integer): Boolean;
var
  i: Integer;
begin
  Result := False;
  for i := Low(AAfi.CuotasPagadas) to High(AAfi.CuotasPagadas) do
  begin
    if AAfi.CuotasPagadas[i] = Mes then
      Exit(True);
  end;
end;

procedure TfrmAfiliados.AplicarFiltros;
var
  i, m, RowIdx, TotalA: Integer;
  EstFiltro, Q: string;
  CoincideEst, CoincideQ: Boolean;
  MoraMeses: Integer;
begin
  EstFiltro := cbFiltroEstado.Text;
  Q := LowerCase(Trim(edtBuscar.Text));

  TotalA := Length(FAfiliados);
  SetLength(FAfiliadosFiltrados, TotalA);
  RowIdx := 0;

  for i := 0 to TotalA - 1 do
  begin
    MoraMeses := EvaluarMoraAfiliado(FAfiliados[i], 10);

    // Filtro Estado
    if (EstFiltro = 'Todos') or (EstFiltro = '') then
      CoincideEst := True
    else if EstFiltro = 'Al Dia' then
      CoincideEst := (MoraMeses < 3) and (FAfiliados[i].Estado = eaActivo)
    else if EstFiltro = 'En Mora (>= 3 meses)' then
      CoincideEst := (MoraMeses >= 3) or (FAfiliados[i].Estado = eaEnMora)
    else
      CoincideEst := True;

    // Filtro Texto
    if Q = '' then
      CoincideQ := True
    else
      CoincideQ := (Pos(Q, LowerCase(FAfiliados[i].NombreCompleto)) > 0) or
                   (Pos(Q, LowerCase(FAfiliados[i].Dni)) > 0) or
                   (Pos(Q, IntToStr(FAfiliados[i].NumeroAfiliado)) > 0);

    if CoincideEst and CoincideQ then
    begin
      FAfiliadosFiltrados[RowIdx] := FAfiliados[i];
      Inc(RowIdx);
    end;
  end;

  SetLength(FAfiliadosFiltrados, RowIdx);
  gridAfiliados.RowCount := RowIdx + 1;

  for i := 0 to RowIdx - 1 do
  begin
    gridAfiliados.Cells[0, i + 1] := IntToStr(FAfiliadosFiltrados[i].NumeroAfiliado);
    gridAfiliados.Cells[1, i + 1] := FAfiliadosFiltrados[i].NombreCompleto;
    gridAfiliados.Cells[2, i + 1] := FAfiliadosFiltrados[i].Dni;
    gridAfiliados.Cells[3, i + 1] := FAfiliadosFiltrados[i].DireccionCobro;
    gridAfiliados.Cells[4, i + 1] := FormatearMoneda(FAfiliadosFiltrados[i].MontoCuotaMensual);
    gridAfiliados.Cells[5, i + 1] := EstadoAfiliadoToStr(FAfiliadosFiltrados[i].Estado);

    for m := 1 to 12 do
    begin
      if EsMesPagado(FAfiliadosFiltrados[i], m) then
        gridAfiliados.Cells[5 + m, i + 1] := 'PAG'
      else if m <= 10 then
        gridAfiliados.Cells[5 + m, i + 1] := 'IMP'
      else
        gridAfiliados.Cells[5 + m, i + 1] := '-';
    end;
  end;

  lblContador.Caption := Format('Afiliados: %d de %d', [RowIdx, TotalA]);
end;

procedure TfrmAfiliados.gridAfiliadosDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
var
  Texto: string;
begin
  if (aRow > 0) and (aCol >= 6) and (aCol <= 17) and (aRow <= Length(FAfiliadosFiltrados)) then
  begin
    Texto := gridAfiliados.Cells[aCol, aRow];
    if Texto = 'PAG' then
    begin
      gridAfiliados.Canvas.Brush.Color := $E8F8F0;
      gridAfiliados.Canvas.Font.Color := $0E6251;
    end
    else if Texto = 'IMP' then
    begin
      gridAfiliados.Canvas.Brush.Color := $FCE8E6;
      gridAfiliados.Canvas.Font.Color := clMaroon;
    end
    else
    begin
      gridAfiliados.Canvas.Brush.Color := clWhite;
      gridAfiliados.Canvas.Font.Color := clGray;
    end;

    gridAfiliados.Canvas.FillRect(aRect);
    gridAfiliados.Canvas.TextOut(aRect.Left + 6, aRect.Top + 2, Texto);
  end;
end;

procedure TfrmAfiliados.btnRefrescarClick(Sender: TObject);
begin
  CargarAfiliados;
end;

procedure TfrmAfiliados.cbFiltroEstadoChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmAfiliados.edtBuscarChange(Sender: TObject);
begin
  AplicarFiltros;
end;

procedure TfrmAfiliados.btnCobrarCuotaClick(Sender: TObject);
var
  SelIdx: Integer;
begin
  SelIdx := gridAfiliados.Row - 1;
  if (SelIdx >= 0) and (SelIdx < Length(FAfiliadosFiltrados)) then
  begin
    frmCobranzaCuota := TfrmCobranzaCuota.Create(Self);
    try
      frmCobranzaCuota.CargarAfiliado(FAfiliadosFiltrados[SelIdx]);
      if frmCobranzaCuota.ShowModal = mrOk then
        CargarAfiliados;
    finally
      frmCobranzaCuota.Free;
    end;
  end
  else
    ShowMessage('Por favor seleccione un afiliado de la lista.');
end;

procedure TfrmAfiliados.btnPlanillaRutaClick(Sender: TObject);
var
  RutaPdf: string;
begin
  RutaPdf := ExtractFilePath(ParamStr(0)) + 'Planilla_Ruta_Cobradores.pdf';
  GenerarPlanillaRutaPDF(FAfiliadosFiltrados, RutaPdf);
  ShowMessage('Planilla de Ruta generada exitosamente en:' + sLineBreak + RutaPdf);
end;

procedure TfrmAfiliados.gridAfiliadosDblClick(Sender: TObject);
begin
  btnCobrarCuotaClick(Sender);
end;

end.
