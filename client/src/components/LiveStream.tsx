import React, { useState, useEffect } from 'react';
import { TwitchEmbed, TwitchChat, TwitchClip, TwitchPlayer } from 'react-twitch-embed';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { getTwitchLiveStatus } from '@/utils/twitchApiDirect';

interface LiveStreamProps {
  channelName: string;
}

const LiveStream: React.FC<LiveStreamProps> = ({ channelName }) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    async function checkStreamStatus() {
      try {
        setIsLoading(true);
        setIsError(false);
        
        const streamData = await getTwitchLiveStatus(channelName);
        console.log("Twitch stream status:", streamData);
        setIsLive(!!streamData); // If data exists, channel is live
      } catch (error) {
        console.error("Failed to fetch stream status:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkStreamStatus();
    
    // Check status every 60 seconds while component is mounted
    const interval = setInterval(checkStreamStatus, 60000);
    return () => clearInterval(interval);
  }, [channelName]);
  
  const isLoadingAuth = false;
  const isLoadingLive = isLoading;
  const isAuthError = false;
  const isLiveError = isError;

  if (isLoadingAuth || isLoadingLive) {
    return (
      <div className="relative">
        <Card className="shadow-xl overflow-hidden border border-gray-800 mb-8">
          <CardHeader className="p-4 bg-gradient-to-r from-background to-muted border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Stream</h2>
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Checking stream status...</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video w-full bg-black/30 flex items-center justify-center text-gray-500">
              <Skeleton className="w-full h-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthError || isLiveError) {
    return (
      <div className="relative">
        <Card className="shadow-xl overflow-hidden border border-gray-800 mb-8">
          <CardHeader className="p-4 bg-gradient-to-r from-background to-muted border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Stream</h2>
              <div className="flex items-center text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Error loading stream</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">
              Unable to connect to Twitch API. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <Card className="shadow-xl overflow-hidden border border-gray-800 mb-8">
        <CardHeader className="p-4 bg-gradient-to-r from-background to-muted border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Live Stream</h2>
            <div className="flex items-center">
              {isLive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                  LIVE NOW
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></span>
                  OFFLINE
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLive ? (
            <TwitchEmbed
              channel={channelName}
              id={`twitch-embed-${channelName}`}
              width="100%"
              height="480"
              withChat={false}
              muted={false}
              parent={["pelletier.chesstu.com", "pelletion.onrender.com", "localhost"]}
            />
          ) : (
            <div className="aspect-video w-full bg-black/80 flex flex-col md:flex-row overflow-hidden">
              {/* Left side - Offline message and latest stream */}
              <div className="md:w-1/2 flex flex-col p-8 justify-center">
                <div className="bg-black/50 backdrop-blur-sm p-4 rounded-lg">
                  <div className="inline-block px-2 py-1 mb-2 bg-red-900/70 text-white text-xs font-semibold rounded">
                    OFFLINE
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">
                    {channelName} is offline.
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Check out this Rocket League stream from 2 days ago.
                  </p>
                  <a 
                    href={`https://twitch.tv/${channelName}/videos`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
                    </svg>
                    Watch Latest Stream
                  </a>
                </div>
              </div>
              
              {/* Right side - Schedule */}
              <div className="md:w-1/2 bg-white/10 backdrop-blur-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xl font-semibold text-white">Upcoming Streams:</h4>
                  <a 
                    href={`https://twitch.tv/${channelName}/schedule`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Full Schedule
                  </a>
                </div>
                
                {/* Today's stream */}
                <div className="bg-white/5 rounded-lg mb-3 overflow-hidden">
                  <div className="border-l-4 border-blue-500 p-4">
                    <div className="text-sm font-medium text-gray-400 mb-1">
                      TODAY · 2 PM - 6 PM EDT
                    </div>
                    <div className="text-white mb-2">
                      Presque tout les jours à 14:00 EST
                    </div>
                    <button className="flex items-center text-purple-400 hover:text-purple-300 text-sm font-medium">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 17L15 12L10 7V17Z" fill="currentColor"/>
                        <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20Z" fill="currentColor"/>
                      </svg>
                      Remind Me
                    </button>
                  </div>
                </div>
                
                {/* Tomorrow's stream */}
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <div className="border-l-4 border-blue-500 p-4">
                    <div className="text-sm font-medium text-gray-400 mb-1">
                      TOMORROW · 2 PM - 6 PM EDT
                    </div>
                    <div className="text-white mb-2">
                      Presque tout les jours à 14:00 EST
                    </div>
                    <button className="flex items-center text-purple-400 hover:text-purple-300 text-sm font-medium">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 17L15 12L10 7V17Z" fill="currentColor"/>
                        <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20Z" fill="currentColor"/>
                      </svg>
                      Remind Me
                    </button>
                  </div>
                </div>
                
                {/* Powered by Twitch */}
                <div className="mt-4 flex justify-end">
                  <div className="flex items-center text-gray-400 text-xs">
                    <svg className="h-4 w-4 text-[#6441a5] mr-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43z"/>
                    </svg>
                    twitch
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStream;