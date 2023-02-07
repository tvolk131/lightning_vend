import * as React from 'react';
import {debounceTime, filter, map, switchMap} from 'rxjs/operators';
import {useEffect, useState} from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import {BehaviorSubject} from 'rxjs';
import CircleIcon from '@mui/icons-material/Circle';
import CircularProgress from '@mui/material/CircularProgress';
import {DeviceSettingsPanel} from './adminPage/deviceSettingsPanel';
import Grid from '@mui/material/Grid';
import {LightningNode} from '../../proto/lnd/lnrpc/lightning';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {LoginBox} from './adminPage/loginBox';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from './api/adminApi';
import {ajax} from 'rxjs/ajax';
import {useTheme} from '@mui/material/styles';

const getDisplayNameOfLightningNode = (node: LightningNode): string => {
  if (node.alias.length > 0 && node.pubKey.length > 0) {
    return `${node.alias} (${node.pubKey})`;
  } else if (node.pubKey.length > 0) {
    return node.pubKey;
  } else {
    return 'Unknown Node';
  }
};

// Search text subject. Bound to `nodeSearchText` through `useEffect` below.
// Do not modify through any other method.
const subject = new BehaviorSubject('');

// TODO - Flesh out and clean up admin page.
export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();

  const theme = useTheme();

  const [nodeSearchText, setNodeSearchText] = useState('');
  const [nodeToRegister, setNodeToRegister] = useState<LightningNode>();

  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  const [lnNodeAutocompleteOptions, setLnNodeAutocompleteOptions] = useState<LightningNode[]>([]);

  useEffect(() => {
    const subscription = subject.pipe(
      debounceTime(50),
      filter(v => v.length > 0), // Send request only if there is user input.
      switchMap(searchText => ajax<LightningNode[]>(`/api/searchLightningNodes/${searchText}`)),
      map(({response}) => response)
    ).subscribe(
      (suggestedNodes) => setLnNodeAutocompleteOptions(suggestedNodes)
    );

    return () => subscription.unsubscribe();
  }, []);

  // Keep subject bound to `nodeSearchText`.
  useEffect(() => {
    subject.next(nodeSearchText);
  }, [nodeSearchText]);

  return (
    <div style={{padding: theme.spacing(2), margin: 'auto', maxWidth: '1000px'}}>
      {loadableAdminData.state === 'loading' && <CircularProgress/>}
      {loadableAdminData.state === 'error' && <LoginBox/>}
      {loadableAdminData.state === 'error' && (
        <div style={{margin: '20px'}}>
          <Autocomplete
            filterOptions={(x) => x}
            style={{marginBottom: '20px'}}
            renderInput={(params) => (
              <TextField
                {...params}
                label={'LN Node Pubkey'}
                onChange={(e) => {
                  setNodeSearchText(e.target.value);
                }}
                value={nodeSearchText}
              />
            )}
            onChange={(e, node) => {
              setNodeToRegister(node || undefined);
              setNodeSearchText(node ? getDisplayNameOfLightningNode(node) : '');
            }}
            options={lnNodeAutocompleteOptions}
            getOptionLabel={(nodeOption) => getDisplayNameOfLightningNode(nodeOption)}
          />
        </div>
      )}
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