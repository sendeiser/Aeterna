unit fCierreCaja;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,
  ExtCtrls, uDataModels, uBusinessRules;

type
  { TfrmCierreCaja }
  TfrmCierreCaja = class(TForm)
    pnlHeader: TPanel;
    lblTitulo: TLabel;
    lblFechaCierre: TLabel;

    gbEsperado: TGroupBox;
    lblEfvoSisTit: TLabel;
    lblEfvoSisVal: TLabel;
    lblDigSisTit: TLabel;
    lblDigSisVal: TLabel;
    lblTotalSisTit: TLabel;
    lblTotalSisVal: TLabel;

    gbArqueo: TGroupBox;
    lblEfvoRealTit: TLabel;
    edtEfvoReal: TEdit;
    lblDiferenciaTit: TLabel;
    lblDiferenciaVal: TLabel;
    lblObservaciones: TLabel;
    memoObservaciones: TMemo;

    btnConfirmar: TButton;
    btnCancelar: TButton;

    procedure FormCreate(Sender: TObject);
    procedure edtEfvoRealChange(Sender: TObject);
    procedure btnConfirmarClick(Sender: TObject);
  private
    FMovimientos: TPagoArray;
    FTotalEfectivoSis: Currency;
    FTotalDigitalSis: Currency;
    procedure CalcularDiferencia;
  public
    procedure ConfigurarCierre(const AMovimientos: TPagoArray; ATotalEf, ATotalDig: Currency);
  end;

var
  frmCierreCaja: TfrmCierreCaja;

implementation

uses
  uReportsPDF;

{$R *.lfm}

{ TfrmCierreCaja }

procedure TfrmCierreCaja.FormCreate(Sender: TObject);
begin
  lblFechaCierre.Caption := 'Fecha de Cierre: ' + FormatDateTime('dd/mm/yyyy hh:nn', Now);
end;

procedure TfrmCierreCaja.ConfigurarCierre(const AMovimientos: TPagoArray; ATotalEf, ATotalDig: Currency);
begin
  FMovimientos := AMovimientos;
  FTotalEfectivoSis := ATotalEf;
  FTotalDigitalSis := ATotalDig;

  lblEfvoSisVal.Caption := FormatearMoneda(FTotalEfectivoSis);
  lblDigSisVal.Caption := FormatearMoneda(FTotalDigitalSis);
  lblTotalSisVal.Caption := FormatearMoneda(FTotalEfectivoSis + FTotalDigitalSis);

  edtEfvoReal.Text := FloatToStr(Double(FTotalEfectivoSis));
  CalcularDiferencia;
end;

procedure TfrmCierreCaja.CalcularDiferencia;
var
  EfvoReal, Diferencia: Currency;
begin
  EfvoReal := StrToCurrDef(edtEfvoReal.Text, 0);
  Diferencia := EfvoReal - FTotalEfectivoSis;

  if Diferencia = 0 then
  begin
    lblDiferenciaVal.Caption := 'Exacto ($ 0)';
    lblDiferenciaVal.Font.Color := 32768;
  end
  else if Diferencia > 0 then
  begin
    lblDiferenciaVal.Caption := 'Sobrante: +' + FormatearMoneda(Diferencia);
    lblDiferenciaVal.Font.Color := 9384704;
  end
  else
  begin
    lblDiferenciaVal.Caption := 'Faltante: -' + FormatearMoneda(Abs(Diferencia));
    lblDiferenciaVal.Font.Color := clMaroon;
  end;
end;

procedure TfrmCierreCaja.edtEfvoRealChange(Sender: TObject);
begin
  CalcularDiferencia;
end;

procedure TfrmCierreCaja.btnConfirmarClick(Sender: TObject);
var
  RutaPdf: string;
begin
  RutaPdf := ExtractFilePath(ParamStr(0)) + 'Cierre_Caja_' + FormatDateTime('yyyymmdd_hhnn', Now) + '.pdf';
  GenerarCierreCajaPDF(FMovimientos, FTotalEfectivoSis, FTotalDigitalSis, RutaPdf);

  ShowMessage('Cierre de caja completado exitosamente.' + sLineBreak +
    'Acta de arqueo generada en:' + sLineBreak + RutaPdf);

  ModalResult := mrOk;
end;

end.
