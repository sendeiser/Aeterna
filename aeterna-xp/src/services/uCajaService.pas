unit uCajaService;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, uDataModels, uSupabaseClient;

type
  { TCajaService }
  TCajaService = class
  public
    class function ObtenerMovimientosHoy: TPagoArray;
    class function RegistrarPago(const ARecibo, AParcelaId, ATitularId, ATitularNombre, AConcepto: string; AMonto: Currency; AMetodo: TMetodoPago; const AOperador, APeriodo: string): Boolean;
    class function CalcularTotalesHoy(out TotalEfectivo, TotalDigital: Currency): Currency;
  end;

implementation

{ TCajaService }

class function TCajaService.ObtenerMovimientosHoy: TPagoArray;
var
  JsonArr: TJSONArray;
  Item, TitularObj: TJSONObject;
  i, Total: Integer;
  FechaHoy: string;
begin
  SetLength(Result, 0);
  FechaHoy := FormatDateTime('yyyy-mm-dd', Now);

  JsonArr := Supabase.Select('pagos_mantenimiento', Format('fecha_pago=gte.%sT00:00:00&select=*,titular:titulares(nombre_completo)&order=fecha_pago.desc', [FechaHoy]));
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].NroRecibo := Item.Get('nro_recibo', '');
      Result[i].ParcelaId := Item.Get('parcela_id', '');
      Result[i].TitularId := Item.Get('titular_id', '');
      Result[i].Concepto := 'Mantenimiento de Parcela';
      Result[i].MontoPagado := Item.Get('monto_pagado', 0.0);
      Result[i].PeriodoCubierto := Item.Get('periodo_cubierto', '');
      Result[i].MetodoPago := StrToMetodoPago(Item.Get('metodo_pago', 'efectivo'));
      Result[i].OperadorNombre := Item.Get('operador_nombre', '');
      Result[i].FechaPago := Item.Get('fecha_pago', '');
      Result[i].Observaciones := Item.Get('observaciones', '');

      Result[i].TitularNombre := '';
      if Item.Find('titular') <> nil then
      begin
        if Item.Types['titular'] = jtObject then
        begin
          TitularObj := Item.Objects['titular'];
          Result[i].TitularNombre := TitularObj.Get('nombre_completo', '');
        end;
      end;
    end;
  finally
    JsonArr.Free;
  end;
end;

class function TCajaService.RegistrarPago(const ARecibo, AParcelaId, ATitularId, ATitularNombre, AConcepto: string; AMonto: Currency; AMetodo: TMetodoPago; const AOperador, APeriodo: string): Boolean;
var
  Data, Resp: TJSONObject;
  FechaAhora: string;
begin
  Result := False;
  FechaAhora := FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Now);
  Data := TJSONObject.Create;
  try
    Data.Add('nro_recibo', ARecibo);
    Data.Add('parcela_id', AParcelaId);
    Data.Add('titular_id', ATitularId);
    Data.Add('monto_pagado', Double(AMonto));
    Data.Add('periodo_cubierto', APeriodo);
    Data.Add('metodo_pago', MetodoPagoToStr(AMetodo));
    Data.Add('operador_nombre', AOperador);
    Data.Add('fecha_pago', FechaAhora);
    Data.Add('observaciones', AConcepto);

    Resp := Supabase.Insert('pagos_mantenimiento', Data);
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

class function TCajaService.CalcularTotalesHoy(out TotalEfectivo, TotalDigital: Currency): Currency;
var
  Movimientos: TPagoArray;
  i: Integer;
begin
  TotalEfectivo := 0;
  TotalDigital := 0;
  Result := 0;

  Movimientos := ObtenerMovimientosHoy;
  for i := Low(Movimientos) to High(Movimientos) do
  begin
    if Movimientos[i].MetodoPago = mpEfectivo then
      TotalEfectivo := TotalEfectivo + Movimientos[i].MontoPagado
    else
      TotalDigital := TotalDigital + Movimientos[i].MontoPagado;
  end;

  Result := TotalEfectivo + TotalDigital;
end;

end.
