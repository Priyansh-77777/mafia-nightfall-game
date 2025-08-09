import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGameState } from '@/hooks/useGameState';
import { useToast } from '@/hooks/use-toast';
import { Copy, Crown, Users, Play } from 'lucide-react';

interface GameLobbyProps {
  roomCode: string;
  playerId: string;
  onGameStart: () => void;
}

export const GameLobby = ({ roomCode, playerId, onGameStart }: GameLobbyProps) => {
  const { game, players, currentPlayer, fetchGameData } = useGameState(roomCode, playerId);
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    fetchGameData(roomCode);
  }, [roomCode, fetchGameData]);

  useEffect(() => {
    if (game?.status === 'starting') {
      onGameStart();
    }
  }, [game?.status, onGameStart]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Room code copied!",
      description: "Share this code with your friends"
    });
  };

  const toggleReady = async () => {
    // TODO: Implement ready toggle
    setIsReady(!isReady);
    toast({
      title: isReady ? "Not ready" : "Ready!",
      description: isReady ? "You are not ready to start" : "You are ready to start the game"
    });
  };

  const startGame = async () => {
    if (!game || !currentPlayer?.is_host) return;

    if (players.length < 7) {
      toast({
        title: "Not enough players",
        description: "You need at least 7 players to start the game",
        variant: "destructive"
      });
      return;
    }

    // TODO: Check if all players are ready
    
    try {
      // TODO: Implement game start logic
      toast({
        title: "Starting game...",
        description: "Assigning roles and beginning the night phase"
      });
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  if (!game || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const isHost = currentPlayer.is_host;
  const canStartGame = isHost && players.length >= 7;

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'var(--game-bg)' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              🎭 Game Lobby
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyRoomCode}
                className="gap-2"
              >
                Room: <span className="font-mono text-lg">{roomCode}</span>
                <Copy className="h-4 w-4" />
              </Button>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Players List */}
          <div className="lg:col-span-2">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({players.length}/12)
                </CardTitle>
                <CardDescription>
                  Waiting for players to join... (minimum 7 players)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {players.map((player) => (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                    >
                      <div className="flex items-center gap-2">
                        {player.is_host && <Crown className="h-4 w-4 text-yellow-500" />}
                        <span className={player.id === playerId ? "font-semibold text-primary" : ""}>
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.is_ready && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Ready
                          </Badge>
                        )}
                        {player.is_host && (
                          <Badge variant="outline" className="text-xs">
                            Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {players.length < 7 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Need {7 - players.length} more player{7 - players.length !== 1 ? 's' : ''} to start
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Game Controls */}
          <div className="space-y-4">
            {/* Ready Button */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Ready Check</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={isReady ? "secondary" : "game"}
                  size="lg"
                  className="w-full"
                  onClick={toggleReady}
                >
                  {isReady ? "✓ Ready!" : "Mark as Ready"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  All players must be ready to start
                </p>
              </CardContent>
            </Card>

            {/* Start Game (Host Only) */}
            {isHost && (
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Host Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="game"
                    size="lg"
                    className="w-full"
                    onClick={startGame}
                    disabled={!canStartGame}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Game
                  </Button>
                  {!canStartGame && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Need at least 7 players
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game Info */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Game Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>🔪 Mafia:</span>
                    <span>{Math.floor(players.length / 3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🏥 Doctor:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🔍 Detective:</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>👥 Civilians:</span>
                    <span>{Math.max(0, players.length - Math.floor(players.length / 3) - 2)}</span>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Roles will be assigned randomly when the game starts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};