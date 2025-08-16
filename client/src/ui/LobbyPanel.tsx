import React, { useEffect, useState } from 'react';
import { useNet } from '../net/net';

export function LobbyPanel() {
  const net = useNet();
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    // Request room list on mount
    net.getRooms();
  }, [net]);

  const handleJoinRoom = (roomId: string) => {
    net.joinRoom(roomId);
  };

  const handleSetName = () => {
    if (playerName.trim()) {
      net.setPlayerName(playerName.trim());
      setShowNameInput(false);
      setPlayerName('');
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getRoomTypeIcon = (roomId: string) => {
    switch (roomId) {
      case 'lobby': return '🏠';
      case 'dungeon1': case 'dungeon2': return '⚔️';
      case 'arena': return '🏟️';
      default: return '🌍';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      padding: 12,
      borderRadius: 8,
      color: '#fff',
      fontFamily: 'monospace',
      minWidth: '280px',
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: 12, fontSize: '14px', fontWeight: 'bold' }}>
        🌐 Multiplayer Lobby
      </div>
      
      {/* Connection Status */}
      <div style={{ marginBottom: 8, fontSize: '12px' }}>
        Status: <span style={{ color: net.connected ? '#4ade80' : '#f87171' }}>
          {net.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
        {net.selfId && (
          <span style={{ marginLeft: 8 }}>
            ID: {net.selfId}
          </span>
        )}
      </div>

      {/* Current Room */}
      <div style={{ marginBottom: 12, fontSize: '12px', padding: 6, background: 'rgba(59, 130, 246, 0.2)', borderRadius: 4 }}>
        Current Room: <strong>{net.currentRoom}</strong>
        <div style={{ fontSize: '10px', color: '#ccc', marginTop: 2 }}>
          {net.players.size} player{net.players.size !== 1 ? 's' : ''} online
        </div>
      </div>

      {/* Player Name */}
      <div style={{ marginBottom: 12 }}>
        {!showNameInput ? (
          <button 
            onClick={() => setShowNameInput(true)}
            style={{ 
              padding: '4px 8px', 
              fontSize: '11px', 
              background: '#374151', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            📝 Set Name
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter name..."
              maxLength={20}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: '11px',
                background: '#374151',
                color: '#fff',
                border: '1px solid #6b7280',
                borderRadius: 4
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
            />
            <button 
              onClick={handleSetName}
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px', 
                background: '#059669', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ✓
            </button>
            <button 
              onClick={() => { setShowNameInput(false); setPlayerName(''); }}
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px', 
                background: '#dc2626', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ✗
            </button>
          </div>
        )}
      </div>

      {/* Room List */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '12px', marginBottom: 6, fontWeight: 'bold' }}>Available Rooms:</div>
        {net.rooms.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
            Loading rooms...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {net.rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: room.id === net.currentRoom ? 'rgba(59, 130, 246, 0.3)' : 'rgba(75, 85, 99, 0.3)',
                  borderRadius: 4,
                  cursor: room.id === net.currentRoom ? 'default' : 'pointer',
                  border: room.id === net.currentRoom ? '1px solid #3b82f6' : '1px solid transparent'
                }}
                onClick={() => room.id !== net.currentRoom && handleJoinRoom(room.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{getRoomTypeIcon(room.id)}</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{room.name}</div>
                    <div style={{ fontSize: '9px', color: '#9ca3af' }}>
                      {room.playerCount} player{room.playerCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {room.id === net.currentRoom && (
                  <span style={{ fontSize: '10px', color: '#4ade80' }}>✓ Current</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Presence Messages */}
      {net.presenceMessages.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', marginBottom: 6, fontWeight: 'bold' }}>Recent Activity:</div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {net.presenceMessages.slice(-5).map((msg, i) => (
              <div key={i} style={{ 
                fontSize: '10px', 
                color: '#9ca3af', 
                marginBottom: 2,
                padding: '2px 4px',
                background: 'rgba(75, 85, 99, 0.2)',
                borderRadius: 2
              }}>
                <span style={{ color: msg.type === 'joined' ? '#4ade80' : msg.type === 'left' ? '#f87171' : '#fbbf24' }}>
                  {msg.type === 'joined' ? '→' : msg.type === 'left' ? '←' : '✏️'}
                </span>
                {' '}
                <strong>{msg.playerName}</strong>
                {' '}
                {msg.type === 'joined' ? 'joined' : msg.type === 'left' ? 'left' : 'changed name'}
                {' '}
                <span style={{ color: '#6b7280' }}>({formatTime(msg.timestamp)})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
