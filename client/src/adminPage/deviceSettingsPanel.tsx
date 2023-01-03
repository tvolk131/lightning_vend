import * as React from 'react';
import {Paper, Typography} from '@mui/material';
import {AdminDeviceView} from '../../../server/adminSessionManager';

interface DeviceSettingsPanelProps {
  adminDeviceView?: AdminDeviceView
}

export const DeviceSettingsPanel = (props: DeviceSettingsPanelProps) => {
  if (!props.adminDeviceView) {
    return <div></div>;
  }

  return (
    <Paper>
      <Typography variant={'h2'}>{props.adminDeviceView.deviceData.displayName}</Typography>
    </Paper>
  );
};