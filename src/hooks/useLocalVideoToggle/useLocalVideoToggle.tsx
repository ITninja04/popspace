/**
 * #WITH_EDIT
 *
 * Aug 6, 2020 WQP
 * - Add effect to set the previous device ref to the local particiapnt's active camera id
 * Aug 28, 2020 WQP
 * - Add error messaging for when we fails to get a local video track.
 */
import { LocalVideoTrack } from 'twilio-video';
import { useCallback, useRef, useState, useEffect } from 'react';
import useVideoContext from '../useVideoContext/useVideoContext';
import { useSelector } from 'react-redux';
import { selectors as preferenceSelectors } from '../../features/preferences/preferencesSlice';

export default function useLocalVideoToggle() {
  const {
    room: { localParticipant },
    localTracks,
    getLocalVideoTrack,
    removeLocalVideoTrack,
    onError,
  } = useVideoContext();
  const videoTrack = localTracks.find((track) => track.name.includes('camera')) as LocalVideoTrack;
  const [isPublishing, setIspublishing] = useState(false);
  const previousDeviceIdRef = useRef<string>();

  const activeCameraId = useSelector(preferenceSelectors.selectActiveCameraId);

  // When the active camera id changes in user meta, update the previous device id ref so that when video is enabled
  // that camera is the one that is enabled
  useEffect(() => {
    previousDeviceIdRef.current = activeCameraId;
  }, [activeCameraId]);

  const toggleVideoEnabled = useCallback(() => {
    if (!isPublishing) {
      if (videoTrack) {
        previousDeviceIdRef.current = videoTrack.mediaStreamTrack.getSettings().deviceId;
        const localTrackPublication = localParticipant?.unpublishTrack(videoTrack);
        // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
        localParticipant?.emit('trackUnpublished', localTrackPublication);
        removeLocalVideoTrack();
      } else {
        setIspublishing(true);
        // Only attempt to set the camera device id if one exists. If the camera id is falsey, but defined, it will
        // cause an "overconstrained" error when getting the video track (ex. if previousDeviceIdRef.current is "").
        const vidOpts = previousDeviceIdRef.current
          ? {
              deviceId: { exact: previousDeviceIdRef.current },
            }
          : {};
        getLocalVideoTrack(vidOpts)
          .then((track: LocalVideoTrack) => localParticipant?.publishTrack(track, { priority: 'low' }))
          .catch((err) => {
            const msg =
              err.message === 'Permission denied' || 'Permission dismissed'
                ? 'Please grant camera access to enable video.'
                : 'An error occurred while connecting to your camera.';
            // @ts-ignore
            onError(new Error(msg));
          })
          .finally(() => setIspublishing(false));
      }
    }
  }, [videoTrack, localParticipant, getLocalVideoTrack, isPublishing, onError, removeLocalVideoTrack]);

  return [!!videoTrack, toggleVideoEnabled] as const;
}
