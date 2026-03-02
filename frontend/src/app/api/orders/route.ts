import { NextRequest, NextResponse } from 'next/server';

// Commande backend – fetch from admin.protein.tn (override with NEXT_PUBLIC_API_URL or API_BACKEND_URL)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BACKEND_URL ?? 'https://admin.protein.tn/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token from Authorization header (sent from client)
    const authHeader = request.headers.get('Authorization');
    const idempotencyKey = request.headers.get('Idempotency-Key');
    
    // Forward the request to the backend API
    const backendUrl = `${API_URL}/add_commande`;
    
    console.log('[API Route] Calling backend:', backendUrl);
    console.log('[API Route] Request body keys:', Object.keys(body));
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
      },
      body: JSON.stringify(body),
      // Add timeout and signal for better error handling
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Try to parse JSON response, but handle non-JSON errors
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('[API Route] Non-JSON response:', text);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      console.error('[API Route] Backend error response:', data);
      return NextResponse.json(
        { error: data.message || data.error || 'Erreur lors de la création de la commande' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Fetch error:', error);
    console.error('[API Route] Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      name: error.name,
    });
    
    // Handle specific error types
    let errorMessage = 'Erreur lors de la création de la commande';
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      errorMessage = 'Timeout: Le serveur met trop de temps à répondre. Veuillez réessayer.';
    } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
