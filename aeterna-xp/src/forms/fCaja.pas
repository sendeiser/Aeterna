unit fCaja;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls,
  StdCtrls, Grids, uDataModels, uBusinessRules, uCajaService;

type
  { TfrmCaja }
  TfrmCaja = class(TForm)
    pnlTop: TPanel;
    lblCajaTit: TLabel;
    lblTotalHoy: TLabel;
    lblEfvoHoy: TLabel;
    lblDigitalHoy: TLabel;

    pnlActions: TPanel;
    btnRefrescar: TButton;
    btnCierreCaja: TButton;
    btnImprimirCierre: TButton;
    lblContador: TLabel;

    gridMovimientos: TStringGrid;

    procedure FormCreate(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure btnRefrescarClick(Sender: TObject);
    procedure btnCierreCajaClick(Sender: TObject);
    procedure btnImprimirCierreClick(Sender: TObject);
    procedure gridMovimientosDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
  private
    FMovimientos: TPagoArray;
    FTotalEfectivo: Currency;
    FTotalDigital: Currency;
    FTotalCaja: Currency;
    procedure CargarCaja;
  public
  end;

var
  frmCaja: TfrmCaja;

implementation

uses
  fCierreCaja, uReportsPDF;

{$R *.lfm}

{ TfrmCaja }

procedure TfrmCaja.FormCreate(Sender: TObject);
begin
  gridMovimientos.ColCount := 7;
  gridMovimientos.RowCount := 1;
  gridMovimientos.Cells[0, 0] := 'Hora';
  gridMovimientos.Cells[1, 0] := 'Nro Recibo';
  gridMovimientos.Cells[2, 0] := 'Concepto / Detalle';
  gridMovimientos.Cells[3, 0] := 'Titular';
  gridMovimientos.Cells[4, 0] := 'Metodo Pago';
  gridMovimientos.Cells[5, 0] := 'Operador';
  gridMovimientos.Cells[6, 0] := 'Monto';

  gridMovimientos.ColWidths[0] := 80;
  gridMovimientos.ColWidths[1] := 110;
  gridMovimientos.ColWidths[2] := 240;
  gridMovimientos.ColWidths[3] := 200;
  gridMovimientos.ColWidths[4] := 110;
  gridMovimientos.ColWidths[5] := 110;
  gridMovimientos.ColWidths[6] := 110;
end;

procedure TfrmCaja.FormShow(Sender: TObject);
begin
  CargarCaja;
end;

procedure TfrmCaja.CargarCaja;
var
  i, TotalM: Integer;
begin
  Screen.Cursor := crHourGlass;
  try
    FMovimientos := TCajaService.ObtenerMovimientosHoy;
    FTotalCaja := TCajaService.CalcularTotalesHoy(FTotalEfectivo, FTotalDigital);

    lblTotalHoy.Caption := 'Total Recaudado Hoy: ' + FormatearMoneda(FTotalCaja);
    lblEfvoHoy.Caption := 'Efectivo: ' + FormatearMoneda(FTotalEfectivo);
    lblDigitalHoy.Caption := 'Digital / Transferencias: ' + FormatearMoneda(FTotalDigital);

    TotalM := Length(FMovimientos);
    gridMovimientos.RowCount := TotalM + 1;

    for i := 0 to TotalM - 1 do
    begin
      gridMovimientos.Cells[0, i + 1] := Copy(FMovimientos[i].FechaPago, 12, 5);
      gridMovimientos.Cells[1, i + 1] := FMovimientos[i].NroRecibo;
      gridMovimientos.Cells[2, i + 1] := FMovimientos[i].Observaciones;
      gridMovimientos.Cells[3, i + 1] := FMovimientos[i].TitularNombre;
      gridMovimientos.Cells[4, i + 1] := MetodoPagoToStr(FMovimientos[i].MetodoPago);
      gridMovimientos.Cells[5, i + 1] := FMovimientos[i].OperadorNombre;
      gridMovimientos.Cells[6, i + 1] := FormatearMoneda(FMovimientos[i].MontoPagado);
    end;

    lblContador.Caption := Format('%d movimientos hoy', [TotalM]);
  finally
    Screen.Cursor := crDefault;
  end;
end;

procedure TfrmCaja.gridMovimientosDrawCell(Sender: TObject; aCol, aRow: Integer; aRect: TRect; aState: TGridDrawState);
var
  Texto: string;
begin
  if (aRow > 0) and (aCol = 4) and (aRow <= Length(FMovimientos)) then
  begin
    Texto := gridMovimientos.Cells[aCol, aRow];
    if Texto = 'efectivo' then
    begin
      gridMovimientos.Canvas.Brush.Color := $E8F8F0;
      gridMovimientos.Canvas.Font.Color := $0E6251;
    end
    else
    begin
      gridMovimientos.Canvas.Brush.Color := $EBF5FB;
      gridMovimientos.Canvas.Font.Color := $1B4F72;
    end;
    gridMovimientos.Canvas.FillRect(aRect);
    gridMovimientos.Canvas.TextOut(aRect.Left + 4, aRect.Top + 2, Texto);
  end;
end;

procedure TfrmCaja.btnRefrescarClick(Sender: TObject);
begin
  CargarCaja;
end;

procedure TfrmCaja.btnCierreCajaClick(Sender: TObject);
begin
  frmCierreCaja := TfrmCierreCaja.Create(Self);
  try
    frmCierreCaja.ConfigurarCierre(FMovimientos, FTotalEfectivo, FTotalDigital);
    if frmCierreCaja.ShowModal = mrOk then
      CargarCaja;
  finally
    frmCierreCaja.Free;
  end;
end;

procedure TfrmCaja.btnImprimirCierreClick(Sender: TObject);
var
  RutaPdf: string;
begin
  RutaPdf := ExtractFilePath(ParamStr(0)) + 'Cierre_Caja_' + FormatDateTime('yyyymmdd', Now) + '.pdf';
  GenerarCierreCajaPDF(FMovimientos, FTotalEfectivo, FTotalDigital, RutaPdf);
  ShowMessage('Reporte de Cierre de Caja generado en:' + sLineBreak + RutaPdf);
end;

end.
