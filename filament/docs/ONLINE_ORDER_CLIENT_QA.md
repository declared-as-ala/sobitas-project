# Online order → client find-or-create — QA scenarios

When a customer places an online order (commande en ligne), a client is automatically found (by phone) or created from delivery data, and the order is linked via `user_id` and `client_id`.

## QA scenarios

1. **New phone → client created + order linked**  
   - Place an order with a phone number that does not exist in `clients`.  
   - Expect: A new client is created with name, phone, address, region/ville from delivery data, `source = "online"`.  
   - Expect: The new commande has `user_id` and `client_id` set to that client.

2. **Same phone again → client reused + order linked**  
   - Place another order with the same phone (same or different name/address).  
   - Expect: No new client; the same client record is used.  
   - Expect: The new commande has `user_id` and `client_id` set to that client.

3. **Existing client missing address → gets filled from delivery data**  
   - Have a client with phone set but empty name or empty adresse (or region/ville).  
   - Place an order with that phone and with nom, adresse, region, ville in delivery.  
   - Expect: The existing client is found; empty fields (name, adresse, region, ville, email) are updated from delivery data.  
   - Expect: Order is linked to that client.

4. **No phone in request → no client created, order not linked**  
   - Place an order with no phone (and no `user_id`).  
   - Expect: No client is created; `user_id` and `client_id` remain null.

## Endpoints

- **Filament API:** `POST /api/add_commande` (Filament app)
- **Backend API:** `POST /api/add_commande` (Backend app)

Both use the same logic via `ClientService::findOrCreateClientFromDeliveryInfo($deliveryData)`.

## Helper

- `findOrCreateClientFromDeliveryInfo(array $deliveryData): ?Client`  
  Uses phone (livraison_phone or phone) as primary key; normalizes phone (trim, digits, +216); finds client by normalized phone; if found, updates empty name/adresse/region/ville/email; if not found, creates client with `source = "online"`. Returns the client or null if no phone.
