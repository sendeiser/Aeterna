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
  CleanEp: string;
begin
  CleanEp := AEndpoint;
  if (CleanEp <> '') and (CleanEp[1] = '/') then
    System.Delete(CleanEp, 1, 1);

  Result := FBaseUrl + '/rest/v1/' + CleanEp;
  if AParams <> '' then
  begin
    if AParams[1] = '?' then
      Result := Result + AParams
    else
      Result := Result + '?' + AParams;
  end;
end;

function TSimpleHttpClient.ExecuteRequest(AMethod: THttpMethod; const AEndpoint: string; const ABody: string; const AParams: string): THttpResponse;
var
  Client: TFPHTTPClient;
  FullUrl: string;
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
      Client.AddHeader('Content-Type', 'application/json');
      Client.AddHeader('Prefer', 'return=representation');
      Client.AllowRedirect := True;

      case AMethod of
        hmGET:
        begin
          Client.Get(FullUrl, ResponseBodyStream);
        end;

        hmPOST:
        begin
          RequestBodyStream := TStringStream.Create(ABody);
          Client.RequestBody := RequestBodyStream;
          Client.Post(FullUrl, ResponseBodyStream);
        end;

        hmPATCH:
        begin
          RequestBodyStream := TStringStream.Create(ABody);
          Client.RequestBody := RequestBodyStream;
          // HTTP PATCH
          Client.HTTPMethod('PATCH', FullUrl, ResponseBodyStream, [200, 204]);
        end;

        hmDELETE:
        begin
          Client.HTTPMethod('DELETE', FullUrl, ResponseBodyStream, [200, 204]);
        end;
      end;

      Result.StatusCode := Client.ResponseStatusCode;
      Result.Body := ResponseBodyStream.DataString;
      Result.Success := (Result.StatusCode >= 200) and (Result.StatusCode < 300);

      if not Result.Success then
        Result.ErrorMessage := Format('HTTP Error %d: %s', [Result.StatusCode, Result.Body]);

    except
      on E: Exception do
      begin
        Result.Success := False;
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
