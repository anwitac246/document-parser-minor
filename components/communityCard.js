"use client";

import { useRouter } from "next/navigation";
import { Users, TrendingUp, Lock, Calendar, Hash } from "lucide-react";
import { useState } from "react";

const CommunityCard = ({ 
  community, 
  isJoined = false, 
  onToggleMembership, 
  user,
  darkMode = false 
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleOpen = (e) => {
    e.stopPropagation(); // Prevent card click when clicking open button
    
    if (!user) {
      router.push('/login');
      return;
    }

    handleCardClick();
  };

  const handleCardClick = () => {
    // Ensure we have a valid community ID before navigating
    if (!community.id) {
      console.error('Community ID is missing');
      return;
    }

    // Navigate to community chat page
    const query = new URLSearchParams({
      name: community.name,
      avatar: community.avatar || '/icons/default-community.png',
      category: community.category,
      description: community.description,
      members: community.members || 0,
    }).toString();

    console.log('Navigating to:', `/community/${community.id}?${query}`);
    router.push(`/community/${community.id}?${query}`);
  };

  const formatMemberCount = (count) => {
    if (!count) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const created = new Date(timestamp);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-6 group cursor-pointer transform hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Community Avatar & Status */}
      <div className="flex justify-center items-center mb-4">
        <div className="relative">
          <img
            src={community.avatar || '/icons/default-community.png'}
            alt={community.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform shadow-md"
            onError={(e) => {
              e.target.src = '/icons/default-community.png';
            }}
          />
          {/* Active status indicator */}
          {community.isActive !== false && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-gray-800 shadow-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full absolute top-0.5 left-0.5 animate-pulse"></div>
            </div>
          )}
          {/* Private community indicator */}
          {community.isPrivate && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Category Badge */}
      <div className="flex justify-center mb-3">
        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium border border-blue-200 dark:border-blue-700">
          {community.category}
        </span>
      </div>

      {/* Community Info */}
      <div className="flex-1 text-center mb-4">
        <h3 className="font-bold text-lg text-[#1E8DD0] dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
          {community.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">
          {community.description}
        </p>
      </div>

      {/* Community Stats */}
      <div className="space-y-3">
        {/* Member Count and Activity */}
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="font-medium">{formatMemberCount(community.members)}</span>
            <span className="hidden sm:inline">members</span>
          </div>
          
          {community.lastActivity && (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {community.tags && community.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {community.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md flex items-center space-x-1"
              >
                <Hash className="w-2.5 h-2.5" />
                <span>{tag}</span>
              </span>
            ))}
            {community.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                +{community.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Open Button */}
        <div className="pt-2">
          <button
            onClick={handleOpen}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-gradient-to-r from-[#1E8DD0] to-[#43B3D8] hover:from-[#145c86] hover:to-[#1E8DD0] text-white transform hover:scale-105 focus:ring-blue-500 shadow-md hover:shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Open</span>
            </div>
          </button>
        </div>

        {/* Bottom Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{getRelativeTime(community.createdAt)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {community.isPrivate && (
              <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                <Lock className="w-3 h-3" />
                <span>Private</span>
              </div>
            )}
            
            {community.featured && (
              <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full text-xs font-medium">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Trending indicator */}
        {community.trending && (
          <div className="text-center pt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </span>
          </div>
        )}
      </div>

      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
    </div>
  );
};

export default CommunityCard;