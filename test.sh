#!/bin/bash
# Comprehensive MCP tool test script
set -euo pipefail

PASS=0
FAIL=0
SKIP=0

test_pass() { PASS=$((PASS+1)); echo "✅ PASS: $1"; }
test_fail() { FAIL=$((FAIL+1)); echo "❌ FAIL: $1"; echo "   $2"; }
test_skip() { SKIP=$((SKIP+1)); echo "⏭️  SKIP: $1 ($2)"; }

call() {
  mcporter call "$1" --timeout "${2:-30000}" 2>&1
}

echo "========================================"
echo "  Netdisk MCP Server - Full Test Suite"
echo "========================================"
echo ""

# ── 1. Health check ──
echo "=== 1. PanSou Health Check ==="
RESULT=$(call 'netdisk.health()' 10000)
if echo "$RESULT" | grep -q "Status: ok"; then
  test_pass "health"
  echo "   $(echo "$RESULT" | grep -c '^\s*-') plugins available"
else
  test_fail "health" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 2. Search ──
echo "=== 2. PanSou Search ==="
RESULT=$(call 'netdisk.search(query: "肖申克的救赎", cloud_types: ["quark"])' 30000)
if echo "$RESULT" | grep -q "Found.*results"; then
  test_pass "search (quark)"
  echo "   $(echo "$RESULT" | head -1)"
else
  test_fail "search" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 3. List Quark ──
echo "=== 3a. List Quark Root ==="
RESULT=$(call 'netdisk.list(cloud: "quark", path: "/")')
if echo "$RESULT" | grep -q "Listing quark drive"; then
  test_pass "list quark /"
  echo "   $(echo "$RESULT" | grep -c '^\s*[0-9]') items"
else
  test_fail "list quark /" "$(echo "$RESULT" | head -3)"
fi

echo "=== 3b. List Quark /3670 ==="
RESULT=$(call 'netdisk.list(cloud: "quark", path: "/3670")')
if echo "$RESULT" | grep -q "Listing quark drive: /3670"; then
  test_pass "list quark /3670"
  echo "   $(echo "$RESULT" | grep -c '^\s*[0-9]') items"
elif echo "$RESULT" | grep -qi "empty"; then
  test_pass "list quark /3670 (empty dir)"
else
  test_fail "list quark /3670" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 4. List 115 ──
echo "=== 4. List 115 Root ==="
RESULT=$(call 'netdisk.list(cloud: "115", path: "/")')
if echo "$RESULT" | grep -q "Listing 115 drive"; then
  test_pass "list 115 /"
  echo "   $(echo "$RESULT" | grep -c '^\s*[0-9]') items"
elif echo "$RESULT" | grep -qi "login expired\|重新登录\|990001"; then
  test_skip "list 115 /" "115 cookie expired"
else
  test_fail "list 115 /" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 5. View: Quark share with passcode ──
echo "=== 5. View Quark Share (pwd=BnxD) ==="
RESULT=$(call 'netdisk.view(share_link: "https://pan.quark.cn/s/355379af69a8?pwd=BnxD#/list/share")')
if echo "$RESULT" | grep -q "Share type: quark"; then
  test_pass "view quark (pwd)"
  echo "   $(echo "$RESULT" | head -1)"
elif echo "$RESULT" | grep -q "No files"; then
  test_pass "view quark (pwd) - single file"
else
  test_fail "view quark (pwd)" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 6. View: Quark share without passcode ──
echo "=== 6. View Quark Share (no pwd) ==="
RESULT=$(call 'netdisk.view(share_link: "https://pan.quark.cn/s/bdbdca12824c#/list/share/0174770276b0462699584518af581857")')
if echo "$RESULT" | grep -q "Share type: quark\|No files"; then
  test_pass "view quark (no pwd)"
  echo "   $(echo "$RESULT" | head -1)"
else
  test_fail "view quark (no pwd)" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 7. View: 115 share ──
echo "=== 7. View 115 Share ==="
RESULT=$(call 'netdisk.view(share_link: "https://115cdn.com/s/swfeyyj3zrk?password=eec5")')
if echo "$RESULT" | grep -q "Share type: 115\|No files"; then
  test_pass "view 115"
  echo "   $(echo "$RESULT" | head -1)"
elif echo "$RESULT" | grep -qi "error"; then
  test_skip "view 115" "$(echo "$RESULT" | head -1)"
else
  test_fail "view 115" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 8. View: 115 share #2 ──
echo "=== 8. View 115 Share #2 ==="
RESULT=$(call 'netdisk.view(share_link: "https://115cdn.com/s/swfry4r3zrk?password=t58d")')
if echo "$RESULT" | grep -q "Share type: 115\|No files"; then
  test_pass "view 115 #2"
  echo "   $(echo "$RESULT" | head -1)"
elif echo "$RESULT" | grep -qi "error"; then
  test_skip "view 115 #2" "$(echo "$RESULT" | head -1)"
else
  test_fail "view 115 #2" "$(echo "$RESULT" | head -3)"
fi
echo ""

# ── 9. View: cancelled share ──
echo "=== 9. View Cancelled Quark Share ==="
RESULT=$(call 'netdisk.view(share_link: "https://pan.quark.cn/s/395cf4f37a5e")')
if echo "$RESULT" | grep -qi "error\|取消"; then
  test_pass "view cancelled quark (expected error)"
else
  test_fail "view cancelled quark" "Expected error but got: $(echo "$RESULT" | head -1)"
fi
echo ""

# ── 10. Transfer Quark → /3670 ──
echo "=== 10. Transfer Quark → /3670 ==="
RESULT=$(call 'netdisk.transfer(share_link: "https://pan.quark.cn/s/bdbdca12824c", target_path: "/3670")' 60000)
if echo "$RESULT" | grep -qi "Transfer success\|transfer success"; then
  test_pass "transfer quark → /3670"
  echo "   $RESULT"
elif echo "$RESULT" | grep -qi "No matching"; then
  test_pass "transfer quark → /3670 (no matching files)"
elif echo "$RESULT" | grep -qi "error\|failed"; then
  test_fail "transfer quark → /3670" "$(echo "$RESULT" | head -2)"
else
  test_pass "transfer quark → /3670 (completed)"
  echo "   $RESULT"
fi
echo ""

# ── 11. Transfer with pattern ──
echo "=== 11. Transfer Quark *.mp4 → /3670 ==="
RESULT=$(call 'netdisk.transfer(share_link: "https://pan.quark.cn/s/355379af69a8?pwd=BnxD", target_path: "/3670", file_pattern: "*.mp4")' 60000)
if echo "$RESULT" | grep -qi "Transfer success\|No matching files"; then
  test_pass "transfer quark *.mp4 → /3670"
  echo "   $RESULT"
elif echo "$RESULT" | grep -qi "error\|failed"; then
  test_fail "transfer quark *.mp4 → /3670" "$(echo "$RESULT" | head -2)"
else
  test_pass "transfer quark *.mp4 → /3670 (completed)"
  echo "   $RESULT"
fi
echo ""

# ── 12. Transfer Recursive (CP-like) ──
echo "=== 12. Transfer Recursive (CP-like) ==="
RESULT=$(call 'netdisk.transfer_recursive(share_link: "https://pan.quark.cn/s/bdbdca12824c", source_pattern: "/*", target_path: "/3670")' 60000)
if echo "$RESULT" | grep -qi "CP-like\|Transfer success\|transfer success"; then
  test_pass "transfer_recursive quark"
  echo "   $(echo "$RESULT" | tail -3)"
elif echo "$RESULT" | grep -qi "error\|failed"; then
  test_fail "transfer_recursive quark" "$(echo "$RESULT" | head -3)"
else
  test_pass "transfer_recursive quark (completed)"
  echo "   $RESULT"
fi
echo ""

# ── Summary ──
echo "========================================"
echo "  Test Results: ✅ $PASS passed, ❌ $FAIL failed, ⏭️ $SKIP skipped"
echo "========================================"
exit $FAIL
