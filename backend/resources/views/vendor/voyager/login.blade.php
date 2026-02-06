@extends('voyager::auth.master')

@section('pre_css')
@if(file_exists(public_path('css/app.css')))
<link rel="stylesheet" href="{{ asset('css/app.css') }}">
@endif
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
    body.login {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        background-attachment: fixed;
    }
    .login-sidebar {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .modern-login-container {
        padding: 3rem 2rem;
    }
    .login-logo {
        text-align: center;
        margin-bottom: 2rem;
    }
    .login-logo img {
        width: 80px;
        height: 80px;
        margin-bottom: 1rem;
    }
    .login-title {
        font-size: 1.875rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }
    .login-subtitle {
        color: #6b7280;
        font-size: 0.875rem;
    }
    .form-group-modern {
        margin-bottom: 1.5rem;
    }
    .form-label-modern {
        display: block;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5rem;
    }
    .form-input-modern {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        font-size: 1rem;
        transition: all 0.2s;
        background: #fff;
    }
    .form-input-modern:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .remember-me-modern {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }
    .remember-me-modern input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: #667eea;
    }
    .btn-login-modern {
        width: 100%;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    }
    .btn-login-modern:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
    }
    .btn-login-modern:active {
        transform: translateY(0);
    }
    .alert-modern {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        background: #fee2e2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }
    .input-icon {
        position: relative;
    }
    .input-icon input {
        padding-left: 2.5rem;
    }
    .input-icon::before {
        content: '';
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.25rem;
        height: 1.25rem;
        opacity: 0.5;
    }
    .fade-in {
        animation: fadeIn 0.5s ease-in;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
@endsection

@section('content')
<div class="modern-login-container fade-in">
    <div class="login-logo">
        <?php $admin_logo_img = Voyager::setting('admin.icon_image', ''); ?>
        @if($admin_logo_img == '')
            <img src="{{ voyager_asset('images/logo-icon-light.png') }}" alt="Logo" class="fade-in">
        @else
            <img src="{{ Voyager::image($admin_logo_img) }}" alt="Logo" class="fade-in">
        @endif
        <h1 class="login-title">{{ Voyager::setting('admin.title', 'SOBITAS') }}</h1>
        <p class="login-subtitle">{{ __('voyager::login.signin_below') }}</p>
    </div>

    <form action="{{ route('voyager.login') }}" method="POST" id="loginForm">
        {{ csrf_field() }}
        
        <div class="form-group-modern">
            <label for="email" class="form-label-modern">
                <i class="voyager-mail"></i> {{ __('voyager::generic.email') }}
            </label>
            <input 
                type="email" 
                name="email" 
                id="email" 
                value="{{ old('email') }}" 
                placeholder="{{ __('voyager::generic.email') }}" 
                class="form-input-modern" 
                required
                autofocus
            >
        </div>

        <div class="form-group-modern">
            <label for="password" class="form-label-modern">
                <i class="voyager-lock"></i> {{ __('voyager::generic.password') }}
            </label>
            <input 
                type="password" 
                name="password" 
                id="password" 
                placeholder="{{ __('voyager::generic.password') }}" 
                class="form-input-modern" 
                required
            >
        </div>

        <div class="remember-me-modern">
            <input type="checkbox" name="remember" id="remember" value="1">
            <label for="remember" style="cursor: pointer; color: #6b7280; font-size: 0.875rem;">
                {{ __('voyager::generic.remember_me') }}
            </label>
        </div>

        <button type="submit" class="btn-login-modern" id="loginButton">
            <span class="signingin hidden">
                <span class="voyager-refresh"></span> {{ __('voyager::login.loggingin') }}...
            </span>
            <span class="signin">{{ __('voyager::generic.login') }}</span>
        </button>
    </form>

    @if(!$errors->isEmpty())
        <div class="alert-modern fade-in">
            <ul style="list-style: none; padding: 0; margin: 0;">
                @foreach($errors->all() as $err)
                    <li style="margin-bottom: 0.25rem;">{{ $err }}</li>
                @endforeach
            </ul>
        </div>
    @endif
</div>
@endsection

@section('post_js')
<script>
    (function() {
        var btn = document.getElementById('loginButton');
        var form = document.getElementById('loginForm');
        var email = document.getElementById('email');
        var password = document.getElementById('password');
        
        if (form) {
            form.addEventListener('submit', function(ev) {
                if (form.checkValidity()) {
                    btn.querySelector('.signingin').classList.remove('hidden');
                    btn.querySelector('.signin').classList.add('hidden');
                    btn.disabled = true;
                } else {
                    ev.preventDefault();
                }
            });
        }
        
        // Add focus effects
        [email, password].forEach(function(input) {
            if (input) {
                input.addEventListener('focus', function() {
                    this.parentElement.classList.add('focused');
                });
                input.addEventListener('blur', function() {
                    this.parentElement.classList.remove('focused');
                });
            }
        });
        
        // Auto-focus email
        if (email) {
            email.focus();
        }
    })();
</script>
@endsection
