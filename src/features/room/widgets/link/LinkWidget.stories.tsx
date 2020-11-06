import { LinkWidget } from './LinkWidget';
import { Story } from '@storybook/react/types-6-0';
import React from 'react';
import { WidgetType } from '../../../../types/room';
import { withViewport } from '../../../../stories/__decorators__/withViewport';
import { Box } from '@material-ui/core';

export default {
  title: 'widgets/Link',
  component: LinkWidget,
  argTypes: {},
  decorators: [withViewport],
};

const Template: Story<{
  url: string;
  title: string;
  isDraft: boolean;
  mediaUrl?: string;
  mediaContentType?: string;
}> = (args) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={500}>
    <LinkWidget
      onClose={() => {}}
      state={{
        id: 'example',
        kind: 'widget',
        participantSid: 'me',
        isDraft: args.isDraft,
        type: WidgetType.Link,
        data: {
          title: args.title,
          url: args.url,
          mediaUrl: args.mediaUrl,
          mediaContentType: args.mediaContentType,
        },
      }}
    />
  </Box>
);

export const Default = Template.bind({});
Default.args = {
  title: 'Google',
  url: 'https://google.com',
  isDraft: false,
};

export const Draft = Template.bind({});
Draft.args = {
  title: '',
  url: '',
  isDraft: true,
};

export const Media = Template.bind({});
Media.args = {
  title: 'shaq.gif',
  url: 'https://i.imgur.com/vP2tUvM.gif',
  mediaUrl: 'https://i.imgur.com/vP2tUvM.gif',
  mediaContentType: 'image/gif',
};
