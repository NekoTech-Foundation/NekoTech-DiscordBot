import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ProfileButton } from "../ui/profile-button";
import Sidebar from './Sidebar';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faSearch, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ticketService } from '../../services/ticketService';
import { userDataService } from '../../utils/userDataService';
import { auth } from '../../lib/auth/auth';

function SearchResultSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-gray-700/30 last:border-0 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gray-700/50" />
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-32 bg-gray-700/50 rounded" />
            <div className="flex items-center space-x-2">
              <div className="h-3 w-20 bg-gray-700/50 rounded" />
              <div className="h-3 w-3 bg-gray-700/50 rounded-full" />
              <div className="h-3 w-40 bg-gray-700/50 rounded" />
            </div>
          </div>
        </div>
        <div className="h-6 w-16 bg-gray-700/50 rounded-lg ml-3" />
      </div>
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const title = location.pathname === '/' ? 'Dashboard' : 
                location.pathname === '/embed-builder' ? 'Embed Builder' :
                location.pathname === '/user-settings' ? 'User Settings' :
                location.pathname.split('/')[1].charAt(0).toUpperCase() + 
                location.pathname.split('/')[1].slice(1);

  const [settings, setSettings] = useState({
    navName: '',
    favicon: '',
    tabName: ''
  });
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userDisplayData, setUserDisplayData] = useState({});
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/settings/dashboard');
        setSettings(response.data || {
          navName: '',
          favicon: '',
          tabName: ''
        });

        document.title = response.data?.tabName || 'Dashboard';

        if (response.data?.favicon) {
          const favicon = document.querySelector("link[rel~='icon']");
          if (favicon) {
            favicon.href = response.data.favicon;
          } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = response.data.favicon;
            document.head.appendChild(newFavicon);
          }
        }
      } catch (error) {
        console.error('[Layout] Failed to fetch dashboard settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await auth.getUser();
        setUserRoles(user?.roles || []);
        setUserId(user?.id || null);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setUserRoles([]);
        setUserId(null);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (!isFocused) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const { tickets } = await ticketService.getTickets({ 
          search: searchQuery.trim(),
          limit: 5 
        });

        const filteredTickets = tickets.filter(ticket => {
          if (ticket.creator === userId) return true;

          const ticketType = window.DASHBOARD_CONFIG?.TICKETS?.TYPES?.[ticket.type];
          if (!ticketType) return false;

          const supportRoles = Array.isArray(ticketType.supportRoles) 
            ? ticketType.supportRoles 
            : [ticketType.supportRoles];

          return supportRoles.some(roleId => userRoles.includes(roleId));
        });

        setSearchResults(filteredTickets);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isFocused, userRoles, userId]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!searchResults.length) return;

      setIsLoadingUserData(true);
      const uniqueUsers = Array.from(new Set(searchResults.map(ticket => ticket.creator)));
      const initialData = {};

      try {
        for (const userId of uniqueUsers) {
          const data = await userDataService.getUserData(userId);
          initialData[userId] = {
            avatar: data.avatar,
            displayName: data.displayName
          };
        }
        setUserDisplayData(initialData);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadUserData();
  }, [searchResults]);


  const handleSearch = (e) => {
    if (e) {
      e.preventDefault();
    }
    if (searchQuery.trim()) {
      navigate({
        pathname: '/tickets',
        search: `?status=all&priority=all&type=all&search=${encodeURIComponent(searchQuery.trim())}&sortBy=newest`
      });
      setSearchQuery('');
      setShowDropdown(false);
      setIsFocused(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 lg:z-0`}>
          <Sidebar 
            navName={settings.navName} 
            onClose={() => setIsMobileMenuOpen(false)} 
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen w-full">
          <header 
            className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md shadow-lg shadow-black/10 border-b border-border"
          >
            <div className="h-16 px-4 md:px-6 lg:px-8 mx-auto">
              <div className="h-full mx-auto flex items-center justify-between">
                {/* Left section with menu button and title */}
                <div className="flex items-center space-x-4">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  {/* Title */}
                  <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                    <div className="relative group">
                      <span className="font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                        {title}
                      </span>
                      <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transform scale-x-0 group-hover:opacity-100 group-hover:scale-x-100 transition-all duration-300" />
                    </div>
                  </h1>
                </div>

                {/* Center section with search */}
                <div className="hidden md:flex flex-1 justify-center px-6 max-w-2xl">
                  <form onSubmit={handleSearch} className="w-full relative">
                    <div className="relative group">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          setIsFocused(true);
                          setShowDropdown(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setIsFocused(false);
                            setShowDropdown(false);
                          }, 200);
                        }}
                        placeholder="Search tickets..."
                        className="w-full border rounded-xl text-foreground placeholder-muted-foreground px-3 py-2 pl-9 text-sm bg-secondary border-border focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-border/80"
                      />
                      <FontAwesomeIcon 
                        icon={faSearch} 
                        className="absolute top-1/2 transform -translate-y-1/2 left-3 w-4 h-4 text-muted-foreground group-hover:text-muted-foreground/80 transition-all duration-200"
                      />
                    </div>
                    
                    {/* Search Results Dropdown */}
                    <div className={`absolute mt-2 w-full transition-all duration-200 ease-in-out origin-top ${
                      showDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}>
                      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl shadow-black/10 overflow-hidden">
                        {isSearching ? (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <SearchResultSkeleton />
                            <SearchResultSkeleton />
                            <SearchResultSkeleton />
                          </div>
                        ) : (
                          <>
                            {!searchQuery.trim() ? (
                              <div className="px-4 py-8 text-center">
                                <FontAwesomeIcon 
                                  icon={faSearch} 
                                  className="w-5 h-5 text-gray-500 mb-2"
                                />
                                <p className="text-gray-400 text-sm">Start Searching...</p>
                                <p className="text-gray-500 text-xs mt-1">Type to search for tickets</p>
                              </div>
                            ) : searchResults.length > 0 ? (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                {searchResults.map((ticket, index) => {
                                  const userData = userDisplayData[ticket.creator] || {
                                    avatar: `https://cdn.discordapp.com/embed/avatars/0.png`,
                                    displayName: 'Loading...'
                                  };
                                  
                                  return (
                                    <Link
                                      key={ticket.id}
                                      to={`/tickets/${ticket.id}/transcript`}
                                      className="block px-4 py-3 hover:bg-gray-800/50 border-b border-gray-700/30 last:border-0 transition-colors duration-200"
                                      style={{
                                        animationDelay: `${index * 50}ms`
                                      }}
                                      onClick={() => {
                                        setSearchQuery('');
                                        setShowDropdown(false);
                                        setIsFocused(false);
                                      }}
                                    >
                                      <div className="flex items-center justify-between group">
                                        <div className="flex items-center space-x-3 min-w-0">
                                          <div className={`relative ${isLoadingUserData ? 'animate-pulse' : ''}`}>
                                            <img
                                              src={userData.avatar}
                                              alt={userData.displayName}
                                              className={`w-8 h-8 rounded-full ring-2 ring-gray-700/50 transition-all duration-200 group-hover:ring-blue-500/50 ${
                                                isLoadingUserData ? 'opacity-50' : ''
                                              }`}
                                            />
                                            {isLoadingUserData && (
                                              <div className="absolute inset-0 bg-gray-700/50 rounded-full" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-200 truncate transition-colors duration-200 group-hover:text-blue-400">
                                              {ticket.title}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <span className={`text-xs text-gray-400 truncate transition-opacity duration-200 ${
                                                isLoadingUserData ? 'opacity-50' : ''
                                              }`}>
                                                {userData.displayName}
                                              </span>
                                              <span className="text-xs text-gray-600">•</span>
                                              <span className="text-xs text-gray-400 line-clamp-1 flex-shrink">
                                                {ticket.description}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-lg flex-shrink-0 ml-3 ${
                                          ticket.status === 'open' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                                          ticket.status === 'closed' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                                          'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                                        }`}>
                                          {ticket.status}
                                        </span>
                                      </div>
                                    </Link>
                                  );
                                })}
                                <button
                                  onClick={handleSearch}
                                  className="w-full px-4 py-3 text-sm text-blue-400 hover:bg-gray-800/50 flex items-center justify-center gap-2 font-medium"
                                >
                                  See all results
                                  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="px-4 py-8 text-center">
                                <p className="text-gray-400 text-sm">No results found</p>
                                <p className="text-gray-500 text-xs mt-1">Try a different search term</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Right section */}
                <div className="flex items-center space-x-3">
                  {/* Mobile search button */}
                  <button
                    className={`md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 ${
                      scrolled 
                        ? 'hover:bg-secondary/40 bg-secondary/30 shadow-sm shadow-black/10' 
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                  >
                    <FontAwesomeIcon icon={faSearch} className={`w-5 h-5 transition-transform duration-300 ${
                      scrolled ? 'transform scale-90' : 'transform scale-100'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile search bar */}
            <div className="md:hidden px-4 pb-3">
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full border rounded-xl text-foreground placeholder-muted-foreground px-3 py-1.5 pl-9 text-sm bg-secondary border-border focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-border/80"
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute top-1/2 transform -translate-y-1/2 left-3 w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground/80 transition-all duration-200"
                  />
                </div>
              </form>
            </div>
          </header>

          {/* Main content with padding to account for fixed header */}
          <main className="flex-1 pt-28 md:pt-20 px-4 md:px-6 lg:px-8">
            <div className="max-w-[2000px] mx-auto">
              <div className="transition-all duration-300 ease-in-out">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Layout; 