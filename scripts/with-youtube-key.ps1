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

$namedCredentials = @(
    @{ Target = 'HakadoshMinistry/YouTube'; Variable = 'YOUTUBE_API_KEY'; Required = $true },
    @{ Target = 'HakadoshMinistry/Resend'; Variable = 'RESEND_API_KEY'; Required = $false },
    @{ Target = 'HakadoshMinistry/TurnstileSecret'; Variable = 'TURNSTILE_SECRET_KEY'; Required = $false },
    @{ Target = 'HakadoshMinistry/TurnstileSite'; Variable = 'TURNSTILE_SITE_KEY'; Required = $false }
)
foreach ($entry in $namedCredentials) {
    if ([Environment]::GetEnvironmentVariable($entry.Variable, 'Process')) { continue }
    $credentialPointer = [IntPtr]::Zero
    try {
        if (-not [HakadoshCredential]::Read($entry.Target, 1, 0, [ref]$credentialPointer)) {
            if ($entry.Required) {
                [Console]::Error.WriteLine('Cannot read the Generic Credential HakadoshMinistry/YouTube. Run under the Windows account that saved it.')
                exit 1
            }
            continue
        }
        $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($credentialPointer, [type][HakadoshCredential+Credential])
        if ($credential.CredentialBlobSize -gt 0) {
            $credentialValue = [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [int]($credential.CredentialBlobSize / 2))
            [Environment]::SetEnvironmentVariable($entry.Variable, $credentialValue, 'Process')
            $credentialValue = $null
        } elseif ($entry.Required) {
            [Console]::Error.WriteLine('The YouTube credential is empty.')
            exit 1
        }
    } finally {
        if ($credentialPointer -ne [IntPtr]::Zero) { [HakadoshCredential]::Free($credentialPointer) }
    }
}

try {
    $nodeArguments = @(ConvertFrom-Json $env:HAKADOSH_NODE_ARGS)
    & $env:HAKADOSH_NODE_PATH @nodeArguments
    exit $LASTEXITCODE
} finally {
    foreach ($entry in $namedCredentials) { [Environment]::SetEnvironmentVariable($entry.Variable, $null, 'Process') }
}
