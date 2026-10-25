; Script de Empaquetado Inno Setup para Aeterna XP
; Compatible estrictamente con Windows XP SP3, Windows 7, 10 y 11 (32/64 bit)

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
Compression=lzma2/ultra64
SolidCompression=yes
; Requiere Windows XP SP3 (Version 5.1.2600) o superior
MinVersion=5.1.2600
PrivilegesRequired=admin
DisableProgramGroupPage=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Ejecutable principal compilado
Source: "..\bin\AeternaXP.exe"; DestDir: "{app}"; Flags: ignoreversion
; Archivo de configuracion con conexion Supabase
Source: "..\bin\config.ini"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
; Librerias OpenSSL 1.1.1 para conexion TLS 1.2/1.3 en Windows XP
Source: "..\bin\libeay32.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\bin\ssleay32.dll"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Aeterna"; Filename: "{app}\AeternaXP.exe"
Name: "{group}\Desinstalar Aeterna"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Aeterna"; Filename: "{app}\AeternaXP.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\AeternaXP.exe"; Description: "{cm:LaunchProgram,Aeterna}"; Flags: nowait postinstall skipifsilent
