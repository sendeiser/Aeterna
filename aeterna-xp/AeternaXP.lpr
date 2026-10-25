program AeternaXP;

{$mode objfpc}{$H+}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Interfaces, // LCL widgetset
  Forms,
  uConfig in 'src/core/uConfig.pas',
  uSynapseHttp in 'src/core/uSynapseHttp.pas',
  uDataModels in 'src/core/uDataModels.pas',
  uBusinessRules in 'src/core/uBusinessRules.pas',
  uSupabaseClient in 'src/core/uSupabaseClient.pas',
  uParcelasService in 'src/services/uParcelasService.pas',
  uInhumacionesService in 'src/services/uInhumacionesService.pas',
  uAfiliadosService in 'src/services/uAfiliadosService.pas',
  uCajaService in 'src/services/uCajaService.pas',
  uReportsPDF in 'src/reports/uReportsPDF.pas',
  fMain in 'src/forms/fMain.pas',
  fParcelas in 'src/forms/fParcelas.pas',
  fDetalleParcela in 'src/forms/fDetalleParcela.pas',
  fInhumaciones in 'src/forms/fInhumaciones.pas',
  fNuevaInhumacion in 'src/forms/fNuevaInhumacion.pas',
  fAfiliados in 'src/forms/fAfiliados.pas',
  fCobranzaCuota in 'src/forms/fCobranzaCuota.pas',
  fCaja in 'src/forms/fCaja.pas',
  fCierreCaja in 'src/forms/fCierreCaja.pas';

{$R *.res}

begin
  RequireDerivedFormResource := True;
  Application.Scaled := True;
  Application.Title := 'Aeterna - Gestion Funeraria y Cementerio Parque San Nicolas';
  Application.Initialize;
  Application.CreateForm(TfrmMain, frmMain);
  Application.Run;
end.
