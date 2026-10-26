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
    FLastErrorMessage: string;
  public
    constructor Create;
    destructor Destroy; override;

    function Select(const ATable: string; const AQueryParams: string = ''): TJSONArray;
    function Insert(const ATable: string; AData: TJSONObject): TJSONObject;
    function Update(const ATable: string; const AFilter: string; AData: TJSONObject): Boolean;
    function Delete(const ATable: string; const AFilter: string): Boolean;

    property LastErrorMessage: string read FLastErrorMessage;
  end;

function Supabase: TSupabaseClient;
function IsValidUuid(const S: string): Boolean;

implementation

function IsValidUuid(const S: string): Boolean;
var
  i: Integer;
begin
  Result := False;
  if Length(S) <> 36 then Exit;
  if (S[9] <> '-') or (S[14] <> '-') or (S[19] <> '-') or (S[24] <> '-') then Exit;
  for i := 1 to 36 do
  begin
    if (i = 9) or (i = 14) or (i = 19) or (i = 24) then Continue;
    if not (S[i] in ['0'..'9', 'a'..'f', 'A'..'F']) then Exit;
  end;
  Result := True;
end;

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
  FLastErrorMessage := '';
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
  FLastErrorMessage := '';
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
  end
  else if not Resp.Success then
    FLastErrorMessage := Resp.ErrorMessage;
end;

function TSupabaseClient.Insert(const ATable: string; AData: TJSONObject): TJSONObject;
var
  Resp: THttpResponse;
  Parser: TJSONParser;
  Data: TJSONData;
begin
  Result := nil;
  FLastErrorMessage := '';
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
  end
  else if not Resp.Success then
    FLastErrorMessage := Resp.ErrorMessage;
end;

function TSupabaseClient.Update(const ATable: string; const AFilter: string; AData: TJSONObject): Boolean;
var
  Resp: THttpResponse;
  Parser: TJSONParser;
  Data: TJSONData;
begin
  Result := False;
  FLastErrorMessage := '';
  if AData = nil then Exit;

  Resp := FHttpClient.Patch(ATable, AFilter, AData.AsJSON);
  if Resp.Success then
  begin
    if Resp.Body <> '' then
    begin
      Parser := TJSONParser.Create(Resp.Body);
      try
        Data := Parser.Parse;
        if (Data is TJSONArray) and (TJSONArray(Data).Count = 0) then
        begin
          FLastErrorMessage := 'No se encontro el registro para actualizar en Supabase (' + AFilter + ')';
          Data.Free;
          Exit(False);
        end;
        Data.Free;
      finally
        Parser.Free;
      end;
    end;
    Result := True;
  end
  else
    FLastErrorMessage := Resp.ErrorMessage;
end;

function TSupabaseClient.Delete(const ATable: string; const AFilter: string): Boolean;
var
  Resp: THttpResponse;
begin
  FLastErrorMessage := '';
  Resp := FHttpClient.Delete(ATable, AFilter);
  Result := Resp.Success;
  if not Result then
    FLastErrorMessage := Resp.ErrorMessage;
end;

initialization

finalization
  if GSupabaseClient <> nil then
    FreeAndNil(GSupabaseClient);

end.
