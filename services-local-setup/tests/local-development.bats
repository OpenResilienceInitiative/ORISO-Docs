#!/usr/bin/env bats

setup() {
  RUNNER="${BATS_TEST_DIRNAME}/../run-oriso-local.sh"
  PYTHON_BIN="$(command -v python3)"
  export ORISO_WORKSPACE_ROOT="${BATS_TEST_TMPDIR}/workspace"
  export ORISO_RUNTIME_DIR="${BATS_TEST_TMPDIR}/runtime"
  mkdir -p "${ORISO_WORKSPACE_ROOT}"
}

@test "doctor with missing Python still emits valid JSON and exits nonzero" {
  mkdir -p "${BATS_TEST_TMPDIR}/empty-path"
  run /usr/bin/env PATH="${BATS_TEST_TMPDIR}/empty-path" /bin/bash "${RUNNER}" doctor --json
  [ "$status" -ne 0 ]
  printf '%s' "$output" | "$PYTHON_BIN" -c 'import sys,json; d=json.load(sys.stdin); assert not d["ready"]; assert "python3" in d["errors"][0]'
  [ ! -e "$ORISO_RUNTIME_DIR" ]
}

@test "unknown selected service fails before creating runtime files" {
  run /bin/bash "${RUNNER}" start --services "admin nonexistent"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Unknown service"* ]]
  [ ! -e "$ORISO_RUNTIME_DIR" ]
}

@test "missing selected repo produces structured diagnostic without starting anything" {
  run /bin/bash "${RUNNER}" doctor --json --services admin
  [ "$status" -ne 0 ]
  printf '%s' "$output" | "$PYTHON_BIN" -c 'import sys,json; d=json.load(sys.stdin); assert not d["ready"]; assert d["selected_services"] == ["admin"]; assert any("ORISO-Admin" in e for e in d["errors"])'
  [ ! -e "$ORISO_RUNTIME_DIR" ]
}

@test "bad doctor options do not disclose supplied credentials" {
  run /bin/bash "${RUNNER}" doctor --json --bad-option DO_NOT_PRINT_THIS
  [ "$status" -ne 0 ]
  [[ "$output" != *"DO_NOT_PRINT_THIS"* ]]
  printf '%s' "$output" | "$PYTHON_BIN" -c 'import sys,json; assert json.load(sys.stdin)["errors"]'
}
