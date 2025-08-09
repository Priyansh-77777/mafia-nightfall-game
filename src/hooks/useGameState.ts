
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Game, Player, Vote, GameLogEntry, GameState } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

export const useGameState = (roomCode?: string, currentPlayerId?: string) => {
  const [gameState, setGameState] = useState<GameState>({
    game: null,
    players: [],
    currentPlayer: null,
    votes: [],
    gameLog: [],
    isLoading: false,
    error: null
  });

  const { toast } = useToast();

  const fetchGameData = useCallback(async (code: string) => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', code)
        .single();

      if (gameError) throw gameError;

      // Fetch players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('created_at');

      if (playersError) throw playersError;

      // Fetch votes for current phase
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('game_id', game.id);

      if (votesError) throw votesError;

      // Fetch game log
      const { data: gameLog, error: logError } = await supabase
        .from('game_log')
        .select('*')
        .eq('game_id', game.id)
        .order('created_at');

      if (logError) throw logError;

      setGameState(prev => ({
        ...prev,
        game,
        players: players || [],
        votes: votes || [],
        gameLog: gameLog || [],
        currentPlayer: currentPlayerId
          ? (players?.find((p: any) => p.id === currentPlayerId) || prev.currentPlayer)
          : prev.currentPlayer,
        isLoading: false
      }));

    } catch (error: any) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  const createGame = useCallback(async (hostName: string) => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true }));

      // Generate room code
      const { data: roomCodeData, error: codeError } = await supabase
        .rpc('generate_room_code');

      if (codeError) throw codeError;

      const roomCode = roomCodeData;

      // Create game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          status: 'waiting'
        })
        .select()
        .single();

      if (gameError) throw gameError;

      if (!game) throw new Error('Failed to create game');

      // Create host player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          name: hostName,
          is_host: true
        })
        .select()
        .single();

      if (playerError) throw playerError;

      if (!player) throw new Error('Failed to create player');

      // Update game with host_id
      const { error: updateError } = await supabase
        .from('games')
        .update({ host_id: player.id })
        .eq('id', game.id);

      if (updateError) throw updateError;

      // Add welcome message
      await supabase
        .from('game_log')
        .insert({
          game_id: game.id,
          message: `🎭 Welcome to Mafia! Room created by ${hostName}`,
          message_type: 'info'
        });

      setGameState(prev => ({
        ...prev,
        currentPlayer: player,
        isLoading: false
      }));

      return { roomCode, playerId: player.id };

    } catch (error: any) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      toast({
        title: "Error creating game",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const joinGame = useCallback(async (roomCode: string, playerName: string) => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true }));

      // Check if game exists
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (gameError) throw gameError;

      if (!game) throw new Error('Game not found');

      if (game.status !== 'waiting') {
        throw new Error('Game has already started');
      }

      // Check if name is already taken
      const { data: existingPlayers, error: checkError } = await supabase
        .from('players')
        .select('name')
        .eq('game_id', game.id)
        .eq('name', playerName);

      if (checkError) throw checkError;

      if (existingPlayers && existingPlayers.length > 0) {
        throw new Error('Name already taken in this game');
      }

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          name: playerName,
          is_host: false
        })
        .select()
        .single();

      if (playerError) throw playerError;

      if (!player) throw new Error('Failed to create player');

      // Add join message
      await supabase
        .from('game_log')
        .insert({
          game_id: game.id,
          message: `👋 ${playerName} joined the game`,
          message_type: 'info'
        });

      setGameState(prev => ({
        ...prev,
        currentPlayer: player,
        isLoading: false
      }));

      return player.id;

    } catch (error: any) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      toast({
        title: "Error joining game",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomCode || !gameState.game) return;

    const gameId = gameState.game.id;

    const subscriptions = [
      // Game updates
      supabase
        .channel('game_updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload) => {
            setGameState(prev => ({
              ...prev,
              game: payload.new as Game
            }));
          }
        )
        .subscribe(),

      // Player updates
      supabase
        .channel('player_updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
          () => {
            fetchGameData(roomCode);
          }
        )
        .subscribe(),

      // Vote updates
      supabase
        .channel('vote_updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
          () => {
            fetchGameData(roomCode);
          }
        )
        .subscribe(),

      // Game log updates
      supabase
        .channel('log_updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'game_log', filter: `game_id=eq.${gameId}` },
          () => {
            fetchGameData(roomCode);
          }
        )
        .subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [roomCode, gameState.game?.id, fetchGameData]);

  return {
    ...gameState,
    createGame,
    joinGame,
    fetchGameData
  };
};
