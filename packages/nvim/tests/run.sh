#!/bin/bash
set -e
cd "$(dirname "$0")/.."

failed=0
for test in tests/test_*.lua; do
  echo "Running $test..."
  if nvim --headless -u tests/minimal_init.lua -c "luafile $test" -c "qa!" 2>&1 | tee /dev/stderr | grep -q "FAIL"; then
    failed=1
  fi
done

exit $failed
