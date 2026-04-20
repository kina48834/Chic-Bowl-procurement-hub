import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  uiBtnDangerSoft,
  uiBtnGhost,
  uiBtnPrimary,
  uiBtnSuccess,
  uiBtnXs,
} from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function SuppliersAdminPage() {
  const { user } = useAuth()
  const { state, updateSupplier, removeSupplier, addSupplier } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [editId, setEditId] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Supplier master (admin)</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Full visibility and remediation: edit reliability, reactivate vendors, or add net-new
          records.
        </p>
      </header>
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
              <tr key={s.id}>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {s.email} · {s.phone}
                </td>
                <td className="px-3 py-2">{s.reliability}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.active ? 'active' : 'inactive'} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${uiBtnGhost} ${uiBtnXs} !text-accent hover:!text-ink`}
                      onClick={() => setEditId((id) => (id === s.id ? null : s.id))}
                    >
                      {editId === s.id ? 'Close' : 'Edit'}
                    </button>
                    {!s.active ? (
                      <button
                        type="button"
                        className={`${uiBtnSuccess} ${uiBtnXs}`}
                        onClick={() => updateSupplier(s.id, { active: true }, actor)}
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${uiBtnDangerSoft} ${uiBtnXs}`}
                        onClick={() => removeSupplier(s.id, actor)}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                  {editId === s.id ? (
                    <AdminSupplierInlineForm
                      supplier={s}
                      onSave={(patch) => {
                        updateSupplier(s.id, patch, actor)
                        setEditId(null)
                      }}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Add supplier (admin)</h2>
        <AdminAddSupplierForm
          onAdd={(data) => {
            addSupplier(data, actor)
          }}
        />
      </section>
    </div>
  )
}

function AdminSupplierInlineForm({
  supplier,
  onSave,
}: {
  supplier: import('@/procurement/types').Supplier
  onSave: (patch: Partial<import('@/procurement/types').Supplier>) => void
}) {
  const [name, setName] = useState(supplier.name)
  const [contact, setContact] = useState(supplier.contact)
  const [email, setEmail] = useState(supplier.email)
  const [phone, setPhone] = useState(supplier.phone)
  const [pricingNotes, setPricingNotes] = useState(supplier.pricingNotes)
  const [reliability, setReliability] = useState(supplier.reliability)

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={input} value={contact} onChange={(e) => setContact(e.target.value)} />
      <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input
        className={input}
        value={pricingNotes}
        onChange={(e) => setPricingNotes(e.target.value)}
      />
      <select
        className={input}
        value={reliability}
        onChange={(e) => setReliability(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            Reliability {n}
          </option>
        ))}
      </select>
      <div className="sm:col-span-2">
        <button
          type="button"
          className={uiBtnPrimary}
          onClick={() =>
            onSave({
              name: name.trim(),
              contact: contact.trim(),
              email: email.trim(),
              phone: phone.trim(),
              pricingNotes: pricingNotes.trim(),
              reliability,
            })
          }
        >
          Save supplier
        </button>
      </div>
    </div>
  )
}

function AdminAddSupplierForm({
  onAdd,
}: {
  onAdd: (data: Omit<import('@/procurement/types').Supplier, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pricingNotes, setPricingNotes] = useState('')
  const [reliability, setReliability] = useState<1 | 2 | 3 | 4 | 5>(3)

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({
          name: name.trim(),
          contact: contact.trim(),
          email: email.trim(),
          phone: phone.trim(),
          pricingNotes: pricingNotes.trim(),
          reliability,
          active: true,
        })
        setName('')
        setContact('')
        setEmail('')
        setPhone('')
        setPricingNotes('')
        setReliability(3)
      }}
    >
      <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={input} placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
      <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input
        className={input}
        placeholder="Pricing notes"
        value={pricingNotes}
        onChange={(e) => setPricingNotes(e.target.value)}
      />
      <select
        className={input}
        value={reliability}
        onChange={(e) => setReliability(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            Reliability {n}
          </option>
        ))}
      </select>
      <div className="sm:col-span-2">
        <button type="submit" className={uiBtnPrimary}>
          Add supplier
        </button>
      </div>
    </form>
  )
}
