<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Étiquette Aramex indisponible</title>
</head>
<body style="margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f9fafb; font-family: ui-sans-serif, system-ui, sans-serif;">
    <div style="max-width:420px; text-align:center; padding:32px;">
        <div style="width:56px; height:56px; margin:0 auto 16px; border-radius:14px; background:#fef3c7; display:flex; align-items:center; justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#b45309" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        </div>
        <div style="font-size:15px; font-weight:600; color:#111827; margin-bottom:8px;">Étiquette Aramex indisponible</div>
        <div style="font-size:13px; color:#6b7280; line-height:1.5;">{{ $message }}</div>
        @if($hawb)
            <div style="margin-top:16px; font-family:ui-monospace,monospace; font-size:12px; color:#9ca3af;">HAWB : {{ $hawb }}</div>
        @endif
    </div>
</body>
</html>
