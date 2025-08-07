import { useState } from 'react';
import { HomePage } from '@/components/HomePage';
import { GameLobby } from '@/components/GameLobby';
import { GameRoom } from '@/components/GameRoom';

type GameState = 'home' | 'lobby' | 'playing';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');

  const handleGameJoined = (code: string, id: string) => {
    setRoomCode(code);
    setPlayerId(id);
    setGameState('lobby');
  };

  const handleGameStart = () => {
    setGameState('playing');
  };

  const handleBackToHome = () => {
    setGameState('home');
    setRoomCode('');
    setPlayerId('');
  };

  switch (gameState) {
    case 'lobby':
      return (
        <GameLobby 
          roomCode={roomCode} 
          playerId={playerId} 
          onGameStart={handleGameStart}
        />
      );
    
    case 'playing':
      return (
        <GameRoom 
          roomCode={roomCode} 
          playerId={playerId}
        />
      );
    
    default:
      return <HomePage onGameJoined={handleGameJoined} />;
  }
};

export default Index;
