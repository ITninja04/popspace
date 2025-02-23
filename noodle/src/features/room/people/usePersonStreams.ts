import { useMemo } from 'react';
import { useCollectedStreams } from '@hooks/useCollectedStreams/useCollectedStreams';
import { useTwilio } from '@providers/twilio/TwilioProvider';
import { Stream } from '@src/types/streams';

/**
 * Groups all of a user's media streams (audio+video) into
 * "main" and "secondary" - using a heuristic to determine
 * which stream should be given priority.
 */
export function usePersonStreams(personId: string) {
  const { allParticipants } = useTwilio();
  const allAssociatedParticipants = useMemo(
    // sorting to at least make it stable
    () =>
      allParticipants
        .sort((a, b) => a.identity.localeCompare(b.identity))
        .filter((p) => p.identity.startsWith(`${personId}#`)),
    [allParticipants, personId]
  );

  const groupedStreams = useCollectedStreams(allAssociatedParticipants);
  const allStreams = useMemo(() => {
    return Object.values(groupedStreams)
      .reduce<Array<Stream>>((streamList, streamGroup) => {
        if (streamGroup.av) streamList.push(streamGroup.av);
        if (streamGroup.screen) streamList.push(streamGroup.screen);
        return streamList;
      }, [])
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [groupedStreams]);
  // only one stream should have audio on - that is the first choice for main stream.
  // if no streams have audio, choose the first in the sorted list with video. Otherwise,
  // just choose the first one. Only AV streams are considered - we don't want the
  // bubble to be a screenshare!
  const mainStream =
    allStreams.find((stream) => stream.kind === 'av' && !!stream.audioPublication) ??
    allStreams.find((stream) => stream.kind === 'av' && !!stream.videoPublication) ??
    null;
  const secondaryStreams = allStreams.filter((s) => s !== mainStream);

  return {
    mainStream,
    secondaryStreams,
  };
}
