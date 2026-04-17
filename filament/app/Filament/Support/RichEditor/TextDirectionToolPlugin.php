<?php

namespace App\Filament\Support\RichEditor;

use Filament\Forms\Components\RichEditor\Plugins\Contracts\RichContentPlugin;
use Filament\Forms\Components\RichEditor\RichEditorTool;
use Filament\Support\Icons\Heroicon;

/**
 * Toolbar tools that flip the blog article `content_text_direction` state (auto | ltr | rtl)
 * directly from the RichEditor toolbar. No TipTap extensions — only Livewire state writes.
 */
final class TextDirectionToolPlugin implements RichContentPlugin
{
    public const TOOL_LTR = 'articleDirLtr';

    public const TOOL_RTL = 'articleDirRtl';

    public const TOOL_AUTO = 'articleDirAuto';

    /** Livewire path of the article form field updated by each tool. */
    public const STATE_PATH = 'data.content_text_direction';

    public static function make(): self
    {
        return new self();
    }

    public function getTipTapPhpExtensions(): array
    {
        return [];
    }

    public function getTipTapJsExtensions(): array
    {
        return [];
    }

    public function getEditorTools(): array
    {
        $statePath = self::STATE_PATH;

        return [
            RichEditorTool::make(self::TOOL_LTR)
                ->label('Sens du texte : gauche à droite (LTR)')
                ->icon(Heroicon::OutlinedBars3BottomLeft)
                ->activeStyling(false)
                ->jsHandler(sprintf(
                    "\$wire.\$set('%s', 'ltr'); if (\$refs.editor) { \$refs.editor.setAttribute('dir', 'ltr'); }",
                    $statePath,
                )),

            RichEditorTool::make(self::TOOL_RTL)
                ->label('Sens du texte : droite à gauche (RTL)')
                ->icon(Heroicon::OutlinedBars3BottomRight)
                ->activeStyling(false)
                ->jsHandler(sprintf(
                    "\$wire.\$set('%s', 'rtl'); if (\$refs.editor) { \$refs.editor.setAttribute('dir', 'rtl'); }",
                    $statePath,
                )),

            RichEditorTool::make(self::TOOL_AUTO)
                ->label('Sens du texte : automatique')
                ->icon(Heroicon::OutlinedLanguage)
                ->activeStyling(false)
                ->jsHandler(sprintf(
                    "\$wire.\$set('%s', 'auto'); if (\$refs.editor) { \$refs.editor.removeAttribute('dir'); }",
                    $statePath,
                )),
        ];
    }

    public function getEditorActions(): array
    {
        return [];
    }
}
