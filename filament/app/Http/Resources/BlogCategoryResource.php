<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'seo' => [
                'title' => $this->seo_title ?: $this->name,
                'description' => $this->seo_description,
                'canonical_url' => $this->seo_canonical_url,
                'robots' => [
                    'index' => $this->seo_robots_index ?? true,
                    'follow' => $this->seo_robots_follow ?? true,
                ],
            ],
        ];
    }
}

