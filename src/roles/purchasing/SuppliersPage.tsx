import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  uiBtnDangerSoft,
  uiBtnPrimary,
  uiBtnSecondary,
  uiBtnXs,
} from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function SuppliersPage() {
  const { user } = useAuth()
  const { state, addSupplier, updateSupplier, removeSupplier } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pricingNotes, setPricingNotes] = useState('')
  const [reliability, setReliability] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addSupplier(
      {
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        phone: phone.trim(),
        pricingNotes: pricingNotes.trim(),
        reliability,
        active: true,
      },
      actor,
    )
    setName('')
    setContact('')
    setEmail('')
    setPhone('')
    setPricingNotes('')
    setReliability(3)
  }

  const active = state.suppliers.filter((s) => s.active)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Supplier management</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Add, update, or retire suppliers;           capture pricing context and reliability scores.
        </p>
      </header>
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Add supplier</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleAdd}>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Contact</label>
            <input className={input} value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Email</label>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Phone</label>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Reliability (1–5)</label>
            <select
              className={input}
              value={reliability}
              onChange={(e) => setReliability(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Pricing notes</label>
            <input
              className={input}
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
            />
          </div>
          <div>
            <button type="submit" className={uiBtnPrimary}>
              Add supplier
            </button>
          </div>
        </form>
      </section>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Reliability</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.suppliers.map((s) => (
              <tr key={s.id} className={!s.active ? 'opacity-50' : ''}>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {s.contact} · {s.email}
                </td>
                <td className="px-3 py-2">{s.reliability}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.active ? 'active' : 'inactive'} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${uiBtnSecondary} ${uiBtnXs}`}
                      onClick={() =>
                        setEditingId((id) => (id === s.id ? null : s.id))
                      }
                    >
                      {editingId === s.id ? 'Close' : 'Edit'}
                    </button>
                    {s.active ? (
                      <button
                        type="button"
                        className={`${uiBtnDangerSoft} ${uiBtnXs}`}
                        onClick={() => removeSupplier(s.id, actor)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {editingId === s.id ? (
                    <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                      <input
                        className={input}
                        defaultValue={s.pricingNotes}
                        id={`pn-${s.id}`}
                        placeholder="Pricing notes"
                      />
                      <button
                        type="button"
                        className={`${uiBtnSecondary} ${uiBtnXs}`}
                        onClick={() => {
                          const el = document.getElementById(`pn-${s.id}`) as HTMLInputElement
                          updateSupplier(s.id, { pricingNotes: el?.value ?? '' }, actor)
                        }}
                      >
                        Save pricing notes
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">
        Active suppliers available for POs and quotations: {active.length}.
      </p>
    </div>
  )
}
