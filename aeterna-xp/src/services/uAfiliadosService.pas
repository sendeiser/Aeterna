unit uAfiliadosService;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, uDataModels, uSupabaseClient;

type
  { TAfiliadosService }
  TAfiliadosService = class
  public
    class function ObtenerTodos: TAfiliadoArray;
    class function ObtenerCuotas(const AAfiliadoId: string; Anio: Integer = 2026): TCuotaSeguroArray;
    class function RegistrarPagoCuota(const AAfiliadoId: string; Anio, NroCuota: Integer; AMonto: Currency; AMetodo: TMetodoPago; const ARecibo: string): Boolean;
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
  JsonArr := Supabase.Select('afiliados_seguro', 'select=*,cuotas_seguro(anio,nro_cuota,estado)&order=numero_afiliado.asc');
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
            if CuotaItem.Get('estado', '') = 'pagada' then
            begin
              SetLength(Result[i].CuotasPagadas, Length(Result[i].CuotasPagadas) + 1);
              Result[i].CuotasPagadas[High(Result[i].CuotasPagadas)] := CuotaItem.Get('nro_cuota', 0);
            end;
          end;
        end;
      end;
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TAfiliadosService.ObtenerCuotas(const AAfiliadoId: string; Anio: Integer): TCuotaSeguroArray;
var
  JsonArr: TJSONArray;
  Item: TJSONObject;
  i, Total: Integer;
begin
  SetLength(Result, 0);
  JsonArr := Supabase.Select('cuotas_seguro', Format('afiliado_id=eq.%s&anio=eq.%d&order=nro_cuota.asc', [AAfiliadoId, Anio]));
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
      Result[i].NroCuota := Item.Get('nro_cuota', i + 1);
      Result[i].Monto := Item.Get('monto', 18000.0);
      if Item.Get('estado', '') = 'pagada' then
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
  FechaHoy: string;
begin
  Result := False;
  FechaHoy := FormatDateTime('yyyy-mm-dd', Now);
  Data := TJSONObject.Create;
  try
    Data.Add('afiliado_id', AAfiliadoId);
    Data.Add('anio', Anio);
    Data.Add('nro_cuota', NroCuota);
    Data.Add('monto', Double(AMonto));
    Data.Add('estado', 'pagada');
    Data.Add('fecha_pago', FechaHoy);
    Data.Add('metodo_pago', MetodoPagoToStr(AMetodo));
    Data.Add('nro_recibo', ARecibo);

    Resp := Supabase.Insert('cuotas_seguro', Data);
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
