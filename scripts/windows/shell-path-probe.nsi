Unicode true
Name "Gold installer shell path probe"
OutFile "${PROBE_DIR}\shell-path-${PROBE_VARIANT}.exe"
SilentInstall silent
AutoCloseWindow true
RequestExecutionLevel user

Var Trace

Section
  System::Call 'kernel32::SetErrorMode(i 3)i.r9'
  FileOpen $Trace "$EXEDIR\shell-path-${PROBE_VARIANT}.log" w
  FileWrite $Trace "started$\r$\n"
  FileClose $Trace

  ; Put a valid short string next to an inaccessible page to detect overreads.
  System::Call 'kernel32::VirtualAlloc(p 0, p 8192, i 0x3000, i 0x04)p.r3'
  IntCmp $3 0 allocationFailed
  IntOp $4 $3 + 4096
  System::Call 'kernel32::VirtualProtect(p r4, p 4096, i 0x01, *i .r5)i.r6'
  IntCmp $6 0 allocationFailed
  IntOp $2 $4 - 64
  System::Call '*$2(&w32 "C:\Programs")'

!ifdef FIX_SHELL_PATH_COPY
  System::Call 'KERNEL32::lstrcpynW(w .r0, p r2, i ${NSIS_MAX_STRLEN})p'
!else
  System::Call '*$2(&w${NSIS_MAX_STRLEN} .s)'
  Pop $0
!endif

  FileOpen $Trace "$EXEDIR\shell-path-${PROBE_VARIANT}.log" a
  FileSeek $Trace 0 END
  FileWrite $Trace "copied=[$0]$\r$\n"
  FileClose $Trace
  System::Call 'kernel32::VirtualFree(p r3, p 0, i 0x8000)i.r6'
  StrCmp $0 "C:\Programs" success
  SetErrorLevel 2
  Goto done

  allocationFailed:
    SetErrorLevel 3
    Goto done
  success:
    SetErrorLevel 0
  done:
SectionEnd
