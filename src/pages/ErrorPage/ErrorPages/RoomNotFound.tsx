import React from 'react';
import { GenericErrorPage } from './GenericErrorPage';
import { Routes } from '../../../constants/Routes';
import { useHistory } from 'react-router-dom';

interface IRoomNotFoundProps {
  errorMsg?: string;
}

export const RoomNotFound: React.FC<IRoomNotFoundProps> = (props) => {
  const { errorMsg } = props;
  const history = useHistory();

  const onButtonClick = () => {
    history.push(Routes.ROOT);
  };

  return (
    <GenericErrorPage
      buttonText="Take me Home"
      onClick={onButtonClick}
      quoteText=""
      title="The Room is Gone"
      body="Seems like the room doesn’t exist anymore."
      errorMessage={errorMsg}
      img={''}
    />
  );
};
