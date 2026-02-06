@php
    $user_avatar = Auth::user()->avatar;
    if ($user_avatar == '' || $user_avatar == null) {
        $user_avatar = voyager_asset('images/default-avatar.png');
    } else {
        $user_avatar = Voyager::image($user_avatar);
    }
@endphp

<div class="modern-sidebar" x-data="{ sidebarOpen: window.innerWidth > 768 ? (localStorage.getItem('voyager.stickySidebar') === 'true') : false }" 
     :class="{ 'sidebar-open': sidebarOpen }"
     @resize.window="sidebarOpen = window.innerWidth > 768 ? (localStorage.getItem('voyager.stickySidebar') === 'true') : false">
    
    <!-- Sidebar Header -->
    <div class="sidebar-header">
        <a href="{{ route('voyager.dashboard') }}" class="sidebar-logo">
            <?php $admin_logo_img = Voyager::setting('admin.icon_image', ''); ?>
            @if($admin_logo_img == '')
                <img src="{{ voyager_asset('images/logo-icon-light.png') }}" alt="Logo" class="logo-icon">
            @else
                <img src="{{ Voyager::image($admin_logo_img) }}" alt="Logo" class="logo-icon">
            @endif
            <span class="logo-text">{{ Voyager::setting('admin.title', 'SOBITAS') }}</span>
        </a>
        <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen; localStorage.setItem('voyager.stickySidebar', sidebarOpen)" 
                aria-label="Toggle sidebar">
            <i class="voyager-list" x-show="!sidebarOpen"></i>
            <i class="voyager-x" x-show="sidebarOpen"></i>
        </button>
    </div>

    <!-- User Profile Card -->
    <div class="sidebar-user-card">
        <div class="user-avatar-wrapper">
            <img src="{{ $user_avatar }}" alt="{{ Auth::user()->name }}" class="user-avatar">
            <div class="user-status-indicator"></div>
        </div>
        <div class="user-info">
            <h4 class="user-name">{{ ucwords(Auth::user()->name) }}</h4>
            <p class="user-email">{{ Auth::user()->email }}</p>
        </div>
        <a href="{{ route('voyager.profile') }}" class="user-profile-link" title="{{ __('voyager::generic.profile') }}">
            <i class="voyager-person"></i>
        </a>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav" id="adminmenu">
        <admin-menu :items="{{ menu('admin', '_json') }}"></admin-menu>
    </nav>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
        <a href="{{ route('voyager.logout') }}" class="sidebar-logout-btn" 
           onclick="event.preventDefault(); document.getElementById('logout-form').submit();">
            <i class="voyager-power"></i>
            <span>{{ __('voyager::generic.logout') }}</span>
        </a>
        <form id="logout-form" action="{{ route('voyager.logout') }}" method="POST" style="display: none;">
            {{ csrf_field() }}
        </form>
    </div>
</div>

<style>
/* Modern Sidebar Styles */
.modern-sidebar {
    width: 280px;
    height: 100vh;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 1000;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
    overflow-x: hidden;
}

.modern-sidebar::-webkit-scrollbar {
    width: 6px;
}

.modern-sidebar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
}

.modern-sidebar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

.modern-sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Sidebar Header */
.sidebar-header {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.2);
}

.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: #fff;
    font-weight: 700;
    font-size: 1.25rem;
    transition: opacity 0.2s;
}

.sidebar-logo:hover {
    opacity: 0.9;
}

.logo-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    padding: 6px;
}

.logo-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sidebar-toggle {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #e2e8f0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.125rem;
}

.sidebar-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
}

.sidebar-toggle:active {
    transform: scale(0.95);
}

/* User Profile Card */
.sidebar-user-card {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.15);
    position: relative;
}

.user-avatar-wrapper {
    position: relative;
    flex-shrink: 0;
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
}

.user-status-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    background: #10b981;
    border: 2px solid #1e293b;
    border-radius: 50%;
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-email {
    font-size: 0.75rem;
    color: #94a3b8;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-profile-link {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e2e8f0;
    text-decoration: none;
    transition: all 0.2s;
    flex-shrink: 0;
}

.user-profile-link:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
    color: #fff;
}

/* Navigation Menu */
.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem 0;
}

/* Override Voyager menu styles */
.sidebar-nav .navbar-nav {
    list-style: none;
    padding: 0;
    margin: 0;
}

.sidebar-nav .navbar-nav > li {
    margin: 0.25rem 0.75rem;
}

.sidebar-nav .navbar-nav > li > a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: #cbd5e1;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 0.9375rem;
    font-weight: 500;
}

.sidebar-nav .navbar-nav > li > a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateX(4px);
}

.sidebar-nav .navbar-nav > li.active > a,
.sidebar-nav .navbar-nav > li > a.active {
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
    color: #60a5fa;
    border-left: 3px solid #3b82f6;
    padding-left: calc(1rem - 3px);
}

.sidebar-nav .navbar-nav > li > a i {
    width: 20px;
    text-align: center;
    font-size: 1.125rem;
}

/* Submenu styles */
.sidebar-nav .navbar-nav .dropdown-menu {
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 8px;
    padding: 0.5rem 0;
    margin: 0.5rem 0 0 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar-nav .navbar-nav .dropdown-menu > li > a {
    padding: 0.625rem 1rem 0.625rem 2.75rem;
    color: #94a3b8;
    font-size: 0.875rem;
}

.sidebar-nav .navbar-nav .dropdown-menu > li > a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

/* Sidebar Footer */
.sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
}

.sidebar-logout-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 0.9375rem;
    font-weight: 500;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.sidebar-logout-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #fff;
    border-color: rgba(239, 68, 68, 0.3);
    transform: translateY(-1px);
}

.sidebar-logout-btn i {
    font-size: 1.125rem;
}

/* Responsive */
@media (max-width: 768px) {
    .modern-sidebar {
        transform: translateX(-100%);
    }
    
    .modern-sidebar.sidebar-open {
        transform: translateX(0);
    }
}

/* Collapsed state */
.modern-sidebar:not(.sidebar-open) {
    width: 80px;
}

.modern-sidebar:not(.sidebar-open) .logo-text,
.modern-sidebar:not(.sidebar-open) .user-info,
.modern-sidebar:not(.sidebar-open) .sidebar-logout-btn span {
    display: none;
}

.modern-sidebar:not(.sidebar-open) .sidebar-user-card {
    justify-content: center;
    padding: 1rem;
}

.modern-sidebar:not(.sidebar-open) .sidebar-logo {
    justify-content: center;
}

.modern-sidebar:not(.sidebar-open) .sidebar-nav .navbar-nav > li > a {
    justify-content: center;
    padding: 0.75rem;
}

.modern-sidebar:not(.sidebar-open) .sidebar-nav .navbar-nav > li > a span {
    display: none;
}
</style>
