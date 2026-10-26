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
    class function RegistrarEgreso(const AComprobante, AConcepto, ACategoria: string; AMonto: Currency; AMetodo: TMetodoPago; const AOperador: string): Boolean;
    class function EliminarPago(const AId: string): Boolean;
    class function CalcularTotalesHoy(out TotalEfectivo, TotalDigital: Currency): Currency;
    class procedure CalcularBalanceGeneral(out TotalIngresos, TotalEgresos, BalanceNeto: Currency);
  end;

implementation

{ TCajaService }

class function TCajaService.ObtenerMovimientosHoy: TPagoArray;
var
  JsonArr: TJSONArray;
  Item: TJSONObject;
  i, Total: Integer;
begin
  SetLength(Result, 0);

  // Obtener asientos de caja y recibos en orden cronologico inverso
  JsonArr := Supabase.Select('pagos_recibos', 'order=fecha_pago.desc&limit=300');
  if JsonArr = nil then Exit;

  try
    Total := JsonArr.Count;
    SetLength(Result, Total);
    for i := 0 to Total - 1 do
    begin
      Item := TJSONObject(JsonArr.Items[i]);
      Result[i].Id := Item.Get('id', '');
      Result[i].NroRecibo := Item.Get('numero_recibo', '');
      if Result[i].NroRecibo = '' then
        Result[i].NroRecibo := Item.Get('nro_recibo', '');
      Result[i].ParcelaId := '';
      Result[i].TitularId := '';
      Result[i].Concepto := Item.Get('concepto', 'Cobro General');
      Result[i].MontoPagado := Item.Get('monto', 0.0);
      if Result[i].MontoPagado = 0 then
        Result[i].MontoPagado := Item.Get('monto_pagado', 0.0);
      Result[i].PeriodoCubierto := 'Periodo Vigente';
      Result[i].MetodoPago := StrToMetodoPago(Item.Get('metodo_pago', 'transferencia_qr'));
      Result[i].OperadorNombre := 'Administracion General';
      Result[i].FechaPago := Item.Get('fecha_pago', '');
      Result[i].Observaciones := Result[i].Concepto;
      Result[i].TitularNombre := Item.Get('titular_paga', 'Contribuyente General');

      if (Item.Get('tipo', '') = 'egreso') or (Pos('[EGRESO]', Result[i].Concepto) > 0) then
        Result[i].TipoMovimiento := tmcEgreso
      else
        Result[i].TipoMovimiento := tmcIngreso;
      Result[i].Categoria := Item.Get('categoria', '');
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
    Data.Add('numero_recibo', ARecibo);
    Data.Add('monto', Double(AMonto));
    Data.Add('metodo_pago', MetodoPagoToStr(AMetodo));
    Data.Add('concepto', AConcepto);
    if ATitularNombre <> '' then
      Data.Add('titular_paga', ATitularNombre)
    else
      Data.Add('titular_paga', 'Contribuyente Parroquia');
    Data.Add('tipo', 'ingreso');
    Data.Add('fecha_pago', FechaAhora);

    Resp := Supabase.Insert('pagos_recibos', Data);
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

class function TCajaService.RegistrarEgreso(const AComprobante, AConcepto, ACategoria: string; AMonto: Currency; AMetodo: TMetodoPago; const AOperador: string): Boolean;
var
  Data, Resp: TJSONObject;
  FechaAhora: string;
begin
  Result := False;
  FechaAhora := FormatDateTime('yyyy-mm-dd"T"hh:nn:ss', Now);
  Data := TJSONObject.Create;
  try
    Data.Add('numero_recibo', AComprobante);
    Data.Add('monto', Double(AMonto));
    Data.Add('metodo_pago', MetodoPagoToStr(AMetodo));
    Data.Add('concepto', '[EGRESO] ' + AConcepto);
    Data.Add('titular_paga', 'Egreso Operativo');
    Data.Add('tipo', 'egreso');
    Data.Add('categoria', ACategoria);
    Data.Add('fecha_pago', FechaAhora);

    Resp := Supabase.Insert('pagos_recibos', Data);
    if Resp <> nil then
    begin
      Result := True;
      Resp.Free;
    end;
  finally
    Data.Free;
  end;
end;

class function TCajaService.EliminarPago(const AId: string): Boolean;
var
  Filter: string;
begin
  Result := False;
  if AId = '' then Exit;
  if (Length(AId) = 36) and (AId[9] = '-') then
    Filter := 'id=eq.' + AId
  else
    Filter := 'numero_recibo=eq.' + AId;
  Result := Supabase.Delete('pagos_recibos', Filter);
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
    if Movimientos[i].TipoMovimiento = tmcEgreso then
    begin
      if Movimientos[i].MetodoPago = mpEfectivo then
        TotalEfectivo := TotalEfectivo - Movimientos[i].MontoPagado
      else
        TotalDigital := TotalDigital - Movimientos[i].MontoPagado;
    end
    else
    begin
      if Movimientos[i].MetodoPago = mpEfectivo then
        TotalEfectivo := TotalEfectivo + Movimientos[i].MontoPagado
      else
        TotalDigital := TotalDigital + Movimientos[i].MontoPagado;
    end;
  end;

  Result := TotalEfectivo + TotalDigital;
end;

class procedure TCajaService.CalcularBalanceGeneral(out TotalIngresos, TotalEgresos, BalanceNeto: Currency);
var
  Movimientos: TPagoArray;
  i: Integer;
begin
  TotalIngresos := 0;
  TotalEgresos := 0;
  Movimientos := ObtenerMovimientosHoy;
  for i := Low(Movimientos) to High(Movimientos) do
  begin
    if Movimientos[i].TipoMovimiento = tmcEgreso then
      TotalEgresos := TotalEgresos + Movimientos[i].MontoPagado
    else
      TotalIngresos := TotalIngresos + Movimientos[i].MontoPagado;
  end;
  BalanceNeto := TotalIngresos - TotalEgresos;
end;

end.
