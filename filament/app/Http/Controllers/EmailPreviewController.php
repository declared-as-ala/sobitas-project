<?php

namespace App\Http\Controllers;

use App\Services\DefaultEmailTemplates;
use App\Services\MarketingService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EmailPreviewController extends Controller
{
    /**
     * Return the email template rendered as HTML for iframe preview.
     * Route: GET /email-campaign-preview?template=xxx&vars={...}
     * No escaping: returns raw HTML so the iframe renders it visually.
     */
    public function __invoke(Request $request): Response
    {
        $template = $request->get('template', '');
        $varsJson = $request->get('vars', '{}');

        if ($template === '' || !DefaultEmailTemplates::get($template)) {
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>Template invalide ou manquant.</p></body></html>';
            return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
        }

        $vars = is_string($varsJson) ? (json_decode($varsJson, true) ?? []) : [];
        $vars = is_array($vars) ? $vars : [];
        $vars = array_merge(DefaultEmailTemplates::getDefaultVariables($template), $vars);
        $vars['logo_url'] = config('marketing.preview_logo_url', 'https://admin.sobitas.tn/icon.png');
        $vars['unsubscribe_url'] = MarketingService::unsubscribeUrl('email', 'preview@example.com');

        $html = DefaultEmailTemplates::renderHtml($template, $vars);
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }
}
