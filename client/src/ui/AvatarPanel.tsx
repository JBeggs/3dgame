import React from 'react';
import { avatarStore, useAvatar, AccessorySlot } from '../avatar/store';

const accessoryOptions = {
  hat: ['none', 'wizardHat', 'baseballCap', 'crown'],
  cape: ['none', 'magicCape', 'heroicCape', 'royalCape'],
  glasses: ['none', 'sunglasses', 'readingGlasses', 'magicSpecs'],
  necklace: ['none', 'goldChain', 'magicAmulet', 'pearlNecklace'],
};

export function AvatarPanel() {
  const a = useAvatar();
  
  const handleAccessoryChange = (slot: AccessorySlot, value: string) => {
    avatarStore.setAccessory(slot, value === 'none' ? undefined : value);
  };
  
  return (
    <div style={{ 
      color: '#fff', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '0.9rem'
    }}>
      <div style={{ marginBottom: 16, fontSize: '0.95rem', fontWeight: '600', color: '#e2e8f0' }}>Character Details</div>
      
      {/* Body Parts */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.85rem', marginBottom: 8, color: '#cbd5e1', fontWeight: '500' }}>Body Parts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <select 
            value={a.bodyId} 
            onChange={(e) => avatarStore.set({ bodyId: e.target.value })}
            style={{
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: '#fff',
              fontSize: '0.8rem'
            }}
          >
            <option value="bodyA">Body A</option>
            <option value="bodyB">Body B</option>
          </select>
          <select 
            value={a.headId} 
            onChange={(e) => avatarStore.set({ headId: e.target.value })}
            style={{
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: '#fff',
              fontSize: '0.8rem'
            }}
          >
            <option value="headA">Head A</option>
            <option value="headB">Head B</option>
          </select>
        </div>
        <select 
          value={a.outfitId} 
          onChange={(e) => avatarStore.set({ outfitId: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            color: '#fff',
            fontSize: '0.8rem'
          }}
        >
          <option value="robeA">Robe A</option>
          <option value="robeB">Robe B</option>
        </select>
      </div>
      
      {/* Accessories */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.85rem', marginBottom: 8, color: '#cbd5e1', fontWeight: '500' }}>Accessories</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(accessoryOptions).map(([slot, options]) => (
            <div key={slot}>
              <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: 4, color: '#94a3b8' }}>
                {slot.charAt(0).toUpperCase() + slot.slice(1)}
              </label>
              <select 
                value={a.accessories[slot as AccessorySlot] || 'none'} 
                onChange={(e) => handleAccessoryChange(slot as AccessorySlot, e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '4px 6px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              >
                {options.map(option => (
                  <option key={option} value={option}>
                    {option === 'none' ? 'None' : option.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      
      {/* Colors */}
      <div>
        <div style={{ fontSize: '0.85rem', marginBottom: 8, color: '#cbd5e1', fontWeight: '500' }}>Color Palette</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <div style={{ marginBottom: 4 }}>Primary</div>
            <input 
              type="color" 
              value={a.colors.primary} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, primary: e.target.value } })} 
              style={{ 
                width: '100%', 
                height: '28px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                background: 'transparent'
              }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <div style={{ marginBottom: 4 }}>Secondary</div>
            <input 
              type="color" 
              value={a.colors.secondary} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, secondary: e.target.value } })} 
              style={{ 
                width: '100%', 
                height: '28px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                background: 'transparent'
              }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <div style={{ marginBottom: 4 }}>Accent</div>
            <input 
              type="color" 
              value={a.colors.accent} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, accent: e.target.value } })} 
              style={{ 
                width: '100%', 
                height: '28px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                background: 'transparent'
              }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <div style={{ marginBottom: 4 }}>Accessory</div>
            <input 
              type="color" 
              value={a.colors.accessory} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, accessory: e.target.value } })} 
              style={{ 
                width: '100%', 
                height: '28px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                background: 'transparent'
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}


