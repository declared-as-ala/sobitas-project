<?php

namespace App\Filament\Pages;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use App\Rules\CurrentPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class Profile extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-user-circle';

    protected static string $view = 'filament.pages.profile';

    protected static ?string $navigationLabel = 'Profile';

    protected static ?string $title = 'My Profile';

    protected static ?int $navigationSort = 1000;

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'name' => auth()->user()->name,
            'email' => auth()->user()->email,
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Personal Information')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Name')
                            ->maxLength(255)
                            ->autocomplete('name'),

                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->autocomplete('email'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Change Password')
                    ->description('Leave blank to keep your current password')
                    ->schema([
                        Forms\Components\TextInput::make('current_password')
                            ->label('Current Password')
                            ->password()
                            ->required(fn ($get) => ! empty($get('new_password')))
                            ->revealable()
                            ->autocomplete('current-password')
                            ->rule(new CurrentPassword()),

                        Forms\Components\TextInput::make('new_password')
                            ->label('New Password')
                            ->password()
                            ->minLength(8)
                            ->rules([
                                Password::min(8)
                                    ->letters()
                                    ->mixedCase()
                                    ->numbers()
                                    ->symbols(),
                            ])
                            ->revealable()
                            ->autocomplete('new-password')
                            ->confirmed()
                            ->dehydrated(fn ($state) => filled($state)),

                        Forms\Components\TextInput::make('new_password_confirmation')
                            ->label('Confirm New Password')
                            ->password()
                            ->required(fn ($get) => ! empty($get('new_password')))
                            ->revealable()
                            ->autocomplete('new-password')
                            ->dehydrated(false),
                    ])
                    ->columns(2)
                    ->collapsible(),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        $user = auth()->user();

        // Validate current password if changing password
        if (! empty($data['new_password'])) {
            if (! Hash::check($data['current_password'], $user->password)) {
                Notification::make()
                    ->title('Current password is incorrect')
                    ->danger()
                    ->send();

                return;
            }

            $user->password = Hash::make($data['new_password']);
        }

        // Update name and email
        if (isset($data['name'])) {
            $user->name = $data['name'];
        }

        if (isset($data['email'])) {
            $user->email = $data['email'];
        }

        $user->save();

        // Clear password fields
        $this->form->fill([
            'name' => $user->name,
            'email' => $user->email,
            'current_password' => '',
            'new_password' => '',
            'new_password_confirmation' => '',
        ]);

        Notification::make()
            ->title('Profile updated successfully')
            ->success()
            ->send();
    }

    protected function getFormActions(): array
    {
        return [
            Forms\Components\Actions\Action::make('save')
                ->label('Save Changes')
                ->submit('save'),
        ];
    }
}
