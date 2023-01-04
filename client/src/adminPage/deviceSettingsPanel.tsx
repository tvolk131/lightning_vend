import * as React from 'react';
import {useState, useEffect} from 'react';
import {Paper, Typography, InputAdornment, IconButton, OutlinedInput} from '@mui/material';
import {CheckCircle as CheckCircleIcon, Edit as EditIcon} from '@mui/icons-material';
import {AdminDeviceView} from '../../../server/adminSessionManager';
import {adminApi} from '../api/adminApi';

interface DeviceSettingsPanelProps {
  adminDeviceView?: AdminDeviceView
}

export const DeviceSettingsPanel = (props: DeviceSettingsPanelProps) => {
  if (!props.adminDeviceView) {
    return <div></div>;
  }

  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  const updateDisplayName = () => {
    if (props.adminDeviceView) {
      adminApi.updateDeviceDisplayName(props.adminDeviceView?.deviceData.deviceSessionId, newDisplayName).then(() => setIsEditingDisplayName(false));
    }
  };

  useEffect(() => {
    setNewDisplayName(props.adminDeviceView?.deviceData.displayName || '');
  }, [isEditingDisplayName]);

  return (
    <Paper style={{padding: '10px'}}>
      {isEditingDisplayName ? (
          <OutlinedInput
            // These styles are to match the Typography h2 below.
            style={{
              fontWeight: 300,
              fontSize: '3.75em',
              lineHeight: 1.2,
              letterSpacing: '-0.00833em',
              width: '100%'
            }}
            autoFocus
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateDisplayName();
              }
            }}
            endAdornment={
              <InputAdornment position={'end'}>
                <IconButton size={'large'} color={'primary'} onClick={() => updateDisplayName()}>
                  <CheckCircleIcon/>
                </IconButton>
              </InputAdornment>
            }
          />
        ) : (
          <div style={{display: 'flex'}}>
            <Typography variant={'h2'} style={{padding: '23.5px 14px 23.75px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{props.adminDeviceView.deviceData.displayName}</Typography>
            <IconButton size={'large'} style={{marginTop: '35px', marginRight: '14px', height: '100%'}} onClick={() => setIsEditingDisplayName(!isEditingDisplayName)}>
              <EditIcon/>
            </IconButton>
          </div>
        )
      }
    </Paper>
  );
};