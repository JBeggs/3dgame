import React from 'react';
import { useModularAvatar, modularAvatarStore } from '../avatar/modularStore';
import { clothingDatabase, getItemsBySlot } from '../data/clothingItems';

export function ClothingPanel() {
  const config = useModularAvatar();

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      minWidth: '250px',
      fontSize: '14px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
        🎨 Modular Avatar System
      </h3>
      
      {/* Clothing Slots */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Clothing:</h4>
        
        {['shirt', 'pants', 'shoes', 'hat'].map(slot => (
          <div key={slot} style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', textTransform: 'capitalize' }}>
              {slot}:
            </label>
            <select 
              value={config.equipped[slot as keyof typeof config.equipped] || ''}
              onChange={(e) => modularAvatarStore.equipItem(slot as any, e.target.value || undefined)}
              style={{
                width: '100%',
                padding: '5px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            >
              <option value="">None</option>
              {getItemsBySlot(slot).map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      
      {/* Colors */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Colors:</h4>
        
        {Object.entries(config.colors).map(([colorKey, colorValue]) => (
          <div key={colorKey} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <label style={{ minWidth: '60px', textTransform: 'capitalize' }}>
              {colorKey}:
            </label>
            <input
              type="color"
              value={colorValue}
              onChange={(e) => modularAvatarStore.setColor(colorKey as any, e.target.value)}
              style={{ marginLeft: '10px', width: '30px', height: '25px' }}
            />
          </div>
        ))}
      </div>
      
      {/* Debug Info */}
      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        <strong>Current Config:</strong><br />
        Base: {config.baseModel}<br />
        Equipped: {Object.keys(config.equipped).length} items<br />
        {Object.entries(config.equipped).map(([slot, itemId]) => (
          <div key={slot}>• {slot}: {itemId}</div>
        ))}
      </div>
      
      {/* Quick Presets */}
      <div style={{ marginTop: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Quick Test:</h4>
        <button
          onClick={() => modularAvatarStore.set({
            equipped: { shirt: 'basic_shirt' },
            colors: { ...config.colors, primary: '#ff6b6b' }
          })}
          style={{
            background: '#444',
            color: 'white',
            border: '1px solid #666',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Red Shirt
        </button>
        <button
          onClick={() => modularAvatarStore.set({
            equipped: {},
            colors: { ...config.colors, primary: '#6b6bff' }
          })}
          style={{
            background: '#444',
            color: 'white',
            border: '1px solid #666',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          No Clothes
        </button>
      </div>
    </div>
  );
}
