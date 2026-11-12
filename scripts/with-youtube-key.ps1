$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HakadoshCredential {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct Credential {
        public UInt32 Flags;
        public UInt32 Type;
        public IntPtr TargetName;
        public IntPtr Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public IntPtr TargetAlias;
        public IntPtr UserName;
    }
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool Read(string target, UInt32 type, UInt32 flags, out IntPtr credential);
    [DllImport("advapi32.dll", EntryPoint = "CredFree")]
    public static extern void Free(IntPtr credential);
}
'@

$credentialPointer = [IntPtr]::Zero
try {
    if (-not [HakadoshCredential]::Read('HakadoshMinistry/YouTube', 1, 0, [ref]$credentialPointer)) {
        [Console]::Error.WriteLine('Cannot read the Generic Credential HakadoshMinistry/YouTube. Run under the Windows account that saved it.')
        exit 1
    }
    $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($credentialPointer, [type][HakadoshCredential+Credential])
    if ($credential.CredentialBlobSize -eq 0) {
        [Console]::Error.WriteLine('The YouTube credential is empty.')
        exit 1
    }
    $env:YOUTUBE_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [int]($credential.CredentialBlobSize / 2))
} finally {
    if ($credentialPointer -ne [IntPtr]::Zero) { [HakadoshCredential]::Free($credentialPointer) }
}

try {
    $nodeArguments = @(ConvertFrom-Json $env:HAKADOSH_NODE_ARGS)
    & $env:HAKADOSH_NODE_PATH @nodeArguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:YOUTUBE_API_KEY -ErrorAction SilentlyContinue
}
