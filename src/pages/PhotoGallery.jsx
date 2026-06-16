import { useState } from 'react';
import './PhotoGallery.css';

function PhotoTile({ item }) {
  return (
    <img className="pg-photo" src={item.image} alt={`${item.label} at ${item.addr}`} loading="lazy" />
  );
}

const GALLERY_ITEMS = [
  {
    id: 1,
    label: 'Front Exterior',
    addr: '2140 Brickell Ave',
    tags: ['Exterior', 'Luxury', 'Pool'],
    ai: 'Modern luxury exterior, pool frontage, strong curb appeal',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 2,
    label: 'Living Room',
    addr: '2140 Brickell Ave',
    tags: ['Interior', 'Modern'],
    ai: 'Open plan living area with premium finishes and natural light',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 3,
    label: 'Gourmet Kitchen',
    addr: '2140 Brickell Ave',
    tags: ['Kitchen', 'Upgraded'],
    ai: 'Large island, upgraded cabinetry, investment-grade finish package',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 4,
    label: 'Primary Bedroom',
    addr: '2140 Brickell Ave',
    tags: ['Bedroom', 'Interior'],
    ai: 'High-end bedroom presentation with strong resale photography',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 5,
    label: 'Primary Bathroom',
    addr: '2140 Brickell Ave',
    tags: ['Bathroom', 'Luxury'],
    ai: 'Spa-style bathroom, tile package suitable for luxury positioning',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 6,
    label: 'Aerial View',
    addr: '2140 Brickell Ave',
    tags: ['Aerial', 'Location'],
    ai: 'Dense urban context with strong commercial and residential demand drivers',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 7,
    label: 'Rear Exterior',
    addr: '918 Congress Ave',
    tags: ['Exterior', 'Backyard'],
    ai: 'Single-family exterior with mature landscaping and usable outdoor area',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 8,
    label: 'Living Room',
    addr: '918 Congress Ave',
    tags: ['Interior', 'Contemporary'],
    ai: 'Contemporary interior condition with broad buyer appeal',
    image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 9,
    label: "Chef's Kitchen",
    addr: '3400 Camelback Rd',
    tags: ['Kitchen', 'Island'],
    ai: 'Large kitchen island, premium appliances, strong owner-occupant appeal',
    image: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 10,
    label: 'Guest Bedroom',
    addr: '3400 Camelback Rd',
    tags: ['Bedroom', 'Natural Light'],
    ai: 'Neutral bedroom presentation, clean condition, good daylight',
    image: 'https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 11,
    label: 'Commercial Facade',
    addr: '3400 Camelback Rd',
    tags: ['Exterior', 'Commercial'],
    ai: 'Commercial-grade frontage suitable for tenant and cap-rate analysis',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1100&q=82',
  },
  {
    id: 12,
    label: 'Neighborhood Aerial',
    addr: '3400 Camelback Rd',
    tags: ['Aerial', 'Schools', 'Parks'],
    ai: 'Neighborhood-scale context for amenity access and comparable selection',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1100&q=82',
  },
];

const ALL_TAGS = ['All', 'Exterior', 'Interior', 'Kitchen', 'Bedroom', 'Bathroom', 'Aerial', 'Luxury', 'Modern', 'Commercial'];

export default function PhotoGallery() {
  const [activeTag, setTag] = useState('All');
  const [selected, setSel] = useState(null);
  const [view, setView] = useState('grid');
  const [addr, setAddr] = useState('all');

  const addrs = ['all', ...new Set(GALLERY_ITEMS.map(i => i.addr))];

  const filtered = GALLERY_ITEMS.filter(item =>
    (addr === 'all' || item.addr === addr) &&
    (activeTag === 'All' || item.tags.includes(activeTag))
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Property Photo Gallery</h1>
        <p className="page-subtitle">AI-analyzed property images with automatic room detection, condition assessment, and feature tagging.</p>
      </div>

      <div className="pg-controls card">
        <div className="pg-addr-tabs">
          {addrs.map(a => (
            <button key={a} className={`pg-addr-tab${addr===a?' active':''}`} onClick={() => setAddr(a)}>
              {a === 'all' ? 'All Properties' : a.split(',')[0]}
            </button>
          ))}
        </div>
        <div className="pg-right">
          <div className="pg-tag-filter">
            {ALL_TAGS.map(t => (
              <button key={t} className={`pg-tag${activeTag===t?' active':''}`} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="pg-view-toggle">
            {['grid','masonry'].map(v => (
              <button key={v} className={`pg-view-btn${view===v?' active':''}`} onClick={() => setView(v)}>
                {v === 'grid' ? 'Grid' : 'Masonry'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`pg-gallery${view === 'masonry' ? ' pg-masonry' : ''}`}>
        {filtered.map((item, idx) => (
          <div key={item.id} className={`pg-item${view==='masonry'&&idx%3===0?' pg-tall':''}`}
            onClick={() => setSel(item)}>
            <PhotoTile item={item} />
            <div className="pg-item-overlay">
              <div className="pg-item-tags">
                {item.tags.slice(0,2).map(t => (
                  <span key={t} className="pg-item-tag">{t}</span>
                ))}
              </div>
              <div className="pg-item-label">{item.label}</div>
              <div className="pg-item-ai">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L7 4.5H11L8 6.5L9.5 11L6 8.5L2.5 11L4 6.5L1 4.5H5L6 1Z" fill="currentColor"/>
                </svg>
                {item.ai}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="pg-empty">No photos match the selected filters.</div>
        )}
      </div>

      {selected && (
        <div className="pg-lightbox" onClick={() => setSel(null)}>
          <div className="pg-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="pg-lightbox-close" onClick={() => setSel(null)}>x</button>
            <div className="pg-lightbox-img">
              <PhotoTile item={selected} />
            </div>
            <div className="pg-lightbox-info">
              <div className="pg-lb-label">{selected.label}</div>
              <div className="pg-lb-addr">{selected.addr}</div>
              <div className="pg-lb-tags">
                {selected.tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
              </div>
              <div className="pg-lb-ai-panel">
                <div className="pg-lb-ai-hdr">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" fill="#c9a84c"/>
                  </svg>
                  AI Analysis
                </div>
                <div className="pg-lb-ai-text">{selected.ai}</div>
              </div>
              <div className="pg-lb-nav">
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const idx = filtered.findIndex(i => i.id === selected.id);
                  setSel(filtered[(idx - 1 + filtered.length) % filtered.length]);
                }}>Previous</button>
                <span className="pg-lb-count">
                  {filtered.findIndex(i => i.id === selected.id) + 1} / {filtered.length}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const idx = filtered.findIndex(i => i.id === selected.id);
                  setSel(filtered[(idx + 1) % filtered.length]);
                }}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
