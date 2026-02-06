@php
    $user_avatar = Auth::user()->avatar;
    if ($user_avatar == '' || $user_avatar == null) {
        $user_avatar = voyager_asset('images/default-avatar.png');
    } else {
        $user_avatar = Voyager::image($user_avatar);
    }
@endphp

<div class="modern-sidebar-hover" id="modernSidebar">
    <!-- Sidebar Trigger Area (always visible) -->
    <div class="sidebar-trigger"></div>
    
    <!-- Sidebar Content (opens on hover) -->
    <div class="sidebar-content">
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
        </div>

        <!-- User Profile Card -->
        <div class="sidebar-user-card">
            <div class="user-avatar-wrapper">
                <img src="{{ $user_avatar }}" alt="{{ Auth::user()->name }}" class="user-avatar">
                <div class="user-status-indicator"></div>
            </div>
            <div class="user-info">
                <h4 class="user-name">{{ ucwords(Auth::user()->name) }}</h4>
                <p class="user-email">{{ Str::limit(Auth::user()->email, 20) }}</p>
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
</div>

<style>
/* Modern Hover Sidebar */
.modern-sidebar-hover {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 1000;
    display: flex;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Trigger Area - Always visible thin strip */
.sidebar-trigger {
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
    cursor: pointer;
    transition: width 0.3s ease;
    position: relative;
}

.sidebar-trigger::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 60px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 0 10px 10px 0;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.modern-sidebar-hover:hover .sidebar-trigger::before {
    opacity: 1;
}

/* Sidebar Content - Hidden by default, shows on hover */
.sidebar-content {
    width: 0;
    overflow: hidden;
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
}

.modern-sidebar-hover:hover .sidebar-content {
    width: 280px;
    opacity: 1;
}

/* Sidebar Header */
.sidebar-header {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
    min-width: 280px;
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
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.logo-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* User Profile Card */
.sidebar-user-card {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.15);
    min-width: 280px;
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
    border: 2px solid rgba(59, 130, 246, 0.3);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
    background: rgba(59, 130, 246, 0.2);
    transform: scale(1.05);
    color: #60a5fa;
}

/* Navigation Menu */
.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem 0;
    min-width: 280px;
}

.sidebar-nav::-webkit-scrollbar {
    width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
}

.sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
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
    border-radius: 10px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9375rem;
    font-weight: 500;
    position: relative;
}

.sidebar-nav .navbar-nav > li > a::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 0 3px 3px 0;
    transition: height 0.2s ease;
}

.sidebar-nav .navbar-nav > li > a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateX(4px);
    padding-left: 1.25rem;
}

.sidebar-nav .navbar-nav > li > a:hover::before {
    height: 60%;
}

.sidebar-nav .navbar-nav > li.active > a,
.sidebar-nav .navbar-nav > li > a.active {
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
    color: #60a5fa;
    padding-left: 1.25rem;
}

.sidebar-nav .navbar-nav > li.active > a::before,
.sidebar-nav .navbar-nav > li > a.active::before {
    height: 80%;
}

.sidebar-nav .navbar-nav > li > a i {
    width: 20px;
    text-align: center;
    font-size: 1.125rem;
    flex-shrink: 0;
}

/* Submenu styles */
.sidebar-nav .navbar-nav .dropdown-menu {
    background: rgba(0, 0, 0, 0.4);
    border: none;
    border-radius: 10px;
    padding: 0.5rem 0;
    margin: 0.5rem 0 0 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
}

.sidebar-nav .navbar-nav .dropdown-menu > li > a {
    padding: 0.625rem 1rem 0.625rem 2.75rem;
    color: #94a3b8;
    font-size: 0.875rem;
}

.sidebar-nav .navbar-nav .dropdown-menu > li > a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateX(4px);
}

/* Sidebar Footer */
.sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
    min-width: 280px;
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
    border-radius: 10px;
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
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.sidebar-logout-btn i {
    font-size: 1.125rem;
}

/* Adjust main content when sidebar is hovered */
body:has(.modern-sidebar-hover:hover) .app-container .content-container {
    margin-left: 284px;
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Mobile: Always show trigger, sidebar opens on click */
@media (max-width: 768px) {
    .modern-sidebar-hover {
        position: fixed;
    }
    
    .sidebar-content {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;
        z-index: 1001;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
    }
    
    .modern-sidebar-hover.mobile-open .sidebar-content {
        width: 280px;
        opacity: 1;
    }
    
    .sidebar-trigger {
        z-index: 1002;
    }
}
</style>

<script>
(function() {
    'use strict';
    
    // Mobile toggle functionality
    const sidebar = document.getElementById('modernSidebar');
    const trigger = sidebar?.querySelector('.sidebar-trigger');
    
    if (trigger && window.innerWidth <= 768) {
        trigger.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
        
        // Close on outside click
        document.addEventListener('click', function(e) {
            if (sidebar && !sidebar.contains(e.target) && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
    
    // Smooth scroll for menu
    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
        nav.style.scrollBehavior = 'smooth';
    }
})();
</script>
