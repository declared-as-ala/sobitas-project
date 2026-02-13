<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DetailsTicket;
use App\Models\Product;
use App\Models\Ticket;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class AdminTicketController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
    ) {}

    /**
     * Show ticket creation form.
     */
    public function showTicket()
    {
        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();

        return view('admin.ticket', ['edit' => $edit, 'produits' => $produits]);
    }

    /**
     * Store a new ticket.
     */
    public function storeTicket(Request $request)
    {
        $data = $this->extractFormData($request);
        $ticket = $this->invoiceService->storeTicket($data);

        return redirect()->route('admin.imprimer_ticket', ['id' => $ticket->id])->with([
            'message' => 'Ticket enregistré avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Update an existing ticket.
     */
    public function updateTicket(Request $request, int $id)
    {
        $data = $this->extractFormData($request);
        $ticket = $this->invoiceService->updateTicket($id, $data);

        return redirect()->route('admin.imprimer_ticket', ['id' => $ticket->id])->with([
            'message' => 'Ticket mis à jour avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Edit ticket form.
     */
    public function editTicket(int $id)
    {
        $ticket = Ticket::findOrFail($id);
        $detailsTicket = DetailsTicket::where('ticket_id', $id)->get();
        $produits = Product::all();

        return view('admin.ticket', [
            'ticket' => $ticket,
            'edit_length' => $detailsTicket->count(),
            'details_ticket' => $detailsTicket,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Print ticket view.
     */
    public function imprimerTicket(int $id)
    {
        $ticket = Ticket::findOrFail($id);
        $detailsTicket = DetailsTicket::where('ticket_id', $id)->get();
        $produits = Product::all();

        return view('admin.imprimer_ticket', [
            'ticket' => $ticket,
            'edit_length' => $detailsTicket->count(),
            'details_ticket' => $detailsTicket,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Extract product data from the legacy form format.
     */
    private function extractFormData(Request $request): array
    {
        $data = $request->all();
        $products = [];

        $nbAchat = (int) ($request->nb_achat ?? 0);
        $nbDelete = (int) ($request->nb_delete ?? 0);

        for ($i = 1; $i <= $nbAchat + $nbDelete; $i++) {
            $produitId = $request->input('produit_id_' . $i);
            $qte = $request->input('qte' . $i);

            if ($produitId && $qte) {
                $products[] = [
                    'produit_id' => $produitId,
                    'qte' => $qte,
                    'prix_unitaire' => $request->input('prix_unitaire' . $i),
                ];
            }
        }

        $data['products'] = $products;

        return $data;
    }
}
