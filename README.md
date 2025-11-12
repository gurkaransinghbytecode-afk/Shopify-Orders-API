# RR Orders API (Mock Version)

This is a **mock version** of the RugRoyal Orders API so you can test locally before connecting to Shopify.

## Run locally
```bash
npm install -g vercel
vercel dev
```
Then visit:
- [http://localhost:3000/api/shopify/test/orders](http://localhost:3000/api/shopify/test/orders)
- [http://localhost:3000/api/shopify/prod/orders](http://localhost:3000/api/shopify/prod/orders)

### Test Auth
Use these credentials (hardcoded):
```
username: test_user
password: test_pass
```
or for prod:
```
username: prod_user
password: prod_pass
```
Example CURL:
```bash
curl -u test_user:test_pass http://localhost:3000/api/shopify/test/orders
```
