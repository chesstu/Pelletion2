import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { BattleRequest } from '@shared/schema';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Game icon mapping
const gameIcons: Record<string, string> = {
  valorant: "https://static-cdn.jtvnw.net/ttv-boxart/516575-144x192.jpg",
  fortnite: "https://static-cdn.jtvnw.net/ttv-boxart/33214-144x192.jpg",
  cod: "https://static-cdn.jtvnw.net/ttv-boxart/512710-144x192.jpg",
  apex: "https://static-cdn.jtvnw.net/ttv-boxart/511224-144x192.jpg",
  other: "https://static-cdn.jtvnw.net/ttv-boxart/Creative-144x192.jpg",
};

// Format date from ISO string
function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMMM d, yyyy');
}

// Generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Generate random color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary', 'bg-blue-600', 'bg-green-600',
    'bg-red-600', 'bg-yellow-600', 'bg-orange-600'
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'confirmed':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900 text-green-300">
          Confirmed
        </span>
      );
    case 'pending':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-900 text-yellow-300">
          Pending
        </span>
      );
    case 'rejected':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900 text-red-300">
          Canceled
        </span>
      );
    default:
      return null;
  }
};

const ScheduledBattles: React.FC = () => {
  const { data: battles, isLoading, isError } = useQuery<BattleRequest[]>({
    queryKey: ['/api/battle-requests'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Only show confirmed or pending battles
  const visibleBattles = battles?.filter(
    battle => battle.status === 'confirmed' || battle.status === 'pending'
  ) || [];

  return (
    <section id="scheduled" className="mb-20">
      <h2 className="text-3xl font-bold mb-8 section-title">Scheduled Battles</h2>
      
      <Card className="shadow-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Challenger
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Game
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-muted">
              {isLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <tr key={index} className="hover:bg-black hover:bg-opacity-30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-6 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="ml-3">
                          <Skeleton className="h-5 w-24 mb-1" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-6 w-6 rounded mr-2" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    Failed to load scheduled battles. Please try again later.
                  </td>
                </tr>
              ) : visibleBattles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    No battles are scheduled yet. Be the first to request one!
                  </td>
                </tr>
              ) : (
                visibleBattles.map((battle) => (
                  <tr key={battle.id} className="hover:bg-black hover:bg-opacity-30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium">{formatDate(battle.requestedDate)}</div>
                      <div className="text-gray-400">{battle.requestedTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full ${getAvatarColor(battle.name)} flex items-center justify-center text-white font-medium text-sm`}>
                          {getInitials(battle.name)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium">{battle.twitchUsername}</div>
                          <div className="text-sm text-gray-400">
                            {battle.status === 'confirmed' ? 'Confirmed Player' : 'Waiting Confirmation'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <img 
                          src={gameIcons[battle.game] || gameIcons.other} 
                          className="w-6 h-6 mr-2 rounded" 
                          alt={battle.game}
                        />
                        {battle.game === 'valorant' ? 'Valorant' :
                          battle.game === 'fortnite' ? 'Fortnite' :
                          battle.game === 'cod' ? 'Call of Duty: Warzone' :
                          battle.game === 'apex' ? 'Apex Legends' :
                          'Other Game'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={battle.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <CardFooter className="bg-background py-3 px-6 border-t border-gray-800 text-center text-sm text-gray-400">
          {!isLoading && !isError && (
            `Showing ${visibleBattles.length} of ${visibleBattles.length} scheduled battles`
          )}
        </CardFooter>
      </Card>
      
      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Want to see your name on this list? <a href="#battle" className="text-primary hover:text-primary/80">Request a battle now!</a>
        </p>
      </div>
    </section>
  );
};

export default ScheduledBattles;
