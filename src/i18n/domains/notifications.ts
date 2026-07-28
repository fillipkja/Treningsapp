// Strenger for notifications-domenet. en er typet mot nb — tsc håndhever synk.

const nb = {
  'notifications.title': 'Varsler',
  'notifications.markAllRead': 'Merk alt lest',
  'notifications.sectionNew': 'Nye',
  'notifications.sectionEarlier': 'Tidligere',
  'notifications.loading': 'Henter varsler …',
  'notifications.updateFailedTitle': 'Kunne ikke oppdatere',
  'notifications.emptyTitle': 'Ingen varsler',
  'notifications.emptyMessage':
    'Likes, kommentarer, venneforespørsler og utfordringer dukker opp her.',
  // Komponert klientside fra type + aktør (name = aktørens visningsnavn)
  'notifications.like': '{name} likte økten din',
  'notifications.comment': '{name} kommenterte økten din',
  'notifications.friendPr': '{name} satte ny personlig rekord',
  'notifications.friendRequest': '{name} vil bli venner',
  'notifications.friendAccepted': '{name} godtok venneforespørselen din',
  'notifications.challenge': '{name} utfordret deg',
} as const;

const en: Record<keyof typeof nb, string> = {
  'notifications.title': 'Notifications',
  'notifications.markAllRead': 'Mark all read',
  'notifications.sectionNew': 'New',
  'notifications.sectionEarlier': 'Earlier',
  'notifications.loading': 'Loading notifications …',
  'notifications.updateFailedTitle': 'Could not update',
  'notifications.emptyTitle': 'No notifications',
  'notifications.emptyMessage':
    'Likes, comments, friend requests and challenges will show up here.',
  'notifications.like': '{name} liked your workout',
  'notifications.comment': '{name} commented on your workout',
  'notifications.friendPr': '{name} set a new personal record',
  'notifications.friendRequest': '{name} wants to be friends',
  'notifications.friendAccepted': '{name} accepted your friend request',
  'notifications.challenge': '{name} challenged you',
};

export const notificationsNb = nb;
export const notificationsEn = en;
