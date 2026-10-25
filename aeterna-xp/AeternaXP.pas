program AeternaXP;

{$mode objfpc}{$H+}
{$apptype gui}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Windows,
  uWin32App;

begin
  RunAeternaWin32App;
end.
