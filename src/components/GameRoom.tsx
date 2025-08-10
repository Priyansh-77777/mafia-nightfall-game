import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useGameState } from '@/hooks/useGameState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Player, ROLE_DESCRIPTIONS, ROLE_EMOJIS } from '@/types/game';
import { Moon, Sun, Gavel, Eye, Heart, Skull } from 'lucide-react';

interface GameRoomProps {
  roomCode: string;
  playerId: string;
}

export const GameRoom = ({ roomCode, playerId }: GameRoomProps) => {
  const { game, players, currentPlayer, gameLog, fetchGameData } = useGameState(roomCode, playerId);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const { toast } = useToast();

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

  const totalAlive = alivePlayers.length;
  const readyAliveCount = alivePlayers.filter(p => p.is_ready).length;
  const allAliveReady = totalAlive > 0 && readyAliveCount === totalAlive;
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

  const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const determineVoteType = () => {
    if (isNightPhase) {
      if (currentPlayer.role === 'mafia') return 'mafia_kill' as const;
      if (currentPlayer.role === 'doctor') return 'doctor_save' as const;
      if (currentPlayer.role === 'detective') return 'detective_investigate' as const;
    }
    return 'eliminate' as const;
  };

  const autoPlayAI = async () => {
    const aiPlayers = players.filter(p => p.is_alive && !p.is_ready && p.name.startsWith('🤖'));
    if (aiPlayers.length === 0) return;

    const alive = players.filter(p => p.is_alive);

    await Promise.all(
      aiPlayers.map(async (ai) => {
        let targetPool: Player[] = [];
        if (isNightPhase) {
          if (ai.role === 'mafia') {
            targetPool = alive.filter(p => p.role !== 'mafia');
          } else if (ai.role === 'doctor') {
            targetPool = alive;
          } else if (ai.role === 'detective') {
            targetPool = alive.filter(p => p.id !== ai.id);
          } else {
            return;
          }
        } else {
          targetPool = alive.filter(p => p.id !== ai.id);
        }

        if (targetPool.length === 0) return;
        const target = pickRandom(targetPool);

        const vote_type = isNightPhase
          ? (ai.role === 'mafia' ? 'mafia_kill' : ai.role === 'doctor' ? 'doctor_save' : 'detective_investigate')
          : 'eliminate';

        await supabase.from('votes').insert({
          game_id: game.id,
          voter_id: ai.id,
          target_id: target.id,
          vote_type
        } as any);
        await supabase.from('players').update({ is_ready: true }).eq('id', ai.id);
      })
    );
  };

  const progressPhaseIfReady = async () => {
    const alive = players.filter(p => p.is_alive);
    const readyCount = alive.filter(p => p.is_ready).length;
    if (readyCount !== alive.length) return;

    if (!currentPlayer.is_host) return;

    const declareWinner = async (winner: 'mafia' | 'town') => {
      await supabase.from('games').update({ status: 'ended', current_phase: 'ended', winner }).eq('id', game.id);
      await supabase.from('game_log').insert({
        game_id: game.id,
        message: winner === 'mafia' ? '😈 Mafia wins!' : '🛡️ Town wins!',
        message_type: 'victory'
      } as any);
    };

    const fetchVotes = async (types: string[]) => {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('game_id', game.id)
        .in('vote_type', types as any);
      return (data || []) as any[];
    };

    const resetReadinessAndVotes = async (nextPhase: 'night' | 'day') => {
      await supabase.from('players').update({ is_ready: false }).eq('game_id', game.id).eq('is_alive', true);
      await supabase.from('votes').delete().eq('game_id', game.id);
      await supabase.from('games').update({ current_phase: nextPhase }).eq('id', game.id);
      await supabase.from('game_log').insert({
        game_id: game.id,
        message: nextPhase === 'day' ? '☀️ Day begins.' : '🌙 Night falls.',
        message_type: 'info'
      } as any);
    };

    if (isNightPhase) {
      const nightVotes = await fetchVotes(['mafia_kill', 'doctor_save']);
      const tally = (type: string) => {
        const counts: Record<string, number> = {};
        nightVotes.filter(v => v.vote_type === type && v.target_id).forEach(v => {
          counts[v.target_id!] = (counts[v.target_id!] || 0) + 1;
        });
        const entries = Object.entries(counts);
        if (entries.length === 0) return null;
        entries.sort((a,b)=> b[1]-a[1]);
        const topScore = entries[0][1];
        const topTargets = entries.filter(e=> e[1] === topScore).map(e=> e[0]);
        return pickRandom(topTargets);
      };
      const mafiaTargetId = tally('mafia_kill');
      const doctorSaveId = tally('doctor_save');

      if (mafiaTargetId && mafiaTargetId !== doctorSaveId) {
        await supabase.from('players').update({ is_alive: false }).eq('id', mafiaTargetId);
        const victim = players.find(p => p.id === mafiaTargetId);
        await supabase.from('game_log').insert({
          game_id: game.id,
          message: `💀 ${victim?.name || 'A player'} was eliminated during the night.`,
          message_type: 'death'
        } as any);
      } else {
        await supabase.from('game_log').insert({
          game_id: game.id,
          message: `🛡️ No one was eliminated during the night.`,
          message_type: 'info'
        } as any);
      }

      const { data: freshPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .eq('is_alive', true);
      const m = (freshPlayers || []).filter((p: any) => p.role === 'mafia').length;
      const t = (freshPlayers || []).length - m;
      if (m === 0) return await declareWinner('town');
      if (m >= t) return await declareWinner('mafia');

      await resetReadinessAndVotes('day');
    } else {
      const dayVotes = await fetchVotes(['eliminate']);
      const counts: Record<string, number> = {};
      dayVotes.filter(v => v.target_id).forEach(v => {
        counts[v.target_id!] = (counts[v.target_id!] || 0) + 1;
      });
      const entries = Object.entries(counts);
      if (entries.length > 0) {
        entries.sort((a,b)=> b[1]-a[1]);
        const topScore = entries[0][1];
        const topTargets = entries.filter(e=> e[1] === topScore).map(e=> e[0]);
        const eliminatedId = pickRandom(topTargets);
        if (eliminatedId) {
          await supabase.from('players').update({ is_alive: false }).eq('id', eliminatedId);
          const victim = players.find(p => p.id === eliminatedId);
          await supabase.from('game_log').insert({
            game_id: game.id,
            message: `⚖️ ${victim?.name || 'A player'} was eliminated by vote.`,
            message_type: 'death'
          } as any);
        }
      } else {
        await supabase.from('game_log').insert({
          game_id: game.id,
          message: `🤷 No elimination today.`,
          message_type: 'info'
        } as any);
      }

      const { data: freshPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .eq('is_alive', true);
      const m = (freshPlayers || []).filter((p: any) => p.role === 'mafia').length;
      const t = (freshPlayers || []).length - m;
      if (m === 0) return await declareWinner('town');
      if (m >= t) return await declareWinner('mafia');

      await resetReadinessAndVotes('night');
    }
  };

  const submitAction = async () => {
    if (!selectedTarget || !currentPlayer?.is_alive || isGameEnded) return;

    const vote_type = determineVoteType();
    try {
      await supabase.from('votes').insert({
        game_id: game.id,
        voter_id: playerId,
        target_id: selectedTarget,
        vote_type
      } as any);

      await supabase
        .from('players')
        .update({ is_ready: true, last_active: new Date().toISOString() })
        .eq('id', playerId);

      await supabase.from('game_log').insert({
        game_id: game.id,
        message: `${currentPlayer.name} submitted an action.`,
        message_type: 'action'
      } as any);

      await autoPlayAI();
      await progressPhaseIfReady();

      setSelectedTarget(null);
      toast({ title: 'Action submitted', description: 'Waiting for others...' });
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message || 'Please try again.', variant: 'destructive' });
    }
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
            <div className="mt-2 flex flex-col items-center gap-2">
              <Progress
                value={Math.round((readyAliveCount / (totalAlive || 1)) * 100)}
                aria-label={`Ready ${readyAliveCount}/${totalAlive}`}
              />
              <div className="text-xs text-muted-foreground">
                Ready {readyAliveCount}/{totalAlive}
              </div>
              {allAliveReady && (
                <Badge variant="secondary">All players ready</Badge>
              )}
            </div>
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