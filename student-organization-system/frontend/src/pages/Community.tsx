import { useEffect, useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head } from '../store/ui';
import { api } from '../services/api';
import type { Announcement, Product, Order, Fundraiser, FundraiserTask } from '../services/api';

export function Announcements() {
  const { me, notify, refreshKey, bump } = useApp();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [t, setT] = useState('');
  const [b, setB] = useState('');
  const [aud, setAud] = useState('ALL');
  const [showNew, setShowNew] = useState(false);
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
      setShowNew(false);
      notify('Announcement published and sent to members');
      bump();
    } catch (err: any) {
      notify(err.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      (a.created_by_name || '').toLowerCase().includes(q) ||
      a.audience_type.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Head title="Announcements" sub="One post reaches every member, and the history stays on record.">
        {isStaff && (
          <button className="pri" onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Close Form' : '+ New Announcement'}
          </button>
        )}
      </Head>

      {isStaff && showNew && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>New Announcement</h2>
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
            {submitting ? 'Publishing…' : 'Post & Notify Members'}
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <input
          type="search"
          placeholder="Search announcements by title, content, audience…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div className="mut sans" style={{ fontSize: 13, alignSelf: 'center' }}>
          Showing {filtered.length} announcement(s)
        </div>
      </div>

      {loading ? (
        <div className="card mut sans">Loading announcements…</div>
      ) : filtered.length === 0 ? (
        <div className="card mut sans">No announcements match your search.</div>
      ) : (
        filtered.map(a => (
          <div key={a.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row sp">
              <h2>{a.title}</h2>
              <span className="badge">{a.audience_type}</span>
            </div>
            <p style={{ margin: '12px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{a.content}</p>
            <div className="mut sans" style={{ fontSize: 12 }}>
              {fdate(a.published_at || a.created_at)} {a.created_by_name ? `· By ${a.created_by_name}` : ''}
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

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Product Selection & Quantity Steppers
  const [sel, setSel] = useState<Record<string, string>>({}); // product_id -> variant_id
  const [qty, setQty] = useState<Record<string, number>>({});

  // Admin Add Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [np, setNp] = useState({
    name: '',
    description: '',
    category: 'Hoodies',
    base_price: '450',
    image_url: '',
    variants: [
      { size: 'S', color: 'Navy', quantity: 15, low_stock_threshold: 4, sku: 'HOOD-S' },
      { size: 'M', color: 'Navy', quantity: 20, low_stock_threshold: 4, sku: 'HOOD-M' },
      { size: 'L', color: 'Navy', quantity: 15, low_stock_threshold: 4, sku: 'HOOD-L' },
      { size: 'XL', color: 'Navy', quantity: 10, low_stock_threshold: 3, sku: 'HOOD-XL' },
    ],
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const isStaff = me?.is_staff ?? false;
  // Get active membership discount %
  const memberDiscount = me?.membership?.merch_discount ??
    me?.membership?.merchandise_discount_percentage ?? 0;

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
    if (!variantId) return notify('Please select a size / variant first');
    const selectedVariant = p.variants.find(v => v.id === variantId);
    if (!selectedVariant) return notify('Selected variant not found');
    const count = qty[p.id] || 1;
    if (selectedVariant.quantity < count) {
      return notify(`Only ${selectedVariant.quantity} item(s) available in stock`);
    }

    const unitPrice = selectedVariant.price ?? p.base_price;
    const effectiveDiscount = memberDiscount;

    const discountedUnit = effectiveDiscount > 0 ? unitPrice * (1 - effectiveDiscount / 100) : unitPrice;
    const total = Math.round(discountedUnit * count * 100) / 100;

    startPay({
      title: `${p.name} (${selectedVariant.size || selectedVariant.sku}) × ${count}`,
      amount: total,
      onSuccess: async () => {
        try {
          await api.post('/orders', {
            items: [{ variant_id: variantId, quantity: count }],
            payment_method: 'CARD',
            discount_percentage: effectiveDiscount > 0 ? effectiveDiscount : undefined,
          });
          notify(`Order placed for ${count}× ${p.name}!`);
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

  const handleCreateProduct = async () => {
    if (!np.name.trim() || !(+np.base_price > 0)) {
      return notify('Please enter a valid product name and base price');
    }
    if (np.variants.length === 0) {
      return notify('Add at least one size variant');
    }
    try {
      setSavingProduct(true);
      await api.post('/products', {
        name: np.name.trim(),
        description: np.description.trim() || 'Club merchandise',
        category: np.category,
        base_price: +np.base_price,
        image_url: np.image_url.trim() || undefined,
        variants: np.variants.map(v => ({
          sku: v.sku.trim(),
          size: v.size.trim() || undefined,
          color: v.color.trim() || undefined,
          price: +np.base_price,
          quantity: +v.quantity || 0,
          low_stock_threshold: +v.low_stock_threshold || 5,
        })),
      });
      notify('New merchandise product added!');
      setShowAddProduct(false);
      setNp({
        name: '',
        description: '',
        category: 'Hoodies',
        base_price: '450',
        image_url: '',
        variants: [
          { size: 'S', color: 'Navy', quantity: 15, low_stock_threshold: 4, sku: 'HOOD-S' },
          { size: 'M', color: 'Navy', quantity: 20, low_stock_threshold: 4, sku: 'HOOD-M' },
          { size: 'L', color: 'Navy', quantity: 15, low_stock_threshold: 4, sku: 'HOOD-L' },
          { size: 'XL', color: 'Navy', quantity: 10, low_stock_threshold: 3, sku: 'HOOD-XL' },
        ],
      });
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const addVariantRow = () => {
    const nextIdx = np.variants.length + 1;
    const prefix = (np.name.trim() || 'PROD').slice(0, 4).toUpperCase();
    setNp({
      ...np,
      variants: [
        ...np.variants,
        { size: `Size ${nextIdx}`, color: 'Standard', quantity: 10, low_stock_threshold: 4, sku: `${prefix}-${nextIdx}` },
      ],
    });
  };

  const removeVariantRow = (idx: number) => {
    setNp({
      ...np,
      variants: np.variants.filter((_, i) => i !== idx),
    });
  };

  const updateVariantRow = (idx: number, field: string, val: any) => {
    const updated = [...np.variants];
    (updated[idx] as any)[field] = val;
    setNp({ ...np, variants: updated });
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <>
      <Head
        title={isStaff ? 'Merchandise & Inventory Management' : 'Merchandise Shop'}
        sub={
          isStaff
            ? 'Administrator View — Manage club products, inventory variants, stock replenishment, and member orders.'
            : memberDiscount > 0
            ? `Your active member discount: ${memberDiscount}% off applied automatically`
            : 'Join as a member for up to 15% off official club hoodies, shirts, and accessories.'
        }
      >
        {isStaff && (
          <button className="pri" onClick={() => setShowAddProduct(!showAddProduct)}>
            {showAddProduct ? 'Close Form' : '+ Add New Merchandise'}
          </button>
        )}
      </Head>

      {/* Add New Merchandise Modal / Form (Staff) */}
      {isStaff && showAddProduct && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--pri)' }}>
          <h2>Add New Merchandise Product</h2>
          <div className="grid g2 mt">
            <div>
              <label>Product Name</label>
              <input
                value={np.name}
                onChange={e => {
                  const val = e.target.value;
                  const pfx = (val.trim() || 'PROD').slice(0, 4).toUpperCase();
                  setNp({
                    ...np,
                    name: val,
                    variants: np.variants.map(v => ({ ...v, sku: `${pfx}-${v.size}` })),
                  });
                }}
                placeholder="e.g. Skyline Embroidered Fleece Hoodie"
              />
            </div>
            <div>
              <label>Category</label>
              <select value={np.category} onChange={e => setNp({ ...np, category: e.target.value })}>
                <option value="Hoodies">Hoodies</option>
                <option value="T-Shirts">T-Shirts</option>
                <option value="Accessories">Accessories</option>
                <option value="Stationery">Stationery</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid g2 mt">
            <div>
              <label>Base Price (₹)</label>
              <input
                type="number"
                value={np.base_price}
                onChange={e => setNp({ ...np, base_price: e.target.value })}
              />
            </div>
            <div>
              <label>Product Description</label>
              <input
                value={np.description}
                onChange={e => setNp({ ...np, description: e.target.value })}
                placeholder="Details, materials, sizing guide..."
              />
            </div>
          </div>

          {/* Variants Table */}
          <div className="mt">
            <div className="row sp" style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>Size & Stock Variants</label>
              <button className="sm" onClick={addVariantRow}>+ Add Variant / Size</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Color</th>
                  <th>SKU</th>
                  <th>Initial Stock</th>
                  <th>Low Stock Alert</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {np.variants.map((v, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        style={{ padding: '4px 8px' }}
                        value={v.size}
                        onChange={e => updateVariantRow(i, 'size', e.target.value)}
                        placeholder="e.g. S, M, L"
                      />
                    </td>
                    <td>
                      <input
                        style={{ padding: '4px 8px' }}
                        value={v.color}
                        onChange={e => updateVariantRow(i, 'color', e.target.value)}
                        placeholder="e.g. Navy"
                      />
                    </td>
                    <td>
                      <input
                        style={{ padding: '4px 8px' }}
                        value={v.sku}
                        onChange={e => updateVariantRow(i, 'sku', e.target.value)}
                        placeholder="SKU"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ width: 80, padding: '4px 8px' }}
                        value={v.quantity}
                        onChange={e => updateVariantRow(i, 'quantity', +e.target.value || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ width: 80, padding: '4px 8px' }}
                        value={v.low_stock_threshold}
                        onChange={e => updateVariantRow(i, 'low_stock_threshold', +e.target.value || 0)}
                      />
                    </td>
                    <td>
                      {np.variants.length > 1 && (
                        <button className="sm" style={{ color: 'var(--bad)' }} onClick={() => removeVariantRow(i)}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="pri mt" disabled={savingProduct} onClick={handleCreateProduct}>
            {savingProduct ? 'Saving Product…' : 'Save & Publish Merchandise'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="row sp" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ margin: 0 }}>
          {categories.map(c => (
            <button
              key={c}
              className={'sm ' + (categoryFilter === c ? 'on' : '')}
              onClick={() => setCategoryFilter(c)}
            >
              {c === 'ALL' ? 'All Items' : c}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search products by name, size, category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="card mut sans">Loading shop items…</div>
      ) : filteredProducts.length === 0 ? (
        <div className="card mut sans">No merchandise available matching your filter.</div>
      ) : (
        <div className="grid g2">
          {filteredProducts.map(p => {
            const currentVariantId = sel[p.id] || p.variants[0]?.id;
            const currentVariant = p.variants.find(v => v.id === currentVariantId) || p.variants[0];
            const q = qty[p.id] || 1;

            const rawPrice = currentVariant?.price ?? p.base_price;
            const effectiveDiscount = memberDiscount;
            const discountedPrice = effectiveDiscount > 0 ? rawPrice * (1 - effectiveDiscount / 100) : rawPrice;
            const total = Math.round(discountedPrice * q * 100) / 100;
            const unitSavings = rawPrice - discountedPrice;
            const totalStock = (p.variants || []).reduce((acc, v) => acc + (v.quantity || 0), 0);

            return (
              <div key={p.id} className="card">
                <div className="row sp">
                  <h2>{p.name}</h2>
                  <span className="badge">{p.category || 'Merch'}</span>
                </div>

                <p className="mut" style={{ margin: '6px 0 10px', fontSize: 13.5 }}>{p.description}</p>

                {/* Staff Admin View: Price & Total Inventory Metrics */}
                {isStaff ? (
                  <div style={{ margin: '12px 0', background: 'var(--soft)', padding: '10px 14px', borderRadius: 8 }}>
                    <div className="row sp" style={{ alignItems: 'center' }}>
                      <div>
                        <span className="mut sans" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retail Base Price</span>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--pri)' }}>{money(rawPrice)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="mut sans" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total In Stock</span>
                        <div style={{ fontSize: 20, fontWeight: 700, color: totalStock > 0 ? 'var(--ok)' : 'var(--bad)' }}>
                          {totalStock} units
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Student / Attendee View: Price with Member Discount Breakdown */
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 26, fontWeight: 600 }}>
                      {money(discountedPrice)}
                      {effectiveDiscount > 0 && (
                        <s className="mut sans" style={{ fontSize: 15, marginLeft: 8 }}>{money(rawPrice)}</s>
                      )}
                    </div>

                    {effectiveDiscount > 0 && (
                      <div className="badge b-ok" style={{ marginTop: 6, display: 'inline-block' }}>
                        ✓ {effectiveDiscount}% Member Discount (Save {money(unitSavings)} / item)
                      </div>
                    )}
                  </div>
                )}

                {/* Size / Variant Buttons */}
                {p.variants && p.variants.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>
                      {isStaff ? 'Inventory by Variant' : 'Choose Size / Variant'}
                    </label>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {p.variants.map(v => {
                        const inStock = v.quantity > 0;
                        return (
                          <button
                            key={v.id}
                            disabled={!inStock && !isStaff}
                            className={'size sm ' + (currentVariantId === v.id ? 'on' : '')}
                            onClick={() => setSel({ ...sel, [p.id]: v.id })}
                            style={{ opacity: inStock ? 1 : 0.5 }}
                          >
                            {v.size || v.color || v.sku}
                            <span style={{ opacity: 0.8, marginLeft: 4, fontWeight: 'bold' }}>
                              ({v.quantity})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Student / Attendee Purchase Stepper & Checkout Button (Hidden for Admin) */}
                {!isStaff && (
                  <>
                    <div style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: 8, marginTop: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Select Quantity</label>
                      <div className="row" style={{ alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <button
                          className="sm"
                          style={{ width: 32, height: 32, padding: 0 }}
                          disabled={q <= 1}
                          onClick={() => setQty({ ...qty, [p.id]: Math.max(1, q - 1) })}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={currentVariant?.quantity || 1}
                          style={{ width: 64, textAlign: 'center', fontWeight: 'bold' }}
                          value={q}
                          onChange={e => setQty({ ...qty, [p.id]: Math.max(1, Math.min(currentVariant?.quantity || 1, +e.target.value || 1)) })}
                        />
                        <button
                          className="sm"
                          style={{ width: 32, height: 32, padding: 0 }}
                          disabled={!currentVariant || q >= currentVariant.quantity}
                          onClick={() => setQty({ ...qty, [p.id]: Math.min(currentVariant?.quantity || 1, q + 1) })}
                        >
                          +
                        </button>
                        <span className="mut sans" style={{ fontSize: 13 }}>
                          Total: <b>{money(total)}</b>
                        </span>
                      </div>
                    </div>

                    <button
                      className="pri mt"
                      disabled={!currentVariant || currentVariant.quantity <= 0}
                      style={{ width: '100%' }}
                      onClick={() => handleBuy(p)}
                    >
                      {!currentVariant || currentVariant.quantity <= 0
                        ? 'Out of Stock'
                        : `Order ${q} Item${q > 1 ? 's' : ''} · ${money(total)}`}
                    </button>
                  </>
                )}

                {/* Staff Fast Restock */}
                {isStaff && me?.permissions.includes('inventory.manage') && (
                  <div className="row mt sans" style={{ fontSize: 12, alignItems: 'center', borderTop: '1px solid #eee', paddingTop: 10, flexWrap: 'wrap', gap: 6 }}>
                    <span className="mut">Quick Restock (+5 stock):</span>
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
        <h2>{isStaff ? 'All Member Orders' : 'My Orders'}</h2>
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
                  <td><b>{(o as any).customer || me?.first_name || 'Member'}</b></td>
                  <td>
                    {o.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: 13 }}>
                        {it.product_name || (it as any).name} ({it.size || (it as any).variant || 'Std'}) × {it.quantity}
                      </div>
                    )) || '—'}
                  </td>
                  <td><b>{money(o.total_amount)}</b></td>
                  <td><span className={'badge ' + (o.status === 'COMPLETED' ? 'b-ok' : 'b-warn')}>{o.status}</span></td>
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
  const [search, setSearch] = useState('');

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

  const filteredFundraisers = fundraisers.filter(f => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Head title="Fundraisers" sub="Track targets, volunteers, tasks, and real collections." />

      {isStaff && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Create a Fundraiser</h2>
          <div className="row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>Name</label>
              <input value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} placeholder="e.g. Spring Bake Sale" />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label>Target (₹)</label>
              <input type="number" value={nf.goal} onChange={e => setNf({ ...nf, goal: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Event Date</label>
              <input type="date" value={nf.date} onChange={e => setNf({ ...nf, date: e.target.value })} />
            </div>
            <button className="pri" onClick={handleCreateFundraiser}>Create</button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <input
          type="search"
          placeholder="Search fundraisers by title, description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div className="mut sans" style={{ fontSize: 13, alignSelf: 'center' }}>
          Showing {filteredFundraisers.length} fundraiser(s)
        </div>
      </div>

      {loading ? (
        <div className="card mut sans">Loading fundraisers…</div>
      ) : filteredFundraisers.length === 0 ? (
        <div className="card mut sans">No fundraisers found matching your search.</div>
      ) : (
        filteredFundraisers.map(f => {
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
