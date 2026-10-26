unit uDataModels;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils;

type
  TEstadoParcela = (epDisponible, epOcupada, epReservada, epEnMora, epBaja, epStandby);
  TEstadoAfiliado = (eaActivo, eaEnMora, eaSuspendido, eaBaja);
  TEstadoCuota = (ecPendiente, ecPagada, ecAnulada);
  TMetodoPago = (mpEfectivo, mpTransferenciaQR, mpDebito, mpCredito, mpOtro);
  TTipoMovimientoCaja = (tmcIngreso, tmcEgreso);

  { TTitular }
  TTitular = record
    Id: string;
    NombreCompleto: string;
    Dni: string;
    Telefono: string;
    Direccion: string;
    Barrio: string;
    Ciudad: string;
    EstadoVital: string; // 'vivo' | 'fallecido'
  end;

  { TInhumacion }
  TInhumacion = record
    Id: string;
    ParcelaId: string;
    NombreDifunto: string;
    DniDifunto: string;
    FechaFallecimiento: string;
    FechaInhumacion: string;
    NivelPosicion: Integer;
    EsCovid: Boolean;
    CausaDefuncion: string;
    EmpresaFunebrera: string;
    NombreResponsable: string;
    TelefonoResponsable: string;
    Observaciones: string;
    NomenclaturaParcela: string;
    CreatedAt: string;
  end;
  TInhumacionArray = array of TInhumacion;

  { TParcela }
  TParcela = record
    Id: string;
    Nomenclatura: string; // ej. 'A-25-96'
    SectorId: string;     // 'A', 'E', 'Salinas'
    ManzanaFila: string;
    NumeroParcela: string;
    CapacidadTotal: Integer;
    EspaciosOcupados: Integer;
    TitularId: string;
    TitularNombre: string;
    TitularDni: string;
    Estado: TEstadoParcela;
    SaldoMantenimiento: Currency;
    FechaAdquisicion: string;
    FechaUltimoPago: string;
    UltimaCuotaPagada: string;
    MotivoBloqueo: string;
    Notas: string;
    CreatedAt: string;
  end;
  TParcelaArray = array of TParcela;

  { TCuotaSeguro }
  TCuotaSeguro = record
    Id: string;
    AfiliadoId: string;
    Anio: Integer;
    NroCuota: Integer;
    Monto: Currency;
    Estado: TEstadoCuota;
    FechaPago: string;
    MetodoPago: string;
    NroRecibo: string;
  end;
  TCuotaSeguroArray = array of TCuotaSeguro;

  { TAfiliadoSeguro }
  TAfiliadoSeguro = record
    Id: string;
    NumeroAfiliado: Integer;
    TitularId: string;
    NombreCompleto: string;
    Dni: string;
    DireccionCobro: string;
    ZonaCobro: string;
    CobradorAsignado: string;
    MontoCuotaMensual: Currency;
    Estado: TEstadoAfiliado;
    FechaAlta: string;
    MesesMora: Integer;
    UltimaCuotaPagada: string;
    CuotasPagadas: array of Integer;
    CreatedAt: string;
  end;
  TAfiliadoArray = array of TAfiliadoSeguro;

  { TPagoMantenimiento / Registro de Caja }
  TPagoMantenimiento = record
    Id: string;
    NroRecibo: string;
    ParcelaId: string;
    TitularId: string;
    TitularNombre: string;
    Concepto: string; // 'Mantenimiento Parcela', 'Cuota Seguro', 'Inhumacion'
    MontoPagado: Currency;
    PeriodoCubierto: string;
    MetodoPago: TMetodoPago;
    OperadorNombre: string;
    FechaPago: string;
    Observaciones: string;
    TipoMovimiento: TTipoMovimientoCaja;
    Categoria: string;
  end;
  TPagoArray = array of TPagoMantenimiento;

function EstadoParcelaToStr(AEstado: TEstadoParcela): string;
function StrToEstadoParcela(const AStr: string): TEstadoParcela;
function EstadoAfiliadoToStr(AEstado: TEstadoAfiliado): string;
function StrToEstadoAfiliado(const AStr: string): TEstadoAfiliado;
function MetodoPagoToStr(AMetodo: TMetodoPago): string;
function StrToMetodoPago(const AStr: string): TMetodoPago;
function TipoMovimientoToStr(ATipo: TTipoMovimientoCaja): string;
function StrToTipoMovimiento(const AStr: string): TTipoMovimientoCaja;

implementation

function EstadoParcelaToStr(AEstado: TEstadoParcela): string;
begin
  case AEstado of
    epDisponible: Result := 'disponible';
    epOcupada:    Result := 'ocupada';
    epReservada:  Result := 'reservada';
    epEnMora:     Result := 'en_mora';
    epBaja:       Result := 'baja';
    epStandby:    Result := 'en_mora';
  else
    Result := 'disponible';
  end;
end;

function StrToEstadoParcela(const AStr: string): TEstadoParcela;
var
  S: string;
begin
  S := LowerCase(Trim(AStr));
  if S = 'ocupada' then Result := epOcupada
  else if S = 'en_mora' then Result := epEnMora
  else if S = 'reservada' then Result := epReservada
  else if S = 'standby' then Result := epStandby
  else if S = 'baja' then Result := epBaja
  else Result := epDisponible;
end;

function EstadoAfiliadoToStr(AEstado: TEstadoAfiliado): string;
begin
  case AEstado of
    eaActivo:     Result := 'activo';
    eaEnMora:     Result := 'en_mora';
    eaSuspendido: Result := 'suspendido';
    eaBaja:       Result := 'baja';
  else
    Result := 'activo';
  end;
end;

function StrToEstadoAfiliado(const AStr: string): TEstadoAfiliado;
var
  S: string;
begin
  S := LowerCase(Trim(AStr));
  if S = 'en_mora' then Result := eaEnMora
  else if S = 'suspendido' then Result := eaSuspendido
  else if S = 'baja' then Result := eaBaja
  else Result := eaActivo;
end;

function MetodoPagoToStr(AMetodo: TMetodoPago): string;
begin
  case AMetodo of
    mpEfectivo:         Result := 'efectivo';
    mpTransferenciaQR:  Result := 'transferencia_qr';
    mpDebito:           Result := 'debito';
    mpCredito:          Result := 'credito';
  else
    Result := 'otro';
  end;
end;

function StrToMetodoPago(const AStr: string): TMetodoPago;
var
  S: string;
begin
  S := LowerCase(Trim(AStr));
  if (S = 'transferencia_qr') or (S = 'transferencia') or (S = 'digital') then
    Result := mpTransferenciaQR
  else if S = 'debito' then Result := mpDebito
  else if S = 'credito' then Result := mpCredito
  else if S = 'efectivo' then Result := mpEfectivo
  else Result := mpOtro;
end;

function TipoMovimientoToStr(ATipo: TTipoMovimientoCaja): string;
begin
  if ATipo = tmcEgreso then Result := 'egreso'
  else Result := 'ingreso';
end;

function StrToTipoMovimiento(const AStr: string): TTipoMovimientoCaja;
begin
  if LowerCase(Trim(AStr)) = 'egreso' then Result := tmcEgreso
  else Result := tmcIngreso;
end;

end.
