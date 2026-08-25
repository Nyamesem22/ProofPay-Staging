# ProofPay Create Payment Parties Design QA — 25 August 2026

## Evidence

- Source visual truth: `C:\Users\USER\AppData\Local\Temp\codex-clipboard-1571d836-ba8d-4d34-80fd-af0e5e73f812.jpg` for the payment-input pattern and `C:\Users\USER\AppData\Local\Temp\codex-clipboard-ae2b3105-020b-4aab-babb-8d57892bc3ae.png` for the complete Parties composition.
- Preserved QA copy of the selected full-screen source: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\payment-flow-qa\source-payment-parties.png`.
- Browser-rendered implementation: `http://127.0.0.1:4173/?demo=customer`, opened through Pay in the Codex in-app browser.
- Final desktop capture: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\payment-flow-qa\parties-desktop-1280x1920-final.png`.
- Final mobile capture: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\payment-flow-qa\parties-mobile-390x844-final.png`.
- Full-view comparison: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\payment-flow-qa\parties-comparison-normalized-final.png`.
- Focused comparison: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\payment-flow-qa\parties-comparison-focused-final.png`.
- Source pixels: 1863 x 2795. For density normalization, the source was downsampled to 1280 x 1920 with Lanczos resampling. Implementation pixels and CSS viewport: 1280 x 1920 at device pixel ratio 1. Mobile viewport: 390 x 844.
- State: Parties step, current user is buyer/sender, other party is a business, receiving destination is mobile wallet, payer method is saved wallet, and invitation channel is SMS.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Fonts and typography: Inter, weight hierarchy, small uppercase labels and utility copy closely follow the selected screen. Labels remain readable without clipping at desktop and mobile widths.
- Spacing and layout rhythm: the four-step tracker, role choice, verified profile, other-party form, payer method, invitation and sticky readiness summary preserve the source hierarchy. The desktop density was tightened so the wizard footer remains visible at the normalized reference size.
- Colors and visual tokens: ProofPay teal, navy, green selected states, pale-green verification surfaces and pale-blue readiness surface match the selected direction and maintain clear semantic contrast.
- Image quality and asset fidelity: the existing ProofPay raster mark remains sharp and transparent over the teal app bar. Standard controls use the project’s Phosphor icon library; no screenshot assets were faked with CSS drawings or emoji.
- Copy and content: the registered customer is not asked to re-enter verified details. The screen collects the other party’s name, wallet or bank destination, payer method and invitation method with clear security language.
- Responsive behavior: at 390 x 844, the role selector is the first task, confirmation moves next to the invite action, and there is no horizontal overflow. Desktop retains the source’s right-side readiness panel.
- Interaction behavior: provider detection changes from MTN MoMo to Telecel Cash while typing; bank choice exposes account fields; the seller role collects the buyer’s contact and the seller’s own receiving destination; mobile wallet and Visa card states work; new and already-registered party states work; successful verification/invitation opens Agreement automatically.

## Primary Interactions Tested

1. Switched between buyer/sender and seller/receiver and confirmed the form labels and receiving/payment controls adapt to the selected role.
2. Entered a Telecel number and confirmed automatic provider selection.
3. Switched the other-party destination to bank account and confirmed all 18 bank options plus account-number and account-name fields.
4. Confirmed AirtelTigo Money and MoMo PSB are available as manual provider fallbacks.
5. Confirmed the invitation checkbox enables only after required party, destination and payment details are ready.
6. Selected SMS, verified the party, observed the invitation success state and confirmed automatic progression to Agreement.
7. Checked 390 x 844 and 1280 x 1920 layouts, horizontal overflow and persistent navigation.
8. Checked browser console errors: none.

## Comparison History

- Initial P1: the seller/receiver branch asked for the buyer’s receiving account and offered Visa as the seller’s payout route. Fix: made the flow role-aware so the seller adds the buyer’s invitation contact and chooses the seller’s own saved wallet or bank receiving account.
- Initial P2: mobile placed Party Readiness before the role choice and separated its confirmation checkbox from the invitation action. Fix: restored role selection as the first task and placed the mobile confirmation beside the invite action while retaining the desktop readiness panel.
- Initial P2: at the normalized desktop reference size, accumulated section spacing pushed the wizard footer below the visible area. Fix: reduced only the desktop Parties-step section rhythm and captured the post-fix 1280 x 1920 evidence with the footer visible.
- Post-fix evidence: the normalized full-view and focused comparisons show aligned information hierarchy, controls, selection states, colors and copy. Mobile and desktop captures show the intended responsive variants.

## Follow-up Polish

- P3: the 1280 x 1920 document remains approximately 50 CSS pixels taller than the viewport, but the primary invite action, wizard footer and fixed customer navigation all remain visible and usable.

final result: passed

---

# Prior ProofPay Mobile-App Customer Flow Design QA

## Evidence

- Source visual truth: `C:\Users\USER\Desktop\ProofPay\Customer Pages asserts\WhatsApp Image 2026-08-24 at 10.22.52 PM.jpeg` plus the five adjacent MTN MoMo flow screenshots.
- Supplied ProofPay logo truth: `C:\Users\USER\Desktop\ProofPay\Customer Pages asserts\WhatsApp Image 2026-08-24 at 3.51.47 PM (1).jpeg`.
- Browser-rendered implementation: `http://localhost:4173/?demo=customer` in the Codex in-app browser.
- Implementation capture: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\customer-home-transparent-logo.png`.
- Combined comparison: `C:\Users\USER\Desktop\ProofPay\ProofPay-app\output\momo-mobile-shell-vs-proofpay.png`.
- Reference pixels: 540 x 1140. Implementation full-page pixels: 895 x 1366, with the centered 552-pixel app column normalized to 540 pixels for comparison.
- State: Home, protected payment, first service advertisement.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Information architecture: the customer experience is now one centered mobile-app shell at every viewport size. No vertical customer menu is visible. Home, Activity, Messages and Settings remain in a fixed bottom bar.
- Typography: compact Inter labels, clear amount hierarchy and short service names match the reference mobile density without clipping.
- Spacing and layout: the teal app header, compact protected-balance card, direct two-column service grid, promotion carousel and bottom navigation keep the Home screen open and easy to scan. The carousel ends the Home content.
- Colors: ProofPay navy, teal and green replace MTN yellow intentionally while preserving the source hierarchy and contrast.
- Images: the supplied ProofPay P logo is used in the app header as the transparent `proofpay-app-mark-transparent.png` asset, with the teal header visible behind it. Five project-owned raster campaign banners cover Pay, Track, USSD, Report and Support.
- Copy: every service campaign is brief and task-led. Promotional text is inside the raster banners and does not interrupt transaction or security steps.
- Responsiveness: the mobile shell remains centered on wide screens and fills narrow screens, with no horizontal overflow or sidebar transition.
- Persistent navigation: the complete customer app bar remains fixed at viewport top. Home's protected balance, Activity's summary/search/status-dropdown controls and Settings' title/account card remain frozen directly below it while only their lower content scrolls.
- Notifications: the bell shows a live unread badge and opens a dedicated, source-labelled inbox for seller messages, ProofPay Support, transaction events and service announcements. Full details use the same mobile shell and expose only the relevant next action.

## Primary Interactions Tested

1. Automatic service carousel advanced from one campaign to the next after 4.2 seconds without a click.
2. Repeated automatic rotation advanced again on the next interval.
3. Manual indicator selection opened campaign 4 of 5 and exposed the Report campaign label.
4. Home, Activity, Messages and Settings remained available from the fixed bottom navigation.
5. Notification, Help and Profile controls remained available together on the right of the top app bar; the transparent ProofPay P logo occupies the left brand position.
6. The removed shortcut strip and category tabs were absent. Home contained only one Pay service tile, one Track service tile and the single Activity bottom-navigation destination.
7. The notification bell opened the inbox with three unread items; opening the seller notification reduced the badge to two and revealed the complete message and transaction context.
8. Recording delivery created a new unread transaction-status notification immediately.
9. Transactions, Messages and Updates filters showed only their matching sources, and Mark all read cleared the badge.
10. Activity scrolled from the top to its maximum scroll position while the app bar retained a zero-pixel viewport offset and the full Activity control panel stayed at 106 pixels.
11. Activity's duplicate All/Protected/Released/Refunded tab row was absent; the search field, single status dropdown and download control sat directly beneath the payment totals.
12. Home's protected-balance card stayed at 89 pixels before and after scrolling; Settings' title/account panel stayed at 106 pixels before and after scrolling.
13. Activity showed the five newest records on page one and the remaining record on page two; Previous/Next controls changed pages, no row used a trailing arrow, each row opened a closable payment-record modal, and no immutable-record footer appeared beneath pagination.
14. Messages opened directly on the conversation cards with no page heading, privacy banner, section heading or row arrows, then transitioned to a full-width chat with Back navigation, delivery state and a persistent composer. The composer accepted image, video, audio, PDF and document attachments and exposed start/stop voice recording. Support messages and attachments appeared only in the admin Customer messages inbox, and an admin reply returned to the customer Support thread with a new notification.
15. Activity no longer showed the Activity heading or six-payment subtitle; the Pay action, totals, search, filter and download controls retained their frozen layout.
16. Settings opened with the account card directly beneath the app bar, without a page heading, subtitle or separate Protected badge.
17. Home showed the service campaign banner without the Discover ProofPay heading, supporting copy or slide counter.
18. Settings initially showed only the account card and four category cards; no category was selected and each category opened in a closeable modal instead of rendering below the cards.

## Comparison History

- Initial P1: customer navigation became vertical on desktop. Fix: replaced all customer desktop/tablet navigation states with the same fixed mobile bottom bar and centered app shell.
- Initial P1: the app header used a greeting instead of the supplied ProofPay mark. Fix: replaced it with the supplied P artwork and removed its white background for the final transparent header asset.
- Initial P2: no promotional service area existed. Fix: added the banner carousel after the service grid.
- Initial P2: service promotions required manual interaction. Fix: added automatic 4.2-second rotation with persistent manual dots.
- Follow-up P2: the Pay/Track/Activity shortcut strip and For you/Pay/Activity/Help tabs duplicated navigation and crowded Home. Fix: removed both rows so the protected-balance card flows directly into the main service grid.
- Follow-up P2: Help was mixed into Home content. Fix: moved Help to its own top-app-bar icon beside notifications.
- Follow-up P2: Current payment, Recent activity and the PIN reminder continued below the service advertisement. Fix: removed all content beneath the carousel.
- Post-fix evidence: the combined source/implementation image shows the same mobile composition and the live browser verified automatic and manual carousel states.

## Prior QA result

passed
