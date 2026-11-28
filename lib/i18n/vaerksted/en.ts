// UI-i18n U6: Værkstedets moderator-del på ENGELSK (en-GB). Typet ud fra da.ts.
// Termer: Værkstedet = Workshop, melding = issue, Anmeldelser = Flagged
// messages, Adgange = Access, håndteret/behandlet = handled.

import type { VOrdbog } from './da';

export const ven: VOrdbog = {
  navn: 'Workshop',
  metaTitel: (side) => `${side} - Workshop`,

  ramme: {
    loggetIndSom: 'Logged in as',
    tilForsiden: '← To the front page',
    logUd: 'Log out',
    tilbage: '← Back to Overview',
  },

  roller: {
    superadmin: 'superadmin',
    admin: 'admin',
    moderator: 'moderator',
  },

  nav: {
    overblik: 'Overview',
    feedback: 'Feedback',
    rapport: 'Report',
    forum: 'Forum',
    links: 'Links',
    ota: 'OTA',
    anmeldelser: 'Flagged',
    kontakt: 'Contact',
    aktivitet: 'Activity',
    adgange: 'Access',
    audit: 'Audit',
    manual: 'Manual',
    aabneRapporter: (n) => `${n} open forum reports`,
  },

  genveje: {
    titel: 'Shortcuts',
    feedback: 'Moderate issues + clean-up',
    forum: 'Threads, categories and rules',
    anmeldelser: 'Flagged private messages',
    kontakt: 'Private enquiries to the staff',
    rapport: 'Compile the Zeekr report (PDF/CSV)',
    aktivitet: 'Patterns over time',
    adgange: 'Users and roles',
    links: 'Useful links on /links',
  },

  overblik: {
    titel: 'Overview',
    aabn: (omraade) => `Open ${omraade}`,
    meldinger: 'Issues in total',
    bekraeftelser: 'Confirmations in total',
    aabne: 'Open (new + confirmed)',
    loestIOta: 'Fixed in OTA',
    kategorier: 'Categories',
    traade: 'Threads',
    indlaeg: 'Posts',
  },

  faelles: {
    iAlt: (n) => `${n} in total`,
    viser: (vist, total) => `Showing ${vist} of ${total}`,
    visFlere: 'Show more',
    ny: 'New',
    ejer: 'Owner',
    enEjer: 'An owner',
    fortryd: 'Cancel',
    bekraeftSlet: 'Confirm delete',
    soeg: 'Search',
    alle: 'All',
  },

  feedback: {
    alleMeldinger: 'All issues',
    senesteAktivitet: 'Latest feedback activity',
    aktivitetIntro: 'New issues and confirmations.',
    ingenAktivitet: 'No feedback activity yet.',
    ingenMeldinger: 'No issues yet.',
    flereHandlinger: 'More actions',
    titelPh: 'Title',
    beskrivelsePh: 'Description',
    gem: 'Save',
    annuller: 'Cancel',
    seKommentarer: 'See comments',
    svar: (n) => (n === 1 ? '1 reply' : `${n} replies`),
    status: 'Status',
    alvor: 'Severity',
    kategori: 'Category',
    sprog: 'Language',
    sprogTitle: "The issue's original language - controls how the report and titles are translated",
    ingenKategori: '- none -',
    sletSpoerg: 'Delete this issue?',
    loestHvordan: 'Resolved how?',
    loestIOta: '✅ Fixed in OTA',
    loestIOtaTitle: 'Zeekr has fixed it in a software update',
    afklaret: '💬 Clarified',
    afklaretTitle: 'Closed without an OTA fix, e.g. a misinformed user or clarified in a comment',
    markerLoest: '✅ Mark resolved',
    rediger: '✏️ Edit',
    slet: '🗑 Delete',
  },

  aktivitetFeed: {
    nyMelding: 'New issue:',
    bekraeftelsePaa: 'Confirmation on',
    nyTraad: 'New thread:',
    nytSvarI: 'New reply in',
    enMelding: 'an issue',
    enTraad: 'a thread',
    ingen: 'No activity yet.',
  },

  forumSide: {
    rapporterTitel: 'Incoming reports',
    ingenAabne: 'none open',
    aabne: (n) => `${n} open`,
    rapporterIntro:
      'Content that users (or later AI) have flagged. Remove the thread/post with a reason (the author gets an official message), warn the author, or dismiss the report. Any action from here marks the report as handled.',
    modTitel: 'Forum moderation',
    modTaeller: (traade, indlaeg) =>
      `${traade} ${traade === 1 ? 'thread' : 'threads'} · ${indlaeg} ${indlaeg === 1 ? 'post' : 'posts'}`,
    modIntro:
      'Pin, lock or remove threads and posts. The actions take effect on the forum straight away. Search or filter down to what needs attention, and load more with "Show more".',
    aktivitetTitel: 'Latest forum activity',
    aktivitetIntro: 'New threads and replies on the forum.',
    ingenAktivitet: 'No forum activity yet.',
  },

  forumMod: {
    harRapportTitle: 'Has an open report',
    rapportMaerke: '⚑ report',
    spaerretTitle: 'The author is restricted right now',
    spaerretMaerke: '🚫 restricted',
    fastgjort: 'Pinned',
    laast: 'Locked',
    svar: (n) => (n === 1 ? '1 reply' : `${n} replies`),
    visninger: (n) => (n === 1 ? '1 view' : `${n} views`),
    fjernFastgoer: 'Unpin',
    fastgoer: '📌 Pin',
    laasOp: 'Unlock',
    laas: '🔒 Lock',
    fjernTraad: '🗑 Remove thread',
    fjernTraadSubmit: 'Remove thread + notify',
    iTraad: 'in',
    aabning: '(opening)',
    aabningsIndlaeg: 'Opening post - use "Remove thread"',
    fjern: '🗑 Remove',
    fjernIndlaegSubmit: 'Remove post + notify',
    soegLabel: 'Search title or author',
    soegPh: 'e.g. tyre pressure or a name',
    vis: 'Show',
    kraeverOpm: '⚑ Needs attention',
    opmForklaring:
      '"Needs attention" = threads/posts that either have an open report or were written by a user who is restricted right now.',
    traadeOverskrift: (vist, total) => `Threads (showing ${vist} of ${total})`,
    indlaegOverskrift: (vist, total) => `Posts (showing ${vist} of ${total})`,
    ingenTraadeMatcher: 'No threads match.',
    ingenTraade: 'No threads yet.',
    ingenIndlaegMatcher: 'No posts match.',
    ingenIndlaeg: 'No posts yet.',
    visFlereTraade: 'Show more threads',
    visFlereIndlaeg: 'Show more posts',
    kunneIkkeHenteTraade: 'Could not load threads.',
    kunneIkkeHenteIndlaeg: 'Could not load posts.',
  },

  rapporter: {
    indlaeg: 'Post',
    traad: 'Thread',
    grund: (grund) => `Reason: ${grund}`,
    aiFlag: 'AI flag',
    rapporteretAf: (navn) => `· reported by ${navn}`,
    alleredeFjernet: 'already removed',
    forfatter: (navn) => `· author: ${navn}`,
    fjernIndlaeg: '🗑 Remove post',
    fjernTraad: '🗑 Remove thread',
    advarForfatter: '🛡 Warn author',
    afvis: 'Dismiss report',
    fjernIndlaegSubmit: 'Remove post + notify',
    fjernTraadSubmit: 'Remove thread + notify',
    sendAdvarsel: 'Send warning',
    ingenAabne: 'No open reports. 🎉',
    visFlere: 'Show more reports',
    kunneIkkeHente: 'Could not load reports.',
  },

  anmeldelser: {
    titel: 'Flagged messages',
    intro:
      'Private messages that have been flagged. You only see what someone has flagged - not other conversations. Mark as handled, or delete a message that breaks the rules.',
    haandteret: 'Handled',
    anmeldtAf: (navn, tid) => `Flagged by ${navn} · ${tid}`,
    begrundelse: 'Reason:',
    ingenBegrundelse: 'No reason given.',
    skrev: (navn) => `${navn} wrote`,
    beskedSlettet: 'The message has been deleted. The flag is kept as history.',
    helSamtale: 'The whole conversation has been flagged (no single message singled out).',
    aabnSamtale: 'Open conversation',
    markerNy: 'Mark as new',
    markerHaandteret: '✓ Mark handled',
    sletBesked: '🗑 Delete message',
    nye: (n) => `${n} new`,
    haandterede: (n) => `${n} handled`,
    visKunNye: 'Show new only',
    visAlle: 'Show all',
    ingenEndnu: 'No flagged messages yet.',
    ingenNye: 'No new flags. Everything is handled. 👍',
  },

  kontakt: {
    henvendelser: 'Enquiries',
    ingenEndnuTaeller: 'none yet',
    intro:
      'Private messages from owners via the Contact page - a complaint about a user, security/personal data or something personal. Only the staff can see them.',
    behandlet: 'Handled',
    markerUbehandlet: '↩ Mark unhandled',
    markerBehandlet: '✓ Mark handled',
    visFlere: 'Show more enquiries',
    ingen: 'No enquiries yet. 🎉',
    kunneIkkeHente: 'Could not load enquiries.',
  },

  aktivitet: {
    titel: 'Activity',
    intro:
      'Growth and engagement - unique active users and new users per day, last 30 days (Danish time).',
    aktive30: 'Active (30 days)',
    nye30: 'New users (30 days)',
    brugereIAlt: 'Users in total',
    aktivePrDag: 'Active users per day',
    aktiveForklaring:
      'Unique users who did something that day: voted, reported, wrote on the forum (thread or reply) or sent a message.',
    ingenData: 'No recorded activity in the period yet.',
    nyePrDag: 'New users per day',
    nyeForklaring: 'Sign-ups (profiles created).',
    iDag: 'today',
    deploy: (roligst, travlest) =>
      `🔧 Deploy timing: quietest around ${roligst}:00${
        travlest ? ` (busiest at ${travlest}:00)` : ''
      } - the quiet hours are the safest to deploy in (a short outage hits the fewest people).`,
    serverNote:
      "💡 This is community activity (people using the site) - not the server's CPU/memory. The actual server load is shown in Coolify's own monitoring of the application.",
  },

  brugere: {
    adgangeTitel: 'Access',
    titel: 'Users',
    intro: (erAdmin) =>
      `Overview of all registered users. Search and filter, and act on a user: warn or suspend${
        erAdmin ? ', ban, lift or anonymise' : ''
      }. Every action sends the user an official message with the reason and is recorded in the moderation log.`,
    dage: (n) => (n === 1 ? '1 day' : `${n} days`),
    aktiv: 'Active',
    suspenderetTil: (dato) => `Suspended until ${dato}`,
    suspenderet: 'Suspended',
    anonymiseret: 'Anonymised',
    bannet: 'Banned',
    ingenRolle: 'no role',
    anonymiseretNavn: '(anonymised)',
    dig: '(you)',
    oprettet: (tid) => `joined ${tid}`,
    sidstLogget: (tid) => `last logged in ${tid}`,
    aldrigLogget: 'never logged in',
    advar: '🛡 Warn',
    suspender: '⏸ Suspend',
    ban: '⛔ Ban',
    ophaev: '✅ Lift restriction',
    anonymiser: '👤 Anonymise',
    egenKonto: 'You cannot sanction your own account.',
    maalErAdmin: 'An admin cannot be sanctioned - remove the admin role first.',
    kontoAnonymiseret: 'The account has been anonymised.',
    sendAdvarsel: 'Send warning',
    varighed: 'Duration:',
    suspenderSubmit: 'Suspend + notify',
    banForklaring:
      'Permanent posting ban. The user can still read, but not contribute. Can be lifted again.',
    banSubmit: 'Ban + notify',
    anonymForklaring: 'Erases personal data (name, email, VIN/notes) and restricts permanently.',
    anonymForklaring2:
      'Cars, confirmations and forum posts are kept (they are the QA signal) - but are shown without an author. This cannot be undone.',
    anonymSubmit: 'Anonymise the person',
    navnEllerEmail: 'Name or email',
    soegPh: 'e.g. Mette or mette@...',
    rolle: 'Role',
    udenRolle: 'No role',
    rolleModerator: 'Moderator',
    rolleAdmin: 'Admin',
    status: 'Status',
    sorter: 'Sort',
    nyeste: 'Newest',
    sidstAktive: 'Last active',
    navn: 'Name',
    ingenMatcher: 'No users match.',
    kunneIkkeHente: 'Could not load users.',
  },

  fejl: {
    ingenAdgang: "You don't have permission to do that.",
    ugyldigStatus: 'Invalid status.',
    ugyldigAlvor: 'Invalid severity.',
    ugyldigKategori: 'Invalid category.',
    ugyldigtSprog: 'Invalid language.',
    tomTitel: 'The title cannot be empty.',
    ugyldigGrund: 'Invalid reason.',
    ugyldigeDage: 'The number of days must be between 1 and 3650.',
    egenKonto: 'You cannot sanction your own account.',
    maalErAdmin: 'An admin or superadmin cannot be sanctioned - remove the role first.',
    brugerFindesIkke: 'The user does not exist.',
    henvendelseFindesIkke: 'The enquiry no longer exists.',
    nogetGikGalt: 'Something went wrong. Please try again.',
  },

  manual: {
    titel: 'Manual',
    intro: 'A reference for how the Workshop works - page by page.',
    adminManual: 'Admin manual',
    modManual: 'Moderator manual',
    serAdmin: 'You are viewing the admin manual - everything in the Workshop (in Danish).',
    serMod: 'You are viewing the moderator manual - exactly what a moderator sees. Good for onboarding.',
    kort: [
      {
        ikon: '🚗',
        titel: 'What is Zeekr Garage',
        blokke: [
          {
            p: 'Zeekr Garage is an independent, unofficial community for Zeekr owners in the Nordics. The site has two halves: the **feedback board**, where owners report bugs and wishes and others press "me too" to add a vote (an _issue_), and the **forum**, where people talk (threads and replies).',
          },
          {
            p: 'The point of it all: the best, most confirmed issues are collected in a **report to Zeekr** - professional, structured owner feedback. The cleaner and more civil the board and forum, the stronger that report. That is what moderation serves - not policing, but keeping the signal sharp.',
          },
          { p: 'The **Workshop** (here) is backstage, where that work happens.' },
          {
            liste: [
              {
                navn: 'Where the forum reports come from',
                tekst:
                  'Users press ⚑ out on the forum itself; the flagged content lands in the report queue at the top of the Forum tab. (Don\'t mix up the two kinds of "report": a _forum report_ is a flag from a user - _the report to Zeekr_ is the combined feedback that is passed on.)',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧭',
        titel: 'How the Workshop fits together',
        blokke: [
          {
            p: 'The Workshop is the backstage of Zeekr Garage - here we keep the forum and the feedback issues civil and useful, so the feedback owners give becomes a strong report to Zeekr.',
          },
          {
            p: 'As a moderator you handle the day-to-day: forum reports, threads and posts, flagged messages, private enquiries, feedback issues and warnings/suspensions. This manual covers all of it.',
          },
          {
            liste: [
              {
                navn: 'Navigation',
                tekst:
                  'The row of tabs at the top follows the pages: Overview, Feedback, Report, Forum, Flagged, Contact, Activity, Access and Manual. The Forum tab gets a small copper number when there are open reports.',
              },
              {
                navn: 'Ground rule',
                tekst:
                  'Every action that affects a user - remove with a reason, warning, suspension - sends the person an official message with the reason and is recorded in the moderation log. No silent removals.',
              },
              {
                navn: 'Reasons',
                tekst:
                  'The fixed reasons are Duplicate, Tone / personal attack, Off-topic, Spam and Other. You can always add detail in the free-text field.',
              },
              {
                navn: 'Language',
                tekst:
                  'The Workshop follows your language (chosen in the footer or in My garage). User content - issues, posts, messages, enquiries - is shown in the language it was written in. The category and rules editors on the Forum tab and the Report tab are in Danish only.',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧰',
        titel: 'Typical situations - what to do',
        blokke: [
          {
            p: 'From "this happens" to "where + what". If you need the details, they are under each page further down.',
          },
          {
            situationer: [
              {
                naar: 'A post or a thread is nasty or a personal attack',
                tekst:
                  'Already flagged: Forum tab → the report queue at the top → 🗑 Remove with a reason (or 🛡 Warn the author). Otherwise: Forum moderation → search for the thread/post → 🗑 Remove with a reason. The author is notified automatically.',
              },
              {
                naar: 'A user is spamming or keeps going',
                tekst:
                  'Access → find the user → 🛡 Warn first; if it continues, ⏸ Suspend (choose the number of days).',
              },
              {
                naar: 'Two threads about the same bug (duplicate)',
                tekst:
                  'Forum moderation → Remove one with the reason Duplicate, and put the link to the original in the detail field.',
              },
              {
                naar: 'A private message has been flagged',
                tekst:
                  'Flagged tab → read it → ✓ Mark handled, or 🗑 Delete message if it breaks the rules.',
              },
              {
                naar: 'An owner has written to the staff via Contact',
                tekst:
                  'Contact tab → read the enquiry, reply via the email link if the person gave an email → ✓ Mark handled.',
              },
              {
                naar: 'An issue is classified wrongly or needs tightening up',
                tekst:
                  'Feedback tab → change Status/Severity/Category/Language on the row, or ✏️ Edit the title and description in the ⋯ menu.',
              },
              {
                naar: 'Zeekr has fixed a bug in an update',
                tekst: 'Feedback tab → find the issue → ✅ Mark resolved → Fixed in OTA.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📊',
        titel: 'Overview (the front page)',
        blokke: [
          {
            p: 'The landing page of the Workshop. Number tiles for Feedback (issues, confirmations, open, fixed in OTA) and Forum (categories, threads, posts), plus a grid of shortcuts to every page. A plain overview - you don\'t act here.',
          },
        ],
      },
      {
        ikon: '🗒️',
        titel: 'Feedback - issues',
        blokke: [
          {
            p: "All the owners' issues, sorted with the most votes at the top. Each row shows the vote count, title, type (bug or wish), model and software version if given, and a link to the comments if there are any.",
          },
          { afsnit: 'How to' },
          {
            liste: [
              {
                navn: 'Classify',
                tekst:
                  "The four drop-downs set Status, Severity, Category and Language (the issue's original language - change it if the automatic detection got it wrong). It saves straight away.",
              },
              {
                navn: 'Mark resolved',
                tekst:
                  'Press _✅ Mark resolved_ and choose either _Fixed in OTA_ (Zeekr fixed it in an update) or _💬 Clarified_ (closed without an OTA fix, e.g. a misunderstood issue).',
              },
              {
                navn: 'Edit',
                tekst: 'In the ⋯ menu: change the title and description (e.g. to tighten up an issue before the report).',
              },
              {
                navn: 'Delete',
                tekst:
                  "In the ⋯ menu, with a confirmation. Deleting cannot be undone and also removes the issue's images.",
              },
            ],
          },
          { note: 'The tab also shows "Latest feedback activity" (new issues and confirmations).' },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - the report queue',
        blokke: [
          {
            p: 'At the top of the Forum tab: content that users (or later AI) have flagged. Each card shows whether it is a thread or a post, the reason, who reported it, the author and an excerpt.',
          },
          { afsnit: 'Three choices per report' },
          {
            liste: [
              {
                navn: '🗑 Remove thread/post',
                tekst:
                  "Choose a reason (preset to the report's own) + any detail, and press _Remove + notify_. Removes the content, notifies the author and marks the report handled in one go.",
              },
              {
                navn: '🛡 Warn author',
                tekst: 'Reason + detail + _Send warning_. Sends an official message without removing the content.',
              },
              { navn: 'Dismiss report', tekst: 'Closes the report without action - e.g. if it is groundless.' },
            ],
          },
          {
            note: 'An action reloads the queue, so the handled item drops out. "Show more" loads the next page.',
          },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - moderating threads and posts',
        blokke: [
          {
            p: 'Two columns - Threads and Posts. Search the title or author, or switch on _⚑ Needs attention_ (threads/posts with an open report, or written by a user who is restricted right now). "Show more" loads the next 25. The actions take effect on the forum straight away.',
          },
          { afsnit: 'Threads' },
          {
            liste: [
              {
                navn: '📌 Pin / Unpin',
                tekst: 'Puts the thread at the top of its category. 📌 by the title = already pinned.',
              },
              { navn: '🔒 Lock / Unlock', tekst: 'Locks it for new replies. 🔒 by the title = already locked.' },
              { navn: '🗑 Remove thread', tekst: 'With a reason + a message to the author.' },
            ],
          },
          { afsnit: 'Posts' },
          {
            liste: [
              {
                navn: '🗑 Remove',
                tekst:
                  'With a reason + a message. The opening post cannot be removed on its own - use "Remove thread" in the thread column.',
              },
            ],
          },
          {
            note: 'The Forum tab also has "Latest forum activity" (new threads and replies) - a plain overview, no actions.',
          },
        ],
      },
      {
        ikon: '🗂️',
        titel: 'Forum - categories',
        blokke: [
          {
            p: 'Create, rename, move between groups, sort and lock categories - right here, without going into the database. (The editor is in Danish.)',
          },
          {
            liste: [
              { navn: 'New category', tekst: '"+ Ny kategori" under a group puts it in that group.' },
              { navn: 'New group', tekst: '"+ Ny gruppe" at the bottom creates a brand-new group.' },
              {
                navn: 'Sort + move',
                tekst:
                  'The arrows reorder the category within its group; the drop-down moves it to another group; the arrows by the group heading reorder the groups themselves.',
              },
              {
                navn: 'Lock',
                tekst: 'Only moderators can start threads in a locked category (e.g. a notice board).',
              },
              { navn: 'Delete', tekst: 'Only possible when the category is empty - move or remove its threads first.' },
              {
                navn: 'Model forums',
                tekst:
                  'Forums under Modellerne are tied to a car model. They cannot be moved, and Modellerne cannot get ordinary categories.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📜',
        titel: 'Forum - rules',
        blokke: [
          {
            p: "The forum's shared ground rules. Edit the text and save - it takes effect on `/forum/regler` straight away. (The editor and the rules are in Danish.)",
          },
        ],
      },
      {
        ikon: '🚩',
        titel: 'Flagged - private messages',
        blokke: [
          {
            p: 'Messages that someone has flagged - you only see what was flagged, not other conversations. Each card shows who flagged it, the reason and the message itself.',
          },
          {
            liste: [
              { navn: 'Open conversation', tekst: 'Jumps to the conversation if you need the context.' },
              { navn: '✓ Mark handled', tekst: 'Closes the flag (can be set back to "new" again).' },
              {
                navn: '🗑 Delete message',
                tekst: 'Removes the flagged message, with a confirmation. The flag is kept as history.',
              },
              { navn: 'Show all / new only', tekst: 'Switches between all flags and only the unhandled ones.' },
            ],
          },
        ],
      },
      {
        ikon: '📨',
        titel: 'Contact - private enquiries',
        blokke: [
          {
            p: 'Messages that logged-in owners have sent to the staff via the Contact page - e.g. a complaint about another user, security/personal data or something personal. Only the staff see them. Each card shows the sender, subject, message and a reply email if given.',
          },
          {
            liste: [
              {
                navn: '✓ Mark handled',
                tekst:
                  'Handled enquiries stay in the list, dimmed (can be set back to unhandled). Unhandled ones are at the top.',
              },
              {
                navn: 'Reply',
                tekst: 'Click the email address if the person gave one. Otherwise reply via a private message.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📮',
        titel: 'Report to Zeekr',
        blokke: [
          {
            p: 'This is where the owners\' issues are collected into the report that is the whole point of the site. At the top you see "Siden sidste rapport" (how much new has come in) and at the bottom a log of who has downloaded reports. (The tab is in Danish; the report itself can be produced in Danish, English or Swedish.)',
          },
          { afsnit: 'Preview' },
          {
            liste: [
              {
                navn: 'Choose a selection',
                tekst: 'Number (top 20/50/100/all), content (bugs, wishes or both) and language (Danish, English, Swedish).',
              },
              {
                navn: 'On/off',
                tekst:
                  '_Inkludér kommentarer_ (without the marked solution - Zeekr should get the bug, not the workaround) and _Kun nye + eskalerende_ (new + escalating only).',
              },
              {
                navn: 'Forhåndsvis PDF / CSV',
                tekst: 'Downloads the report without changing anything. Feel free to use it.',
              },
              {
                navn: '🔍 Test oversættelse',
                tekst:
                  'Checks that translation into English/Swedish works (LibreTranslate). If it is not configured, the reports are in Danish only.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📈',
        titel: 'Activity',
        blokke: [
          {
            p: 'Growth and engagement: unique active users per day (voted, reported, wrote on the forum or sent a message) and new users per day, over the last 30 days. A deploy-timing note points to the quietest hours. A plain overview - no actions.',
          },
        ],
      },
      {
        ikon: '👥',
        titel: 'Access - users and sanctions',
        blokke: [
          {
            p: 'Overview of all registered users. Search by name or email, filter by role and status (active, suspended, banned), and sort. Every action sends the user an official message with the reason and is recorded in the log. You cannot sanction your own account, an admin or a superadmin.',
          },
          { afsnit: 'Actions per user' },
          {
            liste: [
              { navn: '🛡 Warn', tekst: 'An official warning with a reason, without restricting anything.' },
              {
                navn: '⏸ Suspend',
                tekst:
                  'A temporary posting ban - choose the duration (1 to 90 days) + a reason. The user can still read.',
              },
            ],
          },
        ],
      },
    ],
  },
};
