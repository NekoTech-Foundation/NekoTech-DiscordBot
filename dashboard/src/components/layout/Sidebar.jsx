import { useState, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faHome,
  faCog,
  faChevronDown,
  faExternalLinkAlt,
  faBars,
  faXmark,
  faChartLine,
  faCode,
  faTicket,
  faComments,
  faSignOutAlt,
  faChevronRight,
  faChevronLeft,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons"
import api from "../../lib/api/axios"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { socket } from "../../socket"
import { ProfileButton } from "../ui/profile-button"
import { auth } from "../../lib/auth/auth"

const spring = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1,
}

const NavItemSkeleton = () => (
  <div className="px-3 py-2.5 flex items-center">
    <motion.div
      className="w-5 h-5 bg-gray-700/70 rounded-md"
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.01, 1],
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="ml-3 w-24 h-4 bg-gray-700/70 rounded-md"
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.01, 1],
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay: 0.2,
      }}
    />
  </div>
)

const defaultNavigationItems = [
  {
    name: "Overview",
    href: "/",
    icon: faHome,
    permission: "Login",
  },
  {
    name: "Support",
    href: "/tickets",
    icon: faTicket,
    permission: "Login",
  },
  {
    name: "Analytics",
    href: "/usage",
    icon: faChartLine,
    permission: "Usage",
  },
  {
    name: "Builder",
    href: "/embed-builder",
    icon: faCode,
    permission: "Embed",
  },
  {
    name: "Suggestions",
    href: "/suggestions",
    icon: faComments,
    permission: "Suggestions",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: faCog,
    permission: "Settings",
  },
]

function NavSection({
  title,
  items,
  renderNavItem,
  isOpen: defaultIsOpen = true,
  alwaysShow = false,
  isLoading = false,
  isCollapsed = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen)
  const shouldReduceMotion = useReducedMotion()

  if (!isLoading && !items?.length && !alwaysShow) {
    return null
  }

  const variants = {
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.2, delay: 0.1 },
      },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: "easeIn" },
        opacity: { duration: 0.2 },
      },
    },
  }

  const toggleSection = () => {
    setIsOpen(!isOpen)
  }

  return (
    <motion.div
      className="mt-4 first:mt-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {!isCollapsed && items && items.length > 0 && (
        <button
          onClick={toggleSection}
          className="w-full px-4 mb-2 flex items-center justify-between py-1 rounded-md text-gray-400 hover:text-gray-200 focus:outline-none transition-colors"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          <h3 className="text-xs font-semibold tracking-wider uppercase text-inherit">
            {title}
          </h3>
          <motion.div 
            animate={{ rotate: isOpen ? 0 : -90 }} 
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="text-gray-500"
          >
            <FontAwesomeIcon
              icon={faChevronDown}
              className="w-2.5 h-2.5"
            />
          </motion.div>
        </button>
      )}
      
      {!isCollapsed && !items?.length && (
        <div className="px-4 mb-2">
          <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {title}
          </h3>
        </div>
      )}
      
      <motion.div 
        variants={!isCollapsed ? variants : undefined} 
        initial={!isCollapsed ? "closed" : undefined}
        animate={!isCollapsed && !isOpen ? "closed" : "open"}
        className="overflow-hidden"
      >
        <motion.ul
          className="space-y-[1px] px-2"
          variants={!isCollapsed ? {
            open: {
              transition: { staggerChildren: 0.05, delayChildren: 0.1 },
            },
            closed: {
              transition: { staggerChildren: 0.03, staggerDirection: -1 },
            },
          } : undefined}
        >
          {isLoading ? (
            <>
              <NavItemSkeleton />
              <NavItemSkeleton />
              <NavItemSkeleton />
            </>
          ) : items && items.length > 0 ? (
            items.map((item, index) => renderNavItem(item, index))
          ) : (
            <motion.li
              className="px-3 py-2 text-gray-500 text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              No items available
            </motion.li>
          )}
        </motion.ul>
      </motion.div>
    </motion.div>
  )
}

export default function Sidebar({ navName = "", onClose, isMobileMenuOpen }) {
  const location = useLocation()
  const [customItems, setCustomItems] = useState([])
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [categories, setCategories] = useState({
    navigation: "Menu",
    custom: "Custom Links",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isHeaderLoading, setIsHeaderLoading] = useState(true)
  const [permissions, setPermissions] = useState(null)
  const [user, setUser] = useState(null)
  const [showTooltip, setShowTooltip] = useState(null)
  const tooltipTimeout = useRef(null)

  useEffect(() => {
    const loadPermissionsAndUser = async () => {
      try {
        const [configResponse, userResponse] = await Promise.all([
          api.get("/auth/config"),
          api.get("/auth/me")
        ]);

        setPermissions(configResponse.data.permissions.Dashboard);
        setUser(userResponse.data.user);
      } catch (error) {
        console.error("Failed to load permissions:", error);
      }
    };

    loadPermissionsAndUser();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      setIsHeaderLoading(true)
      try {
        const dashResponse = await api.get("/settings/dashboard")

        if (dashResponse.data && typeof dashResponse.data === "object") {
          const { customNavItems, categories } = dashResponse.data

          if (Array.isArray(customNavItems)) {
            setCustomItems(customNavItems)
          }

          if (categories) {
            setCategories((prevCategories) => ({
              ...prevCategories,
              ...categories,
            }))
          }
        } else {
          throw new Error("Invalid dashboard settings response")
        }
      } catch (e) {
        setCustomItems([])
        setCategories({
          navigation: "Menu",
          custom: "Custom Links",
        })
      } finally {
        setIsLoading(false)
        setIsHeaderLoading(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const handleSettingsUpdate = (data) => {
      if (Array.isArray(data?.customNavItems)) {
        setCustomItems(data.customNavItems)
      }
      if (data?.categories) {
        setCategories((prevCategories) => ({
          ...prevCategories,
          ...data.categories,
        }))
      }
    }

    socket.on("settings:update", handleSettingsUpdate)
    return () => {
      socket.off("settings:update", handleSettingsUpdate)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 1024
      setIsMobile(newIsMobile)
      setIsSidebarOpen(!newIsMobile)

      if (newIsMobile && isSidebarCollapsed) {
        setIsSidebarCollapsed(false)
      }
    }

    let resizeTimer
    const debouncedResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(handleResize, 100)
    }

    window.addEventListener("resize", debouncedResize)
    return () => {
      window.removeEventListener("resize", debouncedResize)
      clearTimeout(resizeTimer)
    }
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
      setIsSidebarCollapsed(false)
    }
  }, [isMobile])

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current)
      }
    }
  }, [])

  const hasPermission = (requiredPermission) => {
    if (!permissions || !user || !user.roles) {
      return false;
    }
    
    if (!requiredPermission || (requiredPermission === "Login" && permissions.Login?.some(roleId => 
      user.roles.includes(roleId) || user.roles.some(role => role.id === roleId)
    ))) {
      return true;
    }
    
    const requiredRoles = permissions[requiredPermission] || [];
    
    const hasRole = requiredRoles.some(requiredRoleId => 
      user.roles.includes(requiredRoleId) ||
      user.roles.some(role => role.id === requiredRoleId)
    );
    
    return hasRole;
  };

  const handleMouseEnter = (id) => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current) 
    }
    setShowTooltip(id)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current)
    }
    
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(null)
    }, 100)
  }

  const renderNavItem = (item, index) => {
    if (!hasPermission(item.permission)) {
      return null;
    }

    const isActive = location.pathname === item.href
    const isExternal = item.href.startsWith("http")
    const emoji = item.emoji || (isExternal ? "🔗" : null)

    const sharedClasses = `px-3 py-2.5 flex items-center rounded-md text-sm font-medium transition-colors relative ${
      isActive
        ? "text-white bg-blue-600 shadow-sm"
        : "text-gray-300 hover:text-white hover:bg-gray-800"
    }`

    const content = (
      <div className="relative flex items-center w-full">
        <div className={`${isSidebarCollapsed ? "mx-auto" : ""} relative ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
          {emoji ? (
            <span className="w-5 h-5 flex items-center justify-center text-lg">{emoji}</span>
          ) : (
            <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
          )}
        </div>
        
        {!isSidebarCollapsed && (
          <>
            <span className="ml-3 truncate">{item.name}</span>
            {isExternal && (
              <FontAwesomeIcon
                icon={faExternalLinkAlt}
                className="w-3 h-3 ml-auto opacity-50"
              />
            )}
          </>
        )}
      </div>
    )

    const linkElement = isExternal ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${sharedClasses} ${isSidebarCollapsed ? "justify-center" : ""} group`}
        onMouseEnter={() => isSidebarCollapsed && handleMouseEnter(index)}
        onMouseLeave={() => isSidebarCollapsed && handleMouseLeave()}
        aria-label={item.name}
      >
        {content}
      </a>
    ) : (
      <Link
        to={item.href}
        className={`${sharedClasses} ${isSidebarCollapsed ? "justify-center" : ""} group`}
        onClick={() => {
          if (isMobile) {
            onClose?.()
          }
        }}
        onMouseEnter={() => isSidebarCollapsed && handleMouseEnter(index)}
        onMouseLeave={() => isSidebarCollapsed && handleMouseLeave()}
        aria-label={item.name}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </Link>
    )

    return (
      <motion.li
        key={item.href}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        {linkElement}
        
        {isSidebarCollapsed && showTooltip === index && (
          <motion.div 
            className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md shadow-md z-50 whitespace-nowrap"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {item.name}
          </motion.div>
        )}
      </motion.li>
    )
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
    if (isMobile && !isSidebarOpen) {
      onClose?.()
    }
  }
  
  const toggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Sidebar */}
        {(isSidebarOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? { x: "-100%", opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={spring}
            className={`h-screen flex flex-col fixed lg:sticky top-0 left-0 
              ${isSidebarCollapsed ? "w-[70px]" : "w-[85vw] sm:w-[360px] lg:w-[280px] xl:w-[300px]"}
              z-40 bg-card border-r border-border shadow-md`}
          >
            {/* Header */}
            <div className="flex-none border-b border-border bg-secondary/30">
              {isHeaderLoading ? (
                <div className="h-16 px-4 flex items-center justify-center">
                  <motion.div
                    className="h-5 w-24 bg-gray-700/70 rounded"
                    animate={{
                      opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              ) : (
                <div className="h-16 px-4 flex items-center">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {isSidebarCollapsed ? (
                      <motion.div 
                        className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-md shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-base font-semibold">{navName?.charAt(0) || "D"}</span>
                      </motion.div>
                    ) : (
                      <>
                        <motion.div 
                          className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-md shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="text-base font-semibold">{navName?.charAt(0) || "D"}</span>
                        </motion.div>
                        <div className="min-w-0">
                          <h1 className="text-lg font-semibold text-white truncate">{navName || "DrakoBot"}</h1>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-400 truncate">Dashboard</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center ml-auto">
                    {isMobile && (
                      <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                        aria-label="Close sidebar"
                      >
                        <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                      </button>
                    )}
                    {!isMobile && !isSidebarCollapsed && (
                      <button
                        onClick={toggleCollapse}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors focus:outline-none"
                        title="Collapse sidebar"
                        aria-label="Collapse sidebar"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                      </button>
                    )}
                    {!isMobile && isSidebarCollapsed && (
                      <button
                        onClick={toggleCollapse}
                        className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors focus:outline-none"
                        title="Expand sidebar"
                        aria-label="Expand sidebar"
                      >
                        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-5 px-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <div className="space-y-6">
                <NavSection
                  title={categories.navigation}
                  items={defaultNavigationItems}
                  renderNavItem={renderNavItem}
                  isLoading={isLoading}
                  alwaysShow={true}
                  isCollapsed={isSidebarCollapsed}
                />

                {customItems && customItems.length > 0 && !isSidebarCollapsed && (
                  <NavSection
                    title={categories.custom}
                    items={customItems.map(item => ({
                      ...item,
                      emoji: item.emoji || "🔗"
                    }))}
                    renderNavItem={renderNavItem}
                    isLoading={isLoading}
                    alwaysShow={false}
                    isCollapsed={isSidebarCollapsed}
                  />
                )}
              </div>
            </nav>

            {/* Footer */}
            <div className="flex-none border-t border-border bg-card">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {!isSidebarCollapsed && (
                    <div className="flex items-center min-w-0 flex-1">
                      <ProfileButton 
                        className="!p-0 !bg-transparent !border-0 hover:!bg-transparent" 
                        minimal={true}
                      />
                    </div>
                  )}
                  <div className={`flex items-center space-x-1 ${isSidebarCollapsed ? "mx-auto" : ""}`}>
                    <Link
                      to="/user-settings"
                      className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/70 transition-colors focus:outline-none"
                      onClick={() => {
                        if (onClose && window.innerWidth < 1024) {
                          onClose()
                        }
                      }}
                      onMouseEnter={() => isSidebarCollapsed && handleMouseEnter('user-settings')}
                      onMouseLeave={() => isSidebarCollapsed && handleMouseLeave()}
                      aria-label="User Settings"
                    >
                      <FontAwesomeIcon icon={faCog} className="w-5 h-5" />
                      {isSidebarCollapsed && showTooltip === 'user-settings' && (
                        <motion.div 
                          className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md shadow-md z-50 whitespace-nowrap"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          User Settings
                        </motion.div>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        auth.logout();
                        if (onClose && window.innerWidth < 1024) {
                          onClose();
                        }
                      }}
                      className="p-2 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700/70 transition-colors focus:outline-none"
                      onMouseEnter={() => isSidebarCollapsed && handleMouseEnter('logout')}
                      onMouseLeave={() => isSidebarCollapsed && handleMouseLeave()}
                      aria-label="Logout"
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
                      {isSidebarCollapsed && showTooltip === 'logout' && (
                        <motion.div 
                          className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md shadow-md z-50 whitespace-nowrap"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          Logout
                        </motion.div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            className="lg:hidden fixed top-4 left-4 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring}
          >
            <motion.button
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 shadow-md transition-colors focus:outline-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open sidebar"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  )
}