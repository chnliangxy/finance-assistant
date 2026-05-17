import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Funds({ userId, t }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [positionTarget, setPositionTarget] = useState(null);
  const [positionForm, setPositionForm] = useState({ buy_price: '', shares: '' });
  const [draggingCode, setDraggingCode] = useState(null);
  const [formData, setFormData] = useState({
    fund_code: '',
    fund_name: '',
    buy_price: '',
    shares: ''
  });
  const longPressTimerRef = useRef(null);
  const pointerDraggingRef = useRef(false);
  const pendingOrderRef = useRef([]);

  useEffect(() => {
    fetchWatchlist();
  }, [userId]);

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`/funds/watchlist/${userId}`);
      setWatchlist(res.data);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchFund = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await axios.get(`/funds/search/${keyword}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error('Failed to search fund:', error);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchKeyword(value);
    searchFund(value);
  };

  const selectFund = (fund) => {
    setSelectedFund(fund);
    setFormData({
      fund_code: fund.code,
      fund_name: fund.name,
      buy_price: '',
      shares: ''
    });
    setSearchResults([]);
    setSearchKeyword('');
  };

  const addToWatchlist = async () => {
    if (!formData.fund_code) return;
    
    try {
      await axios.post('/funds/watchlist', {
        userId,
        ...formData,
        buy_price: parseFloat(formData.buy_price) || 0,
        shares: parseFloat(formData.shares) || 0
      });
      setShowAddModal(false);
      setSelectedFund(null);
      setFormData({ fund_code: '', fund_name: '', buy_price: '', shares: '' });
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (fundCode) => {
    try {
      await axios.delete(`/funds/watchlist/${userId}/${fundCode}`);
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to delete from watchlist:', error);
    }
  };

  const refreshNav = async (fundCode) => {
    try {
      const res = await axios.get(`/funds/nav/${fundCode}`);
      if (res.data) {
        fetchWatchlist();
      }
    } catch (error) {
      console.error('Failed to refresh NAV:', error);
    }
  };

  const formatMoney = (value = 0, digits = 4) => `¥${Number(value || 0).toFixed(digits)}`;
  const moveItem = (items, sourceCode, targetCode) => {
    const sourceIndex = items.findIndex(item => item.fund_code === sourceCode);
    const targetIndex = items.findIndex(item => item.fund_code === targetCode);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const persistOrder = async (items) => {
    try {
      await axios.put(`/funds/watchlist/${userId}/reorder`, {
        codes: items.map(fund => fund.fund_code)
      });
    } catch (error) {
      console.error('Failed to save fund order:', error);
      fetchWatchlist();
    }
  };

  const startRowPress = (event, fundCode) => {
    if (event.target.closest('button, input, a')) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      pointerDraggingRef.current = true;
      pendingOrderRef.current = watchlist;
      setDraggingCode(fundCode);
    }, 450);
  };

  const moveDraggedRow = (event) => {
    if (!pointerDraggingRef.current || !draggingCode) return;
    event.preventDefault();
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('tr[data-row-code]');
    const targetCode = row?.dataset?.rowCode;
    if (!targetCode || targetCode === draggingCode) return;

    const next = moveItem(pendingOrderRef.current, draggingCode, targetCode);
    pendingOrderRef.current = next;
    setWatchlist(next);
  };

  const endRowPress = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearTimeout(longPressTimerRef.current);
    if (pointerDraggingRef.current) {
      persistOrder(pendingOrderRef.current);
    }
    pointerDraggingRef.current = false;
    setDraggingCode(null);
  };

  const openAddPosition = (fund) => {
    setPositionTarget(fund);
    setPositionForm({ buy_price: fund.current_nav ? String(fund.current_nav) : '', shares: '' });
    setShowPositionModal(true);
  };

  const addPosition = async () => {
    if (!positionTarget) return;
    const addPrice = parseFloat(positionForm.buy_price) || 0;
    const addShares = parseFloat(positionForm.shares) || 0;
    if (addPrice <= 0 || addShares <= 0) return;

    const currentShares = Number(positionTarget.shares || 0);
    const currentCost = Number(positionTarget.buy_price || 0);
    const nextShares = currentShares + addShares;
    const nextCost = nextShares > 0
      ? ((currentCost * currentShares) + (addPrice * addShares)) / nextShares
      : 0;

    try {
      await axios.put(`/funds/watchlist/${userId}/${positionTarget.fund_code}`, {
        buy_price: Number(nextCost.toFixed(6)),
        shares: Number(nextShares.toFixed(4))
      });
      setShowPositionModal(false);
      setPositionTarget(null);
      setPositionForm({ buy_price: '', shares: '' });
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to add fund position:', error);
    }
  };

  const previewShares = Number(positionTarget?.shares || 0) + (parseFloat(positionForm.shares) || 0);
  const previewCost = previewShares > 0
    ? (((Number(positionTarget?.buy_price || 0) * Number(positionTarget?.shares || 0)) +
      ((parseFloat(positionForm.buy_price) || 0) * (parseFloat(positionForm.shares) || 0))) / previewShares)
    : 0;

  return (
    <div className="funds-page">
      <div className="page-header">
        <h2 className="page-title">[ {t('funds')} ]</h2>
        <button 
          className="pixel-btn pixel-btn-success"
          onClick={() => setShowAddModal(true)}
        >
          {t('add')}
        </button>
      </div>

      {/* Watchlist */}
      <div className="pixel-card">
        {loading ? (
          <div className="loading-text">{t('loading')}</div>
        ) : watchlist.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">FND</div>
            <div className="empty-text">{t('noFunds')}</div>
            <button 
              className="pixel-btn pixel-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              {t('addFirst')}
            </button>
          </div>
        ) : (
          <>
            <div className="drag-hint">{t('dragHint')}</div>
            <table className="pixel-table">
              <thead>
                <tr>
                  <th>{t('code')}</th>
                  <th>{t('name')}</th>
                  <th>{t('nav')}</th>
                  <th>{t('change')}</th>
                  <th>{t('buy')}</th>
                  <th>{t('shares')}</th>
                  <th>{t('value')}</th>
                  <th>{t('pl')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
              {watchlist.map(fund => {
                const hasPosition = Number(fund.cost_amount || 0) > 0 && Number(fund.current_value || 0) > 0;
                const profitAmount = hasPosition ? Number(fund.profit_amount || 0) : null;
                const profitPercent = hasPosition ? Number(fund.profit_percent || 0) : null;
                
                return (
                  <tr
                    key={fund.fund_code}
                    data-row-code={fund.fund_code}
                    className={draggingCode === fund.fund_code ? 'dragging-row' : ''}
                    onPointerDown={event => startRowPress(event, fund.fund_code)}
                    onPointerMove={moveDraggedRow}
                    onPointerUp={event => endRowPress(event)}
                    onPointerCancel={event => endRowPress(event)}
                  >
                    <td className="fund-code">{fund.fund_code}</td>
                    <td>{fund.fund_name || '-'}</td>
                    <td className={fund.change_percent > 0 ? 'up' : fund.change_percent < 0 ? 'down' : ''}>
                      {fund.current_nav ? formatMoney(fund.current_nav) : '-'}
                    </td>
                    <td className={fund.change_percent > 0 ? 'up' : fund.change_percent < 0 ? 'down' : ''}>
                      {fund.change_percent ? (
                        <span>
                          {fund.change_percent > 0 ? '▲' : '▼'} 
                          {Math.abs(fund.change_percent)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>{fund.buy_price ? formatMoney(fund.buy_price) : '-'}</td>
                    <td>{fund.shares || '-'}</td>
                    <td>{hasPosition ? `¥${Number(fund.current_value || 0).toFixed(2)}` : '-'}</td>
                    <td className={profitPercent > 0 ? 'up' : profitPercent < 0 ? 'down' : ''}>
                      {hasPosition ? (
                        <span className="profit-cell">
                          <span>{profitAmount > 0 ? '+' : ''}¥{Number(profitAmount || 0).toFixed(2)}</span>
                          <small>{profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%</small>
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="action-btns" onPointerDown={event => event.stopPropagation()}>
                        <button 
                          className="pixel-btn pixel-btn-warning action-icon-btn"
                          onClick={() => refreshNav(fund.fund_code)}
                          title={t('refresh')}
                        >
                          ↻
                        </button>
                        <button
                          className="pixel-btn pixel-btn-success action-icon-btn"
                          onClick={() => openAddPosition(fund)}
                          title={t('addPosition')}
                        >
                          +
                        </button>
                        <button 
                          className="pixel-btn pixel-btn-danger action-icon-btn"
                          onClick={() => removeFromWatchlist(fund.fund_code)}
                          title={t('delete')}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Add Fund Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('addFund')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            {!selectedFund ? (
              <div className="search-section">
                <div className="form-group">
                  <label className="form-label">{t('search')}</label>
                  <input
                    type="text"
                    className="pixel-input"
                    placeholder={t('searchPlaceholder')}
                    value={searchKeyword}
                    onChange={handleSearchChange}
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(fund => (
                      <div 
                        key={fund.code} 
                        className="search-item"
                        onClick={() => selectFund(fund)}
                      >
                        <div className="search-item-code">{fund.code}</div>
                        <div className="search-item-name">{fund.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="add-form">
                <div className="selected-fund">
                  <span className="fund-code">{selectedFund.code}</span>
                  <span className="fund-name">{selectedFund.name}</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('costNav')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="pixel-input"
                    placeholder={t('buyNavPlaceholder')}
                    value={formData.buy_price}
                    onChange={e => setFormData({ ...formData, buy_price: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('shares')}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="pixel-input"
                    placeholder={t('sharesPlaceholder')}
                    value={formData.shares}
                    onChange={e => setFormData({ ...formData, shares: e.target.value })}
                  />
                </div>
                
                <div className="modal-footer">
                  <button 
                    className="pixel-btn"
                    onClick={() => setSelectedFund(null)}
                  >
                    {t('back')}
                  </button>
                  <button 
                    className="pixel-btn pixel-btn-success"
                    onClick={addToWatchlist}
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showPositionModal && positionTarget && (
        <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('addHolding')}</h3>
              <button className="modal-close" onClick={() => setShowPositionModal(false)}>✕</button>
            </div>

            <div className="selected-fund">
              <span className="fund-code">{positionTarget.fund_code}</span>
              <span className="fund-name">{positionTarget.fund_name || '-'}</span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('addNav')}</label>
              <input
                type="number"
                step="0.0001"
                className="pixel-input"
                value={positionForm.buy_price}
                onChange={e => setPositionForm({ ...positionForm, buy_price: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('addShares')}</label>
              <input
                type="number"
                step="0.01"
                className="pixel-input"
                value={positionForm.shares}
                onChange={e => setPositionForm({ ...positionForm, shares: e.target.value })}
              />
            </div>

            <div className="position-preview">
              <span>{t('updatedCost')}: {formatMoney(previewCost, 4)}</span>
              <span>{t('totalShares')}: {previewShares ? previewShares.toFixed(2) : '-'}</span>
              <span>{t('cost')}: ¥{Number(previewCost * previewShares || 0).toFixed(2)}</span>
            </div>

            <div className="modal-footer">
              <button className="pixel-btn" onClick={() => setShowPositionModal(false)}>
                {t('back')}
              </button>
              <button className="pixel-btn pixel-btn-success" onClick={addPosition}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fund-code {
          font-family: 'Press Start 2P', cursive;
          font-size: 8px;
          color: #FFFF00;
        }

        .action-btns {
          display: flex;
          gap: 5px;
        }

        .action-btns .pixel-btn {
          font-size: 8px;
          padding: 6px 8px;
        }

        .action-btns .action-icon-btn {
          width: 34px;
          height: 34px;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 14px;
          line-height: 1;
        }

        .drag-hint {
          margin-bottom: 10px;
          font-family: 'VT323', monospace;
          font-size: 16px;
          color: var(--text-muted);
        }

        .pixel-table tr {
          touch-action: none;
          user-select: none;
        }

        .dragging-row td {
          background: rgba(255, 216, 74, 0.12) !important;
          outline: 1px solid var(--accent-yellow);
        }

        .position-preview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
          font-family: 'Press Start 2P', cursive;
          font-size: 8px;
          color: var(--text-secondary);
        }

        .position-preview span {
          border: 1px solid var(--border-line);
          background: rgba(255, 255, 255, 0.035);
          padding: 10px;
          overflow-wrap: anywhere;
        }

        .search-section {
          position: relative;
        }

        .selected-fund {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #000000;
          border: 2px solid #FFFF00;
          margin-bottom: 15px;
          border-radius: 0;
        }

        .selected-fund .fund-code {
          font-size: 10px;
        }

        .selected-fund .fund-name {
          font-family: 'VT323', monospace;
          font-size: 18px;
          color: #BF00FF;
        }

        .add-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
      `}</style>
    </div>
  );
}

export default Funds;
