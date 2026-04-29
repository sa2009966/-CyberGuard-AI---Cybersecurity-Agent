# Vercel Deployment Fix Guide - CyberGuard AI

## Problema Identificado
**Error:** `Module not found: Can't resolve 'zlib-sync' in @discordjs/ws`

**Causa Raíz:** 
- `@chat-adapter/discord` estaba instalado en `package.json`
- Discord.js depende de módulos nativos (`zlib-sync`, `bufferutil`, `utf-8-validate`) que no pueden compilarse en el entorno serverless de Vercel
- Turbopack intentaba bundlear estos módulos y fallaba

## Soluciones Aplicadas

### 1. ✅ Removido Discord Adapter
- Eliminado `@chat-adapter/discord` de `package.json`
- Solo Slack adapter permanece activo (no tiene dependencias nativas)

### 2. ✅ Configuración Robusta de next.config.js
```javascript
webpack: (config, { isServer }) => {
  // Marca módulos nativos como 'external' para que no se bundleen
  // Discord.js degradará gracefully si no están disponibles
}
```

### 3. ✅ Optimización de .npmrc
```ini
node-linker=hoisted       # Flattea node_modules para Vercel
strict-peer-dependencies=false
optional-dependencies=true  # Ignora deps opcionales faltantes
```

## Plan de Re-Despliegue (Paso a Paso)

### Opción A: Desde GitHub (Recomendado - Automático)

```bash
# 1. Commit de los cambios
git add package.json next.config.js .npmrc
git commit -m "fix: remove discord adapter and configure webpack for native modules"

# 2. Push a la rama de feature
git push origin v0/snuilamontes-4738-bb436131

# 3. En Vercel Dashboard:
# - Ve a tu proyecto CyberGuard AI
# - Abre la rama 'v0/snuilamontes-4738-bb436131'
# - Verás un nuevo Deploy iniciándose automáticamente
```

### Opción B: Desde CLI de Vercel (Fuerza caché limpio)

```bash
# 1. Instala Vercel CLI (si no lo tienes)
npm i -g vercel

# 2. Auténticate con Vercel
vercel login

# 3. Re-deploy con fuerza (ignora caché anterior)
vercel deploy --prod --force

# 4. Espera a que el build termine (5-15 min)
```

### Opción C: Fuerza Limpia en Dashboard

```
Dashboard > Settings > Deployments
↓
"Override Function Caching" → Toggle ON
↓
Selecciona rama 'v0/snuilamontes-4738-bb436131'
↓
Haz click en "Redeploy"
↓
Vercel usará pnpm install limpio sin caché
```

## Verificación Post-Despliegue

### 1. Monitorea el Build Log
```
Vercel Dashboard > Deployments > [Tu deployment]
Busca: "✅ Created edge functions"
Busca: "✅ Prerender routes"
```

### 2. Verifica que NO haya estos errores
```
❌ Module not found: Can't resolve 'zlib-sync'
❌ zlib-sync: command 'node-gyp' not found
❌ Cannot find module '@discordjs'
```

### 3. Prueba el Health Check
```bash
curl https://tu-dominio.vercel.app/api/health
# Deberías recibir:
# {"status":"ok","platform":"slack",...}
```

## Limpieza Local (Opcional pero Recomendado)

Si trabajas localmente y quieres sincronizar con los cambios:

```bash
# 1. Limpia node_modules completamente
rm -rf node_modules pnpm-lock.yaml

# 2. Reinstala dependencias limpias
pnpm install

# 3. Verifica que NO haya discord
pnpm list | grep discord
# No debería mostrar nada

# 4. Build local de prueba
pnpm run build

# 5. Si todo está bien, push de cambios
git add .
git commit -m "chore: clean install after discord removal"
git push
```

## Qué Cambió Exactamente

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `package.json` | `-@chat-adapter/discord` | Evita bundlear módulos nativos |
| `next.config.js` | `webpack.externals += [zlib-sync, ...]` | Marca nativos como external |
| `.npmrc` | `node-linker=hoisted` | Flattea deps para mejor resolución |

## Si Aún Falla...

### Síntoma A: "Module not found: zlib-sync"
```
Solución:
1. En Vercel Dashboard > Settings > Environment Variables
2. Verifica que KV_REST_API_URL y KV_REST_API_TOKEN existan
3. Haz re-deploy con --force
```

### Síntoma B: "Cannot find module 'chat-adapter/discord'"
```
Solución:
1. Verifica que package.json NO contenga @chat-adapter/discord
2. En Vercel Dashboard > Settings > Build & Development
3. Haz click en "Bypass build cache"
4. Dispara un nuevo deploy
```

### Síntoma C: "pnpm resolve error"
```
Solución:
1. En tu local: rm -rf node_modules && pnpm install
2. Commit el pnpm-lock.yaml actualizado
3. Push a GitHub
4. Vercel re-buildará automáticamente
```

## Confirmación de Éxito

✅ **Build exitoso cuando ves:**
```
✓ Compiled successfully
✓ Ready to start production server
✓ GET /api/health 200
```

✅ **Dashboard muestra:**
- Rama 'v0/...' con status "Ready"
- Último deployment timestamp reciente
- No hay "Error" o "Failed" badges

---

**Última actualización:** 2026-04-29
**Autor:** CyberGuard AI - Vercel Deployment Expert
