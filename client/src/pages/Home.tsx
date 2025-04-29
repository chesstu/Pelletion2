import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroBanner from '@/components/HeroBanner';
import LiveStream from '@/components/LiveStream';
import Highlights from '@/components/Highlights';
import BattleRequest from '@/components/BattleRequest';
import ScheduledBattles from '@/components/ScheduledBattles';

// Twitch channel name
const TWITCH_CHANNEL = 'pelletion';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <HeroBanner />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <LiveStream channelName={TWITCH_CHANNEL} />
        <Highlights channelName={TWITCH_CHANNEL} />
        <BattleRequest />
        <ScheduledBattles />
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
