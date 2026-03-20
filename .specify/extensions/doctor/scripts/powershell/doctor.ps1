# Project health diagnostic script for Spec Kit
# Usage: .\doctor.ps1 [-Json]

param(
    [switch]$Json
)

$ProjectRoot = Get-Location
$Errors = @()
$Warnings = @()
$Notes = @()

function Check-Directory {
    param([string]$Dir, [string]$Label, [string]$Severity)
    $path = Join-Path $ProjectRoot $Dir
    if (Test-Path $path -PathType Container) {
        Write-Host "  [OK] $Label"
    } else {
        Write-Host "  [MISSING] $Label"
        switch ($Severity) {
            "error"   { $script:Errors += "$Label is missing" }
            "warning" { $script:Warnings += "$Label is missing" }
            default   { $script:Notes += "$Label is missing" }
        }
    }
}

function Check-File {
    param([string]$File, [string]$Label, [string]$Severity)
    $path = Join-Path $ProjectRoot $File
    if (Test-Path $path -PathType Leaf) {
        Write-Host "  [OK] $Label"
    } else {
        Write-Host "  [MISSING] $Label"
        switch ($Severity) {
            "error"   { $script:Errors += "$Label is missing" }
            "warning" { $script:Warnings += "$Label is missing" }
            default   { $script:Notes += "$Label is missing" }
        }
    }
}

# ── 1. Project structure ──────────────────────────────────────────
Write-Host ""
Write-Host "=== Project Structure ==="
Check-Directory ".specify" ".specify/ directory" "error"
Check-Directory "specs" "specs/ directory" "info"
Check-Directory "scripts" "scripts/ directory" "error"
Check-Directory "templates" "templates/ directory" "error"
Check-Directory "memory" "memory/ directory" "error"
Check-File "memory/constitution.md" "memory/constitution.md" "warning"

# ── 2. AI agent detection ─────────────────────────────────────────
Write-Host ""
Write-Host "=== AI Agent Configuration ==="

$AgentFound = $false
$Agents = @{
    ".claude/commands" = "Claude Code"
    ".github/agents" = "GitHub Copilot"
    ".gemini/commands" = "Gemini CLI"
    ".cursor/commands" = "Cursor"
    ".qwen/commands" = "Qwen Code"
    ".opencode/command" = "opencode"
    ".codex/prompts" = "Codex CLI"
    ".windsurf/workflows" = "Windsurf"
    ".kilocode/workflows" = "Kilo Code"
    ".augment/commands" = "Auggie CLI"
    ".codebuddy/commands" = "CodeBuddy"
    ".qoder/commands" = "Qoder CLI"
    ".roo/commands" = "Roo Code"
    ".kiro/prompts" = "Kiro CLI"
    ".agents/commands" = "Amp"
    ".shai/commands" = "SHAI"
    ".tabnine/agent/commands" = "Tabnine CLI"
    ".agent/workflows" = "Antigravity"
    ".bob/commands" = "IBM Bob"
    ".vibe/prompts" = "Mistral Vibe"
    ".kimi/skills" = "Kimi Code"
}

foreach ($entry in $Agents.GetEnumerator()) {
    $agentPath = $entry.Key
    $agentName = $entry.Value
    $dirPart = Split-Path $agentPath -Parent
    $fullDir = Join-Path $ProjectRoot $dirPart
    $fullCmds = Join-Path $ProjectRoot $agentPath

    if (Test-Path $fullDir -PathType Container) {
        $AgentFound = $true
        $hasFiles = (Test-Path $fullCmds -PathType Container) -and ((Get-ChildItem $fullCmds -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
        if ($hasFiles) {
            Write-Host "  [OK] $agentName (commands in $agentPath/)"
        } else {
            Write-Host "  [WARNING] $agentName folder exists but commands directory is empty"
            $Warnings += "$agentName folder exists but commands directory is empty"
        }
    }
}

if (-not $AgentFound) {
    Write-Host "  [NOTE] No AI agent folder detected"
    $Notes += "No AI agent folder detected"
}

# ── 3. Feature specs ──────────────────────────────────────────────
Write-Host ""
Write-Host "=== Feature Specifications ==="

$specsDir = Join-Path $ProjectRoot "specs"
if (Test-Path $specsDir -PathType Container) {
    $featureDirs = Get-ChildItem $specsDir -Directory | Sort-Object Name
    if ($featureDirs.Count -eq 0) {
        Write-Host "  [NOTE] No feature directories"
    } else {
        foreach ($fdir in $featureDirs) {
            $hasSpec = Test-Path (Join-Path $fdir.FullName "spec.md")
            $hasPlan = Test-Path (Join-Path $fdir.FullName "plan.md")
            $hasTasks = Test-Path (Join-Path $fdir.FullName "tasks.md")

            if ($hasSpec -and $hasPlan -and $hasTasks) {
                Write-Host "  [OK] $($fdir.Name) — spec, plan, tasks all present"
            } else {
                $missing = @()
                if (-not $hasSpec) { $missing += "spec" }
                if (-not $hasPlan) { $missing += "plan" }
                if (-not $hasTasks) { $missing += "tasks" }

                if (-not $hasSpec) {
                    Write-Host "  [ERROR] $($fdir.Name) — missing: $($missing -join ', ')"
                    $Errors += "Feature '$($fdir.Name)' is missing spec.md"
                } else {
                    Write-Host "  [PARTIAL] $($fdir.Name) — missing: $($missing -join ', ')"
                    if (-not $hasPlan) { $Notes += "Feature '$($fdir.Name)' has no plan.md" }
                    if (-not $hasTasks) { $Notes += "Feature '$($fdir.Name)' has no tasks.md" }
                }
            }
        }
    }
} else {
    Write-Host "  [NOTE] No specs/ directory"
}

# ── 4. Scripts health ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== Scripts ==="

$expectedScripts = @("common", "check-prerequisites", "create-new-feature", "setup-plan", "update-agent-context")

$bashDir = Join-Path $ProjectRoot "scripts/bash"
if (Test-Path $bashDir -PathType Container) {
    foreach ($name in $expectedScripts) {
        $script = Join-Path $bashDir "$name.sh"
        if (Test-Path $script) {
            Write-Host "  [OK] bash/$name.sh"
        } else {
            Write-Host "  [MISSING] bash/$name.sh"
            $Errors += "scripts/bash/$name.sh is missing"
        }
    }
}

$psDir = Join-Path $ProjectRoot "scripts/powershell"
if (Test-Path $psDir -PathType Container) {
    foreach ($name in $expectedScripts) {
        $script = Join-Path $psDir "$name.ps1"
        if (Test-Path $script) {
            Write-Host "  [OK] powershell/$name.ps1"
        } else {
            Write-Host "  [MISSING] powershell/$name.ps1"
            $Errors += "scripts/powershell/$name.ps1 is missing"
        }
    }
}

# ── 5. Extensions health ──────────────────────────────────────────
Write-Host ""
Write-Host "=== Extensions ==="

$extYml = Join-Path $ProjectRoot ".specify/extensions.yml"
if (Test-Path $extYml) {
    Write-Host "  [OK] extensions.yml found"
} else {
    Write-Host "  [NOTE] No extensions configured"
}

$regJson = Join-Path $ProjectRoot ".specify/extensions/registry.json"
if (Test-Path $regJson) {
    Write-Host "  [OK] Extension registry found"
} else {
    Write-Host "  [NOTE] No extensions installed"
}

# ── 6. Git status ─────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Git Repository ==="

$gitAvailable = Get-Command git -ErrorAction SilentlyContinue
if ($gitAvailable) {
    $isGit = git rev-parse --is-inside-work-tree 2>$null
    if ($isGit -eq "true") {
        $branch = git rev-parse --abbrev-ref HEAD
        Write-Host "  [OK] Inside git repository"
        Write-Host "  [OK] Current branch: $branch"
    } else {
        Write-Host "  [NOTE] Not a git repository"
        $Notes += "Not inside a git repository"
    }
} else {
    Write-Host "  [NOTE] Git not installed"
    $Notes += "Git is not installed"
}

# ── Summary ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Diagnostic Summary ==="

if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "  $($Errors.Count) error(s):"
    foreach ($msg in $Errors) { Write-Host "    [x] $msg" }
}

if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "  $($Warnings.Count) warning(s):"
    foreach ($msg in $Warnings) { Write-Host "    [!] $msg" }
}

if ($Notes.Count -gt 0) {
    Write-Host ""
    Write-Host "  $($Notes.Count) note(s):"
    foreach ($msg in $Notes) { Write-Host "    [-] $msg" }
}

if ($Errors.Count -eq 0 -and $Warnings.Count -eq 0 -and $Notes.Count -eq 0) {
    Write-Host ""
    Write-Host "  All checks passed — project looks healthy!"
}

Write-Host ""

if ($Json) {
    @{
        errors = $Errors.Count
        warnings = $Warnings.Count
        notes = $Notes.Count
    } | ConvertTo-Json
}

if ($Errors.Count -gt 0) { exit 1 } else { exit 0 }
