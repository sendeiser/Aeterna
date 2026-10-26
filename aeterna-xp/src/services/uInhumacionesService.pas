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
    class function ActualizarInhumacion(const AId: string; const AInhumacion: TInhumacion): Boolean;
    class function EliminarInhumacion(const AId: string): Boolean;
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

      Result[i].NomenclaturaParcela := Item.Get('parcela_nomenclatura', '');
      if Result[i].NomenclaturaParcela = '' then
      begin
        if Item.Find('parcela') <> nil then
        begin
          if Item.Types['parcela'] = jtObject then
          begin
            ParcelaObj := Item.Objects['parcela'];
            Result[i].NomenclaturaParcela := ParcelaObj.Get('nomenclatura', '');
          end;
        end;
      end;
      if (Result[i].NomenclaturaParcela = '') and (Pos('Parcela asignada:', Result[i].Observaciones) > 0) then
      begin
        Result[i].NomenclaturaParcela := Trim(Copy(Result[i].Observaciones, Pos('Parcela asignada:', Result[i].Observaciones) + 17, 50));
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
  ParcArr: TJSONArray;
  ParcObj, ParcUpd: TJSONObject;
  ParcId: string;
begin
  Result := False;
  Data := TJSONObject.Create;
  try
    if (AInhumacion.ParcelaId = '') and (AInhumacion.NomenclaturaParcela <> '') then
    begin
      ParcArr := Supabase.Select('parcelas', 'nomenclatura=eq.' + AInhumacion.NomenclaturaParcela + '&select=id,capacidad_total,espacios_ocupados');
      if (ParcArr <> nil) and (ParcArr.Count > 0) then
      begin
        ParcObj := TJSONObject(ParcArr.Items[0]);
        ParcId := ParcObj.Get('id', '');
        if ParcId <> '' then
        begin
          Data.Add('parcela_id', ParcId);
          ParcUpd := TJSONObject.Create;
          try
            ParcUpd.Add('estado', 'ocupada');
            ParcUpd.Add('espacios_ocupados', ParcObj.Get('espacios_ocupados', 0) + 1);
            Supabase.Update('parcelas', 'id=eq.' + ParcId, ParcUpd);
          finally
            ParcUpd.Free;
          end;
        end;
      end;
      if ParcArr <> nil then ParcArr.Free;
    end
    else if AInhumacion.ParcelaId <> '' then
      Data.Add('parcela_id', AInhumacion.ParcelaId);

    if AInhumacion.NomenclaturaParcela <> '' then
      Data.Add('parcela_nomenclatura', AInhumacion.NomenclaturaParcela);
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
    Data.Add('responsable_contacto', AInhumacion.NombreResponsable);
    Data.Add('telefono_responsable', AInhumacion.TelefonoResponsable);
    if AInhumacion.NomenclaturaParcela <> '' then
      Data.Add('observaciones', 'Parcela asignada: ' + AInhumacion.NomenclaturaParcela)
    else
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

class function TInhumacionesService.ActualizarInhumacion(const AId: string; const AInhumacion: TInhumacion): Boolean;
var
  Data: TJSONObject;
  Filter: string;
begin
  Result := False;
  if (AId <> '') and (Pos('-', AId) > 0) then
    Filter := 'id=eq.' + AId
  else if AInhumacion.DniDifunto <> '' then
    Filter := 'dni_difunto=eq.' + AInhumacion.DniDifunto
  else if AInhumacion.NombreDifunto <> '' then
    Filter := 'nombre_difunto=eq.' + AInhumacion.NombreDifunto
  else
    Exit;

  Data := TJSONObject.Create;
  try
    if AInhumacion.ParcelaId <> '' then
      Data.Add('parcela_id', AInhumacion.ParcelaId);
    if AInhumacion.NomenclaturaParcela <> '' then
      Data.Add('parcela_nomenclatura', AInhumacion.NomenclaturaParcela);
    Data.Add('nombre_difunto', AInhumacion.NombreDifunto);
    Data.Add('dni_difunto', AInhumacion.DniDifunto);
    if AInhumacion.FechaFallecimiento <> '' then
      Data.Add('fecha_fallecimiento', AInhumacion.FechaFallecimiento);
    Data.Add('fecha_inhumacion', AInhumacion.FechaInhumacion);
    Data.Add('nivel_posicion', AInhumacion.NivelPosicion);
    Data.Add('es_covid', AInhumacion.EsCovid);
    Data.Add('causa_defuncion', AInhumacion.CausaDefuncion);
    Data.Add('empresa_funebrera', AInhumacion.EmpresaFunebrera);
    Data.Add('responsable_contacto', AInhumacion.NombreResponsable);
    Data.Add('telefono_responsable', AInhumacion.TelefonoResponsable);
    Data.Add('observaciones', AInhumacion.Observaciones);

    Result := Supabase.Update('inhumaciones', Filter, Data);
  finally
    Data.Free;
  end;
end;

class function TInhumacionesService.EliminarInhumacion(const AId: string): Boolean;
var
  Filter: string;
begin
  Result := False;
  if AId = '' then Exit;
  if Pos('-', AId) > 0 then
    Filter := 'id=eq.' + AId
  else
    Filter := 'nombre_difunto=eq.' + AId;
  Result := Supabase.Delete('inhumaciones', Filter);
end;

end.
