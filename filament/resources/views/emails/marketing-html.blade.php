<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subjectLine ?? 'Message' }}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
{!! $htmlBody !!}
@if(!empty($unsubscribeUrl))
<div style="max-width:600px;margin:0 auto;text-align:center;font-size:11px;color:#888;padding:12px;">
    <a href="{{ $unsubscribeUrl }}" style="color:#888;">Se désinscrire</a>
</div>
@endif
</body>
</html>
