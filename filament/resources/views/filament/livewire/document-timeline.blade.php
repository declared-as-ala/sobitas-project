@php
    $chain = $chain ?? [];
@endphp
<div class="doc-timeline-livewire-root">
@if (!empty($chain))
    <div class="doc-timeline-wrap">
        <div class="doc-timeline-card">
            <div class="doc-timeline-title">Chaîne de documents</div>
            <div class="doc-timeline-track" role="list">
                @foreach ($chain as $node)
                <div class="doc-timeline-node {{ $node['isCurrent'] ? 'doc-timeline-node--current' : '' }}" role="listitem">
                    @if ($node['url'] ?? null)
                    <a href="{{ $node['url'] }}" class="doc-timeline-node-inner doc-timeline-node-inner--link">
                    @else
                    <div class="doc-timeline-node-inner">
                    @endif
                        <span class="doc-timeline-node-label">{{ $node['label'] }}</span>
                        @if ($node['number'] ?? null)
                            <span class="doc-timeline-node-number">{{ $node['number'] }}</span>
                        @elseif (!($node['url'] ?? null))
                            <span class="doc-timeline-node-empty">Non créé</span>
                        @endif
                        @if ($node['status'] ?? null)
                            <span class="doc-timeline-node-status doc-badge">{{ $node['status'] }}</span>
                        @endif
                        @if ($node['date'] ?? null)
                            <span class="doc-timeline-node-date">{{ $node['date'] }}</span>
                        @endif
                        @if ($node['total'] ?? null)
                            <span class="doc-timeline-node-total">{{ $node['total'] }}</span>
                        @endif
                        @if (!empty($node['createAction']['url']))
                            <span class="doc-timeline-node-action-wrap"><a href="{{ $node['createAction']['url'] }}" class="doc-btn doc-btn--sm doc-btn--primary">{{ $node['createAction']['label'] }}</a></span>
                        @endif
                    @if ($node['url'] ?? null)
                    </a>
                    @else
                    </div>
                    @endif
                    @if (!$loop->last && count($chain) > 1)
                    <div class="doc-timeline-arrow" aria-hidden="true">→</div>
                    @endif
                </div>
                @endforeach
            </div>
        </div>
    </div>
@endif
</div>
