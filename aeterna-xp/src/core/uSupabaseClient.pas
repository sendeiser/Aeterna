unit uSupabaseClient;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, fpjson, jsonparser, uConfig, uSynapseHttp;

type
  { TSupabaseClient }
  TSupabaseClient = class
  private
    FHttpClient: TSimpleHttpClient;
  public
    constructor Create;
    destructor Destroy; override;

    function Select(const ATable: string; const AQueryParams: string = ''): TJSONArray;
    function Insert(const ATable: string; AData: TJSONObject): TJSONObject;
    function Update(const ATable: string; const AFilter: string; AData: TJSONObject): Boolean;
    function Delete(const ATable: string; const AFilter: string): Boolean;
  end;

function Supabase: TSupabaseClient;

implementation

var
  GSupabaseClient: TSupabaseClient = nil;

function Supabase: TSupabaseClient;
begin
  if GSupabaseClient = nil then
    GSupabaseClient := TSupabaseClient.Create;
  Result := GSupabaseClient;
end;

{ TSupabaseClient }

constructor TSupabaseClient.Create;
var
  Cfg: TAppConfig;
begin
  inherited Create;
  Cfg := AppConfig;
  FHttpClient := TSimpleHttpClient.Create(Cfg.SupabaseUrl, Cfg.SupabaseAnonKey);
end;

destructor TSupabaseClient.Destroy;
begin
  if FHttpClient <> nil then
    FHttpClient.Free;
  inherited Destroy;
end;

function TSupabaseClient.Select(const ATable: string; const AQueryParams: string): TJSONArray;
var
  Resp: THttpResponse;
  Parser: TJSONParser;
  Data: TJSONData;
begin
  Result := nil;
  Resp := FHttpClient.Get(ATable, AQueryParams);
  if Resp.Success and (Resp.Body <> '') then
  begin
    Parser := TJSONParser.Create(Resp.Body);
    try
      Data := Parser.Parse;
      if Data is TJSONArray then
        Result := TJSONArray(Data)
      else if Data is TJSONObject then
      begin
        Result := TJSONArray.Create;
        Result.Add(Data);
      end
      else
        Data.Free;
    finally
      Parser.Free;
    end;
  end;
end;

function TSupabaseClient.Insert(const ATable: string; AData: TJSONObject): TJSONObject;
var
  Resp: THttpResponse;
  Parser: TJSONParser;
  Data: TJSONData;
begin
  Result := nil;
  if AData = nil then Exit;

  Resp := FHttpClient.Post(ATable, AData.AsJSON);
  if Resp.Success and (Resp.Body <> '') then
  begin
    Parser := TJSONParser.Create(Resp.Body);
    try
      Data := Parser.Parse;
      if (Data is TJSONArray) and (TJSONArray(Data).Count > 0) then
      begin
        Result := TJSONObject(TJSONArray(Data).Items[0].Clone);
        Data.Free;
      end
      else if Data is TJSONObject then
        Result := TJSONObject(Data)
      else
        Data.Free;
    finally
      Parser.Free;
    end;
  end;
end;

function TSupabaseClient.Update(const ATable: string; const AFilter: string; AData: TJSONObject): Boolean;
var
  Resp: THttpResponse;
begin
  Result := False;
  if AData = nil then Exit;

  Resp := FHttpClient.Patch(ATable, AFilter, AData.AsJSON);
  Result := Resp.Success;
end;

function TSupabaseClient.Delete(const ATable: string; const AFilter: string): Boolean;
var
  Resp: THttpResponse;
begin
  Resp := FHttpClient.Delete(ATable, AFilter);
  Result := Resp.Success;
end;

initialization

finalization
  if GSupabaseClient <> nil then
    FreeAndNil(GSupabaseClient);

end.
