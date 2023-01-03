import {Button, TextField, CircularProgress, List, ListItemButton, ListItemText, ListItemIcon, Paper, Grid, useTheme} from '@mui/material';
import * as React from 'react';
import {useState} from 'react';
import {adminApi,} from './api/adminApi';
import {Circle as CircleIcon} from '@mui/icons-material';
import {DeviceSettingsPanel} from './adminPage/deviceSettingsPanel';

// TODO - Flesh out and clean up admin page.
export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();

  const theme = useTheme();

  if (loadableAdminData.state === 'loaded') {
    loadableAdminData.data.devices
  }

  const [nodeRegistrationPubkey, setNodeRegistrationPubkey] = useState('');

  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  return (
    <div style={{padding: theme.spacing(2)}}>
      {loadableAdminData.state === 'loading' && <CircularProgress/>}
      {loadableAdminData.state === 'error' && (
        <div>
          <TextField value={nodeRegistrationPubkey} onChange={(e) => setNodeRegistrationPubkey(e.target.value)} label={'LN Node Pubkey'} style={{margin: '20px'}}/>
          <Button
            variant={'contained'}
            disabled={!nodeRegistrationPubkey.length}
            onClick={() => {
              // TODO - Display a loading spinner until this promise resolves.
              adminApi.registerAdmin(nodeRegistrationPubkey);
            }}
          >
            Register
          </Button>
        </div>
      )}
      {loadableAdminData.state === 'loaded' && (
        <Grid container spacing={2}>
          <Grid item xs={'auto'}>
            <Paper sx={{width: '100%', maxWidth: '360px', bgcolor: 'background.paper'}}>
              <List>
                {loadableAdminData.data.devices.map((device, index) => {
                  return (
                    <ListItemButton
                      selected={selectedDeviceIndex === index}
                      onClick={() => setSelectedDeviceIndex(index)}
                    >
                      <ListItemIcon>
                        <CircleIcon color={device.isOnline ? 'success' : 'error'}/>
                      </ListItemIcon>
                      <ListItemText color={''} primary={device.deviceData.displayName}/>
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Grid>
          <Grid item xs>
            <DeviceSettingsPanel adminDeviceView={loadableAdminData.data.devices[selectedDeviceIndex]}/>
          </Grid>
        </Grid>
      )}
    </div>
  );
};