Cardswap Partner Addon

Configuration (choose env vars or config.yml):
- Env vars:
  - `CARDSWAP_DOMAIN` (e.g. `sandbox.card2k.com`)
  - `CARDSWAP_DOMAIN_POST` (e.g. `sandbox.card2k.com` if same host)
  - `CARDSWAP_PARTNER_ID`
  - `CARDSWAP_PARTNER_KEY`
  - `CARDSWAP_WITHDRAW_API_KEY`

- config.yml (alternative):
  ```yaml
  APIs:
    CardSwap:
      Domain: your-domain.com
      DomainPost: your-domain.com
      PartnerId: "..."
      PartnerKey: "..."
      WithdrawApiKey: "..."
  ```

Commands (slash):
- `/cardswap charge telco code serial amount [request_id]`
- `/cardswap check request_id [telco] [code] [serial] [amount]`
- `/cardswap fee`
- `/cardswap buycard service_code value qty [request_id]`
- `/cardswap balance`
- `/cardswap stock service_code value qty`
- `/cardswap products`
- `/cardswap transfers [limit]`
- `/cardswap withdraw_create bank_code account_number account_owner amount`
- `/cardswap banks`
- `/cardswap withdraw_status order_id`
- `/cardswap checkapi`

Notes:
- Signatures for buycard/balance/stock/withdraw_status are implemented per common patterns:
  - charge/check: `md5(partner_key + code + serial)`
  - buycard: `md5(partner_key + request_id + service_code + value + qty)`
  - balance: `md5(partner_key + 'getbalance')`
  - stock: `md5(partner_key + service_code + value + qty)`
  - withdraw_status: `md5(partner_key + order_id)`
- If your provider uses different signature formulas, update the code accordingly or tell the assistant to adjust.

