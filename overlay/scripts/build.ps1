param(
    [string]$Godot = 'C:\Program Files\Godot\Godot.exe.exe',
    [string]$WindowsTemplate = '',
    [string]$OutputDirectory = ''
)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $project '.build\CopyPanda' }
$template = Join-Path $project '.build\windows_release_x86_64.exe'
New-Item -ItemType Directory -Force -Path (Split-Path $template),$OutputDirectory | Out-Null
if ($WindowsTemplate) { Copy-Item -LiteralPath $WindowsTemplate -Destination $template -Force }
if (!(Test-Path -LiteralPath $template)) {
    throw 'Provide -WindowsTemplate with the official Godot 4.7.2 Windows x86_64 release export template.'
}
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$helper = Join-Path $project 'platform\windows\CopyPanda.SessionEvents.exe'
$source = Join-Path $project 'platform\windows\SessionEvents.cs'
& $compiler /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll /reference:System.dll "/out:$helper" $source
if ($LASTEXITCODE) { throw 'Windows session helper compilation failed.' }
$importArguments = @('--headless','--editor','--path',('"'+$project+'"'),'--log-file',('"'+(Join-Path $project '.build\import.log')+'"'),'--quit')
$importProcess = Start-Process -FilePath $Godot -ArgumentList $importArguments -Wait -PassThru -WindowStyle Hidden
if ($importProcess.ExitCode) { throw 'Godot import failed.' }
$exportArguments = @('--headless','--path',('"'+$project+'"'),'--log-file',('"'+(Join-Path $project '.build\export.log')+'"'),'--export-release','"Windows Desktop"',('"'+(Join-Path $OutputDirectory 'CopyPanda.exe')+'"'))
$exportProcess = Start-Process -FilePath $Godot -ArgumentList $exportArguments -Wait -PassThru -WindowStyle Hidden
if ($exportProcess.ExitCode) { throw 'Godot export failed.' }
Copy-Item -LiteralPath $helper -Destination $OutputDirectory -Force
Copy-Item -LiteralPath (Join-Path $project 'PORTABLE-README.txt') -Destination $OutputDirectory -Force
Write-Host "Portable build: $OutputDirectory"
