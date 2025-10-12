const handleAddItem = async () => {
    if (!newItem.name || !newItem.href) {
        setError('Both name and URL are required');
        return;
    }

    let finalHref = newItem.href.trim();
    let isExternal = false;

    if (finalHref.startsWith('http://') || finalHref.startsWith('https://')) {
        if (!isValidUrl(finalHref)) {
            setError('Please enter a valid URL');
            return;
        }
        isExternal = true;
    } else {
        if (!finalHref.startsWith('/') && !finalHref.startsWith('*/')) {
            setError('Internal links must start with / or */ (e.g., /dashboard or */settings)');
            return;
        }
        finalHref = formatInternalPath(finalHref);
    }

    const newItemWithId = { 
        ...newItem, 
        href: finalHref, 
        isExternal,
        iconName: isExternal ? 'external-link-alt' : 'star',
        id: Date.now().toString()
    };

    try {
        const items = [...customItems, newItemWithId];
        await saveItems(items);
        setNewItem({ name: '', href: '', isExternal: false });
        setError('');
    } catch (e) {
        setError('Failed to add item');
    }
};

const renderNavItem = (item) => {
    const isActive = !item.isExternal && location.pathname === item.href;
    const NavComponent = item.isExternal ? 'a' : Link;
    const navProps = item.isExternal ? {
        href: item.href,
        target: "_blank",
        rel: "noopener noreferrer"
    } : {
        to: item.href
    };

    let icon;
    switch (item.iconName) {
        case 'external-link-alt':
            icon = faExternalLinkAlt;
            break;
        case 'star':
            icon = faStar;
            break;
        default:
            icon = faCompass;
    }

    return (
        <li key={item.id || item.href}>
            <NavComponent
                {...navProps}
                className={`flex items-center px-3 py-[9px] rounded-md transition-all duration-200 group relative
                    ${isActive
                        ? 'bg-gray-800/80 text-gray-100' 
                        : 'hover:bg-gray-800/50 text-gray-400 hover:text-gray-300'}`}
                onClick={() => {
                    if (onClose && window.innerWidth < 1024) {
                        onClose();
                    }
                }}
            >
                <div className="flex items-center w-full">
                    <div className={`flex items-center justify-center h-5 w-5 transition-all duration-200 ${
                        isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                        <FontAwesomeIcon
                            icon={icon}
                            className={`h-[14px] w-[14px] transition-transform duration-200 ${
                                isActive ? 'scale-105' : 'group-hover:scale-105'
                            }`}
                        />
                    </div>
                    <span className="ml-3 font-medium text-[13px] transition-colors duration-200">
                        {item.name}
                    </span>
                </div>
                {item.isExternal && (
                    <FontAwesomeIcon
                        icon={faExternalLinkAlt}
                        className="w-3 h-3 ml-1.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    />
                )}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-blue-500/80 rounded-r"></div>
                )}
            </NavComponent>
        </li>
    );
};

 