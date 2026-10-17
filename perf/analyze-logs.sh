#!/usr/bin/env bash
# Key metrics from the JSON log file written by the back:
# response time per endpoint, HTTP statuses, file sizes per action, orphan files.
# Usage, from the repository root: ./perf/analyze-logs.sh [log file]
set -euo pipefail

LOG_FILE="${1:-back/logs/datashare.log}"

if ! command -v jq >/dev/null; then
	echo "jq is required: https://jqlang.org/download/" >&2
	exit 1
fi
if [[ ! -f "$LOG_FILE" ]]; then
	echo "Log file not found: $LOG_FILE" >&2
	exit 1
fi

table() {
	column -t -s $'\t'
}

echo "== Period"
jq -s -r '"\(.[0]["@timestamp"]) -> \(.[-1]["@timestamp"]) (UTC), \(length) lines"' "$LOG_FILE"

echo
echo "== Response time per endpoint (ms, measured by the server)"
# File ids are replaced by {id} so that every download or delete counts as one endpoint.
# Percentile by nearest rank: the value below which p % of the requests fall
jq -s -r '
	def percentile(p): sort | .[(length * p | ceil) - 1];
	map(select(.durationMs != null)
		| .endpoint = "\(.method) \(.path | gsub("[0-9a-f-]{36}"; "{id}"))")
	| group_by(.endpoint) | sort_by(-length)
	| ["ENDPOINT", "REQUESTS", "MEDIAN", "P95", "MAX"],
	  (.[] | (map(.durationMs)) as $d
		| [.[0].endpoint, length, ($d | percentile(0.5)), ($d | percentile(0.95)), ($d | max)])
	| @tsv' "$LOG_FILE" | table

echo
echo "== HTTP statuses"
jq -s -r '
	map(select(.durationMs != null)) | group_by(.status)
	| ["STATUS", "REQUESTS"], (.[] | [.[0].status, length])
	| @tsv' "$LOG_FILE" | table

echo
echo "== Files per action"
jq -s -r '
	def human: if . >= 1048576 then "\(. / 1048576 * 10 | round / 10) MiB"
		elif . >= 1024 then "\(. / 1024 * 10 | round / 10) KiB"
		else "\(. | round) B" end;
	map(select(.action and .sizeBytes != null)) | group_by(.action)
	| ["ACTION", "FILES", "TOTAL", "AVERAGE"],
	  (.[] | (map(.sizeBytes)) as $s
		| [.[0].action, length, ($s | add | human), ($s | add / length | human)])
	| @tsv' "$LOG_FILE" | table

echo
echo "== Orphan files (deleted from the database, left on disk)"
jq -r 'select(.log.level == "WARN" and .action == "delete") | "\(.["@timestamp"]) \(.fileId)"' "$LOG_FILE" \
	| grep . || echo "none"
