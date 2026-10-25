unit uBusinessRules;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, uDataModels;

type
  { TEvaluacionMoraParcela }
  TEvaluacionMoraParcela = record
    EnStandby: Boolean;
    AniosMora: Integer;
    FechaUltimoPago: string;
    UltimaCuotaPagada: string;
  end;

function EvaluarMoraParcela(const AParcela: TParcela; AnioRef: Integer = 2026): TEvaluacionMoraParcela;
function EvaluarMoraAfiliado(const AAfiliado: TAfiliadoSeguro; MesActual: Integer = 10): Integer;
function FormatearMoneda(AMonto: Currency): string;
function FormatearFecha(const AFechaISO: string): string;

implementation

function ExtraerAnioDeString(const AStr: string): Integer;
var
  i, DigitsCount, StartIdx: Integer;
  Sub: string;
begin
  Result := 0;
  if Length(AStr) < 4 then Exit;

  // Buscar 4 digitos consecutivos que representen un año entre 1970 y 2099
  for i := 1 to Length(AStr) - 3 do
  begin
    if (AStr[i] in ['1', '2']) and (AStr[i+1] in ['0'..'9']) and
       (AStr[i+2] in ['0'..'9']) and (AStr[i+3] in ['0'..'9']) then
    begin
      Sub := Copy(AStr, i, 4);
      Result := StrToIntDef(Sub, 0);
      if (Result >= 1970) and (Result <= 2099) then
        Exit;
    end;
  end;
end;

function EvaluarMoraParcela(const AParcela: TParcela; AnioRef: Integer): TEvaluacionMoraParcela;
var
  AnioUltimoPago: Integer;
begin
  Result.EnStandby := False;
  Result.AniosMora := 0;
  Result.FechaUltimoPago := AParcela.FechaUltimoPago;
  Result.UltimaCuotaPagada := AParcela.UltimaCuotaPagada;

  if (AParcela.Estado = epDisponible) or (Trim(AParcela.TitularNombre) = '') then
    Exit;

  if AParcela.Estado = epStandby then
  begin
    Result.EnStandby := True;
    Result.AniosMora := 3;
    Exit;
  end;

  AnioUltimoPago := 0;
  if AParcela.FechaUltimoPago <> '' then
    AnioUltimoPago := ExtraerAnioDeString(AParcela.FechaUltimoPago);

  if (AnioUltimoPago = 0) and (AParcela.UltimaCuotaPagada <> '') then
    AnioUltimoPago := ExtraerAnioDeString(AParcela.UltimaCuotaPagada);

  if AnioUltimoPago > 0 then
    Result.AniosMora := AnioRef - AnioUltimoPago
  else if AParcela.SaldoMantenimiento > 0 then
    Result.AniosMora := 3
  else
    Result.AniosMora := 0;

  if Result.AniosMora < 0 then
    Result.AniosMora := 0;

  // Si debe 3 años o más de mantenimiento, cae en standby legal
  Result.EnStandby := (Result.AniosMora >= 3);
end;

function EvaluarMoraAfiliado(const AAfiliado: TAfiliadoSeguro; MesActual: Integer): Integer;
var
  UltimoMesPagado, i: Integer;
begin
  if AAfiliado.Estado = eaEnMora then
  begin
    Result := 3;
    Exit;
  end;

  UltimoMesPagado := 0;
  for i := Low(AAfiliado.CuotasPagadas) to High(AAfiliado.CuotasPagadas) do
  begin
    if AAfiliado.CuotasPagadas[i] > UltimoMesPagado then
      UltimoMesPagado := AAfiliado.CuotasPagadas[i];
  end;

  if UltimoMesPagado = 0 then
    Result := MesActual
  else
    Result := MesActual - UltimoMesPagado;

  if Result < 0 then
    Result := 0;
end;

function FormatearMoneda(AMonto: Currency): string;
begin
  Result := Format('$ %s', [FormatFloat('#,##0', AMonto)]);
end;

function FormatearFecha(const AFechaISO: string): string;
var
  Partes: TStringList;
begin
  if Trim(AFechaISO) = '' then
  begin
    Result := '-';
    Exit;
  end;

  // AFechaISO en formato YYYY-MM-DD
  if Length(AFechaISO) >= 10 then
  begin
    Result := Copy(AFechaISO, 9, 2) + '/' + Copy(AFechaISO, 6, 2) + '/' + Copy(AFechaISO, 1, 4);
  end
  else
    Result := AFechaISO;
end;

end.
