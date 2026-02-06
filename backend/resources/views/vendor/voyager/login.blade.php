@extends('voyager::auth.master')

@section('pre_css')
@if(file_exists(public_path('css/app.css')))
<link rel="stylesheet" href="{{ asset('css/app.css') }}">
@endif
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
    body.login {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        background-attachment: fixed;
        background-size: 400% 400%;
        animation: gradientShift 15s ease infinite;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    .login-sidebar {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border-radius: 0;
        overflow: hidden;
    }
    
    .modern-login-container {
        padding: 3rem 2.5rem;
        max-width: 420px;
        margin: 0 auto;
    }
    
    .login-logo {
        text-align: center;
        margin-bottom: 2.5rem;
        animation: fadeInDown 0.6s ease-out;
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .login-logo img {
        width: 90px;
        height: 90px;
        margin-bottom: 1.25rem;
        border-radius: 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        background: white;
        padding: 12px;
        transition: transform 0.3s ease;
    }
    
    .login-logo img:hover {
        transform: scale(1.05) rotate(5deg);
    }
    
    .login-title {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
        letter-spacing: -0.5px;
    }
    
    .login-subtitle {
        color: #6b7280;
        font-size: 0.9375rem;
        font-weight: 400;
    }
    
    .form-group-modern {
        margin-bottom: 1.5rem;
        position: relative;
    }
    
    .form-label-modern {
        display: block;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5rem;
        letter-spacing: 0.025em;
    }
    
    .form-label-modern i {
        margin-right: 0.5rem;
        color: #667eea;
    }
    
    .form-input-wrapper {
        position: relative;
    }
    
    .form-input-modern {
        width: 100%;
        padding: 0.875rem 1rem 0.875rem 2.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: #fff;
        color: #1f2937;
        font-family: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .form-input-modern::placeholder {
        color: #9ca3af;
    }
    
    .form-input-modern:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
    }
    
    .form-input-modern:focus + .input-icon {
        color: #667eea;
        transform: scale(1.1);
    }
    
    .input-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        font-size: 1.125rem;
        pointer-events: none;
        transition: all 0.3s ease;
    }
    
    .password-toggle {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 1.125rem;
        padding: 0.25rem;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .password-toggle:hover {
        color: #667eea;
        transform: translateY(-50%) scale(1.1);
    }
    
    .remember-me-modern {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 1.75rem;
        cursor: pointer;
        user-select: none;
    }
    
    .remember-me-modern input[type="checkbox"] {
        width: 1.125rem;
        height: 1.125rem;
        accent-color: #667eea;
        cursor: pointer;
        border-radius: 4px;
    }
    
    .remember-me-modern label {
        cursor: pointer;
        color: #4b5563;
        font-size: 0.875rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    
    .remember-me-modern:hover label {
        color: #667eea;
    }
    
    .btn-login-modern {
        width: 100%;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        font-size: 1rem;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
        font-family: inherit;
        letter-spacing: 0.025em;
        position: relative;
        overflow: hidden;
    }
    
    .btn-login-modern::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
    }
    
    .btn-login-modern:hover::before {
        left: 100%;
    }
    
    .btn-login-modern:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.5);
    }
    
    .btn-login-modern:active {
        transform: translateY(0);
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
    }
    
    .btn-login-modern:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }
    
    .btn-login-modern .signingin {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    
    .btn-login-modern .signingin .voyager-refresh {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .alert-modern {
        padding: 1rem 1.25rem;
        border-radius: 10px;
        margin-bottom: 1.5rem;
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        border: 2px solid #fca5a5;
        color: #991b1b;
        animation: shake 0.5s ease;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .alert-modern ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .alert-modern li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .alert-modern li:last-child {
        margin-bottom: 0;
    }
    
    .forgot-password-link {
        text-align: center;
        margin-top: 1.5rem;
    }
    
    .forgot-password-link a {
        color: #667eea;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
    }
    
    .forgot-password-link a:hover {
        color: #764ba2;
        text-decoration: underline;
    }
    
    .fade-in {
        animation: fadeIn 0.6s ease-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Focus visible for accessibility */
    .form-input-modern:focus-visible,
    .btn-login-modern:focus-visible,
    .password-toggle:focus-visible {
        outline: 2px solid #667eea;
        outline-offset: 2px;
    }
    
    /* Loading state */
    .form-group-modern.loading .form-input-modern {
        opacity: 0.6;
        pointer-events: none;
    }
</style>
@endsection

@section('content')
<div class="modern-login-container fade-in">
    <div class="login-logo">
        <?php $admin_logo_img = Voyager::setting('admin.icon_image', ''); ?>
        @if($admin_logo_img == '')
            <img src="{{ voyager_asset('images/logo-icon-light.png') }}" alt="Logo">
        @else
            <img src="{{ Voyager::image($admin_logo_img) }}" alt="Logo">
        @endif
        <h1 class="login-title">{{ Voyager::setting('admin.title', 'SOBITAS') }}</h1>
        <p class="login-subtitle">{{ __('voyager::login.welcome') }}</p>
    </div>

    @if(!$errors->isEmpty())
        <div class="alert-modern fade-in">
            <ul>
                @foreach($errors->all() as $err)
                    <li>{{ $err }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form action="{{ route('voyager.login') }}" method="POST" id="loginForm" novalidate>
        {{ csrf_field() }}
        
        <div class="form-group-modern">
            <label for="email" class="form-label-modern">
                <i class="voyager-mail"></i> {{ __('voyager::generic.email') }}
            </label>
            <div class="form-input-wrapper">
                <i class="voyager-mail input-icon"></i>
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    value="{{ old('email') }}" 
                    placeholder="votre@email.com" 
                    class="form-input-modern" 
                    required
                    autofocus
                    autocomplete="email"
                    aria-label="{{ __('voyager::generic.email') }}"
                >
            </div>
        </div>

        <div class="form-group-modern">
            <label for="password" class="form-label-modern">
                <i class="voyager-lock"></i> {{ __('voyager::generic.password') }}
            </label>
            <div class="form-input-wrapper">
                <i class="voyager-lock input-icon"></i>
                <input 
                    type="password" 
                    name="password" 
                    id="password" 
                    placeholder="••••••••" 
                    class="form-input-modern" 
                    required
                    autocomplete="current-password"
                    aria-label="{{ __('voyager::generic.password') }}
                >
                <button type="button" class="password-toggle" id="passwordToggle" aria-label="Toggle password visibility">
                    <i class="voyager-eye" id="passwordToggleIcon"></i>
                </button>
            </div>
        </div>

        <div class="remember-me-modern">
            <input type="checkbox" name="remember" id="remember" value="1">
            <label for="remember">{{ __('voyager::generic.remember_me') }}</label>
        </div>

        <button type="submit" class="btn-login-modern" id="loginButton">
            <span class="signingin hidden">
                <i class="voyager-refresh"></i>
                <span>{{ __('voyager::login.loggingin') }}...</span>
            </span>
            <span class="signin">{{ __('voyager::generic.login') }}</span>
        </button>
    </form>

    @if (Route::has('voyager.password.request'))
        <div class="forgot-password-link">
            <a href="{{ route('voyager.password.request') }}">
                {{ __('voyager::login.forgot_password') }}
            </a>
        </div>
    @endif
</div>
@endsection

@section('post_js')
<script>
(function() {
    'use strict';
    
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginButton');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordToggleIcon = document.getElementById('passwordToggleIcon');
    
    // Password toggle functionality
    if (passwordToggle && password) {
        passwordToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            
            // Toggle icon
            if (type === 'text') {
                passwordToggleIcon.classList.remove('voyager-eye');
                passwordToggleIcon.classList.add('voyager-eye-off');
            } else {
                passwordToggleIcon.classList.remove('voyager-eye-off');
                passwordToggleIcon.classList.add('voyager-eye');
            }
        });
    }
    
    // Form submission
    if (form && btn) {
        form.addEventListener('submit', function(e) {
            if (form.checkValidity()) {
                const signingIn = btn.querySelector('.signingin');
                const signIn = btn.querySelector('.signin');
                
                if (signingIn && signIn) {
                    signingIn.classList.remove('hidden');
                    signIn.classList.add('hidden');
                    btn.disabled = true;
                    btn.style.cursor = 'wait';
                }
            } else {
                e.preventDefault();
                e.stopPropagation();
                
                // Focus first invalid field
                const firstInvalid = form.querySelector(':invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            
            form.classList.add('was-validated');
        });
    }
    
    // Enhanced input focus effects
    [email, password].forEach(function(input) {
        if (input) {
            const wrapper = input.closest('.form-input-wrapper');
            const group = input.closest('.form-group-modern');
            
            input.addEventListener('focus', function() {
                if (wrapper) wrapper.classList.add('focused');
                if (group) group.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                if (wrapper) wrapper.classList.remove('focused');
                if (group) group.classList.remove('focused');
                
                // Validate on blur
                if (this.checkValidity()) {
                    this.classList.add('valid');
                    this.classList.remove('invalid');
                } else {
                    this.classList.add('invalid');
                    this.classList.remove('valid');
                }
            });
            
            // Real-time validation
            input.addEventListener('input', function() {
                if (this.value.length > 0) {
                    if (this.checkValidity()) {
                        this.classList.remove('invalid');
                        this.classList.add('valid');
                    } else {
                        this.classList.remove('valid');
                        this.classList.add('invalid');
                    }
                }
            });
        }
    });
    
    // Auto-focus email on load
    if (email && !email.value) {
        setTimeout(function() {
            email.focus();
        }, 100);
    }
    
    // Enter key to submit
    [email, password].forEach(function(input) {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && form.checkValidity()) {
                    form.dispatchEvent(new Event('submit'));
                }
            });
        }
    });
})();
</script>
@endsection
