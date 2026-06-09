@php
    $details = $commande->details->isNotEmpty()
        ? $commande->details
        : $commande->details()->with('product:id,designation_fr,designation_ar')->get();
    $orderUrl = $commande->order_token
        ? config('app.frontend_url', config('app.url')).'/order-confirmation/'.$commande->id.'?token='.urlencode($commande->order_token)
        : config('app.frontend_url', config('app.url')).'/order-confirmation/'.$commande->id;
    $name = trim($commande->livraison_prenom ?? $commande->prenom ?? $commande->livraison_nom ?? $commande->nom ?? '');
    $address = collect([
        $commande->livraison_adresse1 ?? $commande->adresse1 ?? null,
        $commande->livraison_ville ?? $commande->ville ?? null,
        $commande->livraison_region ?? $commande->region ?? null,
        $commande->livraison_code_postale ?? $commande->code_postale ?? null,
    ])->filter()->implode('، ');
@endphp
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم تأكيد طلبك رقم #{{ $commande->numero }}</title>
</head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#dc2626;color:#fff;padding:32px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:26px;">شكرا {{ $name ?: 'لك' }}</h1>
            <p style="margin:0;">تم تأكيد طلبك وهو الآن قيد المعالجة.</p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
            <h2 style="margin:0 0 8px;font-size:18px;">الطلب رقم #{{ $commande->numero }}</h2>
            <p style="margin:0 0 20px;color:#64748b;">{{ optional($commande->created_at)->locale('ar')->translatedFormat('d F Y H:i') }}</p>
            <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;">
                <thead><tr style="background:#f8fafc;"><th align="right">المنتج</th><th>الكمية</th><th align="left">المجموع</th></tr></thead>
                <tbody>
                @foreach($details as $detail)
                    <tr style="border-top:1px solid #e2e8f0;">
                        <td>{{ $detail->product->designation_ar ?? $detail->product->designation_fr ?? 'منتج' }}</td>
                        <td align="center">{{ $detail->qte }}</td>
                        <td align="left">{{ number_format($detail->qte * $detail->prix_unitaire, 3, '.', ' ') }} د.ت</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
            <p style="font-size:18px;font-weight:bold;">المبلغ الإجمالي: {{ number_format((float) $commande->prix_ttc, 3, '.', ' ') }} د.ت</p>
            @if($address)<p><strong>عنوان التوصيل:</strong> {{ $address }}</p>@endif
            <p style="margin:24px 0 0;text-align:center;">
                <a href="{{ $orderUrl }}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;">متابعة الطلب</a>
            </p>
        </td></tr>
        <tr><td style="background:#0f172a;color:#cbd5e1;padding:20px;text-align:center;">شكرا لثقتك في SOBITAS</td></tr>
    </table>
</td></tr>
</table>
</body>
</html>
