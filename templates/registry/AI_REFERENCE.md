# IncogniAI Template Registry — AI Reference

You have access to **100+ premium animated templates** (Framer Motion + Tailwind). Use `[[scaffold:ID:Title]]` to auto-build a complete website in the sandbox without writing any code.

## How to Use

### Option 1: Auto-scaffold (easiest — 1 line)
When the user asks you to build a website, just emit:
```
[[scaffold:page-landing-saas:My SaaS Site]]
```
The system will automatically:
1. Scaffold a complete Vite + React project from the template
2. Install dependencies (framer-motion, lucide-react, tailwindcss)
3. Start the dev server
4. Show the live preview

You don't need to write any code — just pick the right template and customize with a brief description.

### Option 2: Manual scaffold with customization
For custom content, just describe what you want:
```
[[scaffold:page-landing-saas:My App]]
The title should be "Build Great Products", features should be [Analytics, Security, Speed, Collaboration, API, Support], pricing should have 3 tiers starting at $19/mo.
```
The scaffold will use defaults — you can then customize via follow-up edits.

### Option 3: Mixing components
You can also scaffold individual sections:
```
[[scaffold:page-landing-startup:Startup]]
But swap the hero to hero-gradient with more dramatic colors and make the team section show 6 members.
```

## Template Catalog

### Layout & Containers (10)
| ID | What it does |
|---|---|
| `animate-container` | Wraps children with entrance animation (up/down/left/right/scale) on scroll |
| `animate-section` | Full-width section with scroll-triggered reveal |
| `animate-grid` | CSS grid with staggered child entrance animations |
| `animate-stack` | Flex column with staggered child entrances |
| `page-transition` | Page-level fade+slide transition wrapper |
| `parallax-container` | Parallax scrolling wrapper (configurable speed 0-1) |
| `animate-modal` | Modal with backdrop blur and scale entrance |
| `animate-drawer` | Slide-in drawer from left or right |
| `ui-stickyheader` | Header that hides/shows on scroll direction |
| `ui-sidebar` | Collapsible sidebar with smooth width animation |

### Navigation (9)
| ID | What it does |
|---|---|
| `nav-navbar` | Animated navbar with scroll effects, mobile hamburger drawer |
| `nav-mobile` | Full-screen mobile navigation with staggered menu items |
| `nav-breadcrumbs` | Animated breadcrumbs with separator icons |
| `nav-tabs` | Tab switcher with smooth animated underline indicator |
| `nav-megamenu` | Full-width dropdown mega menu with columns |
| `nav-sidenav` | Vertical side navigation with active state |
| `ui-pagination` | Page navigation with ellipsis |
| `ui-stepper` | Step progress wizard with connecting lines |
| `ui-treeview` | Collapsible tree/nested list |

### Hero Sections (4)
| ID | What it does |
|---|---|
| `hero-basic` | Simple hero: fade/slide entrance for headline + subtitle + CTAs |
| `hero-split` | Split layout: text left, parallax image right (reversible) |
| `hero-gradient` | Animated gradient background + floating decorative shapes |
| `hero-typewriter` | Typewriter effect cycling through word array |

### Cards & Surfaces (12)
| ID | What it does |
|---|---|
| `card-basic` | Standard hover-lift card (translateY + shadow) |
| `card-glass` | Glassmorphism card with backdrop-blur |
| `card-gradient` | Card with animated gradient border |
| `card-image` | Image card with zoom on hover + overlay text |
| `card-flip` | 3D card flip on hover (front/back) |
| `card-expand` | Expandable card with smooth height animation |
| `card-pricing` | Pricing card with feature list and "Popular" badge |
| `card-testimonial` | Testimonial card with avatar, stars, quote |
| `card-blog` | Blog post card with image, category, date, author |
| `card-product` | E-commerce card with badge, zoom, slide-up CTA |
| `card-horizontal` | Horizontal card with image left, content right |
| `card-profile` | Profile card with cover photo, avatar, social |

### Forms & Inputs (8)
| ID | What it does |
|---|---|
| `form-input` | Animated input with floating label |
| `form-textarea` | Animated textarea with floating label + char count |
| `form-select` | Custom select with animated dropdown |
| `form-checkbox` | Animated checkbox with SVG checkmark draw |
| `form-radio` | Animated radio group with ripple fill |
| `form-toggle` | Toggle switch with smooth knob animation |
| `form-fileupload` | Drag-and-drop file upload with animated states |
| `form-slider` | Range slider with custom animated track |

### Feedback & UI (8)
| ID | What it does |
|---|---|
| `feedback-toast` | Toast notification system (toast() function + Toaster) |
| `feedback-alert` | Inline alert with colored icon + border |
| `feedback-badge` | Animated badge with pulse/removable/dot options |
| `feedback-skeleton` | Skeleton loader with shimmer animation |
| `feedback-progress` | Progress bar with animated fill |
| `feedback-spinner` | Smooth rotating loading spinner |
| `feedback-empty` | Empty state with bouncing icon + CTA |
| `feedback-error` | Error state with retry + expandable error details |

### Data Display (9)
| ID | What it does |
|---|---|
| `data-table` | Sortable data table with staggered row entrance |
| `data-grid` | Feature grid with selection, pagination, shift-click |
| `data-list` | Animated list with staggered slide-in items |
| `data-timeline` | Vertical timeline with scroll-triggered line draw |
| `data-stats` | Animated counters that count up on scroll |
| `data-accordion` | FAQ accordion with smooth height animation |
| `data-carousel` | Image/card carousel with slide transitions |
| `data-gallery` | Image gallery with lightbox + keyboard nav |
| `data-chart` | CSS bar/line charts (no external lib needed) |

### Marketing Sections (8)
| ID | What it does |
|---|---|
| `marketing-features` | Features grid with icon cards and stagger |
| `marketing-testimonials` | Testimonials carousel (cards/single/grid variants) |
| `marketing-pricing` | Full pricing table with monthly/yearly toggle |
| `marketing-faq` | FAQ section with search + category filters |
| `marketing-contact` | Contact form + info cards section |
| `marketing-newsletter` | Newsletter signup (simple/card/split variants) |
| `marketing-team` | Team section with hover social links |
| `marketing-logocloud` | Logo cloud with marquee scroll option |

### UI Elements (6)
| ID | What it does |
|---|---|
| `ui-avatar` | Stacked avatar group with overlap |
| `ui-notification` | Notification bell with dropdown list |
| `ui-dropdown` | Animated dropdown menu |
| `ui-tooltip` | Hover tooltip with arrow |
| `ui-countdown` | Animated countdown timer |
| `ui-rating` | Interactive star rating |

### Landing Pages (6)
| ID | What it does |
|---|---|
| `page-landing-saas` | Full SaaS page: Hero + Logos + Features + Testimonials + Pricing + FAQ + Newsletter |
| `page-landing-startup` | Startup: Gradient hero + Features + Stats + Team + Contact |
| `page-landing-product` | Product: Hero + Carousel + Features + Pricing + Newsletter |
| `page-landing-agency` | Agency: Hero + Logos + Services + Team + Gallery + CTA |
| `page-landing-portfolio` | Portfolio: Gradient hero + Stats + Filterable Gallery + Testimonials |
| `page-landing-mobile` | Mobile app: Hero with phone mockup + Features + Reviews + Stats |

### Dashboards (3)
| ID | What it does |
|---|---|
| `page-dashboard-analytics` | Analytics: Sidebar + stat cards + charts + transaction table + user grid |
| `page-dashboard-admin` | Admin: User management table + content grid + system alerts |
| `page-dashboard-project` | Project: Kanban board + timeline + task list + sprint stats |

### Auth Pages (4)
| ID | What it does |
|---|---|
| `page-auth-login` | Split layout: gradient brand + animated form + social auth |
| `page-auth-register` | Split layout: registration form + password strength |
| `page-auth-reset` | 3-step reset: email → code → new password |
| `page-auth-2fa` | Centered 2FA with 6-digit code boxes + recovery option |

### Content Pages (12)
| ID | What it does |
|---|---|
| `page-blog-grid` | Blog listing with category pills + search + pagination |
| `page-blog-post` | Full article: ToC sidebar + share buttons + author bio + related |
| `page-docs` | Documentation: sidebar nav + search + code blocks + prev/next |
| `page-contact` | Contact: hero + form + info cards + FAQ |
| `page-about` | About: hero + stats + timeline + team + CTA |
| `page-careers` | Careers: hero + values + open positions + benefits |
| `page-faq` | FAQ: search + category pills + accordion + contact CTA |
| `page-error` | 404/500: animated number + icon + message + CTAs |
| `page-portfolio-project` | Project detail: hero + overview + gallery + tech stack |
| `page-services` | Services: hero + service cards + process + CTA |
| `page-compare-plans` | Plan comparison: feature matrix table |
| `page-waitlist` | Waitlist: hero + preview + signup + social proof |

### Pricing Pages (2)
| ID | What it does |
|---|---|
| `page-pricing-simple` | Simple: 3 tiers + toggle + FAQ |
| `page-pricing-tiered` | Tiered: 4 tiers + full feature comparison table |

## Example: Building a Website

Instead of writing 500 lines of code, just say:
> Use `page-landing-saas` with custom content: title="Build Great Products", features=[custom list], pricing=[3 tiers from $19]. Change the accent color to blue.

The template system handles all animations, responsive layout, and interactions.
