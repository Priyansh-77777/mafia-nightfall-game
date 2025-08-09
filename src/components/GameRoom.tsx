import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameState } from '@/hooks/useGameState';
import { Player, ROLE_DESCRIPTIONS, ROLE_EMOJIS } from '@/types/game';
import { Moon, Sun, Gavel, Eye, Heart, Skull } from 'lucide-react';

interface GameRoomProps {
  roomCode: string;
  playerId: string;
}

export const GameRoom = ({ roomCode, playerId }: GameRoomProps) => {
  const { game, players, currentPlayer, gameLog, fetchGameData } = useGameState(roomCode);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchGameData(roomCode);
  }, [roomCode, fetchGameData]);

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

  const isNightPhase = game.current_phase === 'night';
  const isDayPhase = game.current_phase === 'day';
  const isVotingPhase = game.current_phase === 'voting';
  const isGameEnded = game.current_phase === 'ended';

  const alivePlayers = players.filter(p => p.is_alive);
  const deadPlayers = players.filter(p => !p.is_alive);

  const canAct = () => {
    if (!currentPlayer.is_alive || isGameEnded) return false;
    
    if (isNightPhase) {
      return ['mafia', 'doctor', 'detective'].includes(currentPlayer.role || '');
    }
    
    if (isDayPhase || isVotingPhase) {
      return true;
    }
    
    return false;
  };

  const getActionText = () => {
    if (!currentPlayer.role) return '';
    
    if (isNightPhase) {
      switch (currentPlayer.role) {
        case 'mafia':
          return '🔪 Choose someone to eliminate';
        case 'doctor':
          return '🏥 Choose someone to save';
        case 'detective':
          return '🔍 Choose someone to investigate';
        default:
          return '😴 Wait for the night to end';
      }
    }
    
    if (isDayPhase || isVotingPhase) {
      return '🗳️ Vote to eliminate someone';
    }
    
    return '';
  };

  const getActionIcon = () => {
    if (isNightPhase) {
      switch (currentPlayer.role) {
        case 'mafia':
          return <Skull className="h-4 w-4" />;
        case 'doctor':
          return <Heart className="h-4 w-4" />;
        case 'detective':
          return <Eye className="h-4 w-4" />;
        default:
          return <Moon className="h-4 w-4" />;
      }
    }
    
    return <Gavel className="h-4 w-4" />;
  };

  const submitAction = () => {
    if (!selectedTarget) return;
    
    // TODO: Implement action submission
    console.log('Submitting action:', {
      type: currentPlayer.role,
      target: selectedTarget,
      phase: game.current_phase
    });
    
    setSelectedTarget(null);
  };

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'var(--game-bg)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Game Header */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              {isNightPhase && <Moon className="h-6 w-6" />}
              {(isDayPhase || isVotingPhase) && <Sun className="h-6 w-6" />}
              {isGameEnded && "🏆"}
              
              {isNightPhase && "Night Phase"}
              {isDayPhase && "Day Phase - Discussion"}
              {isVotingPhase && "Day Phase - Voting"}
              {isGameEnded && "Game Over"}
            </CardTitle>
            <CardDescription>
              Room: <span className="font-mono">{roomCode}</span>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Players Grid */}
          <div className="lg:col-span-2">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Players ({alivePlayers.length} alive)</span>
                  {currentPlayer.role && (
                    <Badge variant={currentPlayer.role as any} className="gap-1">
                      {ROLE_EMOJIS[currentPlayer.role as keyof typeof ROLE_EMOJIS]}
                      {currentPlayer.role.charAt(0).toUpperCase() + currentPlayer.role.slice(1)}
                    </Badge>
                  )}
                </CardTitle>
                {currentPlayer.role && (
                  <CardDescription>
                    {ROLE_DESCRIPTIONS[currentPlayer.role as keyof typeof ROLE_DESCRIPTIONS]}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {/* Alive Players */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {alivePlayers.map((player) => (
                    <div 
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTarget === player.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-card/50 hover:bg-card/80'
                      } ${player.id === playerId ? 'ring-2 ring-primary/30' : ''}`}
                      onClick={() => {
                        if (canAct() && player.id !== playerId) {
                          setSelectedTarget(selectedTarget === player.id ? null : player.id);
                        }
                      }}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">👤</div>
                        <div className="font-medium text-sm">{player.name}</div>
                        {player.id === playerId && (
                          <Badge variant="outline" className="text-xs mt-1">You</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dead Players */}
                {deadPlayers.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Eliminated</h4>
                      <div className="flex flex-wrap gap-2">
                        {deadPlayers.map((player) => (
                          <Badge key={player.id} variant="secondary" className="opacity-60">
                            💀 {player.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Game Controls & Log */}
          <div className="space-y-4">
            {/* Action Panel */}
            {canAct() && !isGameEnded && (
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getActionIcon()}
                    Your Action
                  </CardTitle>
                  <CardDescription>
                    {getActionText()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTarget ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          Target: <span className="font-medium">
                            {players.find(p => p.id === selectedTarget)?.name}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="game"
                          size="sm"
                          className="flex-1"
                          onClick={submitAction}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTarget(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click on a player to select them
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game Log */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Game Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64 p-4">
                  <div className="space-y-2">
                    {gameLog.map((entry) => (
                      <div 
                        key={entry.id}
                        className={`text-sm p-2 rounded ${
                          entry.message_type === 'death' ? 'bg-destructive/10 text-destructive' :
                          entry.message_type === 'victory' ? 'bg-primary/10 text-primary' :
                          entry.message_type === 'action' ? 'bg-muted/50' :
                          'bg-muted/30'
                        }`}
                      >
                        {entry.message}
                      </div>
                    ))}
                    {gameLog.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No events yet...
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Game Stats */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Remaining Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>🔪 Mafia:</span>
                    <span>{alivePlayers.filter(p => p.role === 'mafia').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>👥 Town:</span>
                    <span>{alivePlayers.filter(p => p.role !== 'mafia').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};