<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingTemplate extends Model
{
    protected $fillable = [
        'type',
        'name',
        'subject',
        'content_text',
        'content_html',
        'variables_schema',
        'is_active',
    ];

    protected $casts = [
        'variables_schema' => 'array',
        'is_active' => 'boolean',
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(MarketingLog::class, 'template_id');
    }

    public function isSms(): bool
    {
        return $this->type === 'sms';
    }

    public function isEmail(): bool
    {
        return $this->type === 'email';
    }

    public function getDefaultVariables(): array
    {
        $schema = $this->variables_schema ?? [];
        $out = [];
        foreach ($schema as $var) {
            $key = is_array($var) ? ($var['name'] ?? $var['key'] ?? '') : $var;
            $default = is_array($var) ? ($var['default'] ?? '') : '';
            if ($key) {
                $out[$key] = $default;
            }
        }
        return $out;
    }

    public function renderContent(array $variables = []): string
    {
        $text = $this->isSms() ? $this->content_text : $this->content_html;
        if (empty($text)) {
            return '';
        }
        foreach (array_merge($this->getDefaultVariables(), $variables) as $key => $value) {
            $text = str_replace('{{' . $key . '}}', (string) $value, $text);
        }
        return $text;
    }

    public function renderSubject(array $variables = []): string
    {
        $subject = $this->subject ?? '';
        foreach (array_merge($this->getDefaultVariables(), $variables) as $key => $value) {
            $subject = str_replace('{{' . $key . '}}', (string) $value, $subject);
        }
        return $subject;
    }
}
