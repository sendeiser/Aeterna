program AeternaXP;

{$mode objfpc}{$H+}
{$apptype gui}
{$R aeterna.res}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Windows,
  uWin32App;

begin
  RunAeternaWin32App;
end.
