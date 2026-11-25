# Changjian Agriculture marketing website implementation

Version v0.4, 12 October 2026. This English implementation record supports the later Word report; it is not a completed coursework submission.

## Project purpose and current status

The supplied specification describes Guangzhou Changjian Agricultural Development Co Ltd and its fruit products. A company-sign photograph provides evidence of the organisation; supplied images show lychee, packaging, an orchard environment and pineapple. The exact current trading status, stock, prices, product-photo correspondence and official purchasing links remain to be confirmed. The website is a coursework prototype based on this real project. It is not presented as the company's authorised official website.

The working product is a Xianjinfeng lychee gift box, using the user's approved variety name. The primary audience is individuals choosing a gift for family or friends; household sharing is a secondary use. This describes intended use, not a measured demographic or an invented consumer segment. The intended action is to inspect the fruit and packaging, identify relevant questions and submit an enquiry to the course project team. No order, payment or merchant callback is promised.

## Research and design decisions

Research used supplied materials, public desk research and observation of online product descriptions. No interviews or questionnaires were conducted. The findings below suggest useful information topics; they do not establish how many consumers prefer a gift box or prove willingness to pay.

| Evidence | Interpretation for the audience | Implemented decision |
| --- | --- | --- |
| Fruit, flesh and packaging photographs | A prospective gift buyer needs to see what is being presented | Fruit chapter, three-photo gallery, enlargement and labelled packaging details |
| Yangcheng Evening News premium gift-box case, R01 | Gift positioning has an observable market example | Gift-focused copy and occasions; the other brand's price is never used as Changjian's price |
| Zengcheng variety and gift-presentation case, R02 | Product differences and gifting purpose should be explained together | Plain variety background beside poetic headings and gift-scenario guidance |
| Market-regulator freshness guidance, R03 | Delivery timing, supply and storage matter for perishable gifts | Seasonal note, shipping checklist and storage FAQ, with no unsupported delivery guarantee |
| JD descriptions foreground variety, weight, packaging and shipping, R04 | Practical purchase questions belong beside the presentation | Specification rows, four-step checklist and contextual enquiry drafts |
| Agricultural academy variety note, R05 | Explain the working variety from a primary source | General late-maturing background and a visible source link; no claim that a photograph proves variety identity |
| Supplied company sign and project specification | Visitors should understand which real project is being represented | Company name, sign photo and attributed project-material description |

The research log records source dates and limits. Market totals are context, not Changjian sales or a survey of gift buyers. Colour, typography and poetic language follow the user's chosen A visual direction, rather than a claimed research percentage.

## Content depth and hierarchy

The six chapters remain Brand, Lychee, Gift box, Company and orchard, Purchase guidance, and Enquiry. The homepage adds three compact entries explaining what visitors can learn. Chapter 02 combines variety background with seasonal supply, quantity and storage considerations. Chapter 03 labels outer box, inner box and detail photographs, and adds three occasion buttons. Each choice changes the explanation and the linked question draft. It suggests questions, rather than inventing different products or prices.

Chapter 04 combines the company sign with orchard and fruit photographs, then links the observable product, packaging and channel information. Chapter 05 has a four-step checklist and six expandable questions. Unconfirmed weight, price and delivery terms are expressed as matters to confirm. The final chapter explains what to include in an enquiry and what the course project team will receive.

The source list and practical notes replace empty areas with useful information. Shared containers, framed information bands, consistent heading spacing and aligned image/text pairs preserve the selected green Chinese-style design. Added content remains grouped inside its appropriate chapter.

## Navigation and responsive behaviour

`chapters.js` shows one existing section at a time, updates its heading focus, directory marker, counter and URL fragment, and handles browser history. Every chapter can be reached directly from the bottom directory. Contextual links connect the relevant product information to enquiry topics. Longer content scrolls inside the active chapter while the header and directory remain available. The site does not intercept wheel or touch gestures to force chapter changes.

`styles.css` uses Grid and Flexbox, shared colours and spacing, single-column layouts on narrow screens, readable inputs and a three-column/two-row chapter directory on small phones. Form controls and the full expanded content remain reachable by scrolling. Without JavaScript, all six sections become an ordinary readable long document with anchor navigation; submission is disabled.

The opening SVG, circular chapter reveal, local photographs, serif headings and red seal remain from the approved A design. Native `Element.animate()` performs the transition and cancels obsolete animations on rapid navigation. Primary chapter images are loaded eagerly to prevent empty transition frames. Reduced-motion users get immediate chapter changes and no automatic opening animation. Decorative artwork is hidden from assistive technology.

## Enquiry implementation

`script.js` begins by attaching validation and submission handlers. For a file preview it enables an unsaved demonstration. For HTTP it requests `/api/session`; an explicit 404 means a static preview, a valid backend response supplies a CSRF token, and an unavailable or malformed service keeps submission disabled with a retry control. The adjacent notice always describes the active mode.

The live form checks name, topic, phone/email format, message length and consent. The server checks them again, including direct requests that bypass the browser. A JSON `POST /api/enquiries` contains only the form fields and consent. It does not send browser storage, analytics or payment data. While saving, the fields are disabled to prevent repeated clicks. Success requires HTTP 201 and a valid reference; the button remains disabled until the user edits or resets the form. Error responses and connection failures preserve the entered values and show a clear message.

Source excerpt from `script.js`:

```javascript
const payload = { customer_name: customerName.value.trim(), topic: topic.value,
  contact_method: contactMethod.value, contact: contact.value.trim(),
  message: messageInput.value.trim(), consent: consent.checked };
```

In Flask, `app.py` validates the request and inserts the values using SQLite parameters. The connection's context manager commits before a reference is returned. Database errors produce HTTP 503 without a success identifier. Source excerpt from `app.py`:

```python
with sqlite3.connect(app.config["DATABASE"], timeout=5) as db:
    cursor = db.execute(
        "INSERT INTO enquiries (customer_name, topic, contact_method, contact, message, consent) VALUES (?, ?, ?, ?, ?, 1)",
        tuple(values[name] for name in ("customer_name", "topic", "contact_method", "contact", "message")),
    )
    record_id = cursor.lastrowid
```

The database records the identifier, UTC creation time, name, topic, contact method, contact value, message and consent. The admin page displays Beijing time. `CREATE TABLE IF NOT EXISTS` preserves existing records when the application restarts. No contact information is stored in localStorage or sessionStorage; sessionStorage contains only the opening-seen flag. The browser's signed, HttpOnly session cookie carries a CSRF token and, after login, an administrator flag.

## Administrator and runtime

`/admin` redirects unauthenticated visitors to a password login. `--setup` writes a Werkzeug password hash, rather than a plaintext password. Login, submissions and logout validate CSRF tokens. The administrator views newest-first records, with 50 records per page. Jinja automatically escapes submitted text; database queries use parameters. Responses containing admin or API content are marked `no-store`. Static routes serve only the entry page, named frontend files and the web-asset directory, keeping the database and secrets outside public routes.

Flask 3.1.3 handles routes, validation and sessions; Python's built-in sqlite3 handles persistence; Jinja renders the administrator page; Waitress 3.0.2 serves the application on Windows and the Ubuntu server. The frontend has no framework, downloaded template, CDN or animation package. Exact runtime dependencies are listed in `requirements-lock.txt`, with installation files in `vendor/wheels`. Project-specific content, layout, art, scene state, gallery, occasion selection, validation, API, schema and admin page were written for this project. Documentation informed the approach; the Flask tutorial's destructive reset schema was not reused.

`README.md` provides installation, password setup, startup, static-mode and data-location instructions. The normal local URL is http://127.0.0.1:5000/. The verified public URL is https://changjian.86.53.181.46.sslip.io/, deployed with the user's approval on 12 October 2026. An independent systemd service runs Waitress on `127.0.0.1:8051`; the server's existing Caddy supplies HTTPS with a valid certificate. The service uses a dedicated non-login account and keeps the SQLite database, password hash and stable session key in `/var/lib/changjian-agri`, separate from code releases. HTTPS cookies have Secure, HttpOnly and SameSite=Lax attributes. Configuration and verification details are in `online-deployment.md` and `deploy/`. Interviews remain an optional separate activity.

## Validation and coursework mapping

The implementation has 20 passing backend tests and a browser task check covering the six chapters, enquiries, error states, administrator access and 54 layout combinations. Captured desktop and phone-viewport screenshots are in `screenshots-full/`. These are genuine automated checks, not consumer interviews or physical-phone tests. Detailed results and package verification are recorded in `full-checks.md`.

After deployment, an independent public-browser check used Microsoft Edge 155.0.4283.45 with certificate verification enabled. It checked all six chapters at four viewports (24 combinations), navigation, images, validation, two real sample enquiries and authenticated viewing. After restarting only the application service, both records remained visible through the public administrator page with the original password. Eighteen public screenshots are in `screenshots-online/`; they show test data, not interviews or orders. Existing server websites still returned HTTP 200. A full-machine reboot and physical-phone test were not performed.

| Coursework item | Evidence now available | Still needed for final submission |
| --- | --- | --- |
| Project and audience 20 | Real supplied project, stated audience/action, source-to-design mapping | Confirm current trading/product status and write the final English Word report |
| Implementation explanation 10 | Actual frontend/backend source, snippets and attribution | Members explain their real work and supply their actual contribution record |
| Website operation 20 | Bundled runtime/source, local assets, installation and launch instructions | Final package and report must match the final version |
| Content and layout 20 | Six organised chapters with practical gift and purchase information | Confirm the actual specification, pricing and channel details where available |
| Navigation 10 | Directory, deep links, history, menu and contextual enquiry | Recheck future real purchasing links |
| Interaction 10 | Gallery, occasions, FAQs, validated saved enquiries, errors and admin viewing | Retest after further functional changes |
| Responsive display 10 | 54 browser viewport checks and current screenshots | Student checks on a real computer and physical phone |
| Backend bonus | SQLite persistence, validated API and authenticated viewing | Explain the working backend in the final Word report |
| Deployment bonus | Verified public HTTPS URL, independent service and persisted enquiries; see online-deployment.md | Include the complete live URL and accurate explanation in the final Word report |

No questionnaire, interview, member contribution, physical-device result or score has been invented. The public URL and deployment results above were observed in actual checks.
