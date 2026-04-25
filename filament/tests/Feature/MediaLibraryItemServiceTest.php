<?php

namespace Tests\Feature;

use App\Models\MediaLibraryItem;
use App\Services\Media\MediaLibraryItemService;
use App\Services\Media\MediaManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaLibraryItemServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): MediaLibraryItemService
    {
        return app(MediaLibraryItemService::class);
    }

    public function test_ensure_from_disk_creates_row_with_technical_fields(): void
    {
        Storage::fake('public');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        Storage::disk('public')->put('folder/test.png', $png);

        $item = $this->service()->ensureFromDisk('public', 'folder/test.png');

        $this->assertDatabaseHas('media_library_items', [
            'disk' => 'public',
            'path' => 'folder/test.png',
        ]);
        $this->assertNotNull($item->size);
        $this->assertSame('folder/test.png', $item->path);
        $this->assertNotEmpty($item->title);
    }

    public function test_update_metadata_persists_editorial_fields(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('a.jpg', 'not-a-real-jpeg');

        $this->service()->ensureFromDisk('public', 'a.jpg');
        $this->service()->updateMetadata('public', 'a.jpg', [
            'alt_text' => 'Alt example',
            'title' => 'Title example',
            'caption' => 'Cap',
            'description' => 'Desc',
            'meta_title' => 'Meta T',
            'meta_description' => 'Meta D',
        ]);

        $row = MediaLibraryItem::where('path', 'a.jpg')->first();
        $this->assertSame('Alt example', $row->alt_text);
        $this->assertSame('Title example', $row->title);
        $this->assertSame('Meta T', $row->meta_title);
    }

    public function test_move_path_updates_row_after_file_rename(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('old/name.jpg', 'x');
        $this->service()->ensureFromDisk('public', 'old/name.jpg');

        $this->service()->movePath('public', 'old/name.jpg', 'new/name.jpg');

        $this->assertNull(MediaLibraryItem::where('path', 'old/name.jpg')->first());
        $this->assertNotNull(MediaLibraryItem::where('path', 'new/name.jpg')->first());
    }

    public function test_move_path_updates_descendants_after_folder_rename(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('dir/sub/f.jpg', 'x');
        $this->service()->ensureFromDisk('public', 'dir/sub/f.jpg');

        $this->service()->movePath('public', 'dir', 'renamed');

        $this->assertNull(MediaLibraryItem::where('path', 'dir/sub/f.jpg')->first());
        $this->assertNotNull(MediaLibraryItem::where('path', 'renamed/sub/f.jpg')->first());
    }

    public function test_delete_by_path_removes_row(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('z.png', 'x');
        $this->service()->ensureFromDisk('public', 'z.png');

        $this->service()->deleteByPath('public', 'z.png');

        $this->assertNull(MediaLibraryItem::where('path', 'z.png')->first());
    }

    public function test_normalize_storage_path_delegates_to_media_manager(): void
    {
        $mm = app(MediaManagerService::class);
        $svc = $this->service();

        $this->assertSame($mm->normalizePath('a//b/c'), $svc->normalizeStoragePath('a//b/c'));
    }
}
