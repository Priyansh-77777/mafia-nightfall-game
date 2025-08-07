import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGameState } from '@/hooks/useGameState';
import { useToast } from '@/hooks/use-toast';

interface HomePageProps {
  onGameJoined: (roomCode: string, playerId: string) => void;
}

export const HomePage = ({ onGameJoined }: HomePageProps) => {
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { createGame, joinGame } = useGameState();
  const { toast } = useToast();

  const handleCreateGame = async () => {
    if (!hostName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to create a game",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createGame(hostName.trim());
      onGameJoined(result.roomCode, result.playerId);
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinName.trim() || !joinRoomCode.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and room code",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const playerId = await joinGame(joinRoomCode.trim().toUpperCase(), joinName.trim());
      onGameJoined(joinRoomCode.trim().toUpperCase(), playerId);
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--game-bg)' }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            🎭 Mafia
          </h1>
          <p className="text-muted-foreground">
            The classic party game of deception and deduction
          </p>
        </div>

        <div className="space-y-4">
          {/* Create Game Card */}
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                👑 Host a Game
              </CardTitle>
              <CardDescription>
                Create a new game room and invite friends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hostName">Your Name</Label>
                <Input
                  id="hostName"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                />
              </div>
              <Button 
                variant="game" 
                size="lg" 
                className="w-full"
                onClick={handleCreateGame}
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create Game 🚀"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Game Card */}
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                🎮 Join a Game
              </CardTitle>
              <CardDescription>
                Enter a room code to join an existing game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinName">Your Name</Label>
                <Input
                  id="joinName"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  placeholder="ABCD12"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                />
              </div>
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full"
                onClick={handleJoinGame}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join Game 🎯"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Rules Dialog */}
        <div className="text-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                📖 How to Play
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  🎭 How to Play Mafia
                </DialogTitle>
                <DialogDescription className="text-left space-y-3">
                  <div>
                    <strong>🔪 Mafia:</strong> Eliminate townspeople at night. Win when you equal or outnumber the town.
                  </div>
                  <div>
                    <strong>🏥 Doctor:</strong> Save one person each night (including yourself). Help the town win.
                  </div>
                  <div>
                    <strong>🔍 Detective:</strong> Investigate one person each night to learn their role. Help the town win.
                  </div>
                  <div>
                    <strong>👥 Civilians:</strong> Vote during the day to eliminate the mafia. Help the town win.
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <strong>Game Flow:</strong>
                    <br />
                    1. Night: Special roles act secretly
                    <br />
                    2. Day: Everyone discusses and votes
                    <br />
                    3. Repeat until one side wins!
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};