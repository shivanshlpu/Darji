import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, SortAsc, SortDesc, Phone, MessageCircle,
  IndianRupee, Calendar, MoreVertical, Edit, Trash2, Eye, X, User, MapPin, Tag
} from 'lucide-react';
import useCustomerStore from '../store/customerStore';
import { compressImage } from '../utils/imageCompressor';
import './Customers.css';

const TAGS = ['Regular', 'VIP', 'New', 'Wedding', 'Corporate', 'Walk-in'];

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

export default function Customers() {
  const navigate = useNavigate();
  const {
    searchQuery, setSearchQuery, activeFilters, setFilter, clearFilters,
    sortBy, sortOrder, setSort, getFilteredCustomers, addCustomer,
    deleteCustomer, fetchCustomersFromDB
  } = useCustomerStore();

  useEffect(() => {
    fetchCustomersFromDB();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '', mobile: '', whatsapp: '', address: '', gender: 'male', notes: '', tags: []
  });

  const filteredCustomers = useMemo(() => getFilteredCustomers(), [searchQuery, activeFilters, sortBy, sortOrder, getFilteredCustomers]);
  const activeFilterCount = (activeFilters.tags.length > 0 ? 1 : 0) + (activeFilters.pendingOnly ? 1 : 0);

  const handleAddCustomer = (e) => {
    e.preventDefault();
    addCustomer(newCustomer);
    setNewCustomer({ name: '', mobile: '', whatsapp: '', address: '', gender: 'male', notes: '', tags: [] });
    setShowAddModal(false);
  };

  const toggleTag = (tag) => {
    const current = activeFilters.tags;
    setFilter('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
  };

  const toggleNewTag = (tag) => {
    setNewCustomer(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  return (
    <div className="customers">
      {/* Header */}
      <div className="customers__header">
        <div className="customers__header-left">
          <p className="customers__count">{filteredCustomers.length} customers</p>
        </div>
        <div className="customers__header-right">
          <div className="customers__search">
            <Search size={16} className="customers__search-icon" />
            <input
              type="text"
              placeholder="Search by name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="customers__search-input"
            />
            {searchQuery && (
              <button className="customers__search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className={`customers__filter-btn ${activeFilterCount > 0 ? 'customers__filter-btn--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && <span className="customers__filter-count">{activeFilterCount}</span>}
          </button>
          <button className="customers__add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="customers__filters animate-fade-in-down">
          <div className="customers__filter-group">
            <label>Tags</label>
            <div className="customers__filter-chips">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  className={`customers__chip ${activeFilters.tags.includes(tag) ? 'customers__chip--active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="customers__filter-group">
            <label className="customers__toggle-label">
              <input
                type="checkbox"
                checked={activeFilters.pendingOnly}
                onChange={(e) => setFilter('pendingOnly', e.target.checked)}
              />
              <span>Pending payments only</span>
            </label>
          </div>
          {activeFilterCount > 0 && (
            <button className="customers__clear-filters" onClick={clearFilters}>Clear all filters</button>
          )}
        </div>
      )}

      {/* Customer Table */}
      <div className="customers__table-card">
        <div className="customers__table-wrapper">
          <table className="customers__table">
            <thead>
              <tr>
                <th className="customers__th-sortable" onClick={() => setSort('name')}>
                  Customer {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                </th>
                <th>Contact</th>
                <th className="customers__th-sortable" onClick={() => setSort('totalSpending')}>
                  Total Spent {sortBy === 'totalSpending' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                </th>
                <th className="customers__th-sortable" onClick={() => setSort('pendingAmount')}>
                  Pending {sortBy === 'pendingAmount' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                </th>
                <th>Tags</th>
                <th className="customers__th-sortable" onClick={() => setSort('lastVisit')}>
                  Last Visit {sortBy === 'lastVisit' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="customers__empty">
                    <User size={40} />
                    <p>No customers found</p>
                    <span>Try adjusting your search or filters</span>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust._id}
                    className="customers__row"
                    onClick={() => navigate(`/customers/${cust._id}`)}
                  >
                    <td>
                      <div className="customers__name-cell">
                        <div className="customers__avatar" data-gender={cust.gender}>
                          {cust.photoUrl ? (
                            <img src={cust.photoUrl} alt={cust.name} />
                          ) : (
                            cust.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="customers__name">{cust.name}</p>
                          <p className="customers__address"><MapPin size={11} /> {cust.address?.split(',').slice(0, 2).join(',')}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="customers__contact">
                        <span><Phone size={12} /> {cust.mobile}</span>
                      </div>
                    </td>
                    <td className="customers__amount">{formatINR(cust.totalSpending)}</td>
                    <td>
                      <span className={`customers__pending ${cust.pendingAmount > 0 ? 'customers__pending--has' : ''}`}>
                        {cust.pendingAmount > 0 ? formatINR(cust.pendingAmount) : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="customers__tags">
                        {cust.tags.map(tag => (
                          <span key={tag} className="customers__tag">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="customers__date">
                      {new Date(cust.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="customers__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="customers__action-btn"
                          onClick={() => setMenuOpen(menuOpen === cust._id ? null : cust._id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpen === cust._id && (
                          <div className="customers__menu animate-scale-in">
                            <button onClick={() => { navigate(`/customers/${cust._id}`); setMenuOpen(null); }}>
                              <Eye size={14} /> View Profile
                            </button>
                            <button onClick={() => setMenuOpen(null)}>
                              <Edit size={14} /> Edit
                            </button>
                            <button className="customers__menu-danger" onClick={() => { deleteCustomer(cust._id); setMenuOpen(null); }}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add New Customer</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="modal__body">
              <div className="modal__grid">
                <div className="modal__field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="modal__field">
                  <label>Gender</label>
                  <select
                    value={newCustomer.gender}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="modal__field">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
                <div className="modal__field">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    value={newCustomer.whatsapp}
                    onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
                    placeholder="Same as mobile if blank"
                  />
                </div>
              </div>
              <div className="modal__field">
                <label>Address</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="modal__field">
                <label>Customer Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file, 400, 400, 0.85);
                        setNewCustomer(prev => ({ ...prev, photoUrl: compressed }));
                      } catch (err) {
                        console.error('Customer photo compression error:', err);
                      }
                    }
                  }}
                />
              </div>
              <div className="modal__field">
                <label>Tags</label>
                <div className="customers__filter-chips">
                  {TAGS.map(tag => (
                    <button
                      type="button"
                      key={tag}
                      className={`customers__chip ${newCustomer.tags.includes(tag) ? 'customers__chip--active' : ''}`}
                      onClick={() => toggleNewTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal__field">
                <label>Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Any special preferences..."
                  rows={3}
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
