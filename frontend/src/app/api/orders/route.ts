import { NextRequest, NextResponse } from 'next/server';

// Server-side: use internal Docker URL so Next.js container can reach Laravel
// API_BACKEND_URL can be either the base URL (https://admin.protein.tn) or full API URL (https://admin.protein.tn/api)
const API_BACKEND_URL = process.env.API_BACKEND_URL?.replace(/\/$/, '');
const API_URL = API_BACKEND_URL 
  ? (API_BACKEND_URL.includes('/api') ? API_BACKEND_URL : `${API_BACKEND_URL}/api`)
  : (process.env.NEXT_PUBLIC_API_URL || 'https://admin.protein.tn/api');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token from Authorization header (sent from client)
    const authHeader = request.headers.get('Authorization');
    
    // Forward the request to the backend API
    const backendUrl = `${API_URL}/add_commande`;
    console.log('[API Route] Calling backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
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
