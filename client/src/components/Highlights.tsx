import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Calendar, Clock, Eye } from 'lucide-react';
import { TwitchVideoInfo } from '@shared/schema';
import { timeAgo, formatTwitchDuration } from '@/utils/dateUtils';
import { getTwitchClips } from '@/utils/twitchApiDirect';

type HighlightCardProps = {
  video: TwitchVideoInfo;
};

const HighlightCard: React.FC<HighlightCardProps> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      className="overflow-hidden border border-gray-800 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-video">
        <img 
          src={video.thumbnail_url.replace('%{width}', '640').replace('%{height}', '360')} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatTwitchDuration(video.duration)}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold mb-2 line-clamp-2" title={video.title}>
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{timeAgo(video.published_at)}</span>
          </div>
          <div className="flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            <span>{video.view_count.toLocaleString()} views</span>
          </div>
        </div>
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-3 block w-full text-center bg-purple-700 hover:bg-purple-600 text-white py-2 rounded text-sm transition-colors"
        >
          Watch Highlight
        </a>
      </CardContent>
    </Card>
  );
};

interface HighlightsProps {
  channelName: string;
}

const Highlights: React.FC<HighlightsProps> = ({ channelName }) => {
  const [clips, setClips] = useState<TwitchVideoInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    async function fetchClips() {
      try {
        setIsLoading(true);
        setIsError(false);
        
        const clipsData = await getTwitchClips(channelName);
        console.log("Twitch clips received:", clipsData);
        setClips(clipsData);
      } catch (error) {
        console.error("Failed to fetch clips:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchClips();
  }, [channelName]);
  
  const isLoadingAuth = false; // Not using auth anymore since direct API
  const isLoadingVideos = isLoading;
  const isAuthError = false;
  const isVideosError = isError;
  
  const videos = clips;

  if (isLoadingAuth || isLoadingVideos) {
    return (
      <div className="relative">
        <Card className="shadow-xl overflow-hidden border border-gray-800 mb-8">
          <CardHeader className="p-4 bg-gradient-to-r from-background to-muted border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Featured Clips</h2>
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading clips...</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border border-gray-800">
                  <Skeleton className="w-full aspect-video" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthError || isVideosError) {
    return (
      <div className="relative">
        <Card className="shadow-xl overflow-hidden border border-gray-800 mb-8">
          <CardHeader className="p-4 bg-gradient-to-r from-background to-muted border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Featured Clips</h2>
              <div className="flex items-center text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Error loading clips</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">
              Unable to load channel clips. Please try again later.
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
            <h2 className="text-2xl font-bold">Featured Clips</h2>
            <div className="flex items-center">
              <a 
                href={`https://twitch.tv/${channelName}/clips`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                View All
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {videos.length === 0 ? (
            <div className="text-center p-6">
              <p className="text-gray-400">
                No clips available at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video: TwitchVideoInfo) => (
                <HighlightCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Highlights;