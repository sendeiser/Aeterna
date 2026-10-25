; Script de Empaquetado Inno Setup 5.6.1 para Aeterna XP
; Genera el instalador oficial 100% compatible con Windows XP SP3, 7, 8, 10 y 11

[Setup]
AppId={{8B1A2C3D-4E5F-6A7B-8C9D-0E1F2A3B4C5D}
AppName=Aeterna - Gestion Funeraria y Cementerio Parque San Nicolas
AppVersion=1.0.0-XP
AppPublisher=Parroquia San Nicolas de Bari
AppPublisherURL=https://xftwykrxumzxaqhosbvt.supabase.co
DefaultDirName={pf}\Aeterna
DefaultGroupName=Aeterna Cementerio Parque
OutputDir=.
OutputBaseFilename=setup_aeterna_xp
Compression=lzma/ultra64
SolidCompression=yes
; Requiere Windows XP SP3 (Version 5.1.2600) o superior
MinVersion=0,5.1.2600
; Requiere elevacion de administrador para crear la carpeta en Program Files (evita Error 5)
PrivilegesRequired=admin
DisableProgramGroupPage=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Ejecutable principal compilado Win32 nativo
Source: "..\bin\AeternaXP.exe"; DestDir: "{app}"; Flags: ignoreversion
; Archivo de configuracion con conexion Supabase
Source: "..\bin\config.ini"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
; Librerias OpenSSL 32-bit para conexion TLS 1.2 en Windows XP
Source: "..\bin\libeay32.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\bin\ssleay32.dll"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Aeterna XP"; Filename: "{app}\AeternaXP.exe"
Name: "{group}\Desinstalar Aeterna"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Aeterna XP"; Filename: "{app}\AeternaXP.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\AeternaXP.exe"; Description: "{cm:LaunchProgram,Aeterna XP}"; Flags: nowait postinstall skipifsilent
