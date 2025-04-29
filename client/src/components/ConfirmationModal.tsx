import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { BattleRequest } from '@shared/schema';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleData: BattleRequest & { formattedDate?: string };
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, battleData }) => {
  const formatDate = (date: string) => {
    if (battleData.formattedDate) return battleData.formattedDate;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatGameName = (gameId: string) => {
    switch (gameId) {
      case 'valorant': return 'Valorant';
      case 'fortnite': return 'Fortnite';
      case 'cod': return 'Call of Duty: Warzone';
      case 'apex': return 'Apex Legends';
      case 'other': return 'Other Game';
      default: return gameId;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-muted border border-gray-800 max-w-md">
        <DialogHeader className="bg-primary p-4 -mx-6 -mt-6 mb-4 flex justify-between items-center rounded-t-lg">
          <DialogTitle className="text-white">Battle Request Submitted</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-gray-300">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-800 flex items-center justify-center">
            <Check className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <DialogDescription className="text-center mb-4 text-gray-100">
          Your battle request has been submitted successfully! Pelletion will review your request and you'll receive a confirmation email soon.
        </DialogDescription>
        
        <div className="bg-background p-4 rounded-md mb-4">
          <h4 className="font-medium mb-2">Battle Details</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex justify-between">
              <span className="text-gray-400">Date:</span>
              <span>{formatDate(battleData.requestedDate)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span>{battleData.requestedTime}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-400">Game:</span>
              <span>{formatGameName(battleData.game)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-yellow-300">Awaiting Confirmation</span>
            </li>
          </ul>
        </div>
        
        <Button className="w-full" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
