'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── tipos ────────────────────────────────────────────────────────────────────
interface ParsedOption   { name: string; price: number }
interface ParsedGroup    { name: string; options: ParsedOption[] }
interface ParsedProduct  { name: string; price: number; description?: string; groups: ParsedGroup[] }
interface ParsedCategory { name: string; catGroups: ParsedGroup[]; products: ParsedProduct[] }

// ── parser ───────────────────────────────────────────────────────────────────
function parseMenuText(text: string): ParsedCategory[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const categories: ParsedCategory[] = []
  let cat: ParsedCategory | null = null
  let product: ParsedProduct | null = null
  let group: ParsedGroup | null = null

  function extractPrice(str: string) {
    const m = str.match(/\$[\d.,]+/)
    if (!m) return { name: str.trim(), price: 0 }
    const price = parseInt(m[0].replace('$', '').replace(/[.,]/g, '')) || 0
    const name = str.replace(/\$[\d.,]+/, '').trim()
    return { name, price }
  }

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('##')) {
      group = { name: line.replace(/^##\s*/, '').trim(), options: [] }
      if (product) product.groups.push(group)
      else if (cat) cat.catGroups.push(group)
    } else if (line.startsWith('# ') || (line.startsWith('#') && !line.startsWith('##'))) {
      group = null
      product = null
      cat = { name: line.replace(/^#\s*/, '').trim(), catGroups: [], products: [] }
      categories.push(cat)
    } else if (line.startsWith('! ') || line.startsWith('!')) {
      group = null
      if (!cat) { cat = { name: 'General', catGroups: [], products: [] }; categories.push(cat) }
      const { name, price } = extractPrice(line.replace(/^!\s*/, ''))
      product = { name, price, groups: [] }
      cat.products.push(product)
    } else if (line.startsWith('> ') || line.startsWith('>')) {
      if (product) product.description = line.replace(/^>\s*/, '').trim()
    } else if (line.startsWith('* ') || line.startsWith('*')) {
      if (!group) {
        // si no hay grupo activo, creamos uno genérico
        group = { name: 'Opciones', options: [] }
        if (product) product.groups.push(group)
        else if (cat) cat.catGroups.push(group)
      }
      const { name, price } = extractPrice(line.replace(/^\*\s*/, ''))
      group.options.push({ name, price })
    }
  }

  // Filtrar nombres vacíos en productos y opciones
  for (const c of categories) {
    c.products = c.products.filter((p) => p.name.trim())
    for (const p of c.products) {
      p.groups = p.groups.filter((g) => g.name.trim())
      for (const g of p.groups) g.options = g.options.filter((o) => o.name.trim())
    }
    c.catGroups = c.catGroups.filter((g) => g.name.trim())
    for (const g of c.catGroups) g.options = g.options.filter((o) => o.name.trim())
  }

  return categories.filter((c) => c.name && (c.products.length > 0 || c.catGroups.length > 0))
}

// ── ejemplo de sintaxis ───────────────────────────────────────────────────────
const EXAMPLE = `# Hamburguesas
## Cocción
* Jugoso
* Término medio
* Bien cocido

! Classic Burger $12000
> Con lechuga, tomate y cheddar
## Adicionales
* Extra queso $2000
* Bacon $3000

! Veggie Burger $10000

# Bebidas
! Gaseosa $3000
! Jugo Natural $4000`

// ── colores por prefijo ───────────────────────────────────────────────────────
function colorLine(line: string) {
  if (/^##/.test(line)) return 'text-amber-600 font-medium'
  if (/^#/.test(line))  return 'text-gray-900 font-bold'
  if (/^!/.test(line))  return 'text-blue-600 font-medium'
  if (/^>/.test(line))  return 'text-purple-500 italic'
  if (/^\*/.test(line)) return 'text-green-600'
  return 'text-gray-500'
}

// ── componente principal ──────────────────────────────────────────────────────
export default function MenuImportModal({
  restaurantId,
  onClose,
  onImported,
}: {
  restaurantId: string
  onClose: () => void
  onImported: () => void
}) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]           = useState<1 | 2>(1)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [menuText, setMenuText]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [showExample, setShowExample] = useState(false)

  function handleFile(file: File) {
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  async function analyze() {
    if (!imageFile) return
    setAnalyzing(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', imageFile)
      const res  = await fetch('/api/import/menu', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.text) { setError(json.error ?? 'No se pudo leer el menú'); return }
      setMenuText(json.text); setStep(2); setShowExample(false)
    } catch { setError('Error de conexión') }
    finally   { setAnalyzing(false) }
  }

  async function importToDb() {
    const parsed = parseMenuText(menuText)
    if (!parsed.length) { setError('No se detectaron categorías. Revisá el formato.'); return }

    setImporting(true); setError(null)
    try {
      // sort_order base
      const { data: existingCats } = await supabase
        .from('categories').select('sort_order')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: false }).limit(1)
      let sortOrder = (existingCats?.[0]?.sort_order ?? -1) + 1

      for (const cat of parsed) {
        // 1. crear categoría
        const { data: newCat } = await supabase
          .from('categories')
          .insert({ restaurant_id: restaurantId, name: cat.name, sort_order: sortOrder++ })
          .select('id').single()
        if (!newCat) continue

        // 2. extras de categoría
        for (const grp of cat.catGroups) {
          await insertExtraGroup(grp, null, newCat.id)
        }

        // 3. productos
        for (let pi = 0; pi < cat.products.length; pi++) {
          const p = cat.products[pi]
          const { data: newProd } = await supabase
            .from('products')
            .insert({ category_id: newCat.id, name: p.name, price: p.price, description: p.description ?? null, sort_order: pi })
            .select('id').single()
          if (!newProd) continue

          // extras de producto
          for (const grp of p.groups) {
            await insertExtraGroup(grp, newProd.id, null)
          }
        }
      }

      onImported()
    } catch (e) {
      console.error(e)
      setError('Error al importar. Intentá de nuevo.')
    } finally { setImporting(false) }
  }

  async function insertExtraGroup(
    grp: ParsedGroup,
    productId: string | null,
    categoryId: string | null,
  ) {
    if (!grp.options.length) return
    const { data: newGrp } = await supabase
      .from('extra_groups')
      .insert({ restaurant_id: restaurantId, name: grp.name, is_required: false, is_multiple: true })
      .select('id').single()
    if (!newGrp) return

    await supabase.from('extra_options').insert(
      grp.options.map((o, i) => ({ extra_group_id: newGrp.id, name: o.name, price_add: o.price, sort_order: i }))
    )

    if (productId) {
      await supabase.from('product_extra_groups').insert({ product_id: productId, extra_group_id: newGrp.id })
    } else if (categoryId) {
      await supabase.from('category_extra_groups').insert({ category_id: categoryId, extra_group_id: newGrp.id })
    }
  }

  const parsed = step === 2 ? parseMenuText(menuText) : []
  const totalProducts = parsed.reduce((s, c) => s + c.products.length, 0)
  const totalGroups   = parsed.reduce((s, c) =>
    s + c.catGroups.length + c.products.reduce((ps, p) => ps + p.groups.length, 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-xl">

        {/* Handle móvil */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-base">Importar menú con IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 1
                ? 'Subí una foto de tu menú físico o digital'
                : 'Revisá y editá el texto antes de importar'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        {/* ── PASO 1 ── */}
        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
              <div
                onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors min-h-52">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl object-contain" />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">📷</div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Arrastrá o tocá para subir</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP · máx. 10 MB</p>
                      <p className="text-xs text-gray-400 mt-0.5">Tip: un screenshot del menú funciona perfecto ✨</p>
                    </div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {imagePreview && (
                <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600 text-center">Cambiar imagen</button>
              )}

              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
                💡 La IA va a leer el menú y generar texto editable con categorías, productos y extras organizados.
              </div>
            </div>

            <div className="px-5 pb-6 pt-3 border-t border-gray-100 shrink-0">
              <button onClick={analyze} disabled={!imageFile || analyzing}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                {analyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                    </svg>
                    Analizando imagen...
                  </>
                ) : '✨ Analizar con IA'}
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2 ── */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

              {/* Leyenda */}
              <div className="px-5 pt-4 pb-2 shrink-0">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-900 font-bold">
                    <code className="font-mono">#</code> Categoría
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <code className="font-mono">##</code> Grupo de extras
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <code className="font-mono">!</code> Producto
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-500 italic">
                    <code className="font-mono not-italic">&gt;</code> Descripción
                  </span>
                  <span className="flex items-center gap-1.5 text-green-600">
                    <code className="font-mono">*</code> Opción del grupo
                  </span>
                </div>

                {/* Ejemplo colapsable */}
                <button
                  onClick={() => setShowExample((v) => !v)}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    style={{ transform: showExample ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M4 2l4 4-4 4"/>
                  </svg>
                  {showExample ? 'Ocultar ejemplo' : 'Ver ejemplo de formato'}
                </button>

                {showExample && (
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono leading-5">
                    {EXAMPLE.split('\n').map((line, i) => (
                      <div key={i} className={colorLine(line) || 'text-gray-400'}>
                        {line || <br />}
                      </div>
                    ))}
                    <p className="mt-2 text-gray-400 font-sans not-italic text-[11px]">
                      💡 <strong>##</strong> después de <strong>#</strong> = extras para toda la categoría · <strong>##</strong> después de <strong>!</strong> = extras solo de ese producto
                    </p>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="flex-1 px-5 pb-3 min-h-0 flex flex-col">
                <textarea
                  value={menuText}
                  onChange={(e) => setMenuText(e.target.value)}
                  className="w-full flex-1 min-h-64 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-none leading-6 text-gray-800"
                  spellCheck={false}
                />
              </div>

              {/* Resumen */}
              {parsed.length > 0 && (
                <div className="px-5 pb-3 shrink-0">
                  <p className="text-xs text-gray-400 mb-2">
                    Se van a crear{' '}
                    <strong className="text-gray-700">{parsed.length} categorías</strong>,{' '}
                    <strong className="text-gray-700">{totalProducts} productos</strong>
                    {totalGroups > 0 && (
                      <> y <strong className="text-gray-700">{totalGroups} grupos de extras</strong></>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.map((cat, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        {cat.name}
                        <span className="text-gray-400 ml-1">
                          ({cat.products.length} prod{cat.catGroups.length > 0 ? `, ${cat.catGroups.length} extras cat.` : ''})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mx-5 mb-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl shrink-0">{error}</div>
              )}
            </div>

            <div className="px-5 pb-6 pt-3 border-t border-gray-100 shrink-0 flex gap-2">
              <button onClick={() => setStep(1)}
                className="border border-gray-200 text-gray-600 px-4 py-3 rounded-2xl text-sm font-medium hover:bg-gray-50">
                ← Volver
              </button>
              <button onClick={importToDb} disabled={importing || parsed.length === 0}
                className="flex-1 bg-black text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-40 hover:bg-gray-800 transition-colors">
                {importing ? 'Importando...' : `Importar ${totalProducts} productos`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
