import React from 'react';
import { Link } from 'wouter';
import { Gamepad } from 'lucide-react';
import { FaTwitch, FaTwitter, FaDiscord, FaYoutube } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-primary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <Link href="/">
              <div className="text-2xl font-bold text-primary flex items-center cursor-pointer">
                <Gamepad className="mr-2" />
                <span>Pelletion</span>
              </div>
            </Link>
            <p className="text-gray-400 mt-2 max-w-md">
              Challenge me to a battle, watch my stream, and join the community!
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#live" className="text-gray-400 hover:text-white">Live Stream</a>
                </li>
                <li>
                  <a href="#highlights" className="text-gray-400 hover:text-white">Highlights</a>
                </li>
                <li>
                  <a href="#battle" className="text-gray-400 hover:text-white">Request Battle</a>
                </li>
                <li>
                  <a href="#scheduled" className="text-gray-400 hover:text-white">Scheduled Battles</a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Connect</h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="https://www.twitch.tv/pelletion" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-white flex items-center"
                  >
                    <FaTwitch className="mr-2" />
                    <span>Twitch</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white flex items-center">
                    <FaTwitter className="mr-2" />
                    <span>Twitter</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white flex items-center">
                    <FaDiscord className="mr-2" />
                    <span>Discord</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white flex items-center">
                    <FaYoutube className="mr-2" />
                    <span>YouTube</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Pelletion. All rights reserved. Not affiliated with Twitch.
            {' • '} 
            <span 
              className="text-gray-500 hover:text-gray-300 cursor-pointer" 
              onClick={() => window.location.href = '/admin-login'}
            >
              Admin
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
