'use client';

import { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { useAdminServices, useSaveService, useToggleServiceActive } from '@/lib/hooks';
import { fmtZAR } from '@/lib/format';
import { getServiceIcon } from '@/lib/catalog-icons';
import { AdminNav, AlertBox, Content, EmptyState, Main, Screen, Spinner, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';
import type { Service } from '@/lib/types';

interface FormState {
  name: string;
  category: string;
  base_price: string;
}

const EMPTY_FORM: FormState = { name: '', category: '', base_price: '' };

export default function AdminServicesPage() {
  const { data: services = [], isLoading, error } = useAdminServices();
  const saveService = useSaveService();
  const toggleActive = useToggleServiceActive();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setForm({ name: s.name, category: s.category || '', base_price: String(s.base_price) });
    setFormError('');
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.base_price) {
      setFormError('Name and price are required.');
      return;
    }
    setFormError('');
    try {
      await saveService.mutateAsync({
        id: editingId ?? undefined,
        payload: {
          name: form.name.trim(),
          category: form.category.trim() || null,
          base_price: parseFloat(form.base_price),
        },
      });
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  }

  async function onToggle(s: Service) {
    await toggleActive.mutateAsync({ id: s.id, active: s.active ? 0 : 1 });
  }

  return (
    <Screen>
      <AdminNav active="/admin/services" />
      <Main>
        <TopBar
          title="Services"
          right={
            <button
              onClick={openCreate}
              className="w-9.5 h-9.5 rounded-full border border-border bg-card-white flex items-center justify-center text-forest-dark cursor-pointer"
            >
              <Plus size={18} />
            </button>
          }
        />
        <Content wide>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : services.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No services yet"
              message="Add your first service to get started."
              actionLabel="Add service"
              onAction={openCreate}
            />
          ) : (
            <div className="md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3">
              {services.map((s) => {
                const Icon = getServiceIcon(s.name);
                return (
                  <div key={s.id} className="card mb-3 md:mb-0">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2.5 items-center">
                        <Icon size={22} className="text-forest" strokeWidth={1.5} />
                        <div>
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-charcoal-muted mt-2">
                            {s.category || '—'} · {fmtZAR(s.base_price)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.active ? 'bg-sage text-forest' : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3.5">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex-1 px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-sage text-forest-dark cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggle(s)}
                        className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold border-[1.5px] border-border bg-transparent text-forest cursor-pointer"
                      >
                        {s.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Content>
      </Main>

      {showForm && (
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center z-100"
          style={{ background: 'rgba(15, 42, 30, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="bg-card-white w-full max-w-[480px] rounded-t-[24px] md:rounded-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-5 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-border rounded mx-auto mb-4.5 md:hidden" />
            <h3 className="mb-4">{editingId ? 'Edit service' : 'New service'}</h3>
            <AlertBox message={formError} />
            <div className="mb-4 field">
              <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="mb-4 field">
              <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="mb-4 field">
              <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Base price (ZAR)</label>
              <input
                type="number"
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </div>
            <button
              disabled={saveService.isPending}
              onClick={save}
              className="w-full py-3.5 rounded-[var(--radius-md)] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50"
            >
              {saveService.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="w-full mt-4 py-3.5 rounded-[var(--radius-md)] font-semibold bg-transparent border-[1.5px] border-border text-forest cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
