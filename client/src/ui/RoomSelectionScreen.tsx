import React, { useEffect, useState } from 'react';
import { useNet } from '../net/net';

export function RoomSelectionScreen({ onContinue }: { onContinue: () => void }) {
  const net = useNet();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    // Request room list when component mounts
    net.getRooms();
  }, [net]);

  const handleJoinRoom = (roomId: string) => {
    net.joinRoom(roomId);
    onContinue();
  };

  const handleCreateRoom = () => {
    if (newRoomName.trim().length >= 3) {
      net.createRoom(newRoomName.trim());
      setNewRoomName('');
      setShowCreateRoom(false);
      onContinue();
    }
  };

  const getRoomDescription = (roomId: string, maxPlayers: number) => {
    switch (roomId) {
      case 'lobby':
        return 'A safe starting area to meet other players and practice controls';
      default:
        return `Private adventure room (max ${maxPlayers} players)`;
    }
  };

  const getRoomIcon = (roomId: string) => {
    switch (roomId) {
      case 'lobby': return '🏠';
      default: return '🎮';
    }
  };

  const getRoomDifficulty = (roomId: string, maxPlayers: number) => {
    switch (roomId) {
      case 'lobby': return { level: 'Lobby', color: '#4ade80' };
      default: return { level: `${maxPlayers}P`, color: '#8b5cf6' };
    }
  };

  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,20,48,0.9) 100%)', 
      backdropFilter: 'blur(10px)', 
      zIndex: 25, 
      pointerEvents: 'auto',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: 700, 
        background: 'rgba(15,20,30,0.95)', 
        color: '#fff', 
        borderRadius: 16, 
        padding: window.innerWidth < 768 ? 16 : 32, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: window.innerWidth < 768 ? 20 : 32 }}>
          <h2 style={{ 
            fontSize: window.innerWidth < 768 ? '1.5rem' : '2rem', 
            marginTop: 0, 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🌐 Choose Your Adventure
          </h2>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem', 
            margin: 0,
            lineHeight: 1.4
          }}>
            Select a room to join and start your multiplayer journey
          </p>
        </div>

        {/* Connection Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: window.innerWidth < 768 ? 16 : 24,
          padding: window.innerWidth < 768 ? 10 : 12,
          background: net.connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${net.connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 8,
          fontSize: window.innerWidth < 768 ? '0.85rem' : '0.9rem'
        }}>
          <span style={{ color: net.connected ? '#4ade80' : '#f87171' }}>
            {net.connected ? '🟢 Connected to Server' : '🔴 Connecting to Server...'}
          </span>
        </div>

        {/* Create Room Button */}
        <div style={{ marginBottom: 24 }}>
          {!showCreateRoom ? (
            <button
              onClick={() => setShowCreateRoom(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
                marginBottom: 16
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              ➕ Create New Room (Max 4 Players)
            </button>
          ) : (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 'bold', color: '#10b981' }}>
                🎮 Create Your Adventure Room
              </div>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name (3-30 characters)"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '1rem',
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
                maxLength={30}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateRoom();
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreateRoom}
                  disabled={newRoomName.trim().length < 3}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: newRoomName.trim().length >= 3 
                      ? 'linear-gradient(135deg, #10b981, #059669)' 
                      : 'rgba(107, 114, 128, 0.5)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: newRoomName.trim().length >= 3 ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  Create Room
                </button>
                <button
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Room List */}
        <div style={{ marginBottom: 24 }}>
          {net.rooms.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40,
              color: '#94a3b8',
              fontSize: '1rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>⏳</div>
              Loading available rooms...
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {net.rooms.map((room) => {
                const difficulty = getRoomDifficulty(room.id, room.maxPlayers);
                const isRoomFull = room.maxPlayers > 0 && room.playerCount >= room.maxPlayers;
                return (
                  <div
                    key={room.id}
                    onClick={() => !isRoomFull && handleJoinRoom(room.id)}
                    style={{
                      display: 'flex',
                      alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
                      flexDirection: window.innerWidth < 480 ? 'column' : 'row',
                      padding: window.innerWidth < 768 ? 16 : 20,
                      background: isRoomFull ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isRoomFull ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 12,
                      cursor: isRoomFull ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      transform: 'translateY(0)',
                      opacity: isRoomFull ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Room Icon */}
                    <div style={{ 
                      fontSize: window.innerWidth < 480 ? '2rem' : '2.5rem', 
                      marginRight: window.innerWidth < 480 ? 0 : (window.innerWidth < 768 ? 12 : 20),
                      marginBottom: window.innerWidth < 480 ? 12 : 0,
                      minWidth: window.innerWidth < 480 ? 'auto' : 60,
                      textAlign: 'center',
                      alignSelf: window.innerWidth < 480 ? 'center' : 'flex-start'
                    }}>
                      {getRoomIcon(room.id)}
                    </div>
                    
                    {/* Room Info */}
                    <div style={{ flex: 1, width: window.innerWidth < 480 ? '100%' : 'auto' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: 4,
                        flexWrap: 'wrap',
                        gap: window.innerWidth < 768 ? 8 : 12
                      }}>
                        <h3 style={{ 
                          fontSize: window.innerWidth < 768 ? '1.1rem' : '1.3rem', 
                          margin: 0, 
                          color: '#e2e8f0'
                        }}>
                          {room.name}
                        </h3>
                        <span style={{
                          padding: '4px 8px',
                          background: difficulty.color + '20',
                          color: difficulty.color,
                          border: `1px solid ${difficulty.color}40`,
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {difficulty.level}
                        </span>
                      </div>
                      
                      <p style={{ 
                        color: '#94a3b8', 
                        fontSize: window.innerWidth < 768 ? '0.85rem' : '0.9rem', 
                        margin: '4px 0 8px 0',
                        lineHeight: 1.4
                      }}>
                        {getRoomDescription(room.id, room.maxPlayers)}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontSize: window.innerWidth < 768 ? '0.75rem' : '0.8rem',
                        color: '#64748b',
                        flexWrap: 'wrap',
                        gap: window.innerWidth < 768 ? 8 : 16
                      }}>
                        <span style={{ 
                          color: isRoomFull ? '#f87171' : '#64748b'
                        }}>
                          👥 {room.playerCount}{room.maxPlayers > 0 ? `/${room.maxPlayers}` : ''} player{room.playerCount !== 1 ? 's' : ''}
                          {isRoomFull && ' (FULL)'}
                        </span>
                        <span>
                          🕒 Created {new Date(room.created).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Join Arrow */}
                    {window.innerWidth >= 480 && (
                      <div style={{ 
                        fontSize: '1.5rem', 
                        color: '#4ade80',
                        marginLeft: 16
                      }}>
                        →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{ 
          textAlign: 'center',
          fontSize: window.innerWidth < 768 ? '0.75rem' : '0.8rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: window.innerWidth < 768 ? 12 : 16,
          lineHeight: 1.4
        }}>
          💡 You can switch rooms anytime using the lobby panel in-game
        </div>
      </div>
    </div>
  );
}
