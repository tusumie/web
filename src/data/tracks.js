import tellUrWorld from '../../images/covers/tell-ur-world.jpg';
import itsOkTo from '../../images/covers/itsokto.jpg';
import allNightLong from '../../images/covers/all-night-long.jpg';
import somethingOuttaNothing from '../../images/covers/something-outta-nothing.jpg';
import wipeItClean from '../../images/covers/wipe-it-clean.jpg';
import threads from '../../images/covers/threads.png';
import callMeBack from '../../images/covers/cmb.png';

export const tracks = [
  { id: 2417335533, title: 'tell ur world :)', slug: 'tell-ur-world', artwork: tellUrWorld, visualizerColorCue: 89_500 },
  { id: 2301971708, title: "it's ok to rot!", slug: 'itsokto', artwork: itsOkTo },
  { id: 2167843887, title: 'all night long <3', slug: 'all-night-long', artwork: allNightLong },
  { id: 2226365594, title: 'something outta nothing', slug: 'something-outta-nothing', artwork: somethingOuttaNothing },
  { id: 2265867959, title: 'wipe it clean', slug: 'wipe-it-clean', artwork: wipeItClean },
].map((track) => ({ ...track, url: `https://soundcloud.com/tusumie/${track.slug}` }));

export const releases = [
  { title: 'threads', artwork: threads, url: 'https://distrokid.com/hyperfollow/tusumie/threads' },
  { title: 'call me back', artwork: callMeBack, url: 'https://distrokid.com/hyperfollow/tusumie/call-me-back-3' },
];
