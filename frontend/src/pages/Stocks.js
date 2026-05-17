import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Stocks({ userId, t }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [positionTarget, setPositionTarget] = useState(null);
  const [positionForm, setPositionForm] = useState({ buy_price: '', shares: '' });
  const [draggingCode, setDraggingCode] = useState(null);
  const [formData, setFormData] = useState({
    stock_code: '',
    stock_name: '',
    buy_price: '',
    shares: ''
  });
  const [analysis, setAnalysis] = useState(null);
  const [analyzingStock, setAnalyzingStock] = useState(null);
  const longPressTimerRef = useRef(null);
  const pointerDraggingRef = useRef(false);
  const pendingOrderRef = useRef([]);

  useEffect(() => {
    fetchWatchlist();
  }, [userId]);

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`/stocks/watchlist/${userId}`);
      setWatchlist(res.data);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStock = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await axios.get(`/stocks/search/${keyword}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error('Failed to search stock:', error);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchKeyword(value);
    searchStock(value);
  };

  const selectStock = (stock) => {
    setSelectedStock(stock);
    setFormData({
      stock_code: stock.code,
      stock_name: stock.name,
      buy_price: '',
      shares: ''
    });
    setSearchResults([]);
    setSearchKeyword('');
  };

  const addToWatchlist = async () => {
    if (!formData.stock_code) return;
    
    try {
      await axios.post('/stocks/watchlist', {
        userId,
        ...formData,
        buy_price: parseFloat(formData.buy_price) || 0,
        shares: parseInt(formData.shares, 10) || 0
      });
      setShowAddModal(false);
      setSelectedStock(null);
      setFormData({ stock_code: '', stock_name: '', buy_price: '', shares: '' });
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (stockCode) => {
    try {
      await axios.delete(`/stocks/watchlist/${userId}/${stockCode}`);
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to delete from watchlist:', error);
    }
  };

  const analyzeStock = async (stockCode) => {
    setAnalyzingStock(stockCode);
    try {
      const res = await axios.post('/analysis/generate', {
        userId,
        stock_code: stockCode,
        analysis_type: 'daily'
      });
      setAnalysis(res.data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzingStock(null);
    }
  };

  const refreshPrice = async (stockCode) => {
    try {
      await axios.get(`/stocks/price/${stockCode}`);
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to refresh price:', error);
    }
  };

  const formatMoney = (value = 0, digits = 2) => `¥${Number(value || 0).toFixed(digits)}`;
  const moveItem = (items, sourceCode, targetCode) => {
    const sourceIndex = items.findIndex(item => item.stock_code === sourceCode);
    const targetIndex = items.findIndex(item => item.stock_code === targetCode);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const persistOrder = async (items) => {
    try {
      await axios.put(`/stocks/watchlist/${userId}/reorder`, {
        codes: items.map(stock => stock.stock_code)
      });
    } catch (error) {
      console.error('Failed to save stock order:', error);
      fetchWatchlist();
    }
  };

  const startRowPress = (event, stockCode) => {
    if (event.target.closest('button, input, a')) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      pointerDraggingRef.current = true;
      pendingOrderRef.current = watchlist;
      setDraggingCode(stockCode);
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

  const openAddPosition = (stock) => {
    setPositionTarget(stock);
    setPositionForm({ buy_price: stock.current_price ? String(stock.current_price) : '', shares: '' });
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
      await axios.put(`/stocks/watchlist/${userId}/${positionTarget.stock_code}`, {
        buy_price: Number(nextCost.toFixed(4)),
        shares: nextShares
      });
      setShowPositionModal(false);
      setPositionTarget(null);
      setPositionForm({ buy_price: '', shares: '' });
      fetchWatchlist();
    } catch (error) {
      console.error('Failed to add stock position:', error);
    }
  };

  const previewShares = Number(positionTarget?.shares || 0) + (parseFloat(positionForm.shares) || 0);
  const previewCost = previewShares > 0
    ? (((Number(positionTarget?.buy_price || 0) * Number(positionTarget?.shares || 0)) +
      ((parseFloat(positionForm.buy_price) || 0) * (parseFloat(positionForm.shares) || 0))) / previewShares)
    : 0;

  return (
    <div className="stocks-page">
      <div className="page-header">
        <h2 className="page-title">[ {t('stocks')} ]</h2>
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
            <div className="empty-icon">STK</div>
            <div className="empty-text">{t('noStocks')}</div>
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
                  <th>{t('price')}</th>
                  <th>{t('change')}</th>
                  <th>{t('buy')}</th>
                  <th>{t('shares')}</th>
                  <th>{t('value')}</th>
                  <th>{t('pl')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
              {watchlist.map(stock => {
                const hasPosition = Number(stock.cost_amount || 0) > 0 && Number(stock.current_value || 0) > 0;
                const profitAmount = hasPosition ? Number(stock.profit_amount || 0) : null;
                const profitPercent = hasPosition ? Number(stock.profit_percent || 0) : null;
                
                return (
                  <tr
                    key={stock.stock_code}
                    data-row-code={stock.stock_code}
                    className={draggingCode === stock.stock_code ? 'dragging-row' : ''}
                    onPointerDown={event => startRowPress(event, stock.stock_code)}
                    onPointerMove={moveDraggedRow}
                    onPointerUp={event => endRowPress(event)}
                    onPointerCancel={event => endRowPress(event)}
                  >
                    <td className="stock-code">{stock.stock_code}</td>
                    <td>{stock.stock_name || '-'}</td>
                    <td className={stock.change_percent > 0 ? 'up' : stock.change_percent < 0 ? 'down' : ''}>
                      {stock.current_price ? formatMoney(stock.current_price) : '-'}
                    </td>
                    <td className={stock.change_percent > 0 ? 'up' : stock.change_percent < 0 ? 'down' : ''}>
                      {stock.change_percent ? (
                        <span>
                          {stock.change_percent > 0 ? '▲' : '▼'} 
                          {Math.abs(stock.change_percent)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>{stock.buy_price ? formatMoney(stock.buy_price) : '-'}</td>
                    <td>{stock.shares || '-'}</td>
                    <td>{hasPosition ? formatMoney(stock.current_value) : '-'}</td>
                    <td className={profitPercent > 0 ? 'up' : profitPercent < 0 ? 'down' : ''}>
                      {hasPosition ? (
                        <span className="profit-cell">
                          <span>{profitAmount > 0 ? '+' : ''}{formatMoney(profitAmount)}</span>
                          <small>{profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%</small>
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="action-btns" onPointerDown={event => event.stopPropagation()}>
                        <button 
                          className="pixel-btn pixel-btn-primary"
                          onClick={() => analyzeStock(stock.stock_code)}
                          disabled={analyzingStock === stock.stock_code}
                        >
                          {analyzingStock === stock.stock_code ? '...' : 'AI'}
                        </button>
                        <button 
                          className="pixel-btn pixel-btn-warning action-icon-btn"
                          onClick={() => refreshPrice(stock.stock_code)}
                          title={t('refresh')}
                        >
                          ↻
                        </button>
                        <button
                          className="pixel-btn pixel-btn-success action-icon-btn"
                          onClick={() => openAddPosition(stock)}
                          title={t('addPosition')}
                        >
                          +
                        </button>
                        <button 
                          className="pixel-btn pixel-btn-danger action-icon-btn"
                          onClick={() => removeFromWatchlist(stock.stock_code)}
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

      {/* AI Analysis Result */}
      {analysis && (
        <div className="pixel-card analysis-card">
          <div className="analysis-header">
            <h3 className="card-title">{t('aiReport')}</h3>
            <span className={`recommendation ${analysis.recommendation}`}>
              {analysis.recommendation.toUpperCase()}
            </span>
          </div>
          <div className="analysis-content">
            {analysis.content}
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('addStock')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            {!selectedStock ? (
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
                    {searchResults.map(stock => (
                      <div 
                        key={stock.code} 
                        className="search-item"
                        onClick={() => selectStock(stock)}
                      >
                        <div className="search-item-code">{stock.code}</div>
                        <div className="search-item-name">{stock.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="add-form">
                <div className="selected-stock">
                  <span className="stock-code">{selectedStock.code}</span>
                  <span className="stock-name">{selectedStock.name}</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('costPrice')}</label>
                  <input
                    type="number"
                    className="pixel-input"
                    placeholder={t('buyPricePlaceholder')}
                    value={formData.buy_price}
                    onChange={e => setFormData({ ...formData, buy_price: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('shares')}</label>
                  <input
                    type="number"
                    className="pixel-input"
                    placeholder={t('sharesPlaceholder')}
                    value={formData.shares}
                    onChange={e => setFormData({ ...formData, shares: e.target.value })}
                  />
                </div>
                
                <div className="modal-footer">
                  <button 
                    className="pixel-btn"
                    onClick={() => setSelectedStock(null)}
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

            <div className="selected-stock">
              <span className="stock-code">{positionTarget.stock_code}</span>
              <span className="stock-name">{positionTarget.stock_name || '-'}</span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('addPrice')}</label>
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
                step="1"
                className="pixel-input"
                value={positionForm.shares}
                onChange={e => setPositionForm({ ...positionForm, shares: e.target.value })}
              />
            </div>

            <div className="position-preview">
              <span>{t('updatedCost')}: {formatMoney(previewCost, 4)}</span>
              <span>{t('totalShares')}: {previewShares || '-'}</span>
              <span>{t('cost')}: {formatMoney(previewCost * previewShares)}</span>
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
        .stock-code {
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
        
        .selected-stock {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #000000;
          border: 2px solid #FFFF00;
          margin-bottom: 15px;
        }
        
        .selected-stock .stock-code {
          font-size: 10px;
        }
        
        .selected-stock .stock-name {
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

export default Stocks;
