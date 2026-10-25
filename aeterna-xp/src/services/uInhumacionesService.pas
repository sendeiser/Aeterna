unit uInhumacionesService;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, uDataModels, uSupabaseClient;

type
  { TInhumacionesService }
  TInhumacionesService = class
  public
    class function ObtenerTodas: TInhumacionArray;
    class function CrearInhumacion(const AInhumacion: TInhumacion): Boolean;
  end;

implementation

{ TInhumacionesService }

class function TInhumacionesService.ObtenerTodas: TInhumacionArray;
var
  JsonArr: TJSONArray;
  Item, ParcelaObj: TJSONObject;
  i, Total: Integer;
begin
  SetLength(Result, 0);
  JsonArr := Supabase.Select('inhumaciones', 'select=*,parcela:parcelas(nomenclatura)&order=fecha_inhumacion.desc');
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].ParcelaId := Item.Get('parcela_id', '');
      Result[i].NombreDifunto := Item.Get('nombre_difunto', '');
      Result[i].DniDifunto := Item.Get('dni_difunto', '');
      Result[i].FechaFallecimiento := Item.Get('fecha_fallecimiento', '');
      Result[i].FechaInhumacion := Item.Get('fecha_inhumacion', '');
      Result[i].NivelPosicion := Item.Get('nivel_posicion', 1);
      Result[i].EsCovid := Item.Get('es_covid', False);
      Result[i].CausaDefuncion := Item.Get('causa_defuncion', '');
      Result[i].EmpresaFunebrera := Item.Get('empresa_funebrera', '');
      Result[i].NombreResponsable := Item.Get('nombre_responsable', '');
      Result[i].TelefonoResponsable := Item.Get('telefono_responsable', '');
      Result[i].Observaciones := Item.Get('observaciones', '');

      Result[i].NomenclaturaParcela := '';
      if Item.Find('parcela') <> nil then
      begin
        if Item.Types['parcela'] = jtObject then
        begin
          ParcelaObj := Item.Objects['parcela'];
          Result[i].NomenclaturaParcela := ParcelaObj.Get('nomenclatura', '');
        end;
      end;
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TInhumacionesService.CrearInhumacion(const AInhumacion: TInhumacion): Boolean;
var
  Data: TJSONObject;
  Resp: TJSONObject;
begin
  Result := False;
  Data := TJSONObject.Create;
  try
    Data.Add('parcela_id', AInhumacion.ParcelaId);
    Data.Add('nombre_difunto', AInhumacion.NombreDifunto);
    if AInhumacion.DniDifunto <> '' then
      Data.Add('dni_difunto', AInhumacion.DniDifunto);
    if AInhumacion.FechaFallecimiento <> '' then
      Data.Add('fecha_fallecimiento', AInhumacion.FechaFallecimiento);
    Data.Add('fecha_inhumacion', AInhumacion.FechaInhumacion);
    Data.Add('nivel_posicion', AInhumacion.NivelPosicion);
    Data.Add('es_covid', AInhumacion.EsCovid);
    Data.Add('causa_defuncion', AInhumacion.CausaDefuncion);
    Data.Add('empresa_funebrera', AInhumacion.EmpresaFunebrera);
    Data.Add('nombre_responsable', AInhumacion.NombreResponsable);
    Data.Add('telefono_responsable', AInhumacion.TelefonoResponsable);
    Data.Add('observaciones', AInhumacion.Observaciones);

    Resp := Supabase.Insert('inhumaciones', Data);
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

end.
