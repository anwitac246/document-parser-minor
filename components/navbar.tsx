'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Sun, Moon, Menu, X, FileText, Users, Info, Building2 } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
}

export default function Navbar({ darkMode, setDarkMode }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // mark component mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // handle scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // sync darkMode to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('darkMode', darkMode.toString());
    }
  }, [darkMode, mounted]);

  if (!mounted) return null;

  const navItems = [
    { name: 'Document Parser', icon: FileText, href: '/document-analyser' },
    { name: 'Communities', icon: Building2, href: '/communities' },
    { name: 'Learn More', icon: Info, href: '/learn-more' },
  ];

  return (
    <nav className={`sticky top-0 left-0 right-0 z-100 transition-all duration-300 ${
      isScrolled 
        ? darkMode 
          ? 'bg-[#0B2E33]/95 backdrop-blur-md shadow-lg'
          : 'bg-white/95 backdrop-blur-md shadow-lg'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="shrink-0">
            <Link href="/" className="no-underline">
              <h1 className={`text-2xl font-bold tracking-tight ${
                darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
              }`}>
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      darkMode 
                        ? 'text-[#B8E3E9] hover:text-[#CADDE9] hover:bg-[#4F7C82]/20'
                        : 'text-[#1E8DD0] hover:text-[#1E8DD0] hover:bg-[#CADDE9]/20'
                    }`}
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
              href="/login"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 ${
                darkMode 
                  ? 'text-[#B8E3E9] hover:text-[#CADDE9] hover:bg-[#4F7C82]/20'
                  : 'text-[#1E8DD0] hover:text-[#1E8DD0] hover:bg-[#CADDE9]/20'
              }`}
            >
              <Users size={18} />
              <span>Login</span>
            </a>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                darkMode 
                  ? 'bg-[#4F7C82]/20 text-[#B8E3E9] hover:bg-[#4F7C82]/30'
                  : 'bg-[#1E8DD0]/20 text-[#1E8DD0] hover:bg-[#CADDE9]/30'
              }`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-md transition-colors ${
                  darkMode 
                    ? 'text-[#B8E3E9] hover:bg-[#4F7C82]/20'
                    : 'text-[#1E8DD0] hover:bg-[#CADDE9]/20'
                }`}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      darkMode 
                        ? 'text-[#B8E3E9] hover:bg-[#4F7C82]/20'
                        : 'text-[#1E8DD0] hover:bg-[#CADDE9]/20'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}