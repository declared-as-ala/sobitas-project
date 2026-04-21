<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class BlogCategory extends Model
{
    protected $table = 'blog_categories';

    protected $fillable = [
        'name',
        'slug',
        'seo_title',
        'seo_description',
        'seo_canonical_url',
        'seo_robots_index',
        'seo_robots_follow',
    ];

    protected $casts = [
        'seo_robots_index' => 'boolean',
        'seo_robots_follow' => 'boolean',
    ];

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_blog_category')
            ->withTimestamps();
    }
}

