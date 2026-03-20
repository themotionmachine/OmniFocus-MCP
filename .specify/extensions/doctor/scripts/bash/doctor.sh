#!/usr/bin/env bash

# Project health diagnostic script for Spec Kit
# Usage: ./doctor.sh [--json]

set -e

JSON_MODE=false
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
    esac
done

PROJECT_ROOT="$(pwd)"
ERRORS=()
WARNINGS=()
NOTES=()

# ── 1. Project structure ──────────────────────────────────────────
check_dir() {
    local dir="$1"
    local label="$2"
    local severity="$3"
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo "  [OK] $label"
    else
        echo "  [MISSING] $label"
        if [ "$severity" = "error" ]; then
            ERRORS+=("$label is missing")
        elif [ "$severity" = "warning" ]; then
            WARNINGS+=("$label is missing")
        else
            NOTES+=("$label is missing")
        fi
    fi
}

check_file() {
    local file="$1"
    local label="$2"
    local severity="$3"
    if [ -f "$PROJECT_ROOT/$file" ]; then
        echo "  [OK] $label"
    else
        echo "  [MISSING] $label"
        if [ "$severity" = "error" ]; then
            ERRORS+=("$label is missing")
        elif [ "$severity" = "warning" ]; then
            WARNINGS+=("$label is missing")
        else
            NOTES+=("$label is missing")
        fi
    fi
}

echo ""
echo "=== Project Structure ==="
check_dir ".specify" ".specify/ directory" "error"
check_dir "specs" "specs/ directory" "info"
check_dir "scripts" "scripts/ directory" "error"
check_dir "templates" "templates/ directory" "error"
check_dir "memory" "memory/ directory" "error"
check_file "memory/constitution.md" "memory/constitution.md" "warning"

# ── 2. AI agent detection ─────────────────────────────────────────
echo ""
echo "=== AI Agent Configuration ==="

AGENT_FOUND=false
declare -A AGENTS=(
    [".claude/commands"]="Claude Code"
    [".github/agents"]="GitHub Copilot"
    [".gemini/commands"]="Gemini CLI"
    [".cursor/commands"]="Cursor"
    [".qwen/commands"]="Qwen Code"
    [".opencode/command"]="opencode"
    [".codex/prompts"]="Codex CLI"
    [".windsurf/workflows"]="Windsurf"
    [".kilocode/workflows"]="Kilo Code"
    [".augment/commands"]="Auggie CLI"
    [".codebuddy/commands"]="CodeBuddy"
    [".qoder/commands"]="Qoder CLI"
    [".roo/commands"]="Roo Code"
    [".kiro/prompts"]="Kiro CLI"
    [".agents/commands"]="Amp"
    [".shai/commands"]="SHAI"
    [".tabnine/agent/commands"]="Tabnine CLI"
    [".agent/workflows"]="Antigravity"
    [".bob/commands"]="IBM Bob"
    [".vibe/prompts"]="Mistral Vibe"
    [".kimi/skills"]="Kimi Code"
)

for path in "${!AGENTS[@]}"; do
    agent_name="${AGENTS[$path]}"
    dir_part="$(dirname "$path")"
    if [ -d "$PROJECT_ROOT/$dir_part" ]; then
        AGENT_FOUND=true
        if [ -d "$PROJECT_ROOT/$path" ] && [ "$(ls -A "$PROJECT_ROOT/$path" 2>/dev/null)" ]; then
            echo "  [OK] $agent_name (commands in $path/)"
        else
            echo "  [WARNING] $agent_name folder exists but commands directory is empty"
            WARNINGS+=("$agent_name folder exists but commands directory is empty")
        fi
    fi
done

if [ "$AGENT_FOUND" = false ]; then
    echo "  [NOTE] No AI agent folder detected"
    NOTES+=("No AI agent folder detected — this is fine if you use IDE-based agents")
fi

# ── 3. Feature specs ──────────────────────────────────────────────
echo ""
echo "=== Feature Specifications ==="

if [ -d "$PROJECT_ROOT/specs" ]; then
    FEATURE_COUNT=0
    for fdir in "$PROJECT_ROOT/specs"/*/; do
        [ -d "$fdir" ] || continue
        FEATURE_COUNT=$((FEATURE_COUNT + 1))
        fname="$(basename "$fdir")"
        has_spec=false; has_plan=false; has_tasks=false
        [ -f "$fdir/spec.md" ] && has_spec=true
        [ -f "$fdir/plan.md" ] && has_plan=true
        [ -f "$fdir/tasks.md" ] && has_tasks=true

        if $has_spec && $has_plan && $has_tasks; then
            echo "  [OK] $fname — spec, plan, tasks all present"
        else
            missing=""
            $has_spec || missing="${missing}spec "
            $has_plan || missing="${missing}plan "
            $has_tasks || missing="${missing}tasks "
            if ! $has_spec; then
                echo "  [ERROR] $fname — missing: $missing"
                ERRORS+=("Feature '$fname' is missing spec.md")
            else
                echo "  [PARTIAL] $fname — missing: $missing"
                $has_plan || NOTES+=("Feature '$fname' has no plan.md — run /speckit.plan to generate")
                $has_tasks || NOTES+=("Feature '$fname' has no tasks.md — run /speckit.tasks to generate")
            fi
        fi
    done
    if [ "$FEATURE_COUNT" -eq 0 ]; then
        echo "  [NOTE] No feature directories — run /speckit.specify to create one"
    fi
else
    echo "  [NOTE] No specs/ directory — created when you run /speckit.specify"
fi

# ── 4. Scripts health ─────────────────────────────────────────────
echo ""
echo "=== Scripts ==="

EXPECTED_SCRIPTS="common check-prerequisites create-new-feature setup-plan update-agent-context"

if [ -d "$PROJECT_ROOT/scripts/bash" ]; then
    for name in $EXPECTED_SCRIPTS; do
        script="$PROJECT_ROOT/scripts/bash/${name}.sh"
        if [ -f "$script" ]; then
            if [ ! -x "$script" ]; then
                echo "  [WARNING] bash/${name}.sh — not executable"
                WARNINGS+=("scripts/bash/${name}.sh is not executable — run chmod +x")
            else
                echo "  [OK] bash/${name}.sh"
            fi
        else
            echo "  [MISSING] bash/${name}.sh"
            ERRORS+=("scripts/bash/${name}.sh is missing")
        fi
    done
else
    echo "  [NOTE] scripts/bash/ not found"
fi

if [ -d "$PROJECT_ROOT/scripts/powershell" ]; then
    for name in $EXPECTED_SCRIPTS; do
        script="$PROJECT_ROOT/scripts/powershell/${name}.ps1"
        if [ -f "$script" ]; then
            echo "  [OK] powershell/${name}.ps1"
        else
            echo "  [MISSING] powershell/${name}.ps1"
            ERRORS+=("scripts/powershell/${name}.ps1 is missing")
        fi
    done
else
    echo "  [NOTE] scripts/powershell/ not found"
fi

# ── 5. Extensions health ──────────────────────────────────────────
echo ""
echo "=== Extensions ==="

if [ -f "$PROJECT_ROOT/.specify/extensions.yml" ]; then
    echo "  [OK] extensions.yml found"
else
    echo "  [NOTE] No extensions configured"
fi

if [ -f "$PROJECT_ROOT/.specify/extensions/registry.json" ]; then
    echo "  [OK] Extension registry found"
else
    echo "  [NOTE] No extensions installed"
fi

# ── 6. Git status ─────────────────────────────────────────────────
echo ""
echo "=== Git Repository ==="

if command -v git &>/dev/null; then
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        branch="$(git rev-parse --abbrev-ref HEAD)"
        echo "  [OK] Inside git repository"
        echo "  [OK] Current branch: $branch"
    else
        echo "  [NOTE] Not a git repository"
        NOTES+=("Not inside a git repository — git features like branching won't work")
    fi
else
    echo "  [NOTE] Git not installed"
    NOTES+=("Git is not installed")
fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "=== Diagnostic Summary ==="

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "  ${#ERRORS[@]} error(s):"
    for msg in "${ERRORS[@]}"; do
        echo "    [x] $msg"
    done
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "  ${#WARNINGS[@]} warning(s):"
    for msg in "${WARNINGS[@]}"; do
        echo "    [!] $msg"
    done
fi

if [ ${#NOTES[@]} -gt 0 ]; then
    echo ""
    echo "  ${#NOTES[@]} note(s):"
    for msg in "${NOTES[@]}"; do
        echo "    [-] $msg"
    done
fi

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ] && [ ${#NOTES[@]} -eq 0 ]; then
    echo ""
    echo "  All checks passed — project looks healthy!"
fi

echo ""

# JSON output
if [ "$JSON_MODE" = true ]; then
    echo "{"
    echo "  \"errors\": ${#ERRORS[@]},"
    echo "  \"warnings\": ${#WARNINGS[@]},"
    echo "  \"notes\": ${#NOTES[@]}"
    echo "}"
fi

# Exit code
[ ${#ERRORS[@]} -eq 0 ] && exit 0 || exit 1
