import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { BattleRequest } from '@shared/schema';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, AlertTriangle, Calendar, Clock, User, Send, Mail, Gamepad } from 'lucide-react';

const Admin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Extract token and action from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const actionFromUrl = urlParams.get('action');
  
  // Fetch all battle requests
  const { data: battleRequests, isLoading, isError } = useQuery<BattleRequest[]>({
    queryKey: ['/api/battle-requests'],
  });
  
  // Update battle request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ token, status }: { token: string, status: string }) => {
      const response = await apiRequest('POST', '/api/battle-requests/update-status', { token, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/battle-requests'] });
      toast({
        title: "Status Updated",
        description: "The battle request status has been updated successfully.",
      });
      
      // Clear URL parameters after processing
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update battle request status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Process URL action if token and action are provided
  useEffect(() => {
    if (tokenFromUrl && actionFromUrl) {
      if (actionFromUrl === 'accept') {
        updateStatusMutation.mutate({ token: tokenFromUrl, status: 'confirmed' });
      } else if (actionFromUrl === 'reject') {
        updateStatusMutation.mutate({ token: tokenFromUrl, status: 'rejected' });
      }
    }
  }, [tokenFromUrl, actionFromUrl]);

  // Filter battle requests by status
  const pendingRequests = battleRequests?.filter(req => req.status === 'pending') || [];
  const confirmedRequests = battleRequests?.filter(req => req.status === 'confirmed') || [];
  const rejectedRequests = battleRequests?.filter(req => req.status === 'rejected') || [];

  // Handle battle request actions
  const handleAccept = (token: string) => {
    updateStatusMutation.mutate({ token, status: 'confirmed' });
  };

  const handleReject = (token: string) => {
    updateStatusMutation.mutate({ token, status: 'rejected' });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  // Render a single battle request card
  const renderBattleRequest = (request: BattleRequest) => {
    return (
      <Card key={request.id} className="mb-4 shadow-md overflow-hidden">
        <CardHeader className={`p-4 ${
          request.status === 'confirmed' ? 'bg-green-900/20' : 
          request.status === 'pending' ? 'bg-yellow-900/20' : 'bg-red-900/20'
        }`}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{request.name}</h3>
            <div>
              {request.status === 'pending' ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-900 text-yellow-300">
                  Pending
                </span>
              ) : request.status === 'confirmed' ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900 text-green-300">
                  Confirmed
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900 text-red-300">
                  Rejected
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">{formatDate(request.requestedDate)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">{request.requestedTime}</span>
            </div>
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">{request.twitchUsername}</span>
            </div>
            <div className="flex items-center">
              <Gamepad className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">
                {request.game === 'valorant' ? 'Valorant' :
                 request.game === 'fortnite' ? 'Fortnite' :
                 request.game === 'cod' ? 'Call of Duty: Warzone' :
                 request.game === 'apex' ? 'Apex Legends' :
                 'Other Game'}
              </span>
            </div>
            <div className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">{request.email}</span>
            </div>
            <div className="flex items-center">
              <Send className="w-5 h-5 mr-2 text-primary" />
              <span className="text-sm">
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {request.notes && (
            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-sm text-gray-300">{request.notes}</p>
            </div>
          )}
        </CardContent>
        
        {request.status === 'pending' && (
          <CardFooter className="p-4 bg-muted border-t border-gray-800 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleReject(request.token)}
              disabled={updateStatusMutation.isPending}
              className="border-red-700 hover:bg-red-900/50"
            >
              <X className="mr-1 h-4 w-4" />
              Decline
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleAccept(request.token)}
              disabled={updateStatusMutation.isPending}
              className="bg-green-700 hover:bg-green-800"
            >
              <Check className="mr-1 h-4 w-4" />
              Accept
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <h1 className="text-3xl font-bold mb-8 section-title">Battle Request Admin</h1>
        
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading battle requests...</p>
          </div>
        ) : isError ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
            <p className="text-gray-400">
              Failed to load battle requests. Please refresh the page and try again.
            </p>
          </Card>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {pendingRequests.length === 0 ? (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-gray-400">
                    No pending battle requests at the moment.
                  </p>
                </div>
              ) : (
                pendingRequests.map(renderBattleRequest)
              )}
            </TabsContent>
            
            <TabsContent value="confirmed">
              {confirmedRequests.length === 0 ? (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-gray-400">
                    No confirmed battle requests yet.
                  </p>
                </div>
              ) : (
                confirmedRequests.map(renderBattleRequest)
              )}
            </TabsContent>
            
            <TabsContent value="rejected">
              {rejectedRequests.length === 0 ? (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-gray-400">
                    No rejected battle requests.
                  </p>
                </div>
              ) : (
                rejectedRequests.map(renderBattleRequest)
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Admin;
