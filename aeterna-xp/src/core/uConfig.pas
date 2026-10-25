unit uConfig;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, IniFiles;

type
  { TAppConfig }
  TAppConfig = class
  private
    FIniPath: string;
    FSupabaseUrl: string;
    FSupabaseAnonKey: string;
    FAppTitulo: string;
    FVersion: string;
    FDefaultOperador: string;
    procedure LoadConfig;
  public
    constructor Create(const AIniPath: string = '');
    procedure SaveConfig;

    property SupabaseUrl: string read FSupabaseUrl write FSupabaseUrl;
    property SupabaseAnonKey: string read FSupabaseAnonKey write FSupabaseAnonKey;
    property AppTitulo: string read FAppTitulo write FAppTitulo;
    property Version: string read FVersion write FVersion;
    property DefaultOperador: string read FDefaultOperador write FDefaultOperador;
  end;

function AppConfig: TAppConfig;

implementation

var
  GAppConfig: TAppConfig = nil;

function AppConfig: TAppConfig;
begin
  if GAppConfig = nil then
    GAppConfig := TAppConfig.Create;
  Result := GAppConfig;
end;

{ TAppConfig }

constructor TAppConfig.Create(const AIniPath: string);
begin
  inherited Create;
  if AIniPath <> '' then
    FIniPath := AIniPath
  else
    FIniPath := ExtractFilePath(ParamStr(0)) + 'config.ini';

  LoadConfig;
end;

procedure TAppConfig.LoadConfig;
var
  Ini: TIniFile;
begin
  Ini := TIniFile.Create(FIniPath);
  try
    FSupabaseUrl := Ini.ReadString('Supabase', 'Url', 'https://xftwykrxumzxaqhosbvt.supabase.co');
    FSupabaseAnonKey := Ini.ReadString('Supabase', 'AnonKey', '');
    FAppTitulo := Ini.ReadString('App', 'Titulo', 'Aeterna - Gestion Funeraria y Cementerio Parque San Nicolas');
    FVersion := Ini.ReadString('App', 'Version', '1.0.0-XP');
    FDefaultOperador := Ini.ReadString('App', 'DefaultOperador', 'Administrador General');
  finally
    Ini.Free;
  end;
end;

procedure TAppConfig.SaveConfig;
var
  Ini: TIniFile;
begin
  Ini := TIniFile.Create(FIniPath);
  try
    Ini.WriteString('Supabase', 'Url', FSupabaseUrl);
    Ini.WriteString('Supabase', 'AnonKey', FSupabaseAnonKey);
    Ini.WriteString('App', 'Titulo', FAppTitulo);
    Ini.WriteString('App', 'Version', FVersion);
    Ini.WriteString('App', 'DefaultOperador', FDefaultOperador);
  finally
    Ini.Free;
  end;
end;

initialization

finalization
  if GAppConfig <> nil then
    FreeAndNil(GAppConfig);

end.
