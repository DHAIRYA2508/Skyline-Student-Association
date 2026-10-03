import { useEffect, useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head } from '../store/ui';
import { api } from '../services/api';
import type { Announcement, Product, Order, Fundraiser, FundraiserTask } from '../services/api';

export function Announcements() {
  const { me, notify, refreshKey, bump } = useApp();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState('');
  const [b, setB] = useState('');
  const [aud, setAud] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  const isStaff = me?.is_staff ?? false;

  useEffect(() => {
    setLoading(true);
    api.get<Announcement[]>('/announcements')
      .then(res => setItems(Array.isArray(res) ? res : []))
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, notify]);

  const send = async () => {
    if (!t.trim() || !b.trim()) return notify('Add a title and a message');
    try {
      setSubmitting(true);
      await api.post('/announcements', {
        title: t.trim(),
        content: b.trim(),
        audience_type: aud,
        publish: true,
      });
      setT('');
      setB('');
      notify('Announcement published and sent to members');
      bump();
    } catch (err: any) {
      notify(err.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head title="Announcements" sub="One post reaches every member, and the history stays on record." />
      
      {isStaff && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>New announcement</h2>
          <label>Title</label>
          <input value={t} onChange={e => setT(e.target.value)} placeholder="e.g. Annual General Meeting details" />
          
          <div className="row mt">
            <div style={{ flex: 1 }}>
              <label>Audience</label>
              <select value={aud} onChange={e => setAud(e.target.value)}>
                <option value="ALL">All Members & Students</option>
                <option value="MEMBERS">Active Members Only</option>
                <option value="VOLUNTEERS">Volunteers</option>
                <option value="STAFF">Staff & Leadership</option>
              </select>
            </div>
          </div>

          <label className="mt">Message</label>
          <textarea rows={3} value={b} onChange={e => setB(e.target.value)} placeholder="Write your announcement content here..." />
          <button className="pri mt" disabled={submitting} onClick={send}>
            {submitting ? 'Publishing…' : 'Post & notify members'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="card mut sans">Loading announcements…</div>
      ) : items.length === 0 ? (
        <div className="card mut sans">No announcements found.</div>
      ) : (
        items.map(a => (
          <div key={a.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row sp">
              <h2>{a.title}</h2>
              <span className="badge">{a.audience_type}</span>
            </div>
            <p style={{ margin: '12px 0', whiteSpace: 'pre-wrap' }}>{a.content}</p>
            <div className="mut sans" style={{ fontSize: 12 }}>
              {fdate(a.published_at || a.created_at)} {a.created_by_name ? `· ${a.created_by_name}` : ''}
            </div>
          </div>
        ))
      )}
    </>
  );
}

export function Shop() {
  const { me, startPay, notify, refreshKey, bump } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Record<string, string>>({}); // product_id -> variant_id
  const [qty, setQty] = useState<Record<string, number>>({});

  const isStaff = me?.is_staff ?? false;
  const memberDiscount = me?.membership?.merch_discount ?? 0;

  useEffect(() => {
    setLoading(true);
    const fetchOrders = isStaff && me?.permissions.includes('orders.manage')
      ? api.get<Order[]>('/orders')
      : api.get<Order[]>('/orders/mine');

    Promise.all([
      api.get<Product[]>('/products'),
      fetchOrders.catch(() => [] as Order[]),
    ])
      .then(([prods, ords]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setOrders(Array.isArray(ords) ? ords : []);
      })
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, isStaff, me?.permissions, notify]);

  const handleBuy = (p: Product) => {
    const variantId = sel[p.id] || p.variants[0]?.id;
    if (!variantId) return notify('Please select a variant / size');
    const selectedVariant = p.variants.find(v => v.id === variantId);
    if (!selectedVariant) return notify('Variant not found');
    const count = qty[p.id] || 1;
    if (selectedVariant.quantity < count) {
      return notify(`Only ${selectedVariant.quantity} item(s) in stock`);
    }

    const unitPrice = selectedVariant.price ?? p.base_price;
    const finalUnit = memberDiscount > 0 ? unitPrice * (1 - memberDiscount / 100) : unitPrice;
    const total = Math.round(finalUnit * count * 100) / 100;

    startPay({
      title: `${p.name} (${selectedVariant.size || selectedVariant.sku}) × ${count}`,
      amount: total,
      onSuccess: async () => {
        try {
          await api.post('/orders', {
            items: [{ variant_id: variantId, quantity: count }],
            payment_method: 'CARD',
          });
          notify('Order placed successfully!');
          bump();
        } catch (e: any) {
          notify(e.message || 'Order failed');
        }
      },
    });
  };

  const handleRestock = async (variantId: string, name: string) => {
    try {
      await api.post('/inventory/adjust', {
        variant_id: variantId,
        quantity: 5,
        transaction_type: 'RESTOCK',
        reason: 'Restocked by admin',
      });
      notify(`+5 stock added to ${name}`);
      bump();
    } catch (e: any) {
      notify(e.message || 'Restock failed');
    }
  };

  return (
    <>
      <Head
        title="Merchandise"
        sub={memberDiscount > 0 ? `Your member discount: ${memberDiscount}% off` : 'Join as a member for up to 15% off merchandise'}
      />

      {loading ? (
        <div className="card mut sans">Loading shop items…</div>
      ) : products.length === 0 ? (
        <div className="card mut sans">No merchandise available right now.</div>
      ) : (
        <div className="grid g2">
          {products.map(p => {
            const currentVariantId = sel[p.id] || p.variants[0]?.id;
            const currentVariant = p.variants.find(v => v.id === currentVariantId) || p.variants[0];
            const q = qty[p.id] || 1;
            const rawPrice = currentVariant?.price ?? p.base_price;
            const discountedPrice = memberDiscount > 0 ? rawPrice * (1 - memberDiscount / 100) : rawPrice;
            const total = Math.round(discountedPrice * q * 100) / 100;

            return (
              <div key={p.id} className="card">
                <h2>{p.name}</h2>
                <p className="mut">{p.description}</p>
                <div style={{ fontSize: 22, margin: '10px 0' }}>
                  {money(discountedPrice)}{' '}
                  {memberDiscount > 0 && (
                    <s className="mut sans" style={{ fontSize: 14 }}>{money(rawPrice)}</s>
                  )}
                </div>

                {p.variants && p.variants.length > 0 && (
                  <>
                    <label>Options / Size</label>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                      {p.variants.map(v => (
                        <button
                          key={v.id}
                          disabled={v.quantity <= 0}
                          className={'size sm ' + (currentVariantId === v.id ? 'on' : '')}
                          onClick={() => setSel({ ...sel, [p.id]: v.id })}
                        >
                          {v.size || v.color || v.sku}{' '}
                          <span style={{ opacity: 0.7 }}>({v.quantity})</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <label className="mt">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={currentVariant?.quantity || 1}
                  style={{ width: 90 }}
                  value={q}
                  onChange={e => setQty({ ...qty, [p.id]: Math.max(1, +e.target.value || 1) })}
                />

                <button
                  className="pri mt"
                  disabled={!currentVariant || currentVariant.quantity <= 0}
                  onClick={() => handleBuy(p)}
                >
                  {!currentVariant || currentVariant.quantity <= 0 ? 'Out of stock' : `Order · ${money(total)}`}
                </button>

                {isStaff && me?.permissions.includes('inventory.manage') && currentVariant && (
                  <div className="row mt sans" style={{ fontSize: 13, alignItems: 'center' }}>
                    <span className="mut">Restock:</span>
                    {p.variants.map(v => (
                      <button
                        key={v.id}
                        className="sm"
                        onClick={() => handleRestock(v.id, `${p.name} (${v.size || v.sku})`)}
                      >
                        +5 {v.size || v.sku}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Orders Table */}
      <div className="card mt">
        <h2>{isStaff ? 'Order history' : 'My orders'}</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={5} className="mut">No orders placed yet.</td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id}>
                  <td>{fdate(o.created_at)}</td>
                  <td>{(o as any).customer || me?.first_name || 'Member'}</td>
                  <td>
                    {o.items?.map((it, idx) => (
                      <div key={idx}>
                        {it.product_name || (it as any).name} ({it.size || (it as any).variant || 'Std'}) × {it.quantity}
                      </div>
                    )) || '—'}
                  </td>
                  <td>{money(o.total_amount)}</td>
                  <td><span className={'badge ' + (o.status === 'COMPLETED' ? 'b-ok' : '')}>{o.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Fundraisers() {
  const { me, notify, refreshKey, bump } = useApp();
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [tasks, setTasks] = useState<FundraiserTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [nf, setNf] = useState({ name: '', description: '', goal: '500', date: '' });
  const [nt, setNt] = useState<Record<string, { title: string }>>({});
  const [amt, setAmt] = useState<Record<string, string>>({});

  const isStaff = me?.is_staff ?? false;
  const cols: ('TODO' | 'IN_PROGRESS' | 'DONE')[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Fundraiser[]>('/fundraisers'),
      api.get<FundraiserTask[]>('/tasks').catch(() => [] as FundraiserTask[]),
    ])
      .then(([funds, tsks]) => {
        setFundraisers(Array.isArray(funds) ? funds : []);
        setTasks(Array.isArray(tsks) ? tsks : []);
      })
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, notify]);

  const handleCreateFundraiser = async () => {
    if (!nf.name.trim() || !nf.date) return notify('Please enter a fundraiser name and date');
    try {
      await api.post('/fundraisers', {
        name: nf.name.trim(),
        description: nf.description.trim() || 'Club fundraiser event',
        target_amount: +nf.goal || 500,
        start_date: nf.date,
        status: 'ACTIVE',
      });
      setNf({ name: '', description: '', goal: '500', date: '' });
      notify('Fundraiser created successfully!');
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to create fundraiser');
    }
  };

  const handleAddTask = async (fundraiserId: string) => {
    const taskData = nt[fundraiserId];
    if (!taskData || !taskData.title.trim()) return notify('Enter a task description');
    try {
      await api.post('/tasks', {
        fundraiser_id: fundraiserId,
        title: taskData.title.trim(),
        description: 'Fundraiser activity task',
        priority: 'MEDIUM',
        volunteer_ids: [],
      });
      setNt({ ...nt, [fundraiserId]: { title: '' } });
      notify('Task added to fundraiser');
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to add task');
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      notify(`Task updated to ${status}`);
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to update task status');
    }
  };

  const handleRecordSales = async (fundraiserId: string) => {
    const val = +(amt[fundraiserId] || 0);
    if (val <= 0) return notify('Enter a positive amount');
    try {
      await api.post(`/fundraisers/${fundraiserId}/donations`, {
        amount: val,
        description: 'Bake sale / event proceeds',
      });
      setAmt({ ...amt, [fundraiserId]: '' });
      notify('Sales takings recorded in ledger!');
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to record donation');
    }
  };

  return (
    <>
      <Head title="Fundraisers" sub="Track targets, volunteers, tasks, and real collections." />

      {isStaff && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Create a fundraiser</h2>
          <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label>Name</label>
              <input value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} placeholder="e.g. Spring Bake Sale" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Target (₹)</label>
              <input type="number" value={nf.goal} onChange={e => setNf({ ...nf, goal: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Event date</label>
              <input type="date" value={nf.date} onChange={e => setNf({ ...nf, date: e.target.value })} />
            </div>
            <button className="pri" onClick={handleCreateFundraiser}>Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card mut sans">Loading fundraisers…</div>
      ) : fundraisers.length === 0 ? (
        <div className="card mut sans">No fundraisers created yet.</div>
      ) : (
        fundraisers.map(f => {
          const fundTasks = tasks.filter(t => (t as any).fundraiser_id === f.id);
          const doneCount = fundTasks.filter(t => t.status === 'DONE').length;
          const target = f.target_amount || 1;
          const raised = f.raised_amount || (f as any).amount_raised || 0;
          const pct = Math.min(100, Math.round((raised / target) * 100));
          const taskPct = fundTasks.length ? Math.round((doneCount / fundTasks.length) * 100) : 0;
          const n = nt[f.id] || { title: '' };

          return (
            <div key={f.id} className="card" style={{ marginBottom: 18 }}>
              <div className="row sp">
                <div>
                  <h2>{f.name}</h2>
                  <div className="mut sans" style={{ fontSize: 13 }}>
                    Starts {fdate(f.start_date)} {f.end_date ? `· Ends ${fdate(f.end_date)}` : ''}
                  </div>
                </div>
                <span className={'badge ' + (pct >= 100 ? 'b-ok' : taskPct >= 50 ? 'b-ok' : 'b-warn')}>
                  {pct >= 100 ? 'Target Reached' : `${pct}% of target`}
                </span>
              </div>

              <div className="grid g2 mt">
                <div>
                  <div className="row sp sans" style={{ fontSize: 13 }}>
                    <span>Raised {money(raised)}</span>
                    <span>Target {money(target)}</span>
                  </div>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <div>
                  <div className="row sp sans" style={{ fontSize: 13 }}>
                    <span>Tasks Completed</span>
                    <span>{doneCount}/{fundTasks.length}</span>
                  </div>
                  <div className="bar"><i style={{ width: `${taskPct}%` }} /></div>
                </div>
              </div>

              {/* Task Kanban board */}
              <div className="kan mt">
                {cols.map(c => (
                  <div key={c} className="col">
                    <b className="sans" style={{ fontSize: 12 }}>{c.replace('_', ' ')}</b>
                    {fundTasks.filter(t => t.status === c).map(t => (
                      <div key={t.id} className="t">
                        <div>{t.title}</div>
                        <div className="mut" style={{ fontSize: 12 }}>
                          {t.assignees && t.assignees.length > 0 ? t.assignees.map(a => a.name).join(', ') : 'Unassigned'}
                        </div>
                        <div className="row" style={{ marginTop: 6, gap: 4 }}>
                          {cols.filter(x => x !== c).map(x => (
                            <button key={x} className="sm" onClick={() => handleStatusChange(t.id, x)}>
                              → {x.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Add Task row */}
              {isStaff && (
                <div className="row mt" style={{ alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ flex: 2 }}>
                    <label>Add task</label>
                    <input
                      placeholder="e.g. Buy ingredients, print signs"
                      value={n.title}
                      onChange={e => setNt({ ...nt, [f.id]: { title: e.target.value } })}
                    />
                  </div>
                  <button onClick={() => handleAddTask(f.id)}>Add Task</button>
                </div>
              )}

              {/* Record proceeds */}
              {isStaff && (
                <div className="row mt" style={{ alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>Record takings / donation (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={amt[f.id] || ''}
                      onChange={e => setAmt({ ...amt, [f.id]: e.target.value })}
                    />
                  </div>
                  <button className="pri" onClick={() => handleRecordSales(f.id)}>
                    Add to Ledger
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
