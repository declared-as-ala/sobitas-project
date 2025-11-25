<?php

namespace App\Http\Controllers;

use TCG\Voyager\Http\Controllers\VoyagerMediaController as BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomVoyagerMediaController extends BaseController
{
    public function upload(Request $request)
    {
        if ($request->hasFile('file')) {
            $file = $request->file('file');

            // Create folder structure: uploads/YYYY/MM
            $folder = 'uploads/' . date('Y') . '/' . date('m');

            // Rename file with timestamp
            $filename = time() . '_' . $file->getClientOriginalName();

            // Store file in Voyager's disk
            $path = $file->storeAs($folder, $filename, config('voyager.storage.disk'));

            return response()->json([
                'success' => true,
                'path'    => $path,
                'image'   => Storage::disk(config('voyager.storage.disk'))->url($path),
            ]);
        }

        // Fallback to Voyager default if no file
        return parent::upload($request);
    }
}
