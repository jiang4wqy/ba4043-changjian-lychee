# Implementation resources and attribution

Access dates: 11–12 October 2026. This record should inform the later English Word report.

## Technology and reuse

The v0.4 frontend uses HTML, CSS, JavaScript and browser-native APIs, with no frontend framework, external JavaScript library, downloaded template or CDN. The live enquiry backend now uses Flask, Jinja, Werkzeug, SQLite and Waitress; the versions and sources are listed below. The website does not require Playwright or Pillow to run; those tools were used only to check the website and prepare image copies, respectively.

The already-reviewed `preview/intro.html` from this project supplied the original SVG branch/lychee artwork and opening-animation code. These were incorporated into `index.html`, `styles.css` and `script.js`, and adapted to work with the complete homepage, its navigation and reduced-motion preference.

## Animation reference

Manoela Ilic, Codrops, **How to Create and Animate Rotated Overlays**, 18 April 2019:

https://tympanus.net/codrops/2019/04/18/how-to-create-and-animate-rotated-overlays/

The tutorial was consulted for the idea of revealing existing content with moving masks. No Codrops source code, images, demo assets or third-party animation package is included. Our own gallery implementation uses four vertical clipped copies of the next local photograph, staggered native `Element.animate()` calls, a short duration, and cleanup after completion. It does not reproduce the tutorial's rotated fullscreen layout. Thumbnail buttons, accessible captions, current-image enlargement and a reduced-motion/immediate-change fallback were written for this website.

For the chapter version, **Fullscreen Scrolling Slideshow**, Manoela Ilic, Codrops, 17 August 2022, was also consulted:

https://tympanus.net/codrops/2022/08/17/fullscreen-scrolling-slideshow/

It informed the combination of a focused content view and a directory that can jump directly to another view. Our current implementation uses labelled chapter links, URL fragments and a fixed navigation bar, with normal scrolling inside longer chapters. It does not adopt the source demo's scroll-event control or GSAP Observer. Heading focus, history integration and responsive layout were written for this project. No source-demo code or imagery was copied.

For the selected A visual direction, **Fullscreen Clip Animation**, Manoela Ilic, Codrops, 14 March 2023, was consulted:

https://tympanus.net/codrops/2023/03/14/fullscreen-clip-animation/

The reference informed shape-based transitions and the connection between photographs and typography. Our A implementation uses a circular CSS `clip-path`, a local photo/character window, native `Element.animate()` and cancellation on rapid navigation. It was adapted from this project's A comparison sample and extended to six chapters, including longer content, form-state preservation, history and reduced motion. No Codrops code, GSAP dependency or external imagery is included.

`assets/web/leaf-line.svg` is original project line artwork adapted from the approved A sample. The pale-green palette, offset title, hero photo link, red seal, section frames and labelled chapter directory were implemented for the complete website. System fonts are used; no font file is downloaded at runtime.

## Browser documentation consulted

- MDN, **View Transition API**: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API — reviewed as a possible approach; the final MVP uses the simpler native element-animation approach rather than this API.
- MDN, **prefers-reduced-motion**: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion — informs the CSS preference query and JavaScript motion handling; no example code was copied.

Motion documentation was considered during initial research but the library was not adopted. There is no Motion or GSAP runtime dependency. Do not describe a researched resource as an installed library.

## Product information and photographs

- The supplied `长健农业_企业官网需求说明书_V1.0.docx` is project reference material. Its channel and company statements are attributed project claims, not independently verified consumer research.
- Guangdong Academy of Agricultural Sciences, **仙进奉荔枝（粤审果2011009）**, 6 August 2026: https://www.gdaas.cn/gdfruit/kycg/xpz/content/post_1122637.html — used for the general variety background, including late maturation and the stated fruit form. The working product name remains to be matched to actual stock.
- Market and information-design sources, their limits and design inferences are listed in `desk-research-2026-10-11.md`.
- Photographs were supplied by the user; they were not downloaded from other brands. Public use and exact product/location correspondence remain to be confirmed.

| Web file | Supplied original | Preparation |
| --- | --- | --- |
| `lychee-branch.jpg` | `22614.JPG` | Orientation, proportional resize, JPEG compression |
| `lychee-flesh.jpg` | `22615.JPG` | Same |
| `gift-box.jpg` | `22616.JPG` | Same |
| `gift-inside.jpg` | `4bc3797253f1903ffc36b0dc842c2c9b.jpg` | Same |
| `gift-detail.jpg` | `658a9d42be2195ee229c262beb022679.JPG` | Same |
| `orchard.jpg` | `IMG_4360.HEIC` | JPEG conversion, proportional resize, compression |
| `company.jpg` | `f8c18f398300f3deca7d621800651d.JPG` | Orientation, proportional resize, JPEG compression |
| `pineapple.jpg` | `22602.JPG` | Same |

Original files are preserved in the complete collaboration repository. The runnable MVP package contains the web derivatives. Photography is captioned as supplied material; no certification mark or unverified brand logo is presented as the company's credential.

## Backend framework and dependency attribution

Added in v0.4 on 12 October 2026. The project-specific API, field validation, SQLite table, parameterised insert, consent notice, password setup, admin listing and frontend/server mode handling were written for this project. The list records official implementation references and dependency homepages; listing a transitive dependency does not mean its tutorial was used. No complete Flask application template or destructive schema reset was copied.

- Flask 3.1.3: https://flask.palletsprojects.com/en/stable/ — routing, request handling and sessions.
- Flask SQLite tutorial: https://flask.palletsprojects.com/en/stable/tutorial/database/ — SQLite connection and transaction concepts, adapted to a single enquiry table preserved on restart.
- Flask installation: https://flask.palletsprojects.com/en/stable/installation/ — Python and virtual environment setup.
- Waitress 3.0.2: https://docs.pylonsproject.org/projects/waitress/en/stable/ and https://flask.palletsprojects.com/en/stable/deploying/waitress/ — WSGI serving, adapted to loopback binding and a 16 KiB request limit.
- Werkzeug 3.1.9: https://werkzeug.palletsprojects.com/en/stable/utils/#werkzeug.security.generate_password_hash — password hashing and checking.
- Jinja2 3.1.6: https://jinja.palletsprojects.com/en/stable/templates/#html-escaping — administrator page templating and automatic escaping.
- MarkupSafe 3.0.4: https://markupsafe.palletsprojects.com/en/stable/ — Jinja escaping dependency.
- itsdangerous 2.2.0: https://itsdangerous.palletsprojects.com/en/stable/ — Flask signed-session dependency.
- Click 8.1.8: https://click.palletsprojects.com/en/stable/ — Flask command dependency.
- Blinker 1.9.0: https://blinker.readthedocs.io/en/stable/ — Flask signal dependency.
- colorama 0.4.6: https://pypi.org/project/colorama/ — Windows Click dependency.
- importlib-metadata 8.7.1: https://importlib-metadata.readthedocs.io/en/latest/ and zipp 3.23.1: https://zipp.readthedocs.io/en/latest/ — Python 3.9 metadata dependencies.
- Python sqlite3: https://docs.python.org/3/library/sqlite3.html — built-in persistence, no extra database server or package.
- Browser Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API and AbortSignal timeout: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static — asynchronous submission, session connection and bounded waits.

Direct dependencies are in `requirements.txt`; verified runtime versions are pinned in `requirements-lock.txt`. Original wheel files retain upstream licence/metadata content. Runtime dependencies do not imply that their upstream authors wrote this site's content or custom features.

Validation used pytest 8.4.2 (https://docs.pytest.org/en/stable/) and Playwright with Microsoft Edge (https://playwright.dev/). These are development tools, not website runtime dependencies. Pillow prepared photo copies and a screenshot contact sheet; it is also not needed to run the website. The source ZIP contains only relevant web derivatives, not unverified certification artwork.

## Public deployment

Deployment completed with the user's explicit approval on 12 October 2026. The server's existing Caddy 2.11.4 and systemd 249 were reused; no deployment platform, container template or new proxy server was installed. Our project-specific service unit isolates this app, enables boot startup, uses loopback Waitress and keeps persistent data outside the release. The Caddy site configuration defines the approved hostname, compression, a 16 KiB request limit and the loopback proxy; a single import was added to the existing configuration. Original sites were preserved and checked.

- Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https — hostname-based certificate management and HTTP redirects.
- Caddy import: https://caddyserver.com/docs/caddyfile/directives/import — adding the separate site configuration.
- Caddy configuration validation: https://caddyserver.com/docs/command-line — validation before graceful reload.
- systemd execution options: https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml — application identity, private writable directory and service restrictions.
- sslip.io DNS project: https://github.com/cunnie/sslip.io — an IP-derived public hostname, without purchasing a domain.

See `online-deployment.md` for actual public verification and runtime-source correspondence. SSH tools were used only for installation and inspection; server credentials are not part of the application or source package.
