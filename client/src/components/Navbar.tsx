import React, { useState } from 'react';
import { Link } from 'wouter';
import { Gamepad } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background sticky top-0 z-50 border-b border-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="text-2xl font-bold text-primary flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
                <Gamepad className="mr-2" />
                <span>Pelletion</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-6">
            <a href="#live" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Live Stream
            </a>
            <a href="#highlights" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Highlights
            </a>
            <a href="#battle" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Request Battle
            </a>
            <a href="#scheduled" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Scheduled Battles
            </a>
          </div>
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-muted focus:outline-none"
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-muted border-b border-primary`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <a 
            href="#live" 
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            onClick={closeMobileMenu}
          >
            Live Stream
          </a>
          <a 
            href="#highlights" 
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            onClick={closeMobileMenu}
          >
            Highlights
          </a>
          <a 
            href="#battle" 
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            onClick={closeMobileMenu}
          >
            Request Battle
          </a>
          <a 
            href="#scheduled" 
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            onClick={closeMobileMenu}
          >
            Scheduled Battles
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
