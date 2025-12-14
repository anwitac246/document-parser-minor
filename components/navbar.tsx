'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, FileText, Users, Info, Building2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false); // default false
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false); // prevent SSR mismatch

  // mark component mounted
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('darkMode') === 'true';
    setDarkMode(saved);
  }, []);

  // handle scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) return null; // render nothing until client

  const navItems = [
    { name: 'Document Parser', icon: FileText, href: '/document-analyser' },
    { name: 'Communities', icon: Building2, href: '/communities' },
    { name: 'Learn More', icon: Info, href: '/learn-more' },
  ];

  return (
    <nav className={`sticky top-0 left-0 right-0 z-100 transition-all duration-300 ${
      isScrolled 
        ?  'bg-white/95 backdrop-blur-md shadow-lg'
        :  'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}

          <div className="flex-shrink-0">
            <Link href="/" className="no-underline">
              <h1
                className={`text-2xl font-bold tracking-tight 
                   'text-black'
                `}
              >
                LegalFlow
              </h1>
            </Link>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 text-[#1E8DD0] hover:text-[#1E8DD0] hover:bg-[#CADDE9]/20
                    `}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Right side (Login + Theme toggle + Mobile menu) */}
          <div className="flex items-center space-x-4">
            {/* Login button */}
            <a
              key="login"
              href="/login"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 
                text-[#1E8DD0] hover:text-[#1E8DD0] hover:bg-[#CADDE9]/20
              `}
            >
              <Users size={18} />
              <span>Login</span>
            </a>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 
                 'bg-[#1E8DD0]/20 text-[#1E8DD0] hover:bg-[#CADDE9]/30'
              `}
            >
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-md transition-colors 'text-[#1E8DD0] hover:bg-[#CADDE9]/20'
                `}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}