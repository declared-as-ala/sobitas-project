<?php

return [
    // The order confirmation already covers creation. Paid status SMS are
    // reserved for milestones that change what the customer needs to know.
    'sms_order_statuses' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('SMS_ORDER_STATUSES', 'en_cours_de_livraison,livree'))
    ))),
];
