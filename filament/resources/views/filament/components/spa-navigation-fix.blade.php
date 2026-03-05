{{--
    Global fix for Filament/Livewire SPA: re-run init and clean overlays after every navigation.
    Enable debug: in browser console run window.FILAMENT_SPA_DEBUG = true then navigate; you'll see [Filament SPA] logs.
--}}
<script>
(function () {
    'use strict';
    var DEBUG = typeof window !== 'undefined' && window.FILAMENT_SPA_DEBUG === true;

    function log() {
        if (DEBUG && window.console && window.console.log) {
            window.console.log.apply(window.console, ['[Filament SPA]'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    /**
     * Remove leftover modal backdrops/overlays that can block clicks after SPA navigation.
     * Filament and Livewire render modals in the body; when content is replaced via wire:navigate,
     * orphaned backdrop divs may remain and intercept clicks.
     */
    function removeOrphanedOverlays() {
        var removed = 0;
        // Only remove elements that are clearly backdrops (class contains backdrop/overlay and fixed full-screen)
        var selectors = [
            '[class*="backdrop"]',
            '[class*="modal-backdrop"]',
            '[class*="overlay"]'
        ];
        selectors.forEach(function (sel) {
            try {
                document.querySelectorAll(sel).forEach(function (el) {
                    if (!el.parentNode) return;
                    if (el.closest && el.closest('.fi-modal')) return;
                    var style = window.getComputedStyle(el);
                    if (style.position !== 'fixed') return;
                    var rect = el.getBoundingClientRect();
                    var coversScreen = rect.width >= document.documentElement.clientWidth - 20 && rect.height >= document.documentElement.clientHeight - 20;
                    if (coversScreen) {
                        el.parentNode.removeChild(el);
                        removed++;
                    }
                });
            } catch (e) { /* ignore */ }
        });
        if (removed) log('Removed ' + removed + ' orphaned overlay(s)');
    }

    /**
     * Re-initialize anything that must run after each SPA navigation.
     * - NProgress is handled by Livewire's wire:navigate; no need to re-init.
     * - Alpine components are re-bound when new HTML is injected.
     * - This runs any custom init you add here (e.g. re-attach third-party libs).
     */
    function reinitAfterNavigate() {
        removeOrphanedOverlays();
        // Future: call any custom re-init (e.g. window.filamentReinit && window.filamentReinit());
        if (typeof window.filamentReinit === 'function') {
            try { window.filamentReinit(); } catch (e) { log('filamentReinit error', e); }
        }
    }

    function onNavigated() {
        log('livewire:navigated');
        reinitAfterNavigate();
    }

    function onInitialized() {
        log('livewire:initialized');
        reinitAfterNavigate();
    }

    // Run after every Livewire SPA navigation
    document.addEventListener('livewire:navigated', onNavigated);
    // Run when Livewire is ready (first load)
    document.addEventListener('livewire:initialized', onInitialized);
    // Fallback: run once on DOMContentLoaded in case livewire:initialized fires before this script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onInitialized);
    } else {
        onInitialized();
    }

    /**
     * Open URL in new tab without Livewire/SPA intercepting (avoids "Component not found" when
     * downloading PDF or opening print view). Listen for dispatch('open-url-new-tab', url: ...).
     */
    document.addEventListener('livewire:initialized', function () {
        if (typeof window.Livewire === 'undefined') return;
        window.Livewire.on('open-url-new-tab', function (payload) {
            var url = (payload && payload.url) ? payload.url : (payload && payload.detail && payload.detail.url) ? payload.detail.url : null;
            if (url) window.open(url, '_blank', 'noopener');
        });
    });
})();
</script>
