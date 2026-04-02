'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Pencil, Trash2 } from 'lucide-react'

interface ExtraOption {
  id: string
  name: string
  price_add: number
}

interface ExtraGroup {
  id: string
  name: string
  is_required: boolean
  is_multiple: boolean
  extra_options: ExtraOption[]
}

export default function ExtraGroupManager({
  restaurantId,
  entityId,
  entityType,
  initialGroups,
  onGroupsChange,
}: {
  restaurantId: string
  entityId: string
  entityType: 'category' | 'product'
  initialGroups: ExtraGroup[]
  onGroupsChange?: (groups: ExtraGroup[]) => void
}) {
  const [groups, setGroups] = useState<ExtraGroup[]>(initialGroups)

  function updateGroups(next: ExtraGroup[]) {
    setGroups(next)
    onGroupsChange?.(next)
  }
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [isMultiple, setIsMultiple] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const supabase = createClient()

  async function addGroup() {
    if (!groupName.trim()) return
    setSavingGroup(true)

    const { data: group, error: groupError } = await supabase
      .from('extra_groups')
      .insert({ restaurant_id: restaurantId, name: groupName, is_required: isRequired, is_multiple: isMultiple })
      .select()
      .single()

    if (groupError || !group) {
      console.error('Error creando extra_group:', groupError)
      alert(`Error al crear el grupo: ${groupError?.message ?? 'desconocido'}`)
      setSavingGroup(false)
      return
    }

    const pivotTable = entityType === 'category' ? 'category_extra_groups' : 'product_extra_groups'
    const pivotKey = entityType === 'category' ? 'category_id' : 'product_id'
    const { error: pivotError } = await supabase
      .from(pivotTable)
      .insert({ [pivotKey]: entityId, extra_group_id: group.id })

    if (pivotError) {
      console.error(`Error vinculando en ${pivotTable}:`, pivotError)
      // Revertir el extra_group huérfano
      await supabase.from('extra_groups').delete().eq('id', group.id)
      alert(`Error al vincular el grupo (${pivotTable}): ${pivotError.message}`)
      setSavingGroup(false)
      return
    }

    updateGroups([...groups, { ...group, extra_options: [] }])
    setGroupName('')
    setIsRequired(false)
    setIsMultiple(false)
    setShowAddGroup(false)
    setSavingGroup(false)
  }

  async function updateGroup(groupId: string, patch: Partial<Pick<ExtraGroup, 'name' | 'is_required' | 'is_multiple'>>) {
    await supabase.from('extra_groups').update(patch).eq('id', groupId)
    updateGroups(groups.map((g) => g.id === groupId ? { ...g, ...patch } : g))
  }

  async function deleteGroup(groupId: string) {
    const pivotTable = entityType === 'category' ? 'category_extra_groups' : 'product_extra_groups'
    await supabase.from(pivotTable).delete()
      .eq('extra_group_id', groupId)
      .eq(entityType === 'category' ? 'category_id' : 'product_id', entityId)
    await supabase.from('extra_groups').delete().eq('id', groupId)
    updateGroups(groups.filter((g) => g.id !== groupId))
  }

  async function addOption(groupId: string, name: string, priceAdd: string) {
    const { data } = await supabase
      .from('extra_options')
      .insert({ extra_group_id: groupId, name, price_add: parseFloat(priceAdd) || 0 })
      .select()
      .single()
    if (data) {
      updateGroups(groups.map((g) =>
        g.id === groupId ? { ...g, extra_options: [...g.extra_options, data] } : g
      ))
    }
  }

  async function updateOption(groupId: string, optionId: string, patch: Partial<Pick<ExtraOption, 'name' | 'price_add'>>) {
    await supabase.from('extra_options').update(patch).eq('id', optionId)
    updateGroups(groups.map((g) =>
      g.id === groupId
        ? { ...g, extra_options: g.extra_options.map((o) => o.id === optionId ? { ...o, ...patch } : o) }
        : g
    ))
  }

  async function deleteOption(groupId: string, optionId: string) {
    await supabase.from('extra_options').delete().eq('id', optionId)
    updateGroups(groups.map((g) =>
      g.id === groupId ? { ...g, extra_options: g.extra_options.filter((o) => o.id !== optionId) } : g
    ))
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && !showAddGroup && (
        <p className="text-xs text-gray-400 py-2">Sin extras configurados</p>
      )}

      {groups.map((group) => (
        <ExtraGroupCard
          key={group.id}
          group={group}
          onUpdate={(patch) => updateGroup(group.id, patch)}
          onDelete={() => deleteGroup(group.id)}
          onAddOption={addOption}
          onUpdateOption={updateOption}
          onDeleteOption={deleteOption}
        />
      ))}

      {showAddGroup ? (
        <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            placeholder='Nombre del grupo (ej: "Término de la carne")'
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded" />
              Obligatorio
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={isMultiple} onChange={(e) => setIsMultiple(e.target.checked)} className="rounded" />
              Selección múltiple
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addGroup}
              disabled={savingGroup || !groupName.trim()}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {savingGroup ? 'Guardando...' : 'Guardar grupo'}
            </button>
            <button
              onClick={() => { setShowAddGroup(false); setGroupName(''); setIsRequired(false); setIsMultiple(false) }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddGroup(true)}
          className="text-sm text-gray-400 hover:text-gray-600 py-2.5 border border-dashed border-gray-200 rounded-xl hover:border-gray-400 transition-colors">
          + Agregar grupo de extras
        </button>
      )}
    </div>
  )
}

// ── ExtraGroupCard ────────────────────────────────────────────────────────────
function ExtraGroupCard({
  group, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption,
}: {
  group: ExtraGroup
  onUpdate: (patch: Partial<Pick<ExtraGroup, 'name' | 'is_required' | 'is_multiple'>>) => Promise<void>
  onDelete: () => void
  onAddOption: (groupId: string, name: string, price: string) => Promise<void>
  onUpdateOption: (groupId: string, optionId: string, patch: Partial<Pick<ExtraOption, 'name' | 'price_add'>>) => Promise<void>
  onDeleteOption: (groupId: string, optionId: string) => void
}) {
  const [editingGroup, setEditingGroup] = useState(false)
  const [editName, setEditName] = useState(group.name)
  const [editRequired, setEditRequired] = useState(group.is_required)
  const [editMultiple, setEditMultiple] = useState(group.is_multiple)
  const [savingGroupEdit, setSavingGroupEdit] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [optName, setOptName] = useState('')
  const [optPrice, setOptPrice] = useState('')

  async function saveGroupEdit() {
    setSavingGroupEdit(true)
    await onUpdate({ name: editName.trim() || group.name, is_required: editRequired, is_multiple: editMultiple })
    setSavingGroupEdit(false)
    setEditingGroup(false)
  }

  function cancelGroupEdit() {
    setEditName(group.name)
    setEditRequired(group.is_required)
    setEditMultiple(group.is_multiple)
    setEditingGroup(false)
  }

  async function handleAddOption() {
    if (!optName.trim()) return
    await onAddOption(group.id, optName.trim(), optPrice)
    setOptName('')
    setOptPrice('')
    setShowAdd(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">

      {/* Group header */}
      {editingGroup ? (
        <div className="px-4 py-3 bg-gray-50 flex flex-col gap-2.5">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveGroupEdit()}
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="rounded" />
              Obligatorio
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={editMultiple} onChange={(e) => setEditMultiple(e.target.checked)} className="rounded" />
              Selección múltiple
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveGroupEdit}
              disabled={savingGroupEdit}
              className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50">
              <Check size={12} />
              {savingGroupEdit ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={cancelGroupEdit}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
              <X size={12} />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{group.name}</span>
            {group.is_required && (
              <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Obligatorio</span>
            )}
            {group.is_multiple && (
              <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Múltiple</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingGroup(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1">
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Options list */}
      <div className="divide-y divide-gray-100">
        {group.extra_options.map((opt) => (
          <OptionRow
            key={opt.id}
            option={opt}
            onUpdate={(patch) => onUpdateOption(group.id, opt.id, patch)}
            onDelete={() => onDeleteOption(group.id, opt.id)}
          />
        ))}

        {/* Add option */}
        {showAdd ? (
          <div className="px-4 py-3 flex gap-2 flex-wrap">
            <input
              type="text"
              value={optName}
              onChange={(e) => setOptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              placeholder="Opción (ej: Bien cocido)"
              autoFocus
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="number"
              value={optPrice}
              onChange={(e) => setOptPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              placeholder="Precio extra"
              className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleAddOption}
              disabled={!optName.trim()}
              className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              <Check size={13} />
              Guardar
            </button>
            <button
              onClick={() => { setShowAdd(false); setOptName(''); setOptPrice('') }}
              className="text-gray-400 hover:text-gray-600 px-2">
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full text-xs text-gray-400 hover:text-gray-700 py-2.5 hover:bg-gray-50 transition-colors">
            + Agregar opción
          </button>
        )}
      </div>
    </div>
  )
}

// ── OptionRow ─────────────────────────────────────────────────────────────────
function OptionRow({
  option, onUpdate, onDelete,
}: {
  option: ExtraOption
  onUpdate: (patch: Partial<Pick<ExtraOption, 'name' | 'price_add'>>) => Promise<void>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(option.name)
  const [editPrice, setEditPrice] = useState(String(option.price_add))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate({ name: editName.trim() || option.name, price_add: parseFloat(editPrice) || 0 })
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setEditName(option.name)
    setEditPrice(String(option.price_add))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <input
          type="number"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-24 border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50">
          <Check size={12} />
          {saving ? '...' : 'Guardar'}
        </button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 group">
      <span className="text-sm">{option.name}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">
          {option.price_add > 0 ? `+$${option.price_add.toLocaleString('es-CO', { minimumFractionDigits: 0 })}` : 'Gratis'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-700 p-0.5">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-0.5">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
