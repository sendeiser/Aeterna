unit fCobranzaCuota;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,
  CheckLst, ExtCtrls, uDataModels, uBusinessRules, uAfiliadosService, uCajaService;

type
  { TfrmCobranzaCuota }
  TfrmCobranzaCuota = class(TForm)
    pnlHeader: TPanel;
    lblAfiliadoTit: TLabel;
    lblAfiliadoDetalle: TLabel;

    gbMeses: TGroupBox;
    clbMeses: TCheckListBox;
    lblTotal: TLabel;
    lblTotalVal: TLabel;

    gbPago: TGroupBox;
    lblMetodo: TLabel;
    cbMetodo: TComboBox;
    lblNroRecibo: TLabel;
    edtNroRecibo: TEdit;

    btnRegistrar: TButton;
    btnCancelar: TButton;

    procedure FormCreate(Sender: TObject);
    procedure clbMesesClickCheck(Sender: TObject);
    procedure btnRegistrarClick(Sender: TObject);
  private
    FAfiliado: TAfiliadoSeguro;
    procedure RecalcularTotal;
  public
    procedure CargarAfiliado(const AAfi: TAfiliadoSeguro);
  end;

var
  frmCobranzaCuota: TfrmCobranzaCuota;

implementation

uses
  uReportsPDF;

{$R *.lfm}

const
  NombresMeses: array[1..12] of string = (
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  );

{ TfrmCobranzaCuota }

procedure TfrmCobranzaCuota.FormCreate(Sender: TObject);
var
  m: Integer;
begin
  clbMeses.Items.Clear;
  for m := 1 to 12 do
    clbMeses.Items.Add(Format('%s (Cuota %d)', [NombresMeses[m], m]));

  cbMetodo.Items.Clear;
  cbMetodo.Items.Add('Efectivo');
  cbMetodo.Items.Add('Transferencia / QR');
  cbMetodo.ItemIndex := 0;

  edtNroRecibo.Text := 'REC-' + FormatDateTime('hhnnss', Now);
end;

procedure TfrmCobranzaCuota.CargarAfiliado(const AAfi: TAfiliadoSeguro);
var
  m, i: Integer;
  YaPagado: Boolean;
begin
  FAfiliado := AAfi;
  lblAfiliadoTit.Caption := Format('Afiliado #%d: %s', [FAfiliado.NumeroAfiliado, FAfiliado.NombreCompleto]);
  lblAfiliadoDetalle.Caption := Format('DNI: %s | Cuota Mensual: %s', [FAfiliado.Dni, FormatearMoneda(FAfiliado.MontoCuotaMensual)]);

  for m := 1 to 12 do
  begin
    YaPagado := False;
    for i := Low(FAfiliado.CuotasPagadas) to High(FAfiliado.CuotasPagadas) do
    begin
      if FAfiliado.CuotasPagadas[i] = m then
      begin
        YaPagado := True;
        Break;
      end;
    end;

    if YaPagado then
    begin
      clbMeses.ItemEnabled[m - 1] := False;
      clbMeses.Checked[m - 1] := True;
    end
    else
    begin
      clbMeses.ItemEnabled[m - 1] := True;
      // Por defecto marcar si es el proximo mes impago
      clbMeses.Checked[m - 1] := (m <= 10);
    end;
  end;

  RecalcularTotal;
end;

procedure TfrmCobranzaCuota.RecalcularTotal;
var
  m, CantidadPagar: Integer;
  TotalCobro: Currency;
begin
  CantidadPagar := 0;
  for m := 1 to 12 do
  begin
    if clbMeses.ItemEnabled[m - 1] and clbMeses.Checked[m - 1] then
      Inc(CantidadPagar);
  end;

  TotalCobro := CantidadPagar * FAfiliado.MontoCuotaMensual;
  lblTotalVal.Caption := Format('%s (%d cuota/s)', [FormatearMoneda(TotalCobro), CantidadPagar]);
end;

procedure TfrmCobranzaCuota.clbMesesClickCheck(Sender: TObject);
begin
  RecalcularTotal;
end;

procedure TfrmCobranzaCuota.btnRegistrarClick(Sender: TObject);
var
  m: Integer;
  Metodo: TMetodoPago;
  MesesPagadosStr: string;
  TotalCobrado: Currency;
  Cantidad: Integer;
begin
  Cantidad := 0;
  MesesPagadosStr := '';
  for m := 1 to 12 do
  begin
    if clbMeses.ItemEnabled[m - 1] and clbMeses.Checked[m - 1] then
    begin
      Inc(Cantidad);
      if MesesPagadosStr <> '' then MesesPagadosStr := MesesPagadosStr + ', ';
      MesesPagadosStr := MesesPagadosStr + NombresMeses[m];
    end;
  end;

  if Cantidad = 0 then
  begin
    ShowMessage('Seleccione al menos una cuota para cobrar.');
    Exit;
  end;

  if cbMetodo.ItemIndex = 1 then
    Metodo := mpTransferenciaQR
  else
    Metodo := mpEfectivo;

  TotalCobrado := Cantidad * FAfiliado.MontoCuotaMensual;

  Screen.Cursor := crHourGlass;
  try
    // 1. Asentar cuotas
    for m := 1 to 12 do
    begin
      if clbMeses.ItemEnabled[m - 1] and clbMeses.Checked[m - 1] then
      begin
        TAfiliadosService.RegistrarPagoCuota(FAfiliado.Id, 2026, m,
          FAfiliado.MontoCuotaMensual, Metodo, edtNroRecibo.Text);
      end;
    end;

    // 2. Asentar en Caja
    TCajaService.RegistrarPago(edtNroRecibo.Text, '', FAfiliado.TitularId,
      FAfiliado.NombreCompleto, 'Seguro Sepelio - ' + MesesPagadosStr,
      TotalCobrado, Metodo, 'Administrador', 'Cuotas 2026: ' + MesesPagadosStr);

    ShowMessage(Format('Cobranza de %d cuota(s) registrada exitosamente!' + sLineBreak +
      'Monto Total: %s' + sLineBreak + 'Recibo Nro: %s',
      [Cantidad, FormatearMoneda(TotalCobrado), edtNroRecibo.Text]));

    ModalResult := mrOk;
  finally
    Screen.Cursor := crDefault;
  end;
end;

end.
