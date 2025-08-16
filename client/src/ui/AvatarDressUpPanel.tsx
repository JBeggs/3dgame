import React, { useState } from 'react';
import { useAvatar, avatarStore, AccessorySlot } from '../avatar/store';

export function AvatarDressUpPanel() {
  const cfg = useAvatar();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'parts' | 'colors' | 'accessories' | 'presets'>('parts');

  if (!isOpen) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          👗 Dress Up
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '320px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '12px',
      padding: '20px',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          👗 Avatar Dress Up
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
        {[
          { key: 'parts', label: '🧩 Parts', icon: '🧩' },
          { key: 'colors', label: '🎨 Colors', icon: '🎨' },
          { key: 'accessories', label: '👑 Items', icon: '👑' },
          { key: 'presets', label: '⭐ Presets', icon: '⭐' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: activeTab === tab.key ? '#4a90e2' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#999',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              margin: '0 2px',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal'
            }}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'parts' && <PartsTab />}
      {activeTab === 'colors' && <ColorsTab />}
      {activeTab === 'accessories' && <AccessoriesTab />}
      {activeTab === 'presets' && <PresetsTab />}
    </div>
  );
}

function PartsTab() {
  const cfg = useAvatar();
  
  const bodyOptions = [
    { id: 'bodyA', name: 'Athletic', emoji: '🏋️' },
    { id: 'bodyB', name: 'Slim', emoji: '🏃' },
    { id: 'bodyC', name: 'Robust', emoji: '🧸' }
  ];
  
  const headOptions = [
    { id: 'headA', name: 'Human', emoji: '😊' },
    { id: 'headB', name: 'Elf', emoji: '🧝' },
    { id: 'headC', name: 'Dwarf', emoji: '🧔' }
  ];
  
  const outfitOptions = [
    { id: 'robeA', name: 'Mage Robe', emoji: '🧙' },
    { id: 'robeB', name: 'Knight Armor', emoji: '🛡️' },
    { id: 'robeC', name: 'Ranger Gear', emoji: '🏹' }
  ];

  return (
    <div>
      <Section 
        title="Body Type" 
        options={bodyOptions}
        current={cfg.bodyId}
        onChange={(id) => avatarStore.set({ bodyId: id })}
      />
      
      <Section 
        title="Head Type" 
        options={headOptions}
        current={cfg.headId}
        onChange={(id) => avatarStore.set({ headId: id })}
      />
      
      <Section 
        title="Outfit" 
        options={outfitOptions}
        current={cfg.outfitId}
        onChange={(id) => avatarStore.set({ outfitId: id })}
      />
    </div>
  );
}

function ColorsTab() {
  const cfg = useAvatar();
  
  const colorPresets = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dda0dd', '#ffa07a', '#98fb98', '#f0e68c', '#ffd1dc',
    '#b0e0e6', '#ffb6c1', '#d3d3d3', '#c0c0c0', '#8fbc8f'
  ];

  return (
    <div>
      <ColorSection
        title="🎨 Skin Color"
        current={cfg.colors.primary}
        presets={colorPresets}
        onChange={(color) => avatarStore.set({ colors: { ...cfg.colors, primary: color } })}
      />
      
      <ColorSection
        title="👕 Clothing Color"
        current={cfg.colors.secondary}
        presets={colorPresets}
        onChange={(color) => avatarStore.set({ colors: { ...cfg.colors, secondary: color } })}
      />
      
      <ColorSection
        title="✨ Accent Color"
        current={cfg.colors.accent}
        presets={colorPresets}
        onChange={(color) => avatarStore.set({ colors: { ...cfg.colors, accent: color } })}
      />
      
      <ColorSection
        title="👑 Accessory Color"
        current={cfg.colors.accessory}
        presets={colorPresets}
        onChange={(color) => avatarStore.set({ colors: { ...cfg.colors, accessory: color } })}
      />
    </div>
  );
}

function AccessoriesTab() {
  const cfg = useAvatar();
  
  const accessoryOptions = {
    hat: [
      { id: undefined, name: 'None', emoji: '🚫' },
      { id: 'wizardHat', name: 'Wizard Hat', emoji: '🎩' },
      { id: 'crown', name: 'Crown', emoji: '👑' },
      { id: 'helmet', name: 'Helmet', emoji: '⛑️' }
    ],
    cape: [
      { id: undefined, name: 'None', emoji: '🚫' },
      { id: 'magicCape', name: 'Magic Cape', emoji: '🧙‍♂️' },
      { id: 'knightCape', name: 'Knight Cape', emoji: '🛡️' },
      { id: 'cloak', name: 'Cloak', emoji: '🥷' }
    ],
    glasses: [
      { id: undefined, name: 'None', emoji: '🚫' },
      { id: 'glasses', name: 'Glasses', emoji: '👓' },
      { id: 'sunglasses', name: 'Sunglasses', emoji: '🕶️' },
      { id: 'monocle', name: 'Monocle', emoji: '🧐' }
    ],
    necklace: [
      { id: undefined, name: 'None', emoji: '🚫' },
      { id: 'amulet', name: 'Amulet', emoji: '🔮' },
      { id: 'chain', name: 'Gold Chain', emoji: '📿' },
      { id: 'pendant', name: 'Pendant', emoji: '🔱' }
    ]
  };

  return (
    <div>
      {Object.entries(accessoryOptions).map(([slot, options]) => (
        <Section
          key={slot}
          title={slot.charAt(0).toUpperCase() + slot.slice(1)}
          options={options}
          current={cfg.accessories[slot as AccessorySlot]}
          onChange={(id) => avatarStore.setAccessory(slot as AccessorySlot, id)}
        />
      ))}
    </div>
  );
}

function PresetsTab() {
  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#ccc' }}>
        Quick Avatar Presets
      </h4>
      
      {Object.entries(avatarStore.presets).map(([key, preset]) => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <button
            onClick={() => avatarStore.set(preset)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: preset.colors.primary,
              border: '2px solid ' + preset.colors.secondary
            }} />
            
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>
                Preset {key.slice(-1)}
              </div>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {preset.bodyId} • {preset.outfitId}
                {Object.keys(preset.accessories).length > 0 && ` • +${Object.keys(preset.accessories).length} items`}
              </div>
            </div>
          </button>
        </div>
      ))}
      
      {/* Random Avatar Button */}
      <button
        onClick={() => {
          const randomColors = {
            primary: '#' + Math.floor(Math.random()*16777215).toString(16),
            secondary: '#' + Math.floor(Math.random()*16777215).toString(16),
            accent: '#' + Math.floor(Math.random()*16777215).toString(16),
            accessory: '#' + Math.floor(Math.random()*16777215).toString(16)
          };
          
          const bodies = ['bodyA', 'bodyB', 'bodyC'];
          const heads = ['headA', 'headB', 'headC'];
          const outfits = ['robeA', 'robeB', 'robeC'];
          
          avatarStore.set({
            bodyId: bodies[Math.floor(Math.random() * bodies.length)],
            headId: heads[Math.floor(Math.random() * heads.length)],
            outfitId: outfits[Math.floor(Math.random() * outfits.length)],
            colors: randomColors,
            accessories: Math.random() > 0.5 ? { hat: 'wizardHat' } : {}
          });
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold',
          marginTop: '10px'
        }}
      >
        🎲 Random Avatar
      </button>
    </div>
  );
}

function Section({ 
  title, 
  options, 
  current, 
  onChange 
}: { 
  title: string; 
  options: Array<{ id: string | undefined; name: string; emoji: string }>;
  current: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px', color: '#ccc' }}>
        {title}
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px'
      }}>
        {options.map(option => (
          <button
            key={option.id || 'none'}
            onClick={() => onChange(option.id!)}
            style={{
              padding: '10px 8px',
              background: current === option.id ? '#4a90e2' : '#2a2a2a',
              border: current === option.id ? '2px solid #66a3ff' : '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              minHeight: '60px',
              justifyContent: 'center'
            }}
          >
            <div style={{ fontSize: '16px' }}>{option.emoji}</div>
            <div style={{ fontWeight: current === option.id ? 'bold' : 'normal' }}>
              {option.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorSection({
  title,
  current,
  presets,
  onChange
}: {
  title: string;
  current: string;
  presets: string[];
  onChange: (color: string) => void;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px', color: '#ccc' }}>
        {title}
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        marginBottom: '8px'
      }}>
        {presets.map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            style={{
              width: '32px',
              height: '32px',
              background: color,
              border: current === color ? '3px solid white' : '1px solid #444',
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              boxShadow: current === color ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
            }}
          />
        ))}
      </div>
      
      {/* Custom color input */}
      <input
        type="color"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: '32px',
          border: '1px solid #444',
          borderRadius: '6px',
          background: 'transparent',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}
