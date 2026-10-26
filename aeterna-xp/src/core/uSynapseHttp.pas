unit uSynapseHttp;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fphttpclient, opensslsockets;

type
  { THttpResponse }
  THttpResponse = record
    StatusCode: Integer;
    Body: string;
    ErrorMessage: string;
    Success: Boolean;
  end;

  { THttpMethod }
  THttpMethod = (hmGET, hmPOST, hmPATCH, hmDELETE);

  { TSimpleHttpClient }
  TSimpleHttpClient = class
  private
    FBaseUrl: string;
    FApiKey: string;
    FAuthToken: string;
    FTimeoutMs: Integer;
    function BuildFullUrl(const AEndpoint, AParams: string): string;
    function ExecuteRequest(AMethod: THttpMethod; const AEndpoint: string; const ABody: string; const AParams: string = ''): THttpResponse;
  public
    constructor Create(const ABaseUrl, AApiKey: string; const AAuthToken: string = '');
    destructor Destroy; override;

    function Get(const AEndpoint: string; const AParams: string = ''): THttpResponse;
    function Post(const AEndpoint: string; const AJsonBody: string): THttpResponse;
    function Patch(const AEndpoint: string; const AParams: string; const AJsonBody: string): THttpResponse;
    function Delete(const AEndpoint: string; const AParams: string = ''): THttpResponse;

    property BaseUrl: string read FBaseUrl write FBaseUrl;
    property ApiKey: string read FApiKey write FApiKey;
    property AuthToken: string read FAuthToken write FAuthToken;
    property TimeoutMs: Integer read FTimeoutMs write FTimeoutMs;
  end;

implementation

{ TSimpleHttpClient }

constructor TSimpleHttpClient.Create(const ABaseUrl, AApiKey: string; const AAuthToken: string);
begin
  inherited Create;
  FBaseUrl := ABaseUrl;
  if (FBaseUrl <> '') and (FBaseUrl[Length(FBaseUrl)] = '/') then
    System.Delete(FBaseUrl, Length(FBaseUrl), 1);
  FApiKey := AApiKey;
  if AAuthToken <> '' then
    FAuthToken := AAuthToken
  else
    FAuthToken := AApiKey;
  FTimeoutMs := 15000;
end;

destructor TSimpleHttpClient.Destroy;
begin
  inherited Destroy;
end;

function TSimpleHttpClient.BuildFullUrl(const AEndpoint, AParams: string): string;
var
  CleanEp, ParamStr: string;
begin
  CleanEp := AEndpoint;
  if (CleanEp <> '') and (CleanEp[1] = '/') then
    System.Delete(CleanEp, 1, 1);

  Result := FBaseUrl + '/rest/v1/' + CleanEp;
  if AParams <> '' then
  begin
    ParamStr := StringReplace(AParams, ' ', '%20', [rfReplaceAll]);
    if ParamStr[1] = '?' then
      Result := Result + ParamStr
    else
      Result := Result + '?' + ParamStr;
  end;
end;

function IsValidUtf8(const S: string): Boolean;
var
  i, len: Integer;
  c: Byte;
begin
  Result := True;
  len := Length(S);
  i := 1;
  while i <= len do
  begin
    c := Byte(S[i]);
    if c <= $7F then
      Inc(i)
    else if (c and $E0) = $C0 then
    begin
      if (i + 1 > len) or ((Byte(S[i + 1]) and $C0) <> $80) then Exit(False);
      Inc(i, 2);
    end
    else if (c and $F0) = $E0 then
    begin
      if (i + 2 > len) or ((Byte(S[i + 1]) and $C0) <> $80) or ((Byte(S[i + 2]) and $C0) <> $80) then Exit(False);
      Inc(i, 3);
    end
    else if (c and $F8) = $F0 then
    begin
      if (i + 3 > len) or ((Byte(S[i + 1]) and $C0) <> $80) or ((Byte(S[i + 2]) and $C0) <> $80) or ((Byte(S[i + 3]) and $C0) <> $80) then Exit(False);
      Inc(i, 4);
    end
    else
      Exit(False);
  end;
end;

function EnsureUtf8(const S: string): string;
begin
  if IsValidUtf8(S) then
    Result := S
  else
    Result := AnsiToUtf8(S);
end;

function TSimpleHttpClient.ExecuteRequest(AMethod: THttpMethod; const AEndpoint: string; const ABody: string; const AParams: string): THttpResponse;
var
  Client: TFPHTTPClient;
  FullUrl, Payload: string;
  RequestBodyStream: TStringStream;
  ResponseBodyStream: TStringStream;
begin
  Result.StatusCode := 0;
  Result.Body := '';
  Result.ErrorMessage := '';
  Result.Success := False;

  FullUrl := BuildFullUrl(AEndpoint, AParams);
  Client := TFPHTTPClient.Create(nil);
  RequestBodyStream := nil;
  ResponseBodyStream := TStringStream.Create('');

  try
    try
      // Headers requeridos por Supabase PostgREST
      Client.AddHeader('apikey', FApiKey);
      Client.AddHeader('Authorization', 'Bearer ' + FAuthToken);
      Client.AddHeader('Content-Type', 'application/json; charset=utf-8');
      Client.AddHeader('Prefer', 'return=representation');
      Client.AllowRedirect := True;

      case AMethod of
        hmGET:
        begin
          Client.HTTPMethod('GET', FullUrl, ResponseBodyStream, [200, 201, 204, 206, 400, 401, 403, 404, 409, 422, 500]);
        end;

        hmPOST:
        begin
          Payload := EnsureUtf8(ABody);
          RequestBodyStream := TStringStream.Create(Payload);
          Client.RequestBody := RequestBodyStream;
          Client.HTTPMethod('POST', FullUrl, ResponseBodyStream, [200, 201, 204, 400, 401, 403, 404, 409, 422, 500]);
        end;

        hmPATCH:
        begin
          Payload := EnsureUtf8(ABody);
          RequestBodyStream := TStringStream.Create(Payload);
          Client.RequestBody := RequestBodyStream;
          // Permitir codigos estandar para leer el cuerpo de error de PostgREST sin excepciones prematuras
          Client.HTTPMethod('PATCH', FullUrl, ResponseBodyStream, [200, 201, 204, 400, 401, 403, 404, 409, 422, 500]);
        end;

        hmDELETE:
        begin
          Client.HTTPMethod('DELETE', FullUrl, ResponseBodyStream, [200, 201, 204, 400, 401, 403, 404, 409, 422, 500]);
        end;
      end;

      Result.StatusCode := Client.ResponseStatusCode;
      Result.Body := ResponseBodyStream.DataString;
      Result.Success := (Result.StatusCode >= 200) and (Result.StatusCode < 300);

      if not Result.Success then
      begin
        if Result.Body <> '' then
          Result.ErrorMessage := Format('HTTP Error %d: %s', [Result.StatusCode, Result.Body])
        else
          Result.ErrorMessage := Format('HTTP Error %d', [Result.StatusCode]);
      end;

    except
      on E: Exception do
      begin
        Result.Success := False;
        Result.StatusCode := Client.ResponseStatusCode;
        if ResponseBodyStream.DataString <> '' then
          Result.ErrorMessage := Format('HTTP Error %d: %s', [Result.StatusCode, ResponseBodyStream.DataString])
        else
          Result.ErrorMessage := E.Message;
        if Result.StatusCode = 0 then
          Result.StatusCode := 500;
      end;
    end;
  finally
    if RequestBodyStream <> nil then
      RequestBodyStream.Free;
    ResponseBodyStream.Free;
    Client.Free;
  end;
end;

function TSimpleHttpClient.Get(const AEndpoint: string; const AParams: string): THttpResponse;
begin
  Result := ExecuteRequest(hmGET, AEndpoint, '', AParams);
end;

function TSimpleHttpClient.Post(const AEndpoint: string; const AJsonBody: string): THttpResponse;
begin
  Result := ExecuteRequest(hmPOST, AEndpoint, AJsonBody, '');
end;

function TSimpleHttpClient.Patch(const AEndpoint: string; const AParams: string; const AJsonBody: string): THttpResponse;
begin
  Result := ExecuteRequest(hmPATCH, AEndpoint, AJsonBody, AParams);
end;

function TSimpleHttpClient.Delete(const AEndpoint: string; const AParams: string): THttpResponse;
begin
  Result := ExecuteRequest(hmDELETE, AEndpoint, '', AParams);
end;

end.
