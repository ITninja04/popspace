import React, { useState } from 'react';
import clsx from 'clsx';
import LocalVideoPreview from '../LocalVideoPreview';

import WithLogo from './images/logo_extrasmall.svg';
import { ReactComponent as EditIcon } from '../../images/icons/edit.svg';

import './joinRoom.css';

import { AvatarSelect } from '../AvatarSelect/AvatarSelect';
import { randomAvatar } from '../AvatarSelect/options';
import { Avatar } from '../Avatar/Avatar';

import { AudioToggle } from '../AudioToggle/AudioToggle';
import { VideoToggle } from '../VideoToggle/VideoToggle';

import useLocalVideoToggle from '../../hooks/useLocalVideoToggle/useLocalVideoToggle';
import { Button, TextField } from '@material-ui/core';
import { actions } from '../../features/room/roomSlice';
import useVideoContext from '../../hooks/useVideoContext/useVideoContext';
import { useAppState } from '../../state';
import { useCoordinatedDispatch } from '../../features/room/CoordinatedDispatchProvider';

interface IJoinRoomProps {
  roomName: string;
}

const JoinRoom = ({ roomName }: IJoinRoomProps) => {
  const { getToken, setError } = useAppState();
  const { connect } = useVideoContext();
  const [screenName, setScreenName] = useState('');
  const [password, setPassword] = useState('');
  const [initialAvatar, setInitialAvatar] = useState(randomAvatar());
  const [isVideoEnabled] = useLocalVideoToggle();
  const [isSelectingAvatar, toggleIsSelectingAvatar] = useState(false);

  const [isJoining, setIsJoining] = useState(false);

  const coordinatedDispatch = useCoordinatedDispatch();

  const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO input validation and add stuff here
    // We currently dont allow people into a room without a password and dont have
    // any error messaging really hooked up, so only allow them in if username and password
    // are filled out
    if (screenName.length > 0 && password.length > 0) {
      // check to see if we are already attempting to join a room to prevent
      // another token request is in progress
      if (!isJoining) {
        try {
          setIsJoining(true);
          const token = await getToken(screenName, roomName, password);
          const room = await connect(token);
          if (!room) {
            throw new Error('Failed to join room');
          }
          // add the user's participant to the room
          coordinatedDispatch(
            actions.addPerson({
              // TODO: move this into the room viewport context to get a viewport-central
              // location?
              position: { x: Math.random() * 200, y: Math.random() * 200 },
              person: {
                id: room.localParticipant.sid,
                kind: 'person',
                avatar: initialAvatar.name,
                emoji: null,
                isSpeaking: false,
                viewingScreenSid: null,
              },
            })
          );
        } catch (err) {
          setError(err);
        }
        // set isJoining to false after we attempt to connect
        setIsJoining(false);
      }
    }
  };

  const joiningRoomText = <div className="JoinRoom-text u-flex u-flexAlignItemsCenter">Joining {roomName}</div>;

  const header = (
    <div className="u-flex u-flexRow u-flexAlignItemsCenter">
      <div>
        <img className="JoinRoom-logo" alt="With Logo" src={WithLogo} />
      </div>
      {joiningRoomText}
    </div>
  );

  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const onAvatarHover = () => {
    setIsHoveringAvatar(true);
  };

  const onAvatarUnHover = () => {
    setIsHoveringAvatar(false);
  };

  const userAvatarCameraSelect = (
    <div className="JoinRoom-avControls u-flex u-flexCol u-flexAlignItemsCenter">
      <div
        className="JoinRoom-videoPreviewContainer u-round"
        style={{ backgroundColor: initialAvatar.backgroundColor }}
      >
        {isVideoEnabled ? (
          <LocalVideoPreview classNames="JoinRoom-videoPreview u-height100Percent" />
        ) : (
          <div
            className={clsx(
              'JoinRoom-videoPreviewContainer-avatar u-height100Percent u-width100Percent u-positionRelative',
              {
                'is-hovering': isHoveringAvatar,
              }
            )}
            onMouseEnter={onAvatarHover}
            onMouseLeave={onAvatarUnHover}
          >
            <div
              className={clsx(
                'JoinRoom-videoPreviewContainer-avatar-overlay u-positionAbsolute u-width100Percent u-height100Percent u-flex u-flexAlignItemsCenter u-flexJustifyCenter u-cursorPointer u-layerSurfaceAlpha',
                { 'u-displayNone': !isHoveringAvatar }
              )}
              onClick={() => toggleIsSelectingAvatar(true)}
            >
              <EditIcon />
            </div>
            <Avatar name={initialAvatar.name} />
          </div>
        )}
      </div>
      <div className="u-flex">
        <div className="JoinRoom-avControls-item">
          <VideoToggle />
        </div>
        <div className="JoinRoom-avControls-item">
          <AudioToggle />
        </div>
      </div>
    </div>
  );

  const userLoginForm = (
    <form className="JoinRoom-form u-flex u-flexCol" onSubmit={onSubmitHandler}>
      <TextField
        id="screenName"
        label="Desired screen name"
        value={screenName}
        onChange={(event) => setScreenName(event.target.value)}
        required={true}
        className={'JoinRoom-formInputOffset u-marginBottom8'}
      />
      <TextField
        id="password"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        required={true}
        className={'JoinRoom-formInputOffset u-marginBottom16'}
      />
      <Button type="submit" disabled={!isJoining && (screenName.length === 0 || password.length === 0)}>
        {isJoining ? 'Joining...' : 'Join Room'}
      </Button>
      <div className="u-marginTop16 u-marginBottom16">
        We use analytics software to improve With. Please feel free to come back later, when we made it optional.
      </div>
    </form>
  );

  return (
    <div className="JoinRoom u-width100Percent u-flex u-flexJustifyCenter u-flexAlignItemsCenter">
      <div className="JoinRoom-container u-positionRelative u-size8of10 u-sm-sizeFull u-margin8">
        <div
          className={clsx('JoinRoom-header u-flex u-sm-displayNone u-marginBottom24', {
            'is-open': !isSelectingAvatar,
          })}
        >
          {header}
        </div>
        <div className={clsx('JoinRoom-userInfo u-flex u-flexRow u-sm-flexCol', { 'is-open': !isSelectingAvatar })}>
          <div className="JoinRoom-title u-sm-flex u-md-displayNone u-lg-displayNone u-flexJustifyCenter u-flexAlignItemsCenter">
            {joiningRoomText}
          </div>
          <div className="u-size1of2 u-sm-sizeFull u-flex u-flexCol u-flexAlignItemsCenter">
            {userAvatarCameraSelect}
          </div>
          <div className="joinRoom-formContainer u-size1of2 u-sm-sizeFull">{userLoginForm}</div>
        </div>
        <div className={clsx('JoinRoom-avatarSelect u-layerSurfaceBeta', { 'is-open': isSelectingAvatar })}>
          <AvatarSelect
            onAvatarChange={(av) => setInitialAvatar(av)}
            defaultAvatar={initialAvatar}
            handleClose={() => toggleIsSelectingAvatar(false)}
          />
        </div>
        <div className="u-sm-flex u-md-displayNone u-lg-displayNone u-flexJustifyCenter u-flexAlignItemsCenter">
          <img className="JoinRoom-logo" alt="header-logo" src={WithLogo} />
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
