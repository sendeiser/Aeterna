unit fDetalleParcela;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,
  ExtCtrls, uDataModels, uBusinessRules, uParcelasService, uCajaService;

type
  { TfrmDetalleParcela }
  TfrmDetalleParcela = class(TForm)
    pnlHeader: TPanel;
    lblNomenclatura: TLabel;
    lblSector: TLabel;
    gbTitular: TGroupBox;
    lblTitularNombre: TLabel;
    edtTitularNombre: TEdit;
    lblTitularDni: TLabel;
    edtTitularDni: TEdit;
    gbEstado: TGroupBox;
    lblEstado: TLabel;
    cbEstado: TComboBox;
    lblSaldo: TLabel;
    edtSaldo: TEdit;
    lblUltimaCuota: TLabel;
    edtUltimaCuota: TEdit;
    gbNotas: TGroupBox;
    memoNotas: TMemo;
    btnCobrar: TButton;
    btnGuardar: TButton;
    btnCancelar: TButton;

    procedure FormCreate(Sender: TObject);
    procedure btnGuardarClick(Sender: TObject);
    procedure btnCobrarClick(Sender: TObject);
  private
    FParcela: TParcela;
  public
    procedure CargarParcela(const AParcela: TParcela);
  end;

var
  frmDetalleParcela: TfrmDetalleParcela;

implementation

{$R *.lfm}

{ TfrmDetalleParcela }

procedure TfrmDetalleParcela.FormCreate(Sender: TObject);
begin
  cbEstado.Items.Clear;
  cbEstado.Items.Add('disponible');
  cbEstado.Items.Add('ocupada');
  cbEstado.Items.Add('reservada');
  cbEstado.Items.Add('en_mora');
  cbEstado.Items.Add('standby');
end;

procedure TfrmDetalleParcela.CargarParcela(const AParcela: TParcela);
begin
  FParcela := AParcela;
  lblNomenclatura.Caption := 'Parcela ' + FParcela.Nomenclatura;
  lblSector.Caption := 'Sector: ' + FParcela.SectorId + ' | Capacidad: ' +
    Format('%d / %d espacios', [FParcela.EspaciosOcupados, FParcela.CapacidadTotal]);

  edtTitularNombre.Text := FParcela.TitularNombre;
  edtTitularDni.Text := FParcela.TitularDni;
  cbEstado.Text := EstadoParcelaToStr(FParcela.Estado);
  edtSaldo.Text := FloatToStr(Double(FParcela.SaldoMantenimiento));
  edtUltimaCuota.Text := FParcela.UltimaCuotaPagada;
  memoNotas.Text := FParcela.Notas;
end;

procedure TfrmDetalleParcela.btnGuardarClick(Sender: TObject);
var
  NuevoEstado: TEstadoParcela;
  NuevoSaldo: Currency;
begin
  NuevoEstado := StrToEstadoParcela(cbEstado.Text);
  NuevoSaldo := StrToCurrDef(edtSaldo.Text, 0);

  if TParcelasService.ActualizarEstado(FParcela.Id, NuevoEstado, NuevoSaldo) then
  begin
    ShowMessage('Parcela actualizada exitosamente.');
    ModalResult := mrOk;
  end
  else
    ShowMessage('Error al actualizar en Supabase.');
end;

procedure TfrmDetalleParcela.btnCobrarClick(Sender: TObject);
var
  MontoStr: string;
  Monto: Currency;
  ReciboNro: string;
begin
  MontoStr := InputBox('Cobro de Mantenimiento', 'Ingrese el monto abonado por el titular:', edtSaldo.Text);
  Monto := StrToCurrDef(MontoStr, 0);
  if Monto <= 0 then Exit;

  ReciboNro := FormatDateTime('yyyy-hhnnss', Now);
  if TCajaService.RegistrarPago(ReciboNro, FParcela.Id, FParcela.TitularId,
    FParcela.TitularNombre, 'Cobro Mantenimiento', Monto, mpEfectivo, 'Administrador', 'Cuota 2026') then
  begin
    // Descontar saldo
    if Monto >= FParcela.SaldoMantenimiento then
      TParcelasService.ActualizarEstado(FParcela.Id, epOcupada, 0)
    else
      TParcelasService.ActualizarEstado(FParcela.Id, FParcela.Estado, FParcela.SaldoMantenimiento - Monto);

    ShowMessage('Pago registrado exitosamente. Recibo Nro: ' + ReciboNro);
    ModalResult := mrOk;
  end
  else
    ShowMessage('Error al asentar el pago en caja.');
end;

end.
