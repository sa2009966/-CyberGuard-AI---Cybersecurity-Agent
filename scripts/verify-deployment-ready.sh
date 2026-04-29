#!/bin/bash

# CyberGuard AI - Pre-Deployment Verification Script
# Ejecuta esto antes de hacer deploy a Vercel para asegurar que todo está correcto

set -e

echo "════════════════════════════════════════════════════════════"
echo "  CyberGuard AI - Vercel Deployment Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verificar que Discord NO está en package.json
echo "1. Verificando que Discord adapter ha sido removido..."
if grep -q "@chat-adapter/discord" package.json; then
  fail "❌ @chat-adapter/discord aún está en package.json. Por favor eliminarlo."
else
  pass "Discord adapter no encontrado en package.json"
fi

# 2. Verificar que Slack SÍ está en package.json
echo ""
echo "2. Verificando que Slack adapter está presente..."
if grep -q "@chat-adapter/slack" package.json; then
  pass "Slack adapter encontrado"
else
  fail "❌ Slack adapter falta en package.json"
fi

# 3. Verificar que next.config.js tiene webpack config
echo ""
echo "3. Verificando configuración de webpack en next.config.js..."
if grep -q "webpack:" next.config.js && grep -q "zlib-sync" next.config.js; then
  pass "Webpack configuration con handling de módulos nativos"
else
  fail "❌ next.config.js no tiene webpack config para módulos nativos"
fi

# 4. Verificar .npmrc
echo ""
echo "4. Verificando configuración de pnpm (.npmrc)..."
if grep -q "node-linker=hoisted" .npmrc; then
  pass ".npmrc configurado con node-linker=hoisted"
else
  warn ".npmrc no tiene node-linker=hoisted (considera agregarlo)"
fi

# 5. Verificar que no hay imports de discord en bot.tsx
echo ""
echo "5. Verificando que lib/bot.tsx no importa Discord..."
if grep -q "from.*@chat-adapter/discord" lib/bot.tsx; then
  fail "❌ lib/bot.tsx aún intenta importar @chat-adapter/discord"
else
  pass "lib/bot.tsx no intenta importar Discord"
fi

# 6. Verificar que node_modules existe (si aplica)
echo ""
echo "6. Verificando estado de node_modules..."
if [ -d "node_modules" ]; then
  pass "node_modules directory exists"
  
  # Verificar que discord.js NO está en node_modules
  if [ -d "node_modules/discord.js" ] || [ -d "node_modules/.pnpm/discord.js" ]; then
    warn "discord.js aún está en node_modules (esto se limpiará en Vercel)"
  else
    pass "discord.js no encontrado en node_modules"
  fi
else
  warn "node_modules no existe (se creará al hacer pnpm install)"
fi

# 7. Verificar estructura de carpetas críticas
echo ""
echo "7. Verificando estructura de carpetas..."
critical_dirs=("src/config" "src/core" "src/adapters" "lib" "app/api")
for dir in "${critical_dirs[@]}"; do
  if [ -d "$dir" ]; then
    pass "Carpeta $dir existe"
  else
    fail "❌ Carpeta crítica falta: $dir"
  fi
done

# 8. Verificar TypeScript compile
echo ""
echo "8. Ejecutando type check de TypeScript..."
if pnpm exec tsc --noEmit > /dev/null 2>&1; then
  pass "TypeScript type check passed"
else
  warn "TypeScript type check falló (puede haber errores de tipo)"
  pnpm exec tsc --noEmit | head -20
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Resumen de Verificación"
echo "════════════════════════════════════════════════════════════"
echo -e "✓ Passed: ${GREEN}${PASSED}${NC}"
echo -e "✗ Failed: ${RED}${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ ¡Listo para hacer deploy a Vercel!${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. git add ."
  echo "2. git commit -m 'fix: remove discord adapter for vercel deployment'"
  echo "3. git push origin v0/snuilamontes-4738-bb436131"
  echo "4. En Vercel Dashboard: Bypass build cache y re-deploy"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Hay problemas que resolver antes de hacer deploy${NC}"
  echo ""
  echo "Revisa los errores marcados con ✗ arriba."
  exit 1
fi
