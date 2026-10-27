unit uAfiliadosService;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, uDataModels, uBusinessRules, uSupabaseClient;

type
  { TAfiliadosService }
  TAfiliadosService = class
  public
    class function ObtenerTodos: TAfiliadoArray;
    class function ObtenerCuotas(const AAfiliadoId: string; Anio: Integer = 2026): TCuotaSeguroArray;
    class function RegistrarPagoCuota(const AAfiliadoId: string; Anio, NroCuota: Integer; AMonto: Currency; AMetodo: TMetodoPago; const ARecibo: string): Boolean;
    class function CrearAfiliado(const AAfiliado: TAfiliadoSeguro): Boolean;
    class function ActualizarAfiliado(const AId: string; const AAfiliado: TAfiliadoSeguro): Boolean;
    class function ActualizarCuotaMasiva(NuevoMonto: Currency; SoloActivos: Boolean = True): Boolean;
    class function EliminarAfiliado(const AId: string): Boolean;
  end;

implementation

{ TAfiliadosService }

class function TAfiliadosService.ObtenerTodos: TAfiliadoArray;
var
  JsonArr, CuotasArr: TJSONArray;
  Item, CuotaItem: TJSONObject;
  i, j, Total, TotalCuotas: Integer;
begin
  SetLength(Result, 0);
  JsonArr := Supabase.Select('afiliados_seguro', 'select=*,cuotas_seguro(anio,mes,estado_cuota)&order=numero_afiliado.asc');
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].NumeroAfiliado := Item.Get('numero_afiliado', 0);
      Result[i].TitularId := Item.Get('titular_id', '');
      Result[i].NombreCompleto := Item.Get('nombre_completo', '');
      Result[i].Dni := Item.Get('dni', '');
      Result[i].Telefono := Item.Get('telefono', '');
      Result[i].Email := Item.Get('email', '');
      Result[i].Facebook := Item.Get('facebook', '');
      Result[i].Instagram := Item.Get('instagram', '');
      Result[i].DireccionCobro := Item.Get('direccion_cobro', '');
      Result[i].ZonaCobro := Item.Get('zona_cobro', '');
      Result[i].CobradorAsignado := Item.Get('cobrador_asignado', '');
      Result[i].MontoCuotaMensual := Item.Get('monto_cuota_mensual', 18000.0);
      Result[i].Estado := StrToEstadoAfiliado(Item.Get('estado', 'activo'));
      Result[i].FechaAlta := Item.Get('fecha_alta', '');

      // Parse cuotas pagadas
      SetLength(Result[i].CuotasPagadas, 0);
      if Item.Find('cuotas_seguro') <> nil then
      begin
        if Item.Types['cuotas_seguro'] = jtArray then
        begin
          CuotasArr := Item.Arrays['cuotas_seguro'];
          TotalCuotas := CuotasArr.Count;
          for j := 0 to TotalCuotas - 1 do
          begin
            CuotaItem := TJSONObject(CuotasArr.Items[j]);
            if CuotaItem.Get('estado_cuota', '') = 'pagada' then
            begin
              SetLength(Result[i].CuotasPagadas, Length(Result[i].CuotasPagadas) + 1);
              Result[i].CuotasPagadas[High(Result[i].CuotasPagadas)] := CuotaItem.Get('mes', 0);
            end;
          end;
        end;
      end;

      // Calcular morosidad real segun reglas de negocio
      Result[i].MesesMora := EvaluarMoraAfiliado(Result[i]);
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TAfiliadosService.ObtenerCuotas(const AAfiliadoId: string; Anio: Integer): TCuotaSeguroArray;
var
  JsonArr, AfiArr: TJSONArray;
  Item: TJSONObject;
  i, Total: Integer;
  RealAfiliadoId, CleanNum: string;
begin
  SetLength(Result, 0);
  RealAfiliadoId := AAfiliadoId;
  if not IsValidUuid(RealAfiliadoId) then
  begin
    CleanNum := StringReplace(RealAfiliadoId, 'afi-', '', [rfIgnoreCase]);
    AfiArr := Supabase.Select('afiliados_seguro', 'numero_afiliado=eq.' + CleanNum + '&select=id');
    if (AfiArr <> nil) and (AfiArr.Count > 0) then
      RealAfiliadoId := TJSONObject(AfiArr.Items[0]).Get('id', RealAfiliadoId);
    if AfiArr <> nil then AfiArr.Free;
  end;

  if not IsValidUuid(RealAfiliadoId) then Exit;

  JsonArr := Supabase.Select('cuotas_seguro', Format('afiliado_id=eq.%s&anio=eq.%d&order=mes.asc', [RealAfiliadoId, Anio]));
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].AfiliadoId := Item.Get('afiliado_id', '');
      Result[i].Anio := Item.Get('anio', Anio);
      Result[i].NroCuota := Item.Get('mes', i + 1);
      Result[i].Monto := Item.Get('monto', 18000.0);
      if Item.Get('estado_cuota', '') = 'pagada' then
        Result[i].Estado := ecPagada
      else
        Result[i].Estado := ecPendiente;
      Result[i].FechaPago := Item.Get('fecha_pago', '');
      Result[i].MetodoPago := Item.Get('metodo_pago', '');
      Result[i].NroRecibo := Item.Get('nro_recibo', '');
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TAfiliadosService.RegistrarPagoCuota(const AAfiliadoId: string; Anio, NroCuota: Integer; AMonto: Currency; AMetodo: TMetodoPago; const ARecibo: string): Boolean;
var
  Data, Resp: TJSONObject;
  ExistingArr, AfiArr: TJSONArray;
  FechaHoy, RealAfiliadoId, CleanNum: string;
begin
  Result := False;
  FechaHoy := FormatDateTime('yyyy-mm-dd"T"hh:nn:ss"+00:00"', Now);

  RealAfiliadoId := AAfiliadoId;
  if not IsValidUuid(RealAfiliadoId) then
  begin
    CleanNum := StringReplace(RealAfiliadoId, 'afi-', '', [rfIgnoreCase]);
    AfiArr := Supabase.Select('afiliados_seguro', 'numero_afiliado=eq.' + CleanNum + '&select=id');
    if (AfiArr <> nil) and (AfiArr.Count > 0) then
      RealAfiliadoId := TJSONObject(AfiArr.Items[0]).Get('id', RealAfiliadoId);
    if AfiArr <> nil then AfiArr.Free;
  end;

  if not IsValidUuid(RealAfiliadoId) then Exit;

  ExistingArr := Supabase.Select('cuotas_seguro', Format('afiliado_id=eq.%s&anio=eq.%d&mes=eq.%d&select=id', [RealAfiliadoId, Anio, NroCuota]));
  Data := TJSONObject.Create;
  try
    Data.Add('monto', Double(AMonto));
    Data.Add('estado_cuota', 'pagada');
    Data.Add('fecha_pago', FechaHoy);
    Data.Add('metodo_pago', MetodoPagoToStr(AMetodo));
    Data.Add('nro_recibo', ARecibo);

    if (ExistingArr <> nil) and (ExistingArr.Count > 0) then
    begin
      Result := Supabase.Update('cuotas_seguro', 'id=eq.' + TJSONObject(ExistingArr.Items[0]).Get('id', ''), Data);
    end
    else
    begin
      Data.Add('afiliado_id', RealAfiliadoId);
      Data.Add('anio', Anio);
      Data.Add('mes', NroCuota);
      Resp := Supabase.Insert('cuotas_seguro', Data);
      if Resp <> nil then
      begin
        Result := True;
        Resp.Free;
      end;
    end;
  finally
    if ExistingArr <> nil then ExistingArr.Free;
    Data.Free;
  end;
end;

class function TAfiliadosService.CrearAfiliado(const AAfiliado: TAfiliadoSeguro): Boolean;
var
  Data, Resp: TJSONObject;
begin
  Result := False;
  Data := TJSONObject.Create;
  try
    Data.Add('numero_afiliado', AAfiliado.NumeroAfiliado);
    Data.Add('nombre_completo', AAfiliado.NombreCompleto);
    if AAfiliado.Dni <> '' then
    begin
      Data.Add('dni', AAfiliado.Dni);
      Data.Add('notas', 'DNI: ' + AAfiliado.Dni);
    end;
    if AAfiliado.Telefono <> '' then
      Data.Add('telefono', AAfiliado.Telefono);
    if AAfiliado.Email <> '' then
      Data.Add('email', AAfiliado.Email);
    if AAfiliado.Facebook <> '' then
      Data.Add('facebook', AAfiliado.Facebook);
    if AAfiliado.Instagram <> '' then
      Data.Add('instagram', AAfiliado.Instagram);
    Data.Add('direccion_cobro', AAfiliado.DireccionCobro);
    Data.Add('zona_cobro', AAfiliado.ZonaCobro);
    Data.Add('cobrador_asignado', AAfiliado.CobradorAsignado);
    Data.Add('monto_cuota_mensual', Double(AAfiliado.MontoCuotaMensual));
    Data.Add('estado', EstadoAfiliadoToStr(AAfiliado.Estado));
    if AAfiliado.FechaAlta <> '' then
      Data.Add('fecha_alta', AAfiliado.FechaAlta)
    else
      Data.Add('fecha_alta', FormatDateTime('yyyy-mm-dd', Now));

    Resp := Supabase.Insert('afiliados_seguro', Data);
    if (Resp = nil) and ((AAfiliado.Telefono <> '') or (AAfiliado.Email <> '') or (AAfiliado.Facebook <> '') or (AAfiliado.Instagram <> '')) then
    begin
      if Data.Find('telefono') <> nil then Data.Delete('telefono');
      if Data.Find('email') <> nil then Data.Delete('email');
      if Data.Find('facebook') <> nil then Data.Delete('facebook');
      if Data.Find('instagram') <> nil then Data.Delete('instagram');
      Resp := Supabase.Insert('afiliados_seguro', Data);
    end;
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

class function TAfiliadosService.ActualizarAfiliado(const AId: string; const AAfiliado: TAfiliadoSeguro): Boolean;
var
  Data: TJSONObject;
  Filter: string;
begin
  Result := False;
  if IsValidUuid(AId) then
    Filter := 'id=eq.' + AId
  else if AAfiliado.NumeroAfiliado > 0 then
    Filter := 'numero_afiliado=eq.' + IntToStr(AAfiliado.NumeroAfiliado)
  else if AId <> '' then
    Filter := 'numero_afiliado=eq.' + StringReplace(AId, 'afi-', '', [rfIgnoreCase])
  else
    Exit;

  Data := TJSONObject.Create;
  try
    Data.Add('numero_afiliado', AAfiliado.NumeroAfiliado);
    Data.Add('nombre_completo', AAfiliado.NombreCompleto);
    if AAfiliado.Dni <> '' then
    begin
      Data.Add('dni', AAfiliado.Dni);
      Data.Add('notas', 'DNI: ' + AAfiliado.Dni);
    end;
    if AAfiliado.Telefono <> '' then
      Data.Add('telefono', AAfiliado.Telefono);
    if AAfiliado.Email <> '' then
      Data.Add('email', AAfiliado.Email);
    if AAfiliado.Facebook <> '' then
      Data.Add('facebook', AAfiliado.Facebook);
    if AAfiliado.Instagram <> '' then
      Data.Add('instagram', AAfiliado.Instagram);
    Data.Add('direccion_cobro', AAfiliado.DireccionCobro);
    Data.Add('zona_cobro', AAfiliado.ZonaCobro);
    Data.Add('cobrador_asignado', AAfiliado.CobradorAsignado);
    Data.Add('monto_cuota_mensual', Double(AAfiliado.MontoCuotaMensual));
    Data.Add('estado', EstadoAfiliadoToStr(AAfiliado.Estado));

    Result := Supabase.Update('afiliados_seguro', Filter, Data);
    if (not Result) and ((AAfiliado.Telefono <> '') or (AAfiliado.Email <> '') or (AAfiliado.Facebook <> '') or (AAfiliado.Instagram <> '')) then
    begin
      if Data.Find('telefono') <> nil then Data.Delete('telefono');
      if Data.Find('email') <> nil then Data.Delete('email');
      if Data.Find('facebook') <> nil then Data.Delete('facebook');
      if Data.Find('instagram') <> nil then Data.Delete('instagram');
      Result := Supabase.Update('afiliados_seguro', Filter, Data);
    end;
  finally
    Data.Free;
  end;
end;

class function TAfiliadosService.ActualizarCuotaMasiva(NuevoMonto: Currency; SoloActivos: Boolean = True): Boolean;
var
  Data: TJSONObject;
  Filter: string;
begin
  Result := False;
  if NuevoMonto <= 0 then Exit;
  Data := TJSONObject.Create;
  try
    Data.Add('monto_cuota_mensual', Double(NuevoMonto));
    if SoloActivos then
      Filter := 'estado=neq.baja'
    else
      Filter := 'id=neq.00000000-0000-0000-0000-000000000000';
    Result := Supabase.Update('afiliados_seguro', Filter, Data);
  finally
    Data.Free;
  end;
end;

class function TAfiliadosService.EliminarAfiliado(const AId: string): Boolean;
var
  Filter, RealId, CleanNum: string;
  AfiArr: TJSONArray;
begin
  Result := False;
  if AId = '' then Exit;
  RealId := AId;
  if IsValidUuid(AId) then
    Filter := 'id=eq.' + AId
  else
  begin
    CleanNum := StringReplace(AId, 'afi-', '', [rfIgnoreCase]);
    Filter := 'numero_afiliado=eq.' + CleanNum;
    AfiArr := Supabase.Select('afiliados_seguro', Filter + '&select=id');
    if (AfiArr <> nil) and (AfiArr.Count > 0) then
      RealId := TJSONObject(AfiArr.Items[0]).Get('id', '');
    if AfiArr <> nil then AfiArr.Free;
  end;

  if IsValidUuid(RealId) then
    Supabase.Delete('cuotas_seguro', 'afiliado_id=eq.' + RealId);

  Result := Supabase.Delete('afiliados_seguro', Filter);
end;

end.
