program test_connection;

{$mode objfpc}{$H+}

uses
  Classes, SysUtils, uConfig, uSynapseHttp;

procedure RunConnectionTest;
var
  Client: TSimpleHttpClient;
  Response: THttpResponse;
  Cfg: TAppConfig;
begin
  WriteLn('=== Test de Conectividad Supabase TLS 1.2 / 1.3 ===');
  Cfg := AppConfig;
  WriteLn('Supabase URL: ', Cfg.SupabaseUrl);
  WriteLn('Anon Key: ', Copy(Cfg.SupabaseAnonKey, 1, 20), '...');

  Client := TSimpleHttpClient.Create(Cfg.SupabaseUrl, Cfg.SupabaseAnonKey);
  try
    WriteLn('Enviando GET a /rest/v1/parcelas?select=id&limit=1 ...');
    Response := Client.Get('parcelas', 'select=id&limit=1');

    WriteLn('Status Code: ', Response.StatusCode);
    if Response.Success then
    begin
      WriteLn('CONEXION EXITOSA!');
      WriteLn('Respuesta: ', Copy(Response.Body, 1, 120));
    end
    else
    begin
      WriteLn('FALLO LA CONEXION: ', Response.ErrorMessage);
    end;
  finally
    Client.Free;
  end;
end;

begin
  try
    RunConnectionTest;
  except
    on E: Exception do
      WriteLn('Excepcion no controlada: ', E.Message);
  end;
end.
