import React, { useEffect } from 'react';
import { useNet } from '../net/net';

export function RoomSelectionScreen({ onContinue }: { onContinue: () => void }) {
  const net = useNet();

  useEffect(() => {
    // Request room list when component mounts
    net.getRooms();
  }, [net]);

  const handleJoinRoom = (roomId: string) => {
    net.joinRoom(roomId);
    onContinue();
  };

  const getRoomDescription = (roomId: string) => {
    switch (roomId) {
      case 'lobby':
        return 'A safe starting area to meet other players and practice controls';
      case 'dungeon1':
        return 'Beginner-friendly dungeon with basic enemies and treasures';
      case 'dungeon2':
        return 'Intermediate dungeon with more challenging creatures';
      case 'arena':
        return 'Player vs Player combat arena for competitive gameplay';
      default:
        return 'Custom room for specialized gameplay';
    }
  };

  const getRoomIcon = (roomId: string) => {
    switch (roomId) {
      case 'lobby': return '🏠';
      case 'dungeon1': return '⚔️';
      case 'dungeon2': return '🏰';
      case 'arena': return '🏟️';
      default: return '🌍';
    }
  };

  const getRoomDifficulty = (roomId: string) => {
    switch (roomId) {
      case 'lobby': return { level: 'Safe', color: '#4ade80' };
      case 'dungeon1': return { level: 'Easy', color: '#22c55e' };
      case 'dungeon2': return { level: 'Medium', color: '#f59e0b' };
      case 'arena': return { level: 'PvP', color: '#ef4444' };
      default: return { level: 'Custom', color: '#8b5cf6' };
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
      pointerEvents: 'auto' 
    }}>
      <div style={{ 
        maxWidth: 700, 
        background: 'rgba(15,20,30,0.95)', 
        color: '#fff', 
        borderRadius: 16, 
        padding: 32, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ 
            fontSize: '2rem', 
            marginTop: 0, 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🌐 Choose Your Adventure
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
            Select a room to join and start your multiplayer journey
          </p>
        </div>

        {/* Connection Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 24,
          padding: 12,
          background: net.connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${net.connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 8,
          fontSize: '0.9rem'
        }}>
          <span style={{ color: net.connected ? '#4ade80' : '#f87171' }}>
            {net.connected ? '🟢 Connected to Server' : '🔴 Connecting to Server...'}
          </span>
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
                const difficulty = getRoomDifficulty(room.id);
                return (
                  <div
                    key={room.id}
                    onClick={() => handleJoinRoom(room.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 20,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: 'translateY(0)'
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
                      fontSize: '2.5rem', 
                      marginRight: 20,
                      minWidth: 60,
                      textAlign: 'center'
                    }}>
                      {getRoomIcon(room.id)}
                    </div>
                    
                    {/* Room Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <h3 style={{ 
                          fontSize: '1.3rem', 
                          margin: 0, 
                          marginRight: 12,
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
                        fontSize: '0.9rem', 
                        margin: '4px 0 8px 0',
                        lineHeight: 1.4
                      }}>
                        {getRoomDescription(room.id)}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        color: '#64748b'
                      }}>
                        <span style={{ marginRight: 16 }}>
                          👥 {room.playerCount} player{room.playerCount !== 1 ? 's' : ''} online
                        </span>
                        <span>
                          🕒 Created {new Date(room.created).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Join Arrow */}
                    <div style={{ 
                      fontSize: '1.5rem', 
                      color: '#4ade80',
                      marginLeft: 16
                    }}>
                      →
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{ 
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 16
        }}>
          💡 You can switch rooms anytime using the lobby panel in-game
        </div>
      </div>
    </div>
  );
}
