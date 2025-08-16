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
      position: 'absolute', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.4)', 
      padding: 8, 
      borderRadius: 8, 
      color: '#fff', 
      fontFamily: 'monospace',
      maxWidth: '300px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: 6, fontWeight: 'bold' }}>Avatar Customization</div>
      
      {/* Body Parts */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '12px', marginBottom: 4 }}>Body Parts</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <select value={a.bodyId} onChange={(e) => avatarStore.set({ bodyId: e.target.value })}>
            <option value="bodyA">Body A</option>
            <option value="bodyB">Body B</option>
          </select>
          <select value={a.headId} onChange={(e) => avatarStore.set({ headId: e.target.value })}>
            <option value="headA">Head A</option>
            <option value="headB">Head B</option>
          </select>
        </div>
        <select value={a.outfitId} onChange={(e) => avatarStore.set({ outfitId: e.target.value })}>
          <option value="robeA">Robe A</option>
          <option value="robeB">Robe B</option>
        </select>
      </div>
      
      {/* Accessories */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '12px', marginBottom: 4 }}>Accessories</div>
        {Object.entries(accessoryOptions).map(([slot, options]) => (
          <div key={slot} style={{ marginBottom: 4 }}>
            <label style={{ fontSize: '11px', display: 'block' }}>
              {slot.charAt(0).toUpperCase() + slot.slice(1)}
            </label>
            <select 
              value={a.accessories[slot as AccessorySlot] || 'none'} 
              onChange={(e) => handleAccessoryChange(slot as AccessorySlot, e.target.value)}
              style={{ width: '100%' }}
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
      
      {/* Colors */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '12px', marginBottom: 4 }}>Colors</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <label style={{ fontSize: '11px' }}>
            Primary
            <input 
              type="color" 
              value={a.colors.primary} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, primary: e.target.value } })} 
              style={{ width: '100%', height: '24px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            Secondary
            <input 
              type="color" 
              value={a.colors.secondary} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, secondary: e.target.value } })} 
              style={{ width: '100%', height: '24px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            Accent
            <input 
              type="color" 
              value={a.colors.accent} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, accent: e.target.value } })} 
              style={{ width: '100%', height: '24px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            Accessory
            <input 
              type="color" 
              value={a.colors.accessory} 
              onChange={(e) => avatarStore.set({ colors: { ...a.colors, accessory: e.target.value } })} 
              style={{ width: '100%', height: '24px' }}
            />
          </label>
        </div>
      </div>
      
      {/* Presets */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button 
          onClick={() => avatarStore.set(avatarStore.presets.presetA)}
          style={{ flex: 1, padding: 4, fontSize: '11px' }}
        >
          Preset A
        </button>
        <button 
          onClick={() => avatarStore.set(avatarStore.presets.presetB)}
          style={{ flex: 1, padding: 4, fontSize: '11px' }}
        >
          Preset B
        </button>
      </div>
    </div>
  );
}


