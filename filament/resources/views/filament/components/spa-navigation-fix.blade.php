{{--
    Global fix for Filament/Livewire SPA: re-run init and clean overlays after every navigation.
    Enable debug: in browser console run window.FILAMENT_SPA_DEBUG = true then navigate.
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

    function removeOrphanedOverlays() {
        var removed = 0;
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
     * Force Filament's Alpine-based select (TomSelect) components to reinitialize.
     * After SPA navigation, Alpine components in the new DOM may have stale state.
     * We find all select wrappers and dispatch an Alpine init cycle.
     */
    function reinitFilamentSelects() {
        try {
            document.querySelectorAll('[wire\\:id]').forEach(function (component) {
                if (typeof component.__livewire !== 'undefined') {
                    log('Livewire component found, state should be fresh');
                }
            });

            document.querySelectorAll('.fi-fo-select').forEach(function (selectEl) {
                var alpineEl = selectEl.querySelector('[x-data]');
                if (alpineEl && typeof alpineEl._x_dataStack !== 'undefined') {
                    log('Select Alpine component found, already initialized');
                }
            });
        } catch (e) {
            log('reinitFilamentSelects error', e);
        }
    }

    function reinitAfterNavigate() {
        removeOrphanedOverlays();
        reinitFilamentSelects();

        if (typeof window.filamentReinit === 'function') {
            try { window.filamentReinit(); } catch (e) { log('filamentReinit error', e); }
        }
        if (typeof window.dvFormReinit === 'function') {
            try { window.dvFormReinit(); } catch (e) { log('dvFormReinit error', e); }
        }
        if (typeof window.blFormReinit === 'function') {
            try { window.blFormReinit(); } catch (e) { log('blFormReinit error', e); }
        }
        if (typeof window.ftvaFormReinit === 'function') {
            try { window.ftvaFormReinit(); } catch (e) { log('ftvaFormReinit error', e); }
        }
        if (typeof window.ticketPosReinit === 'function') {
            try { window.ticketPosReinit(); } catch (e) { log('ticketPosReinit error', e); }
        }
    }

    function onNavigated() {
        log('livewire:navigated');
        reinitAfterNavigate();
    }

    document.addEventListener('livewire:navigated', onNavigated);

    /**
     * Open URL in new tab without Livewire/SPA intercepting.
     */
    function registerOpenUrlNewTabListener() {
        if (typeof window.Livewire === 'undefined' || window.__filamentOpenUrlNewTabHooked) return;
        window.__filamentOpenUrlNewTabHooked = true;
        window.Livewire.on('open-url-new-tab', function (payload) {
            var url = (payload && payload.url) ? payload.url : (payload && payload.detail && payload.detail.url) ? payload.detail.url : null;
            if (url) window.open(url, '_blank', 'noopener');
        });
    }
    document.addEventListener('livewire:init', registerOpenUrlNewTabListener);
    if (typeof window.Livewire !== 'undefined') {
        registerOpenUrlNewTabListener();
    }
})();
</script>
