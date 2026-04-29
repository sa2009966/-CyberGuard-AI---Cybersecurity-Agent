# Guía de Despliegue en Vercel - CyberGuard AI

## Problema Resuelto: Dependencias Nativas de Discord.js

El error `Module not found: Can't resolve 'zlib-sync'` ocurría porque @discordjs/ws intenta importar módulos nativos que no están disponibles en el entorno serverless de Vercel.

### Solución Implementada

Hemos aplicado tres capas de configuración:

#### 1. **next.config.js** (Webpack Externals)
Marca `zlib-sync`, `bufferutil` y `utf-8-validate` como externos, indicándole a Webpack que **no** intente bundlearlos. En serverless, estos módulos se usan solo si están instalados; si no, se ignoran silenciosamente.

```javascript
config.externals.push(
  'zlib-sync',      // Compression
  'bufferutil',     // Binary protocol
  'utf-8-validate', // String validation
)
```

#### 2. **.npmrc** (pnpm Configuration)
Configura pnpm para:
- `node-linker=hoisted`: Aplana node_modules para que Vercel las encuentre fácilmente
- `optional-dependencies=true`: Permite que falten dependencias opcionales sin romper el build
- `strict-peer-dependencies=false`: No falla en advertencias de peer

#### 3. **.pnpmfile.cjs** (Hook de construcción)
Auto-aprueba los scripts de construcción de módulos nativos sin interacción manual.

---

## Comandos para Clean Deploy

### 1. Instalar dependencias (local + CI)
```bash
pnpm install
```

### 2. Limpiar caché local (importante antes de push)
```bash
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
```

### 3. Build local de prueba
```bash
pnpm run build
```

Si el build es exitoso localmente, estará listo para Vercel.

### 4. Verificar tipos
```bash
pnpm exec tsc --noEmit
```

### 5. Desplegar en Vercel
```bash
# Opción A: Push a rama y Vercel deploy automático
git add .
git commit -m "fix: discord.js native dependencies for serverless"
git push origin <tu-rama>

# Opción B: Deploy manual con Vercel CLI (si tienes instalado)
vercel --prod
```

---

## Archivos Modificados

| Archivo | Propósito |
|---------|-----------|
| `next.config.js` | Webpack config para marcar módulos nativos como externos |
| `.npmrc` | Configuración pnpm optimizada para Vercel |
| `.pnpmfile.cjs` | Hook para auto-aprobar builds de módulos nativos |
| `package.json` (devDeps) | Agregadas: zlib-sync, bufferutil, utf-8-validate |

---

## Troubleshooting

### Si aún ves el error en Vercel Build:
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Asegúrate de que `KV_REST_API_URL` y `KV_REST_API_TOKEN` están correctamente configuradas
3. Ejecuta en la terminal de Vercel:
   ```bash
   vercel redeploy --prod
   ```

### Si `pnpm install` falla localmente:
```bash
# Resuelve el lockfile
pnpm install --force

# Si aún falla:
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Verificar que el módulo se resuelve sin bundlarse:
```bash
# En tu build output, busca esto:
# ✓ Compiled successfully (modules marked as external)
grep -i "zlib-sync" .next/build-manifest.json || echo "OK: No bundled"
```

---

## Resumen Técnico

**¿Por qué funciona esta solución?**

1. **Webpack Externals**: Evita que Turbopack intente bundlear módulos que no se pueden compilar en serverless.
2. **hoisted node_modules**: Vercel puede encontrar módulos instalados más fácilmente.
3. **optional-dependencies**: Permite que el build continúe incluso si faltan dependencias opcionales.
4. **pnpmfile hook**: Silencia advertencias y aprueba automáticamente los scripts de construcción.

**Ventajas de este enfoque:**
- ✅ Discord.js funciona sin errores en serverless
- ✅ No se compromete la funcionalidad (se usan los módulos si están disponibles)
- ✅ Compatible con próximas versiones de Next.js
- ✅ Sin cambios en el código de la aplicación
