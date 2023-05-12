import * as React from 'react';
import CircleIcon from '@mui/icons-material/Circle';
import CircularProgress from '@mui/material/CircularProgress';
import {DeviceSettingsPanel} from './adminPage/deviceSettingsPanel';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {LoginBox} from './adminPage/loginBox';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {adminApi} from './api/adminApi';
import {useState} from 'react';
import {useTheme} from '@mui/material/styles';

// TODO - Flesh out and clean up admin page.
export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();

  const theme = useTheme();

  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  return (
    <div style={{padding: theme.spacing(2), margin: 'auto', maxWidth: '1000px'}}>
      {loadableAdminData.state === 'loading' && <CircularProgress/>}
      {loadableAdminData.state === 'error' && <LoginBox/>}
      {loadableAdminData.state === 'loaded' && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper>
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
          <Grid item xs={12} sm={8}>
            {
              loadableAdminData.data.devices[selectedDeviceIndex] ?
                <DeviceSettingsPanel
                  adminDeviceView={loadableAdminData.data.devices[selectedDeviceIndex]}
                />
                :
                <Paper><Typography variant={'h2'}>No Device Selected</Typography></Paper>
            }
          </Grid>
        </Grid>
      )}
    </div>
  );
};