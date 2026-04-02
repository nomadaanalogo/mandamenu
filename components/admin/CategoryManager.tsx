'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ExtraGroupManager from './ExtraGroupManager'
import MenuImportModal from './MenuImportModal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface ExtraOption { id: string; name: string; price_add: number }
interface ExtraGroup {
  id: string; name: string; is_required: boolean; is_multiple: boolean
  extra_options: ExtraOption[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  is_available: boolean; is_featured: boolean
  product_extra_groups?: { extra_groups: ExtraGroup }[]
}
interface Category {
  id: string; name: string; is_active: boolean
  products: Product[]
  category_extra_groups?: { extra_groups: ExtraGroup }[]
}

// --- Iconos SVG ---
const IcoPencil = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z"/>
  </svg>
)
const IcoEye = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <ellipse cx="8" cy="8" rx="6.5" ry="4"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
)
const IcoEyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.3 4.4C3 5.3 2 6.5 1.5 8c1 2.8 3.8 5 6.5 5 1.4 0 2.8-.5 3.9-1.3M7.1 3.1C7.4 3 7.7 3 8 3c2.7 0 5.5 2.2 6.5 5-.4 1-.9 2-1.7 2.8"/>
  </svg>
)
const IcoTrash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4h11M6 4V2.5h4V4M5.5 4l.5 9M10.5 4l-.5 9M3.5 4l1 10h7l1-10"/>
  </svg>
)
const IcoStarFilled = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1.5l1.7 3.4 3.8.55-2.75 2.68.65 3.78L8 10.1l-3.4 1.83.65-3.78L2.5 5.45l3.8-.55L8 1.5z"/>
  </svg>
)
const IcoStarOutline = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M8 1.5l1.7 3.4 3.8.55-2.75 2.68.65 3.78L8 10.1l-3.4 1.83.65-3.78L2.5 5.45l3.8-.55L8 1.5z"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 8l4.5 4.5L14 4"/>
  </svg>
)
const IcoX = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 3l10 10M13 3L3 13"/>
  </svg>
)
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
    <path d="M3 6l5 5 5-5"/>
  </svg>
)
const IcoSparkle = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 1v14M1 8h14M4 4l8 8M12 4l-8 8"/>
  </svg>
)

// --- Tooltip ---
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-20">
        {label}
      </span>
    </div>
  )
}

// --- Botón icono ---
function IBtn({ onClick, label, className = '', children, stopProp = true }: {
  onClick: () => void; label: string; className?: string; children: React.ReactNode; stopProp?: boolean
}) {
  return (
    <Tip label={label}>
      <button
        onClick={(e) => { if (stopProp) e.stopPropagation(); onClick() }}
        className={`p-1.5 rounded-lg transition-colors ${className}`}>
        {children}
      </button>
    </Tip>
  )
}

// ====== CATEGORYMANAGER ======
export default function CategoryManager({ restaurantId, initialCategories }: {
  restaurantId: string; initialCategories: Category[]
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; description?: string; onConfirm: () => Promise<void> } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const supabase = createClient()

  async function runConfirm() {
    if (!confirmAction) return
    setConfirming(true)
    await confirmAction.onConfirm()
    setConfirming(false)
    setConfirmAction(null)
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const { data } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, name: newCatName, sort_order: categories.length })
      .select().single()
    if (data) setCategories([...categories, { ...data, products: [], category_extra_groups: [] }])
    setNewCatName('')
    setAddingCat(false)
  }

  async function renameCategory(id: string, name: string) {
    await supabase.from('categories').update({ name }).eq('id', id)
    setCategories(categories.map((c) => c.id === id ? { ...c, name } : c))
  }

  async function toggleCategory(id: string, current: boolean) {
    await supabase.from('categories').update({ is_active: !current }).eq('id', id)
    setCategories(categories.map((c) => c.id === id ? { ...c, is_active: !current } : c))
  }

  async function deleteCategory(id: string) {
    setConfirmAction({
      title: '¿Eliminar esta categoría?',
      description: 'Se eliminarán todos sus productos y extras.',
      onConfirm: async () => {
        const { data: products } = await supabase.from('products').select('id').eq('category_id', id)
        const productIds = (products ?? []).map((p) => p.id)
        const { data: ceg } = await supabase.from('category_extra_groups').select('extra_group_id').eq('category_id', id)
        const { data: peg } = productIds.length > 0
          ? await supabase.from('product_extra_groups').select('extra_group_id').in('product_id', productIds)
          : { data: [] }
        const extraGroupIds = [...new Set([...(ceg ?? []).map((r) => r.extra_group_id), ...(peg ?? []).map((r) => r.extra_group_id)])]
        await supabase.from('category_extra_groups').delete().eq('category_id', id)
        if (productIds.length > 0) await supabase.from('product_extra_groups').delete().in('product_id', productIds)
        if (extraGroupIds.length > 0) {
          const { data: sC } = await supabase.from('category_extra_groups').select('extra_group_id').in('extra_group_id', extraGroupIds)
          const { data: sP } = await supabase.from('product_extra_groups').select('extra_group_id').in('extra_group_id', extraGroupIds)
          const linked = new Set([...(sC ?? []).map((r) => r.extra_group_id), ...(sP ?? []).map((r) => r.extra_group_id)])
          const orphaned = extraGroupIds.filter((eid) => !linked.has(eid))
          if (orphaned.length > 0) {
            await supabase.from('extra_options').delete().in('extra_group_id', orphaned)
            await supabase.from('extra_groups').delete().in('id', orphaned)
          }
        }
        if (productIds.length > 0) await supabase.from('products').delete().in('id', productIds)
        await supabase.from('categories').delete().eq('id', id)
        setCategories((prev) => prev.filter((c) => c.id !== id))
      },
    })
  }

  async function addProduct(categoryId: string, name: string, price: string, description: string) {
    const { data } = await supabase
      .from('products')
      .insert({ category_id: categoryId, name, price: parseFloat(price), description: description || null })
      .select().single()
    if (data) setCategories(categories.map((c) =>
      c.id === categoryId ? { ...c, products: [...c.products, { ...data, product_extra_groups: [] }] } : c
    ))
  }

  async function updateProduct(categoryId: string, productId: string, name: string, price: string, description: string) {
    const { data } = await supabase
      .from('products')
      .update({ name, price: parseFloat(price), description: description || null })
      .eq('id', productId).select().single()
    if (data) setCategories(categories.map((c) =>
      c.id === categoryId ? { ...c, products: c.products.map((p) => p.id === productId ? { ...p, ...data } : p) } : c
    ))
  }

  async function toggleAvailable(categoryId: string, productId: string, current: boolean) {
    await supabase.from('products').update({ is_available: !current }).eq('id', productId)
    setCategories(categories.map((c) => c.id === categoryId
      ? { ...c, products: c.products.map((p) => p.id === productId ? { ...p, is_available: !current } : p) } : c))
  }

  async function toggleFeatured(categoryId: string, productId: string, current: boolean) {
    await supabase.from('products').update({ is_featured: !current }).eq('id', productId)
    setCategories(categories.map((c) => c.id === categoryId
      ? { ...c, products: c.products.map((p) => p.id === productId ? { ...p, is_featured: !current } : p) } : c))
  }

  async function deleteProduct(categoryId: string, productId: string) {
    setConfirmAction({
      title: '¿Eliminar este producto?',
      onConfirm: async () => {
        const { data: peg } = await supabase.from('product_extra_groups').select('extra_group_id').eq('product_id', productId)
        const extraGroupIds = (peg ?? []).map((r) => r.extra_group_id)
        await supabase.from('product_extra_groups').delete().eq('product_id', productId)
        if (extraGroupIds.length > 0) {
          const { data: sC } = await supabase.from('category_extra_groups').select('extra_group_id').in('extra_group_id', extraGroupIds)
          const { data: sP } = await supabase.from('product_extra_groups').select('extra_group_id').in('extra_group_id', extraGroupIds)
          const linked = new Set([...(sC ?? []).map((r) => r.extra_group_id), ...(sP ?? []).map((r) => r.extra_group_id)])
          const orphaned = extraGroupIds.filter((eid) => !linked.has(eid))
          if (orphaned.length > 0) {
            await supabase.from('extra_options').delete().in('extra_group_id', orphaned)
            await supabase.from('extra_groups').delete().in('id', orphaned)
          }
        }
        await supabase.from('products').delete().eq('id', productId)
        setCategories((prev) => prev.map((c) =>
          c.id === categoryId ? { ...c, products: c.products.filter((p) => p.id !== productId) } : c
        ))
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-3xl mb-3">🍽️</p>
          <p className="font-medium mb-1">Todavía no hay categorías</p>
          <p className="text-sm text-gray-400">Creá una categoría abajo para empezar</p>
        </div>
      )}

      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          restaurantId={restaurantId}
          isOpen={openCategory === cat.id}
          onToggle={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
          onRename={(name) => renameCategory(cat.id, name)}
          onToggleVisibility={() => toggleCategory(cat.id, cat.is_active)}
          onDelete={() => deleteCategory(cat.id)}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onToggleAvailable={toggleAvailable}
          onToggleFeatured={toggleFeatured}
          onDeleteProduct={deleteProduct}
          onProductExtrasChange={(productId, updatedGroups) => {
            setCategories((prev) => prev.map((c) =>
              c.id === cat.id ? {
                ...c,
                products: c.products.map((p) =>
                  p.id === productId
                    ? { ...p, product_extra_groups: updatedGroups.map((g) => ({ extra_groups: g })) }
                    : p
                ),
              } : c
            ))
          }}
          onCategoryExtrasChange={(updatedGroups) => {
            setCategories((prev) => prev.map((c) =>
              c.id === cat.id
                ? { ...c, category_extra_groups: updatedGroups.map((g) => ({ extra_groups: g })) }
                : c
            ))
          }}
        />
      ))}

      {/* Nueva categoría */}
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-4 flex gap-2">
        <input
          type="text" value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="Nueva categoría (ej: Hamburguesas)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button onClick={addCategory} disabled={addingCat || !newCatName.trim()}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40">
          {addingCat ? 'Agregando...' : '+ Agregar'}
        </button>
      </div>

      {/* Importar desde imagen */}
      <button
        onClick={() => setShowImport(true)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border-2 border-green-600 rounded-xl px-4 py-3 hover:border-green-400 transition-colors w-full justify-center">
        ✨ Importar menú desde imagen con IA
      </button>

      {showImport && (
        <MenuImportModal
          restaurantId={restaurantId}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            window.location.reload()
          }}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          description={confirmAction.description}
          loading={confirming}
          onConfirm={runConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

// ====== CATEGORY CARD ======
function CategoryCard({ category, restaurantId, isOpen, onToggle, onRename, onToggleVisibility,
  onDelete, onAddProduct, onUpdateProduct, onToggleAvailable, onToggleFeatured, onDeleteProduct,
  onProductExtrasChange, onCategoryExtrasChange }: {
  category: Category; restaurantId: string; isOpen: boolean
  onToggle: () => void; onRename: (name: string) => void
  onToggleVisibility: () => void; onDelete: () => void
  onAddProduct: (catId: string, name: string, price: string, description: string) => void
  onUpdateProduct: (catId: string, prodId: string, name: string, price: string, description: string) => Promise<void>
  onToggleAvailable: (catId: string, prodId: string, current: boolean) => void
  onToggleFeatured: (catId: string, prodId: string, current: boolean) => void
  onDeleteProduct: (catId: string, prodId: string) => void
  onProductExtrasChange: (productId: string, updatedGroups: ExtraGroup[]) => void
  onCategoryExtrasChange: (updatedGroups: ExtraGroup[]) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(category.name)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [savingProd, setSavingProd] = useState(false)
  const [expandedExtrasProductId, setExpandedExtrasProductId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [activeTab, setActiveTab] = useState<'productos' | 'extras'>('productos')

  function startEditProduct(p: Product) {
    setEditingProductId(p.id)
    setEditName(p.name)
    setEditPrice(p.price.toString())
    setEditDesc(p.description ?? '')
    setExpandedExtrasProductId(null)
  }

  async function saveEditProduct(productId: string) {
    if (!editName.trim() || !editPrice) return
    setSavingEdit(true)
    await onUpdateProduct(category.id, productId, editName, editPrice, editDesc)
    setEditingProductId(null)
    setSavingEdit(false)
  }

  async function handleAddProduct() {
    if (!prodName.trim() || !prodPrice) return
    setSavingProd(true)
    await onAddProduct(category.id, prodName, prodPrice, prodDesc)
    setProdName(''); setProdPrice(''); setProdDesc('')
    setShowAddProduct(false)
    setSavingProd(false)
  }

  async function saveName() {
    if (nameVal.trim() && nameVal !== category.name) onRename(nameVal.trim())
    setEditingName(false)
  }

  const catExtras = category.category_extra_groups?.map((ceg) => ceg.extra_groups) ?? []

  return (
    <div className={`bg-white rounded-xl border transition-opacity ${category.is_active ? 'border-gray-100' : 'border-gray-200 opacity-55'}`}>

      {/* Cabecera de categoría */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Nombre editable */}
        {editingName ? (
          <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameVal(category.name); setEditingName(false) } }}
              className="flex-1 border border-blue-400 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <IBtn onClick={saveName} label="Guardar nombre" className="text-green-600 hover:bg-green-50" stopProp={false}>
              <IcoCheck />
            </IBtn>
            <IBtn onClick={() => { setNameVal(category.name); setEditingName(false) }} label="Cancelar" className="text-gray-400 hover:bg-gray-100" stopProp={false}>
              <IcoX />
            </IBtn>
          </div>
        ) : (
          <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
            <span className={`font-semibold text-sm ${!category.is_active ? 'text-gray-400' : ''}`}>
              {category.name}
            </span>
            {!category.is_active && (
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Oculta</span>
            )}
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {category.products.length} producto{category.products.length !== 1 ? 's' : ''}
            </span>
          </button>
        )}

        {/* Acciones de categoría */}
        {!editingName && (
          <div className="flex items-center gap-0.5">
            <IBtn onClick={() => setEditingName(true)} label="Editar nombre" className="text-gray-400 hover:text-blue-500 hover:bg-blue-50">
              <IcoPencil />
            </IBtn>
            <IBtn onClick={onToggleVisibility} label={category.is_active ? 'Ocultar categoría' : 'Mostrar categoría'}
              className={category.is_active ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'}>
              {category.is_active ? <IcoEye /> : <IcoEyeOff />}
            </IBtn>
            <IBtn onClick={onDelete} label="Eliminar categoría" className="text-gray-400 hover:text-red-500 hover:bg-red-50">
              <IcoTrash />
            </IBtn>
            <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600 ml-1">
              <IcoChevron open={isOpen} />
            </button>
          </div>
        )}
      </div>

      {/* Contenido expandido */}
      {isOpen && (
        <div className="border-t border-gray-100">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4 gap-1">
            <button onClick={() => setActiveTab('productos')}
              className={`text-xs py-2.5 px-3 font-medium transition-colors ${activeTab === 'productos' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}>
              Productos
            </button>
            <button onClick={() => setActiveTab('extras')}
              className={`text-xs py-2.5 px-3 font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'extras' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}>
              <IcoSparkle />
              Extras de la categoría
              {catExtras.length > 0 && (
                <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-1.5">{catExtras.length}</span>
              )}
            </button>
          </div>

          {/* Tab: Productos */}
          {activeTab === 'productos' && (
            <div>
              {category.products.length === 0 && !showAddProduct && (
                <p className="text-xs text-gray-400 text-center py-5">No hay productos en esta categoría</p>
              )}

              {category.products.map((product) => (
                <div key={product.id} className="border-b border-gray-50 last:border-0">

                  {editingProductId === product.id ? (
                    // --- Formulario edición ---
                    <div className="px-4 py-3 bg-blue-50/40 flex flex-col gap-2">
                      <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre del producto"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Precio"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEditProduct(product.id)} disabled={savingEdit || !editName.trim() || !editPrice}
                          className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40">
                          <IcoCheck /> {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingProductId(null)}
                          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                          <IcoX /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // --- Vista normal del producto ---
                    <div>
                      <div className="flex items-start px-4 py-3 gap-3">
                        {/* Info producto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${!product.is_available ? 'text-gray-400' : ''}`}>
                              {product.name}
                            </span>
                            {product.is_featured && (
                              <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <IcoStarFilled /> Destacado
                              </span>
                            )}
                            {!product.is_available && (
                              <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Oculto</span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{product.description}</p>
                          )}
                          <p className="text-sm font-semibold mt-0.5">${product.price.toFixed(2)}</p>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <IBtn onClick={() => startEditProduct(product)} label="Editar producto"
                            className="text-gray-400 hover:text-blue-500 hover:bg-blue-50">
                            <IcoPencil />
                          </IBtn>
                          <IBtn onClick={() => onToggleFeatured(category.id, product.id, product.is_featured)}
                            label={product.is_featured ? 'Quitar destacado' : 'Marcar como destacado'}
                            className={product.is_featured ? 'text-amber-400 hover:bg-amber-50' : 'text-gray-400 hover:text-amber-400 hover:bg-amber-50'}>
                            {product.is_featured ? <IcoStarFilled /> : <IcoStarOutline />}
                          </IBtn>
                          <IBtn onClick={() => onToggleAvailable(category.id, product.id, product.is_available)}
                            label={product.is_available ? 'Ocultar del menú' : 'Mostrar en el menú'}
                            className={product.is_available ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-orange-400 hover:bg-orange-50'}>
                            {product.is_available ? <IcoEye /> : <IcoEyeOff />}
                          </IBtn>
                          <IBtn onClick={() => onDeleteProduct(category.id, product.id)} label="Eliminar producto"
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <IcoTrash />
                          </IBtn>
                        </div>
                      </div>

                      {/* Extras propios del producto (expandible) */}
                      <button
                        onClick={() => setExpandedExtrasProductId(expandedExtrasProductId === product.id ? null : product.id)}
                        className="w-full flex items-center gap-2 px-4 pb-2 text-xs text-gray-400 hover:text-gray-600">
                        <IcoSparkle />
                        {expandedExtrasProductId === product.id ? 'Ocultar extras propios' : 'Gestionar extras propios'}
                        {(product.product_extra_groups?.length ?? 0) > 0 && (
                          <span className="bg-gray-100 text-gray-500 rounded-full px-1.5">
                            {product.product_extra_groups!.length}
                          </span>
                        )}
                      </button>

                      {expandedExtrasProductId === product.id && (
                        <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 mb-3">
                            Extras exclusivos de este producto (se suman a los de la categoría)
                          </p>
                          <ExtraGroupManager
                            restaurantId={restaurantId}
                            entityId={product.id}
                            entityType="product"
                            initialGroups={product.product_extra_groups?.map((peg) => peg.extra_groups) ?? []}
                            onGroupsChange={(updatedGroups) => onProductExtrasChange(product.id, updatedGroups)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Agregar producto */}
              {showAddProduct ? (
                <div className="p-4 flex flex-col gap-2 border-t border-gray-50">
                  <input autoFocus value={prodName} onChange={(e) => setProdName(e.target.value)}
                    placeholder="Nombre del producto *"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  <input value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  <input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="Precio *"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  <div className="flex gap-2">
                    <button onClick={handleAddProduct} disabled={savingProd || !prodName.trim() || !prodPrice}
                      className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40">
                      {savingProd ? 'Guardando...' : 'Guardar producto'}
                    </button>
                    <button onClick={() => setShowAddProduct(false)}
                      className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddProduct(true)}
                  className="w-full text-xs text-gray-400 hover:text-gray-700 py-3 hover:bg-gray-50 flex items-center justify-center gap-1.5 border-t border-gray-50">
                  + Agregar producto
                </button>
              )}
            </div>
          )}

          {/* Tab: Extras de la categoría */}
          {activeTab === 'extras' && (
            <div className="p-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700">
                Los extras que configures aquí aparecerán en <strong>todos los productos</strong> de esta categoría al momento del pedido.
              </div>
              <ExtraGroupManager
                restaurantId={restaurantId}
                entityId={category.id}
                entityType="category"
                initialGroups={catExtras}
                onGroupsChange={onCategoryExtrasChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
