import React from 'react';
import { avatarStore, useAvatar } from '../avatar/store';

export function AvatarPanel() {
  const a = useAvatar();
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 8, color: '#fff', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: 6 }}>Avatar</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <select value={a.bodyId} onChange={(e) => avatarStore.set({ bodyId: e.target.value })}>
          <option value="bodyA">Body A</option>
          <option value="bodyB">Body B</option>
        </select>
        <select value={a.headId} onChange={(e) => avatarStore.set({ headId: e.target.value })}>
          <option value="headA">Head A</option>
          <option value="headB">Head B</option>
        </select>
        <select value={a.outfitId} onChange={(e) => avatarStore.set({ outfitId: e.target.value })}>
          <option value="robeA">Robe A</option>
          <option value="robeB">Robe B</option>
        </select>
      </div>
      <label>
        Primary
        <input type="color" value={a.colors.primary} onChange={(e) => avatarStore.set({ colors: { primary: e.target.value, secondary: a.colors.secondary } })} />
      </label>
      <label style={{ marginLeft: 6 }}>
        Secondary
        <input type="color" value={a.colors.secondary} onChange={(e) => avatarStore.set({ colors: { primary: a.colors.primary, secondary: e.target.value } })} />
      </label>
    </div>
  );
}


