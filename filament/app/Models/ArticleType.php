<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArticleType extends Model
{
    protected $table = 'article_types';

    protected $fillable = [
        'name',
        'slug',
        'color',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'article_type_id');
    }
}
