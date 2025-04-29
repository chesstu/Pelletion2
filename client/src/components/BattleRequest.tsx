import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { insertBattleRequestSchema } from '@shared/schema';
import { z } from 'zod';
import ConfirmationModal from './ConfirmationModal';

// Extend the schema with additional validations
const formSchema = insertBattleRequestSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  requestedDate: z.date({
    required_error: "Please select a date",
  }),
  requestedTime: z.string({
    required_error: "Please select a time slot",
  }),
  name: z.string().min(2, "Name must be at least 2 characters"),
  twitchUsername: z.string().min(2, "Twitch username must be at least 2 characters"),
  game: z.string().min(1, "Please select a game"),
});

type FormValues = z.infer<typeof formSchema>;

interface TimeSlot {
  time: string;
  available: boolean;
}

const BattleRequest: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      twitchUsername: "",
      game: "",
      notes: "",
      requestedTime: "",
    },
  });

  // Set date in form when calendar selection changes
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      form.setValue('requestedDate', date, { shouldValidate: true });
    } else {
      // Clear time slots if no date is selected
      setTimeSlots([]);
    }
  };

  // Fetch available time slots when a date is selected
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery<TimeSlot[]>({
    queryKey: ['/api/battle-requests/availability', selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateParam = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const response = await fetch(`/api/battle-requests/availability?date=${dateParam}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching time slots:", errorData);
        throw new Error(errorData.error || 'Failed to fetch time slots');
      }
      
      return response.json();
    },
    enabled: !!selectedDate, // Only run this query when a date is selected
  });
  
  // Handle time slot selection
  const handleTimeSlotSelect = (time: string) => {
    form.setValue('requestedTime', time, { shouldValidate: true });
  };

  // Update time slots when availability data changes
  useEffect(() => {
    if (availabilityData && Array.isArray(availabilityData)) {
      setTimeSlots(availabilityData);
      
      // Clear the selected time if it's no longer available
      const currentTime = form.watch('requestedTime');
      if (currentTime) {
        const isStillAvailable = availabilityData.some(
          (slot: TimeSlot) => slot.time === currentTime && slot.available
        );
        
        if (!isStillAvailable) {
          form.setValue('requestedTime', '', { shouldValidate: true });
        }
      }
    } else if (selectedDate) {
      // Default time slots (2PM to midnight) while loading
      const defaultSlots = [
        "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
        "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
      ].map(time => ({ time, available: false }));
      
      setTimeSlots(defaultSlots);
    }
  }, [availabilityData, selectedDate]);

  const battleRequestMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log('Submitting request to API with data:', data);
      
      // Convert Date to ISO string for API
      const requestData = {
        ...data,
        requestedDate: data.requestedDate.toISOString(),
      };
      
      const response = await apiRequest('POST', '/api/battle-requests', requestData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit battle request');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Battle request submitted successfully:', data);
      
      // Invalidate both battle requests and availability data
      queryClient.invalidateQueries({ queryKey: ['/api/battle-requests'] });
      
      // Also immediately update the time slot availability UI
      if (selectedDate && timeSlots.length > 0) {
        // Mark the selected time slot as unavailable in the current state
        const updatedTimeSlots = timeSlots.map(slot => {
          if (slot.time === data.requestedTime) {
            return { ...slot, available: false };
          }
          return slot;
        });
        setTimeSlots(updatedTimeSlots);
        
        // Also invalidate availability data for this date
        queryClient.invalidateQueries({ 
          queryKey: ['/api/battle-requests/availability', selectedDate.toISOString()]
        });
      }
      
      setSubmittedData({
        ...data,
        formattedDate: format(new Date(data.requestedDate), 'MMMM d, yyyy'),
      });
      setShowConfirmation(true);
      form.reset();
      setSelectedDate(undefined);
      
      toast({
        title: "Success!",
        description: "Your battle request has been submitted.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Error in battle request mutation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit battle request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log('Form data to submit:', data);
    
    // Check if date is selected before submission
    if (!data.requestedDate) {
      toast({
        title: "Error",
        description: "Please select a date for your battle request.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if time is selected before submission
    if (!data.requestedTime) {
      toast({
        title: "Error",
        description: "Please select a time slot for your battle request.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the form data
    battleRequestMutation.mutate(data);
  };
  
  return (
    <section id="battle" className="mb-20">
      <h2 className="text-3xl font-bold mb-8 section-title">Request a Battle</h2>
      
      <Card className="shadow-xl overflow-hidden border border-gray-800">
        <CardHeader className="p-6 bg-gradient-to-r from-background to-muted border-b border-gray-800">
          <h3 className="text-xl font-bold">Challenge Pelletion to a Game</h3>
          <p className="text-gray-400">Select a date and time to request a battle session on Twitch</p>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="md:flex">
            {/* Calendar Section */}
            <div className="md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-800">
              <h4 className="text-lg font-medium mb-4">1. Select a Date</h4>
              
              <div className="bg-background rounded-lg p-4 mb-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                  disabled={(date) => 
                    date < new Date() || // Disable past dates
                    date > new Date(new Date().setMonth(new Date().getMonth() + 2)) // Only allow 2 months in the future
                  }
                />
              </div>
              
              <h4 className="text-lg font-medium mb-4">2. Select Available Time Slots</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map((slot, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={form.watch('requestedTime') === slot.time ? 'default' : 'outline'}
                    disabled={!slot.available}
                    onClick={() => handleTimeSlotSelect(slot.time)}
                    className="py-2 px-3 text-sm"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Form Section */}
            <div className="md:w-1/2 p-6">
              <h4 className="text-lg font-medium mb-4">3. Your Information</h4>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="twitchUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitch Username</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-muted text-gray-400 text-sm">
                              twitch.tv/
                            </span>
                            <Input 
                              placeholder="your_username" 
                              className="rounded-l-none" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="game"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a game" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="valorant">Valorant</SelectItem>
                            <SelectItem value="fortnite">Fortnite</SelectItem>
                            <SelectItem value="cod">Call of Duty: Warzone</SelectItem>
                            <SelectItem value="apex">Apex Legends</SelectItem>
                            <SelectItem value="other">Other (specify in notes)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special requests or details about your battle..." 
                            className="resize-none"
                            rows={3}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full py-3"
                    disabled={battleRequestMutation.isPending}
                  >
                    {battleRequestMutation.isPending ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <svg 
                          className="mr-2 h-5 w-5" 
                          fill="none" 
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        Submit Battle Request
                      </>
                    )}
                  </Button>
                  
                  <p className="text-sm text-gray-400 mt-4">
                    <svg 
                      className="inline-block mr-1 h-4 w-4" 
                      fill="none" 
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Your request will be sent to Pelletion for approval. You'll receive a confirmation email when it's accepted.
                  </p>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && submittedData && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          battleData={submittedData}
        />
      )}
    </section>
  );
};

export default BattleRequest;