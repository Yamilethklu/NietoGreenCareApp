# Accountless review demonstration

From the access selection or sign-in screen, select **Probar demostración · sin cuenta**.
The visible DEMO banner remains throughout the visit. Exit with **Salir de demostración**.
No account, password, privileged role, or production database entry is created.
Every demo visit starts with fresh fictitious records and discards edits on exit.

The demonstration reuses the agenda, house history, invoice, order editor, calendar,
request form, house form, payment form and worker assignment components. Invoice API
operations are scoped to the demo React subtree. Unsupported operations throw instead
of falling back to the live API. Demo workers do not receive login credentials.

## Review notes (English)

An accountless demonstration is available on the initial access selection screen and
sign-in screen: tap “Probar demostración · sin cuenta”. A DEMO banner identifies this
mode. It contains fictitious customers, jobs and workers. Reviewers can edit jobs,
record simulated payments, create grouped invoices, export a clearly marked sample
PDF, create a request or house and assign demo workers. Select “Ver como trabajador
demo” to inspect the worker agenda. Exit using “Salir de demostración”; sample data
resets when demo mode is reopened. The demonstration never grants access to real
customer information or changes production records.

Limitations are explicit: website synchronization, notifications, employee credentials,
site editing and real server PDF generation require the authenticated production
service. The sample PDF is marked DEMO and does not represent the production invoice
template. Apple may require a review account or further access for those features;
this demo is not a guarantee of approval. Keep it available throughout review and
explain its scope in App Review notes, rather than hiding functionality from reviewers.

## Verification

- `npm run typecheck`
- `node --test tests/demo-store.test.cjs`
- `npx expo export --platform ios`
- On iPhone: enter demo without Google; edit a price and note, complete a job,
  group the completed unpaid dates under Historial, preview/share the sample PDF,
  pay/delete an invoice and verify released orders.
- Create a house/request, select its date, assign a worker and check worker view.
- Exit/re-enter: edits disappear. Sign in normally: production access remains unchanged.

An OTA publication does not establish that the binary selected in App Store Connect
contains this feature. Verify on that exact review installation; if it does not receive
the update, upload an updated build to the **same app listing**. Do not create a second app.
No keys, app version, runtime version, bundle identifier or native dependency changed.
