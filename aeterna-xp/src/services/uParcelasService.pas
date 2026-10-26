unit uParcelasService;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, uDataModels, uSupabaseClient;

type
  { TParcelasService }
  TParcelasService = class
  public
    class function ObtenerTodas(const ASector: string = ''): TParcelaArray;
    class function ObtenerPorId(const AId: string; out AParcela: TParcela): Boolean;
    class function ActualizarEstado(const AId: string; AEstado: TEstadoParcela; ASaldo: Currency): Boolean;
    class function CrearParcela(const AParcela: TParcela): Boolean;
    class function ActualizarParcela(const AId: string; const AParcela: TParcela; const AOriginalNomenclatura: string = ''): Boolean;
    class function EliminarParcela(const AId: string): Boolean;
  end;

implementation

{ TParcelasService }

class function TParcelasService.ObtenerTodas(const ASector: string): TParcelaArray;
var
  JsonArr: TJSONArray;
  Item: TJSONObject;
  TitularObj: TJSONObject;
  i, Total: Integer;
  Query: string;
begin
  SetLength(Result, 0);
  Query := 'select=id,nomenclatura,sector_id,manzana_fila,numero_parcela,capacidad_total,espacios_ocupados,estado,saldo_mantenimiento,fecha_adquisicion,created_at,notas,titular:titulares(id,nombre_completo,dni)&order=nomenclatura.asc';

  if ASector <> '' then
    Query := Query + '&sector_id=eq.' + ASector;

  JsonArr := Supabase.Select('parcelas', Query);
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].Nomenclatura := Item.Get('nomenclatura', '');
      Result[i].SectorId := Item.Get('sector_id', '');
      Result[i].ManzanaFila := Item.Get('manzana_fila', '');
      Result[i].NumeroParcela := Item.Get('numero_parcela', '');
      Result[i].CapacidadTotal := Item.Get('capacidad_total', 3);
      Result[i].EspaciosOcupados := Item.Get('espacios_ocupados', 0);
      Result[i].Estado := StrToEstadoParcela(Item.Get('estado', 'disponible'));
      Result[i].SaldoMantenimiento := Item.Get('saldo_mantenimiento', 0.0);
      if (Result[i].Estado = epEnMora) and (Result[i].SaldoMantenimiento >= 100000) then
        Result[i].Estado := epStandby;
      Result[i].FechaAdquisicion := Item.Get('fecha_adquisicion', '');
      Result[i].FechaUltimoPago := Item.Get('fecha_ultimo_pago', '');
      Result[i].UltimaCuotaPagada := Item.Get('ultima_cuota_pagada', '');
      Result[i].MotivoBloqueo := Item.Get('motivo_bloqueo', '');
      Result[i].CreatedAt := Item.Get('created_at', '');
      Result[i].Notas := Item.Get('notas', '');

      Result[i].TitularNombre := '';
      Result[i].TitularDni := '';
      Result[i].TitularId := '';
      Result[i].TitularEstadoVital := 'vivo';
      if Item.Find('titular') <> nil then
      begin
        if Item.Types['titular'] = jtObject then
        begin
          TitularObj := Item.Objects['titular'];
          Result[i].TitularId := TitularObj.Get('id', '');
          Result[i].TitularNombre := TitularObj.Get('nombre_completo', '');
          Result[i].TitularDni := TitularObj.Get('dni', '');
          Result[i].TitularEstadoVital := TitularObj.Get('estado_vital', '');
          if Result[i].TitularEstadoVital = '' then
            Result[i].TitularEstadoVital := TitularObj.Get('estado_titular', 'vivo');
        end;
      end;
      if (Result[i].TitularNombre = '') and (Pos('Titular:', Result[i].Notas) > 0) then
      begin
        Result[i].TitularNombre := Copy(Result[i].Notas, Pos('Titular:', Result[i].Notas) + 8, Length(Result[i].Notas));
        if Pos('.', Result[i].TitularNombre) > 0 then
          Result[i].TitularNombre := Copy(Result[i].TitularNombre, 1, Pos('.', Result[i].TitularNombre) - 1);
        Result[i].TitularNombre := Trim(Result[i].TitularNombre);
      end;
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TParcelasService.ObtenerPorId(const AId: string; out AParcela: TParcela): Boolean;
var
  JsonArr: TJSONArray;
  Item: TJSONObject;
begin
  Result := False;
  FillChar(AParcela, SizeOf(AParcela), 0);

  JsonArr := Supabase.Select('parcelas', 'id=eq.' + AId + '&select=*,titular:titulares(*)');
  if (JsonArr <> nil) and (JsonArr.Count > 0) then
  begin
    try
      Item := TJSONObject(JsonArr.Items[0]);
      AParcela.Id := Item.Get('id', '');
      AParcela.Nomenclatura := Item.Get('nomenclatura', '');
      AParcela.SectorId := Item.Get('sector_id', '');
      AParcela.ManzanaFila := Item.Get('manzana_fila', '');
      AParcela.NumeroParcela := Item.Get('numero_parcela', '');
      AParcela.CapacidadTotal := Item.Get('capacidad_total', 3);
      AParcela.EspaciosOcupados := Item.Get('espacios_ocupados', 0);
      AParcela.Estado := StrToEstadoParcela(Item.Get('estado', 'disponible'));
      AParcela.SaldoMantenimiento := Item.Get('saldo_mantenimiento', 0.0);
      if (AParcela.Estado = epEnMora) and (AParcela.SaldoMantenimiento >= 100000) then
        AParcela.Estado := epStandby;
      AParcela.FechaAdquisicion := Item.Get('fecha_adquisicion', '');
      AParcela.FechaUltimoPago := Item.Get('fecha_ultimo_pago', '');
      AParcela.UltimaCuotaPagada := Item.Get('ultima_cuota_pagada', '');
      AParcela.MotivoBloqueo := Item.Get('motivo_bloqueo', '');
      AParcela.Notas := Item.Get('notas', '');
      Result := True;
    finally
      JsonArr.Free;
    end;
  end;
end;

class function TParcelasService.ActualizarEstado(const AId: string; AEstado: TEstadoParcela; ASaldo: Currency): Boolean;
var
  Data: TJSONObject;
  Filter: string;
begin
  if IsValidUuid(AId) then
    Filter := 'id=eq.' + AId
  else
    Filter := 'nomenclatura=eq.' + AId;

  Data := TJSONObject.Create;
  try
    Data.Add('estado', EstadoParcelaToStr(AEstado));
    Data.Add('saldo_mantenimiento', Double(ASaldo));
    Result := Supabase.Update('parcelas', Filter, Data);
  finally
    Data.Free;
  end;
end;

class function TParcelasService.CrearParcela(const AParcela: TParcela): Boolean;
var
  Data, Resp, TitData, TitResp: TJSONObject;
  NotasFinales, NewTitId: string;
begin
  Result := False;
  NewTitId := '';
  NotasFinales := AParcela.Notas;

  if Trim(AParcela.TitularNombre) <> '' then
  begin
    if Pos(AParcela.TitularNombre, NotasFinales) = 0 then
    begin
      if NotasFinales <> '' then
        NotasFinales := 'Titular: ' + AParcela.TitularNombre + '. ' + NotasFinales
      else
        NotasFinales := 'Titular: ' + AParcela.TitularNombre;
    end;

    // Crear registro en tabla titulares de Supabase
    TitData := TJSONObject.Create;
    try
      TitData.Add('nombre_completo', AParcela.TitularNombre);
      if AParcela.TitularDni <> '' then
        TitData.Add('dni', AParcela.TitularDni);
      TitData.Add('ciudad', 'Chamical');
      TitData.Add('estado_titular', 'activo');
      TitResp := Supabase.Insert('titulares', TitData);
      if TitResp <> nil then
      begin
        NewTitId := TitResp.Get('id', '');
        TitResp.Free;
      end;
    finally
      TitData.Free;
    end;
  end;

  Data := TJSONObject.Create;
  try
    Data.Add('nomenclatura', AParcela.Nomenclatura);
    Data.Add('sector_id', AParcela.SectorId);
    Data.Add('manzana_fila', AParcela.ManzanaFila);
    Data.Add('numero_parcela', AParcela.NumeroParcela);
    Data.Add('capacidad_total', AParcela.CapacidadTotal);
    Data.Add('espacios_ocupados', AParcela.EspaciosOcupados);
    Data.Add('estado', EstadoParcelaToStr(AParcela.Estado));
    Data.Add('saldo_mantenimiento', Double(AParcela.SaldoMantenimiento));
    if NewTitId <> '' then
      Data.Add('titular_id', NewTitId);
    if AParcela.FechaAdquisicion <> '' then
      Data.Add('fecha_adquisicion', AParcela.FechaAdquisicion)
    else
      Data.Add('fecha_adquisicion', FormatDateTime('yyyy-mm-dd', Now));
    if NotasFinales <> '' then
      Data.Add('notas', NotasFinales);
    Resp := Supabase.Insert('parcelas', Data);
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

class function TParcelasService.ActualizarParcela(const AId: string; const AParcela: TParcela; const AOriginalNomenclatura: string = ''): Boolean;
var
  Data, TitData, TitResp: TJSONObject;
  Filter, NotasFinales, NewTitId: string;
begin
  Result := False;
  if IsValidUuid(AId) then
    Filter := 'id=eq.' + AId
  else if AOriginalNomenclatura <> '' then
    Filter := 'nomenclatura=eq.' + AOriginalNomenclatura
  else if AParcela.Nomenclatura <> '' then
    Filter := 'nomenclatura=eq.' + AParcela.Nomenclatura
  else if AId <> '' then
    Filter := 'nomenclatura=eq.' + AId
  else
    Exit;

  NotasFinales := AParcela.Notas;
  if (AParcela.TitularNombre <> '') and (Pos(AParcela.TitularNombre, NotasFinales) = 0) then
  begin
    if NotasFinales <> '' then
      NotasFinales := 'Titular: ' + AParcela.TitularNombre + '. ' + NotasFinales
    else
      NotasFinales := 'Titular: ' + AParcela.TitularNombre;
  end;

  NewTitId := AParcela.TitularId;
  // Actualizar titular en tabla titulares o crear nuevo
  if IsValidUuid(AParcela.TitularId) then
  begin
    if AParcela.TitularNombre <> '' then
    begin
      TitData := TJSONObject.Create;
      try
        TitData.Add('nombre_completo', AParcela.TitularNombre);
        if AParcela.TitularDni <> '' then
          TitData.Add('dni', AParcela.TitularDni);
        Supabase.Update('titulares', 'id=eq.' + AParcela.TitularId, TitData);
      finally
        TitData.Free;
      end;
    end;
  end
  else if Trim(AParcela.TitularNombre) <> '' then
  begin
    TitData := TJSONObject.Create;
    try
      TitData.Add('nombre_completo', AParcela.TitularNombre);
      if AParcela.TitularDni <> '' then
        TitData.Add('dni', AParcela.TitularDni);
      TitData.Add('ciudad', 'Chamical');
      TitData.Add('estado_titular', 'activo');
      TitResp := Supabase.Insert('titulares', TitData);
      if TitResp <> nil then
      begin
        NewTitId := TitResp.Get('id', '');
        TitResp.Free;
      end;
    finally
      TitData.Free;
    end;
  end;

  Data := TJSONObject.Create;
  try
    Data.Add('nomenclatura', AParcela.Nomenclatura);
    if AParcela.SectorId <> '' then
      Data.Add('sector_id', AParcela.SectorId);
    if AParcela.ManzanaFila <> '' then
      Data.Add('manzana_fila', AParcela.ManzanaFila);
    if AParcela.NumeroParcela <> '' then
      Data.Add('numero_parcela', AParcela.NumeroParcela);
    Data.Add('estado', EstadoParcelaToStr(AParcela.Estado));
    Data.Add('saldo_mantenimiento', Double(AParcela.SaldoMantenimiento));
    if NewTitId <> '' then
      Data.Add('titular_id', NewTitId)
    else if (AParcela.TitularNombre = '') and (AParcela.TitularId = '') then
      Data.Add('titular_id', TJSONNull.Create);
    if AParcela.FechaAdquisicion <> '' then
      Data.Add('fecha_adquisicion', AParcela.FechaAdquisicion);
    Data.Add('notas', NotasFinales);
    Result := Supabase.Update('parcelas', Filter, Data);
  finally
    Data.Free;
  end;
end;

class function TParcelasService.EliminarParcela(const AId: string): Boolean;
var
  Filter: string;
begin
  Result := False;
  if AId = '' then Exit;
  if IsValidUuid(AId) then
    Filter := 'id=eq.' + AId
  else
    Filter := 'nomenclatura=eq.' + AId;
  Result := Supabase.Delete('parcelas', Filter);
end;

end.
