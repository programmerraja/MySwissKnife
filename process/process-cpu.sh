#!/usr/bin/env bash

# -----------------------------------------------------------------------------
# Script: benchmark.sh
# Version: 2.0 (Echo-Safe Version)
# -----------------------------------------------------------------------------

set -euo pipefail

# 1. Validation
if [[ $# -eq 0 ]]; then
    echo "Usage: ${0##*/} <command> [args...]" >&2
    exit 1
fi

# 2. Setup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGFILE="audit_${TIMESTAMP}.log"
TMPDIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'audit')

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

# 3. Execution
echo "Audit started: [$(date)]"

# Using -- with /usr/bin/time to ensure it doesn't swallow hyphens from your command
/usr/bin/time -v -o "$TMPDIR/metrics" -- "$@" > "$TMPDIR/stdout" 2> "$TMPDIR/stderr" || EXIT_CODE=$?
EXIT_CODE=${EXIT_CODE:-0}

# 4. Metric Extraction
get_val() { 
    # grep -F handles fixed strings; awk captures the value after the colon
    grep -F "$1" "$TMPDIR/metrics" | awk -F': ' '{print $2}' | xargs 
}

WALL_TIME=$(get_val "Elapsed (wall clock)")
USER_TIME=$(get_val "User time")
SYS_TIME=$(get_val "System time")
CPU_LOAD=$(get_val "Percent of CPU")
MAX_RSS_KB=$(get_val "Maximum resident set size")
VOL_CTX=$(get_val "Voluntary context switches")
INVOL_CTX=$(get_val "Involuntary context switches")
PAGE_FAULTS=$(get_val "Major (requiring I/O) page faults")

# Logic
MEM_GB=$(awk "BEGIN {printf \"%.2f\", $MAX_RSS_KB/1024/1024}")
THREAD_STR="Single-threaded"
[[ ${CPU_LOAD%*\%} -gt 105 ]] && THREAD_STR="Multi-threaded"

# 5. Clean Report Generation using 'echo'
# Using '-e' to enable backslash escapes like \t (tab) for alignment
    echo "================================================================"
    echo " PROCESS PERFORMANCE AUDIT"
    echo "================================================================"
    echo " DATE           : $(date)"
    echo " COMMAND        : $*"
    echo " STATUS         : $([[ $EXIT_CODE -eq 0 ]] && echo "SUCCESS" || echo "FAILED ($EXIT_CODE)")"
    echo "----------------------------------------------------------------"
    echo ""
    echo " [TEMPORAL METRICS]"
    echo -e "  Wall Clock\t\t: $WALL_TIME"
    echo -e "  Compute Time\t\t: ${USER_TIME}s (User) / ${SYS_TIME}s (System)"
    echo -e "  CPU Utilization\t: $CPU_LOAD ($THREAD_STR)"
    echo ""
    echo " [RESOURCE CONSUMPTION]"
    echo -e "  Peak Memory (RSS)\t: $MAX_RSS_KB KB (~$MEM_GB GB)"
    echo -e "  I/O Page Faults\t: $PAGE_FAULTS"
    echo ""
    echo " [OS SCHEDULER]"
    echo -e "  Voluntary Ctx\t\t: $VOL_CTX"
    echo -e "  Involuntary Ctx\t: $INVOL_CTX"
    echo ""
    echo " [IO SUMMARY]"
    echo -e "  STDOUT\t\t: $(wc -l < "$TMPDIR/stdout") lines ($(du -h "$TMPDIR/stdout" | awk '{print $1}'))"
    echo -e "  STDERR\t\t: $(wc -l < "$TMPDIR/stderr") lines"
    
    if [[ -s "$TMPDIR/stderr" ]]; then
        echo ""
        echo " [STDERR SNIPPET]"
        tail -n 3 "$TMPDIR/stderr" | sed 's/^/  | /'
    fi
    echo "================================================================"
