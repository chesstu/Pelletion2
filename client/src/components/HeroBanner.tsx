import React from 'react';
import { Crosshair } from 'lucide-react';
import { FaTwitch } from 'react-icons/fa';

const HeroBanner: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-muted">
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-0"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="md:max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Game On with <span className="text-primary">Pelletion</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Watch streams, check out highlights, and challenge me to a battle on Twitch!
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="#battle" 
              className="bg-primary hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-all hover-scale inline-flex items-center"
            >
              <Crosshair className="mr-2 h-5 w-5" />
              Request a Battle
            </a>
            <a 
              href="https://www.twitch.tv/pelletion" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white text-background hover:bg-gray-200 font-medium py-3 px-6 rounded-md transition-all hover-scale inline-flex items-center"
            >
              <FaTwitch className="mr-2 h-5 w-5 text-primary" />
              Follow on Twitch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
