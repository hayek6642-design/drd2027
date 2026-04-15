#!/bin/bash
# 🧪 Zagel RAG System - API Test Script
# Tests all endpoints after integration

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
echo "🔍 Testing Zagel API at: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  
  echo -n "Testing $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -X GET "$BASE_URL$endpoint" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  # Check if response contains "error" (case-insensitive)
  if echo "$response" | grep -qi "error"; then
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Response: $response"
    ((FAILED++))
  else
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo "ZAGEL EMBEDDINGS ENDPOINT"
echo "═══════════════════════════════════════════════════════════"
test_endpoint "Embeddings" "POST" "/api/zagel/embeddings" '{"text":"hello world"}'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "ZAGEL SEARCH ENDPOINTS"
echo "═══════════════════════════════════════════════════════════"
test_endpoint "Web Search" "POST" "/api/zagel/web-search" '{"query":"latest AI news","category":"tech"}'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "ZAGEL EXTRACTION ENDPOINTS"
echo "═══════════════════════════════════════════════════════════"
echo "Note: File extraction endpoints require multipart/form-data uploads"
echo "These are better tested with the frontend upload UI"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Zagel is ready to use.${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Check your configuration.${NC}"
  exit 1
fi
