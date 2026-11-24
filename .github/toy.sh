#!/usr/bin/env bash
# Toy job: reads .github/toy-scenario and acts. $1 = job id, $2 = matrix leg.
set -u
SCEN=$(cat .github/toy-scenario)
echo "scenario=$SCEN job=$1 leg=$2"
case "$1" in
  *-plan)
    if [ "$SCEN" = "docs" ]; then echo "run=false" >> "$GITHUB_OUTPUT"; else echo "run=true" >> "$GITHUB_OUTPUT"; fi
    echo 'shards=[{"name":"inflation"},{"name":"loan-1of2"},{"name":"loan-2of2"},{"name":"shared"}]' >> "$GITHUB_OUTPUT"
    echo "fingerprint=toy" >> "$GITHUB_OUTPUT"
    exit 0 ;;
esac
if [ "$SCEN" = "validation-fail" ] && [ "$2" = "Lint" ]; then sleep 10; echo "planted failure"; exit 1; fi
if [ "$SCEN" = "tool-fail" ] && [ "$1" = "mutation-shard" ] && [ "$2" = "inflation" ]; then sleep 15; echo "planted failure"; exit 1; fi
case "$1" in
  validation) sleep 60 ;;
  *-shard|*-tool) sleep 90 ;;
  *) sleep 5 ;;
esac
echo ok
