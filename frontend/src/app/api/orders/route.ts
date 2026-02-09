import { NextRequest, NextResponse } from 'next/server';

// Server-side: use internal Docker URL so Next.js container can reach Laravel
// IMPORTANT: Always use admin.protein.tn for backend API calls (not protein.tn)
// API_BACKEND_URL can be either the base URL (https://admin.protein.tn) or full API URL (https://admin.protein.tn/api)
const API_BACKEND_URL = process.env.API_BACKEND_URL?.replace(/\/$/, '');
let API_URL: string;

if (API_BACKEND_URL) {
  // Use API_BACKEND_URL if provided
  API_URL = API_BACKEND_URL.includes('/api') ? API_BACKEND_URL : `${API_BACKEND_URL}/api`;
} else {
  // Fallback: Always use admin.protein.tn (never protein.tn)
  // This ensures the backend API is always called correctly
  API_URL = 'https://admin.protein.tn/api';
}

// Debug: Log the API URL being used (only in development or if explicitly enabled)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_API === 'true') {
  console.log('[API Route] Environment check:', {
    API_BACKEND_URL: process.env.API_BACKEND_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    resolved_API_URL: API_URL,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token from Authorization header (sent from client)
    const authHeader = request.headers.get('Authorization');
    
    // Forward the request to the backend API
    // Ensure we're calling admin.protein.tn, not protein.tn
    const backendUrl = `${API_URL}/add_commande`;
    
    // Verify we're calling the correct backend
    if (!backendUrl.includes('admin.protein.tn')) {
      console.error('[API Route] ERROR: Backend URL does not point to admin.protein.tn!', backendUrl);
      return NextResponse.json(
        { error: 'Configuration error: Backend URL is incorrect' },
        { status: 500 }
      );
    }
    
    console.log('[API Route] Calling backend:', backendUrl);
    console.log('[API Route] Request body keys:', Object.keys(body));
    
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
