import React from 'react';
import { styled } from '@material-ui/core/styles';

const Main = styled('main')({
  height: '100%',
  position: 'relative',
  color: '#000',
  textAlign: 'center',
});

const Auth = styled('button')({
  fontSize: '24px',
  marginTop: '5%',
  marginRight: '5px',
  cursor: 'pointer',
});

export default function Landing() {
  const logIn = () => {
    console.log('logging in');
  };

  return (
    <Main>
      <Auth onClick={logIn}> Log in </Auth>
      <Auth> Sign up </Auth>
    </Main>
  );
}
