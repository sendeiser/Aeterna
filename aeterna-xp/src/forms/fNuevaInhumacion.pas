unit fNuevaInhumacion;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,
  ExtCtrls, uDataModels, uInhumacionesService, uParcelasService;

type
  { TfrmNuevaInhumacion }
  TfrmNuevaInhumacion = class(TForm)
    pnlHeader: TPanel;
    lblTitulo: TLabel;
    gbDifunto: TGroupBox;
    lblNombreDifunto: TLabel;
    edtNombreDifunto: TEdit;
    lblDniDifunto: TLabel;
    edtDniDifunto: TEdit;
    lblFechaFallecimiento: TLabel;
    edtFechaFallecimiento: TEdit;
    lblFechaInhumacion: TLabel;
    edtFechaInhumacion: TEdit;

    gbUbicacion: TGroupBox;
    lblParcela: TLabel;
    cbParcelas: TComboBox;
    lblNivel: TLabel;
    cbNivel: TComboBox;
    chkCovid: TCheckBox;

    gbProtocolo: TGroupBox;
    lblCausa: TLabel;
    edtCausa: TEdit;
    lblEmpresa: TLabel;
    edtEmpresa: TEdit;
    lblResponsable: TLabel;
    edtResponsable: TEdit;
    lblTelefono: TLabel;
    edtTelefono: TEdit;

    btnGuardar: TButton;
    btnCancelar: TButton;

    procedure FormCreate(Sender: TObject);
    procedure btnGuardarClick(Sender: TObject);
  private
    FParcelasDisponibles: TParcelaArray;
    procedure CargarListaParcelas;
  public
  end;

var
  frmNuevaInhumacion: TfrmNuevaInhumacion;

implementation

{$R *.lfm}

{ TfrmNuevaInhumacion }

procedure TfrmNuevaInhumacion.FormCreate(Sender: TObject);
begin
  edtFechaInhumacion.Text := FormatDateTime('yyyy-mm-dd', Now);
  edtFechaFallecimiento.Text := FormatDateTime('yyyy-mm-dd', Now);
  CargarListaParcelas;
end;

procedure TfrmNuevaInhumacion.CargarListaParcelas;
var
  i: Integer;
begin
  cbParcelas.Items.Clear;
  FParcelasDisponibles := TParcelasService.ObtenerTodas;
  for i := Low(FParcelasDisponibles) to High(FParcelasDisponibles) do
  begin
    cbParcelas.Items.AddObject(FParcelasDisponibles[i].Nomenclatura + ' (' +
      FParcelasDisponibles[i].SectorId + ')', TObject(IntPtr(i)));
  end;
  if cbParcelas.Items.Count > 0 then
    cbParcelas.ItemIndex := 0;
end;

procedure TfrmNuevaInhumacion.btnGuardarClick(Sender: TObject);
var
  Inh: TInhumacion;
  SelIdx, PIdx: Integer;
begin
  if Trim(edtNombreDifunto.Text) = '' then
  begin
    ShowMessage('Por favor ingrese el nombre del difunto.');
    edtNombreDifunto.SetFocus;
    Exit;
  end;

  SelIdx := cbParcelas.ItemIndex;
  if SelIdx < 0 then
  begin
    ShowMessage('Por favor seleccione una parcela.');
    cbParcelas.SetFocus;
    Exit;
  end;

  PIdx := Integer(IntPtr(cbParcelas.Items.Objects[SelIdx]));
  FillChar(Inh, SizeOf(Inh), 0);
  Inh.NombreDifunto := Trim(edtNombreDifunto.Text);
  Inh.DniDifunto := Trim(edtDniDifunto.Text);
  Inh.FechaFallecimiento := Trim(edtFechaFallecimiento.Text);
  Inh.FechaInhumacion := Trim(edtFechaInhumacion.Text);
  Inh.ParcelaId := FParcelasDisponibles[PIdx].Id;
  Inh.NomenclaturaParcela := FParcelasDisponibles[PIdx].Nomenclatura;
  Inh.NivelPosicion := StrToIntDef(cbNivel.Text, 1);
  Inh.EsCovid := chkCovid.Checked;
  Inh.CausaDefuncion := Trim(edtCausa.Text);
  Inh.EmpresaFunebrera := Trim(edtEmpresa.Text);
  Inh.NombreResponsable := Trim(edtResponsable.Text);
  Inh.TelefonoResponsable := Trim(edtTelefono.Text);

  Screen.Cursor := crHourGlass;
  try
    if TInhumacionesService.CrearInhumacion(Inh) then
    begin
      ShowMessage('Inhumacion registrada exitosamente en Supabase.');
      ModalResult := mrOk;
    end
    else
      ShowMessage('Error al guardar la inhumacion en el servidor.');
  finally
    Screen.Cursor := crDefault;
  end;
end;

end.
