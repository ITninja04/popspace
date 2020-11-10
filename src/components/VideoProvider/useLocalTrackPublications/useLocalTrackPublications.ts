import { LocalDataTrack, Room } from 'twilio-video';
import { useEffect } from 'react';
import { useLocalTracks } from '../../LocalTracksProvider/useLocalTracks';
import {
  MIC_TRACK_NAME,
  CAMERA_TRACK_NAME,
  SCREEN_SHARE_AUDIO_TRACK_NAME,
  SCREEN_SHARE_TRACK_NAME,
} from '../../../constants/User';

function useTrackPublication(room: Room | null, track: MediaStreamTrack | LocalDataTrack | null, trackName: string) {
  useEffect(() => {
    if (!room) return;

    if (track) {
      // this may look ridiculous but it works around a weird TypeScript overloading bug.
      if (track instanceof LocalDataTrack) {
        room.localParticipant.publishTrack(track);
      } else {
        room.localParticipant.publishTrack(track, {
          name: trackName,
          logLevel: 'info',
        });
      }
    }
    return () => {
      if (track) {
        const pub = room.localParticipant.unpublishTrack(track);
        room.localParticipant.emit('trackUnpublished', pub);
      }
    };
  }, [track, room, trackName]);
}

export function useLocalTrackPublications(room: Room | null) {
  const { audioTrack, videoTrack, screenShareAudioTrack, screenShareVideoTrack, dataTrack } = useLocalTracks();

  // for each local track, we declaratively manage publication state with effects.
  // when a track is changed, the old one is unpublished and the new is published.
  //
  // Notably, we want each of these tracks to be published under a specific name
  // so we can reference that elsewhere.

  useTrackPublication(room, audioTrack, MIC_TRACK_NAME);
  useTrackPublication(room, videoTrack, CAMERA_TRACK_NAME);
  useTrackPublication(room, screenShareAudioTrack, SCREEN_SHARE_AUDIO_TRACK_NAME);
  useTrackPublication(room, screenShareVideoTrack, SCREEN_SHARE_TRACK_NAME);
  // name doesn't really matter for data track
  useTrackPublication(room, dataTrack, 'data');
}
